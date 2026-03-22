'use server'

import { stripe } from '@/lib/stripe'
import { createServiceClient } from '@/lib/supabase/service'
import { type CartItem } from '@/lib/cart'
import { type ShippingAddress, generateOrderId } from '@/lib/order'
import { sendSlackMessage } from '@/lib/slack'
import { type Product } from '@/lib/products'
import { calculateShippingFee, SHIPPING_FEES } from '@/lib/shipping'

interface CheckoutSessionData {
  items: CartItem[]
  shippingAddress: ShippingAddress
  totalPrice: number
  shippingFee?: number
}

const SHIPPING_FIELD_LABELS: Record<string, string> = {
  lastName: '姓', firstName: '名', postalCode: '郵便番号',
  prefecture: '都道府県', city: '市区町村', address1: '番地・建物名',
  phone: '電話番号', email: 'メールアドレス',
}

/** Server-side guard: ensures required fields are present before hitting Stripe/DB. */
function validateShippingAddress(addr: ShippingAddress): void {
  const required: (keyof ShippingAddress)[] = [
    'lastName', 'firstName', 'postalCode', 'prefecture', 'city', 'address1', 'phone', 'email',
  ]
  for (const field of required) {
    if (!addr[field]?.trim()) {
      throw new Error(`配送先の入力が不完全です（${SHIPPING_FIELD_LABELS[field] ?? field}）`)
    }
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addr.email)) {
    throw new Error('メールアドレスの形式が正しくありません')
  }
  if (!/^\d{3}-?\d{4}$/.test(addr.postalCode)) {
    throw new Error('郵便番号の形式が正しくありません')
  }
}

// ── Server-side price calculation ───────────────────────────────────────────
// Mirrors calculateUnitPrice() in lib/products.ts but runs on the server
// so client-supplied prices can never bypass it.
function computeUnitPrice(
  priceTiers: Product['priceTiers'],
  options: Product['options'],
  quantity: number,
  selectedOptions: Record<string, string>,
): number {
  const tier = priceTiers.find((t) => quantity >= t.minQuantity && quantity <= t.maxQuantity)
  let base: number
  if (tier) {
    base = tier.unitPrice
  } else if (quantity < (priceTiers[0]?.minQuantity ?? 0)) {
    base = priceTiers[0]?.unitPrice ?? 0
  } else {
    base = priceTiers[priceTiers.length - 1]?.unitPrice ?? 0
  }

  let price = base
  for (const [optionId, valueId] of Object.entries(selectedOptions)) {
    const option = options.find((o) => o.id === optionId)
    const value = option?.values.find((v) => v.id === valueId)
    const mod = value?.priceModifier
    if (!mod) continue
    if (mod.type === 'add') price += mod.value
    else if (mod.type === 'multiply') price = Math.round(price * mod.value)
  }
  return price
}

/**
 * Validates cart items against the product master data in DB and returns
 * items with server-computed (authoritative) prices.
 *
 * SECURITY: client-supplied unit prices, mold fees, and express fees are
 * never used for billing. All prices are recomputed from the DB master.
 * Mismatches are logged as security events.
 */
async function validateAndRepricItems(
  items: CartItem[],
  shippingFee: number,
  customerEmail: string,
  supabase: ReturnType<typeof createServiceClient>,
): Promise<{ validatedItems: CartItem[]; serverTotal: number }> {
  const productIds = [...new Set(items.map((i) => i.productId))]
  const { data: masterRows, error: masterError } = await supabase
    .from('products')
    .select('id, price_tiers, options, requires_mold, mold_fee, express_delivery_fee, min_quantity, max_quantity')
    .in('id', productIds)

  if (masterError) {
    console.error('[pricing] Product master lookup failed:', masterError)
    throw new Error('商品情報の取得に失敗しました。もう一度お試しください。')
  }

  const masterMap: Record<string, any> = {}
  for (const row of masterRows ?? []) masterMap[row.id] = row

  // ── Validate moldOrderId claims in one batch query ──────────────────────────
  // A client could supply any string as moldOrderId to falsely claim a mold fee
  // exemption.  We verify each claimed order: it must exist, belong to the same
  // customer email, be less than 1 year old, and contain the same product.
  const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000
  const claimedMoldIds = [...new Set(items.map((i) => i.moldOrderId).filter(Boolean))] as string[]
  const validMoldOrderIds = new Set<string>()

  if (claimedMoldIds.length > 0) {
    const { data: moldOrders } = await supabase
      .from('orders')
      .select('id, created_at, customer_info, order_items(product_id)')
      .in('id', claimedMoldIds)

    for (const mo of moldOrders ?? []) {
      const moEmail = ((mo.customer_info as any)?.email ?? '').toLowerCase()
      const moProductIds = new Set(((mo as any).order_items ?? []).map((oi: any) => oi.product_id as string))
      const withinOneYear = Date.now() - new Date(mo.created_at).getTime() < ONE_YEAR_MS
      const sameCustomer = moEmail === customerEmail.toLowerCase()
      // Mark this mold order as valid for each item's product it contains
      if (sameCustomer && withinOneYear) {
        // Store per-product validity: moldOrderId is valid only for items whose productId it covers
        for (const pid of moProductIds) {
          validMoldOrderIds.add(`${mo.id}::${pid}`)
        }
      } else {
        console.warn(JSON.stringify({
          evt: 'security.invalid_mold_order_id',
          moldOrderId: mo.id,
          sameCustomer,
          withinOneYear,
          customerEmail,
        }))
      }
    }
  }

  const validatedItems: CartItem[] = items.map((item) => {
    const master = masterMap[item.productId]
    if (!master) {
      throw new Error(`商品が見つかりません: ${item.productName}（削除または非公開の可能性があります）`)
    }

    // Quantity range validation
    if (item.quantity < master.min_quantity || item.quantity > master.max_quantity) {
      throw new Error(
        `${item.productName}: 数量は ${master.min_quantity}〜${master.max_quantity} の範囲で指定してください（現在: ${item.quantity}）`,
      )
    }

    // Re-compute unit price from product master
    const selectedOptionsMap: Record<string, string> = Object.fromEntries(
      (item.options ?? []).map((o) => [o.id, o.value]),
    )
    const serverUnitPrice = computeUnitPrice(
      master.price_tiers ?? [],
      master.options ?? [],
      item.quantity,
      selectedOptionsMap,
    )
    const serverTotalPrice = serverUnitPrice * item.quantity

    // Security audit log: unit price mismatch
    if (serverUnitPrice !== item.unitPrice) {
      console.warn(JSON.stringify({
        evt: 'security.price_mismatch',
        productId: item.productId,
        productName: item.productName,
        clientUnitPrice: item.unitPrice,
        serverUnitPrice,
        quantity: item.quantity,
        customerEmail,
      }))
    }

    // Mold fee: validate claimed exemption (moldOrderId must be verified above)
    const moldExemptionValid = item.moldOrderId
      ? validMoldOrderIds.has(`${item.moldOrderId}::${item.productId}`)
      : false
    if (item.moldOrderId && !moldExemptionValid) {
      console.warn(JSON.stringify({
        evt: 'security.invalid_mold_order_id',
        moldOrderId: item.moldOrderId,
        productId: item.productId,
        customerEmail,
      }))
    }
    const validatedMoldOrderId = moldExemptionValid ? item.moldOrderId : undefined
    const expectedMoldFee = (master.requires_mold && !validatedMoldOrderId)
      ? (master.mold_fee ?? 0)
      : 0
    const clientMoldFee = item.moldFee ?? 0
    if (clientMoldFee !== expectedMoldFee) {
      console.warn(JSON.stringify({
        evt: 'security.mold_fee_mismatch',
        productId: item.productId,
        clientMoldFee,
        serverMoldFee: expectedMoldFee,
        customerEmail,
      }))
    }

    // Express delivery fee: must match product master if express is selected
    const serverExpressFee = item.expressDelivery
      ? Math.max(0, master.express_delivery_fee ?? 0)
      : 0
    const clientExpressFee = item.expressDeliveryFee ?? 0
    if (clientExpressFee !== serverExpressFee) {
      console.warn(JSON.stringify({
        evt: 'security.express_fee_mismatch',
        productId: item.productId,
        clientExpressFee,
        serverExpressFee,
        customerEmail,
      }))
    }

    return {
      ...item,
      unitPrice: serverUnitPrice,
      totalPrice: serverTotalPrice,
      moldFee: expectedMoldFee,
      moldOrderId: validatedMoldOrderId,
      expressDeliveryFee: serverExpressFee,
    }
  })

  const serverTotal =
    validatedItems.reduce(
      (sum, i) => sum + i.totalPrice + (i.moldFee ?? 0) + (i.expressDeliveryFee ?? 0),
      0,
    ) + shippingFee

  // Log total mismatch (tampered totalPrice)
  const clientTotal = items.reduce(
    (sum, i) => sum + i.totalPrice + (i.moldFee ?? 0) + (i.expressDeliveryFee ?? 0),
    0,
  ) + shippingFee

  if (serverTotal !== clientTotal) {
    console.warn(JSON.stringify({
      evt: 'security.total_mismatch',
      clientTotal,
      serverTotal,
      customerEmail,
    }))
  }

  return { validatedItems, serverTotal }
}

export async function startCheckoutSession(data: CheckoutSessionData) {
  const { items: rawItems, shippingAddress, totalPrice: clientTotalPrice, shippingFee: clientShippingFee = 0 } = data

  // ── Server-side input validation ────────────────────────────────────────────
  if (!rawItems || rawItems.length === 0) throw new Error('カートが空です')
  if (clientTotalPrice <= 0) throw new Error('合計金額が不正です')
  validateShippingAddress(shippingAddress)

  // Generate a unique order_number with up to 3 attempts.
  let orderId = generateOrderId()
  const customerName = `${shippingAddress.lastName} ${shippingAddress.firstName}`
  const supabase = createServiceClient()

  // ── SECURITY: Server-side shipping fee recalculation ─────────────────────────
  // Never trust the client-supplied shipping fee. Recalculate from postal code
  // and prefecture using the same logic as the frontend, with DB-configured rates.
  const { data: shippingSettings } = await supabase
    .from('site_settings')
    .select('key, value')
    .in('key', ['shipping_fee_okinawa', 'shipping_fee_remote_island'])
  const feeConfig = { ...SHIPPING_FEES }
  for (const row of shippingSettings ?? []) {
    const val = parseInt(row.value, 10)
    if (!isNaN(val)) {
      if (row.key === 'shipping_fee_okinawa') feeConfig.okinawa = val
      if (row.key === 'shipping_fee_remote_island') feeConfig.remote_island = val
    }
  }
  const shippingFee = calculateShippingFee(shippingAddress.postalCode, shippingAddress.prefecture, feeConfig)
  if (clientShippingFee !== shippingFee) {
    console.warn(JSON.stringify({
      evt: 'security.shipping_fee_mismatch',
      clientShippingFee,
      serverShippingFee: shippingFee,
      postalCode: shippingAddress.postalCode,
      prefecture: shippingAddress.prefecture,
      customerEmail: shippingAddress.email,
    }))
  }

  // ── Per-email order rate limit ───────────────────────────────────────────────
  const ORDER_RATE_WINDOW_MIN = 60
  const MAX_ORDERS_PER_WINDOW = 10
  const windowStart = new Date(Date.now() - ORDER_RATE_WINDOW_MIN * 60 * 1000).toISOString()
  const { count: recentOrderCount } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .filter('customer_info->>email', 'eq', shippingAddress.email.toLowerCase())
    .gte('created_at', windowStart)
    .neq('status', 'cancelled')

  if ((recentOrderCount ?? 0) >= MAX_ORDERS_PER_WINDOW) {
    throw new Error(
      `短時間に多数の注文が検出されました。${ORDER_RATE_WINDOW_MIN}分間に${MAX_ORDERS_PER_WINDOW}件を超えるご注文はお受けできません。` +
      ' ご不明な点は contact@soara-mu.com までお問い合わせください。',
    )
  }

  // ── SECURITY: Server-side price validation ───────────────────────────────────
  // Re-compute all prices from DB product master. Client-supplied prices are
  // replaced by authoritative server values before any DB write or Stripe charge.
  const { validatedItems: items, serverTotal: totalPrice } =
    await validateAndRepricItems(rawItems, shippingFee, shippingAddress.email, supabase)

  // ── Step 1: Insert pending order into DB FIRST ──────────────────────────────
  let order: any = null
  let orderError: any = null
  for (let attempt = 1; attempt <= 3; attempt++) {
    const result = await supabase
      .from('orders')
      .insert({
        stripe_session_id: `tmp_${orderId}`,
        order_number: orderId,
        customer_info: { name: customerName, ...shippingAddress },
        shipping_address: shippingAddress,
        total_price: totalPrice,
        shipping_fee: shippingFee,
        status: 'pending',
      })
      .select()
      .single()
    order = result.data
    orderError = result.error
    if (!orderError) break
    if (orderError.code === '23505' && attempt < 3) {
      orderId = generateOrderId()
      console.warn(`[order_number collision] Retrying with new ID: ${orderId} (attempt ${attempt + 1})`)
      continue
    }
    break
  }

  if (orderError) {
    console.error('Failed to create pending order:', orderError)
    throw new Error('注文の作成に失敗しました。もう一度お試しください。')
  }

  // ── Step 2: Resolve default factory assignments per product ─────────────────
  const distinctProductIds = [...new Set(items.map((i) => i.productId))]
  const { data: productRows } = await supabase
    .from('products')
    .select('id, default_factory_id')
    .in('id', distinctProductIds)
  const defaultFactoryMap: Record<string, string | null> = {}
  for (const row of productRows ?? []) {
    defaultFactoryMap[row.id] = row.default_factory_id ?? null
  }

  // ── Step 3: Insert order items ───────────────────────────────────────────────
  const orderItemsToInsert = items.map((item) => {
    const defaultFactoryId = defaultFactoryMap[item.productId] ?? null
    return {
      order_id: order.id,
      product_id: item.productId,
      product_name: item.productName,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      total_price: item.totalPrice,
      mold_fee: item.moldFee || 0,
      mold_order_id: item.moldOrderId || null,
      options: item.options ?? [],
      design_file_name: item.designFileName || null,
      design_url: item.designImage || null,
      delivery_pdf_url: item.deliveryPdfUrl || null,
      express_delivery: item.expressDelivery || false,
      express_delivery_fee: item.expressDeliveryFee || 0,
      factory_id: defaultFactoryId,
      status: defaultFactoryId ? 'assigned' : 'unassigned',
    }
  })

  const { error: itemsError } = await supabase.from('order_items').insert(orderItemsToInsert)

  if (itemsError) {
    await supabase.from('orders').delete().eq('id', order.id)
    console.error('Failed to create order items:', itemsError)
    throw new Error('注文明細の作成に失敗しました。もう一度お試しください。')
  }

  // ── Background: PO duplicate check ──────────────────────────────────────────
  const poNumber = shippingAddress.poNumber?.trim()
  if (poNumber) {
    ;(async () => {
      try {
        const { data: dupes } = await supabase
          .from('orders')
          .select('id, order_number')
          .eq('status', 'paid')
          .neq('id', order.id)
          .filter('shipping_address->>poNumber', 'eq', poNumber)
          .limit(1)
        if (dupes && dupes.length > 0) {
          const prev = dupes[0].order_number ?? dupes[0].id
          const adminUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/admin/orders/${order.id}`
          await sendSlackMessage(
            `⚠️ *PO番号重複検知*\n新規注文: ${orderId}\nPO番号: \`${poNumber}\`\n既存注文: ${prev}\n\n重複発注の可能性があります。顧客に確認してください。\n<${adminUrl}|管理画面で確認>`,
          )
        }
      } catch (e: any) {
        console.error('[PO duplicate check] error:', e.message)
      }
    })()
  }

  // ── Step 4: Build Stripe line items (using server-validated prices) ──────────
  const lineItems = items.flatMap((item) => {
    const lineItem = [
      {
        price_data: {
          currency: 'jpy',
          product_data: {
            name: item.productName,
            description: (item.options ?? []).map((o) => `${o.name}: ${o.value}`).join(', ') || undefined,
          },
          unit_amount: item.unitPrice,
        },
        quantity: item.quantity,
      },
    ]

    if (item.moldFee && item.moldFee > 0) {
      lineItem.push({
        price_data: {
          currency: 'jpy',
          product_data: {
            name: `型代 - ${item.productName}`,
            description: item.moldOrderId ? '型の再利用（免除）' : '初回型作成費用',
          },
          unit_amount: item.moldFee,
        },
        quantity: 1,
      })
    }

    if (item.expressDelivery && item.expressDeliveryFee && item.expressDeliveryFee > 0) {
      lineItem.push({
        price_data: {
          currency: 'jpy',
          product_data: {
            name: `⚡ 特急料金 - ${item.productName}`,
            description: '特急納期（約10日以内）オプション',
          },
          unit_amount: item.expressDeliveryFee,
        },
        quantity: 1,
      })
    }

    return lineItem
  })

  if (shippingFee > 0) {
    lineItems.push({
      price_data: {
        currency: 'jpy',
        product_data: {
          name: '送料（離島・遠隔地）',
          description: '離島・沖縄・一部遠隔地への送料',
        },
        unit_amount: shippingFee,
      },
      quantity: 1,
    })
  }

  // ── Step 5: Create Stripe Checkout Session ───────────────────────────────────
  let session
  try {
    session = await stripe.checkout.sessions.create({
      ui_mode: 'embedded',
      redirect_on_completion: 'never',
      line_items: lineItems,
      mode: 'payment',
      metadata: {
        orderId,
        dbOrderId: order.id,
      },
      customer_email: shippingAddress.email,
    })
  } catch (stripeErr) {
    await supabase.from('orders').delete().eq('id', order.id)
    console.error('Failed to create Stripe session:', stripeErr)
    throw new Error('決済セッションの作成に失敗しました。もう一度お試しください。')
  }

  // ── Step 6: Update order with the real Stripe session ID ────────────────────
  const { error: updateError } = await supabase
    .from('orders')
    .update({ stripe_session_id: session.id })
    .eq('id', order.id)

  if (updateError) {
    console.error(`[${orderId}] Failed to update stripe_session_id — webhook will use dbOrderId fallback:`, updateError)
    try {
      const { sendSlackMessage } = await import('@/lib/slack')
      await sendSlackMessage(
        `⚠️ *stripe_session_id 更新失敗*\n注文番号: ${orderId}\nDB Order ID: ${order.id}\nエラー: ${updateError.message}\n\nWebhookはdbOrderIdフォールバックで処理されますが、注文を確認してください。`,
      )
    } catch (_) { /* slack failure must not abort checkout */ }
  }

  return {
    clientSecret: session.client_secret,
    sessionId: session.id,
    orderId,
  }
}

export async function getCheckoutSession(sessionId: string) {
  const session = await stripe.checkout.sessions.retrieve(sessionId)
  return session
}
