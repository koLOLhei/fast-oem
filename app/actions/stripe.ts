'use server'

import { stripe } from '@/lib/stripe'
import { createServiceClient } from '@/lib/supabase/service'
import { type CartItem } from '@/lib/cart'
import { type ShippingAddress, generateOrderId } from '@/lib/order'
import type { CustomerInfo } from '@/lib/database.types'
import { sendSlackMessage } from '@/lib/slack'
import { type Product, calculateMoldFee, calculateShippingModifier, checkComplexityRestriction } from '@/lib/products'
import { calculateShippingByQuantity, calculateExpressShipping } from '@/lib/shipping'
import { calculateTotalQuantity } from '@/lib/cart'
import { MAX_UNIT_PRICE_JPY, MAX_CHECKBOX_VALUES } from '@/lib/validation'

interface CheckoutSessionData {
  items: CartItem[]
  shippingAddress: ShippingAddress
  totalPrice: number
  shippingFee?: number
}

const SHIPPING_FIELD_LABELS: Record<string, string> = {
  lastName: '姓', firstName: '名',
  lastNameKana: 'セイ（カナ）', firstNameKana: 'メイ（カナ）',
  postalCode: '郵便番号',
  prefecture: '都道府県', city: '市区町村', address1: '番地・建物名',
  phone: '電話番号', email: 'メールアドレス',
}

/** Server-side guard: ensures required fields are present before hitting Stripe/DB. */
function validateShippingAddress(addr: ShippingAddress): void {
  const required: (keyof ShippingAddress)[] = [
    'lastName', 'firstName', 'lastNameKana', 'firstNameKana', 'postalCode', 'prefecture', 'city', 'address1', 'phone', 'email',
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
  fixedUnitPrice = false,
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

  if (fixedUnitPrice) return base

  let price = base
  for (const [optionId, valueIdOrLabel] of Object.entries(selectedOptions)) {
    const option = options.find((o) => o.id === optionId)
    if (!option) continue

    // number type: input value × pricePerUnit
    if (option.type === 'number' && option.pricePerUnit) {
      const num = parseFloat(valueIdOrLabel)
      // Enforce option's min/max bounds; reject negative values unless explicitly allowed
      const min = option.numberMin ?? 0
      const max = option.numberMax ?? 100_000
      if (!isNaN(num) && isFinite(num) && num >= min && num <= max) {
        price += Math.round(num * option.pricePerUnit)
      }
      if (price < 0 || price > MAX_UNIT_PRICE_JPY) {
        throw new Error('単価の計算結果が許容範囲を超えました。オプションの組み合わせをご確認ください。')
      }
      continue
    }

    // checkbox type: comma-separated values, accumulate all modifiers
    if (option.type === 'checkbox' || option.multiSelect) {
      const ids = valueIdOrLabel.split(',').filter(Boolean).slice(0, MAX_CHECKBOX_VALUES)
      for (const id of ids) {
        // Match by ID first, then label — same order as client (lib/products.ts)
        const val = option.values.find((v) => v.id === id || v.label === id)
        const mod = val?.priceModifier
        if (!mod) continue
        if (mod.type === 'add') price += mod.value
        else if (mod.type === 'multiply') price = Math.round(price * mod.value)
        if (price < 0 || price > MAX_UNIT_PRICE_JPY) {
          throw new Error('単価の計算結果が許容範囲を超えました。オプションの組み合わせをご確認ください。')
        }
      }
      continue
    }

    // Standard single-select
    // Match by ID first, then label — same order as client (lib/products.ts)
    const value = option.values.find((v) => v.id === valueIdOrLabel || v.label === valueIdOrLabel)
    const mod = value?.priceModifier
    if (!mod) continue
    if (mod.type === 'add') price += mod.value
    else if (mod.type === 'multiply') price = Math.round(price * mod.value)
    if (price < 0 || price > MAX_UNIT_PRICE_JPY) {
      throw new Error('単価の計算結果が許容範囲を超えました。オプションの組み合わせをご確認ください。')
    }
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
    .select('id, price_tiers, options, requires_mold, mold_fee, mold_fee_rules, express_delivery_fee, min_quantity, max_quantity, fixed_unit_price, complexity_rules, is_3d, is_active')
    .in('id', productIds)
    .eq('is_active', true)

  if (masterError) {
    console.error('[pricing] Product master lookup failed:', masterError.message)
    throw new Error('商品情報の取得に失敗しました。もう一度お試しください。')
  }

  const masterMap: Record<string, any> = {}
  for (const row of masterRows ?? []) masterMap[row.id] = row

  // ── Validate moldOrderId claims in one batch query ──────────────────────────
  // A client could supply any string as moldOrderId to falsely claim a mold fee
  // exemption.  We verify each claimed order: it must exist, belong to the same
  // customer email, be within expiration, contain the same product, and have
  // actually paid a mold fee (prevents chain-of-exemption bypass).
  // Only paid/fulfilled orders qualify (matches mold.ts VALID_STATUSES).
  const VALID_MOLD_STATUSES = ['paid', 'processing', 'partially_shipped', 'shipped', 'completed']

  // Use configurable expiration from site_settings (consistent with mold.ts)
  let moldReuseMs: number
  try {
    const { data: settingRow } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'mold_reuse_months')
      .single()
    const parsed = parseInt(settingRow?.value ?? '12', 10)
    const months = isNaN(parsed) ? 12 : parsed
    moldReuseMs = months <= 0 ? Infinity : months * 30 * 24 * 60 * 60 * 1000
  } catch {
    moldReuseMs = 365 * 24 * 60 * 60 * 1000 // fallback: 1 year
  }

  const claimedMoldIds = [...new Set(items.map((i) => i.moldOrderId).filter(Boolean))] as string[]
  const validMoldOrderIds = new Set<string>()

  if (claimedMoldIds.length > 0) {
    const moldQuery = supabase
      .from('orders')
      .select('id, status, created_at, customer_info, order_items(product_id, mold_fee)')
      .in('id', claimedMoldIds)
    const { data: moldOrders } = await moldQuery

    for (const mo of moldOrders ?? []) {
      const moEmail = ((mo.customer_info as CustomerInfo)?.email ?? '').toLowerCase()
      const withinExpiration = moldReuseMs === Infinity
        || Date.now() - new Date(mo.created_at).getTime() < moldReuseMs
      const sameCustomer = moEmail === customerEmail.toLowerCase()
      const validStatus = VALID_MOLD_STATUSES.includes(mo.status)

      if (sameCustomer && withinExpiration && validStatus) {
        // Only mark valid for products where the order actually paid a mold fee
        for (const oi of (mo.order_items ?? []) as { product_id: string; mold_fee: number }[]) {
          if (oi.mold_fee && oi.mold_fee > 0) {
            validMoldOrderIds.add(`${mo.id}::${oi.product_id}`)
          }
        }
      } else {
        console.warn(JSON.stringify({
          evt: 'security.invalid_mold_order_id',
          moldOrderId: mo.id,
          sameCustomer,
          withinExpiration,
          validStatus,
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

    // Quantity validation: must be a positive integer within range
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      throw new Error(`${item.productName}: 数量は正の整数で指定してください（現在: ${item.quantity}）`)
    }
    if (item.quantity < master.min_quantity || item.quantity > master.max_quantity) {
      throw new Error(
        `${item.productName}: 数量は ${master.min_quantity}〜${master.max_quantity} の範囲で指定してください（現在: ${item.quantity}）`,
      )
    }

    // Re-compute unit price from product master
    const selectedOptionsMap: Record<string, string> = Object.fromEntries(
      (item.options ?? []).map((o) => [o.id, o.value]),
    )
    // Build a Product-like object from DB master data for shared calculation functions
    const masterProduct = {
      options: master.options ?? [],
      requiresMold: master.requires_mold,
      moldFee: master.mold_fee,
      moldFeeRules: master.mold_fee_rules ?? [],
      complexityRules: master.complexity_rules ?? [],
      is3d: master.is_3d ?? false,
    } as Product

    // Complexity restriction check (server-side enforcement)
    const complexityBlock = checkComplexityRestriction(masterProduct, selectedOptionsMap)
    if (complexityBlock) {
      throw new Error(`注文できない組み合わせが含まれています: ${item.productName} — ${complexityBlock}`)
    }

    const serverUnitPrice = computeUnitPrice(
      master.price_tiers ?? [],
      master.options ?? [],
      item.quantity,
      selectedOptionsMap,
      master.fixed_unit_price ?? false,
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

    // Calculate expected mold fee using canonical calculateMoldFee()
    const { moldFee: calculatedMoldFee } = calculateMoldFee(masterProduct, selectedOptionsMap, item.quantity)
    const expectedMoldFee = validatedMoldOrderId ? 0 : calculatedMoldFee
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

    // Shipping modifier: recalculate from master options
    const masterProductForShipping = {
      options: master.options ?? [],
    } as Product
    const serverShippingModifier = calculateShippingModifier(masterProductForShipping, selectedOptionsMap)
    const clientShippingModifier = item.shippingModifier ?? 0
    if (clientShippingModifier !== serverShippingModifier) {
      console.warn(JSON.stringify({
        evt: 'security.shipping_modifier_mismatch',
        productId: item.productId,
        clientShippingModifier,
        serverShippingModifier,
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
      shippingModifier: serverShippingModifier,
    }
  })

  const serverTotal =
    validatedItems.reduce(
      (sum, i) => sum + i.totalPrice + (i.moldFee ?? 0) + (i.expressDeliveryFee ?? 0) + (i.shippingModifier ?? 0),
      0,
    ) + shippingFee

  // Log total mismatch (tampered totalPrice)
  const clientTotal = items.reduce(
    (sum, i) => sum + i.totalPrice + (i.moldFee ?? 0) + (i.expressDeliveryFee ?? 0) + (i.shippingModifier ?? 0),
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
  // Never trust the client-supplied shipping fee. Recalculate from total
  // quantity using the quantity-based tier system.
  const totalQuantity = calculateTotalQuantity(rawItems)
  const baseShippingFee = calculateShippingByQuantity(totalQuantity)
  const hasExpress = rawItems.some((item) => item.expressDelivery)
  const shippingFee = hasExpress ? calculateExpressShipping(baseShippingFee) : baseShippingFee
  if (clientShippingFee !== shippingFee) {
    console.warn(JSON.stringify({
      evt: 'security.shipping_fee_mismatch',
      clientShippingFee,
      serverShippingFee: shippingFee,
      totalQuantity,
      hasExpress,
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

  // Sanity check: reject orders with implausible totals (guards against
  // misconfigured price tiers or integer overflow)
  const MAX_ORDER_TOTAL_JPY = 10_000_000 // ¥10M
  if (totalPrice <= 0 || totalPrice > MAX_ORDER_TOTAL_JPY) {
    console.error(JSON.stringify({
      evt: 'security.implausible_total',
      totalPrice,
      customerEmail: shippingAddress.email,
    }))
    throw new Error('合計金額が不正です。カートの内容をご確認ください。')
  }

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
    console.error('Failed to create pending order:', orderError.message)
    throw new Error('注文の作成に失敗しました。もう一度お試しください。')
  }

  // ── Step 2: Resolve default factory assignments per product ─────────────────
  const distinctProductIds = [...new Set(items.map((i) => i.productId))]
  const { data: productRows } = await supabase
    .from('products')
    .select('id, default_factory_id, options')
    .in('id', distinctProductIds)
  const defaultFactoryMap: Record<string, string | null> = {}
  const productMasterMap: Record<string, any> = {}
  for (const row of productRows ?? []) {
    defaultFactoryMap[row.id] = row.default_factory_id ?? null
    productMasterMap[row.id] = row
  }

  // ── Step 3: Insert order items ───────────────────────────────────────────────

  const orderItemsToInsert = items.map((item) => {
    const defaultFactoryId = defaultFactoryMap[item.productId] ?? null

    // Calculate shipping modifier from selected options
    const selectedOptionsMap: Record<string, string> = Object.fromEntries(
      (item.options ?? []).map((o) => [o.id, o.value]),
    )
    const masterForShipping = productMasterMap[item.productId]
    const shippingModifier = masterForShipping
      ? calculateShippingModifier(
          { options: masterForShipping.options ?? [] } as Product,
          selectedOptionsMap,
        )
      : 0

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
      back_design_url: item.backDesignImage || null,
      back_design_file_name: item.backDesignFileName || null,
      back_delivery_pdf_url: item.backDeliveryPdfUrl || null,
      express_delivery: item.expressDelivery || false,
      express_delivery_fee: item.expressDeliveryFee || 0,
      factory_id: defaultFactoryId,
      status: defaultFactoryId ? 'assigned' : 'unassigned',
      shipping_modifier: shippingModifier,
      design_images: item.designImages ?? [],
    }
  })

  const { error: itemsError } = await supabase.from('order_items').insert(orderItemsToInsert)

  if (itemsError) {
    await supabase.from('orders').delete().eq('id', order.id)
    console.error('Failed to create order items:', itemsError.message)
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
            description: '特急納期（約2週間）オプション',
          },
          unit_amount: item.expressDeliveryFee,
        },
        quantity: 1,
      })
    }

    if (item.shippingModifier && item.shippingModifier > 0) {
      lineItem.push({
        price_data: {
          currency: 'jpy',
          product_data: {
            name: `送料加算 - ${item.productName}`,
            description: 'オプションによる送料加算',
          },
          unit_amount: item.shippingModifier,
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
          name: hasExpress ? '送料（特急便）' : '送料',
          description: `合計数量: ${totalQuantity}個${hasExpress ? ' / 特急便: 送料×2' : ''}`,
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
    console.error('Failed to create Stripe session:', (stripeErr as Error).message)
    throw new Error('決済セッションの作成に失敗しました。もう一度お試しください。')
  }

  // ── Step 6: Update order with the real Stripe session ID ────────────────────
  const { error: updateError } = await supabase
    .from('orders')
    .update({ stripe_session_id: session.id })
    .eq('id', order.id)

  if (updateError) {
    console.error(`[${orderId}] Failed to update stripe_session_id — webhook will use dbOrderId fallback:`, updateError.message)
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
  if (!sessionId || typeof sessionId !== 'string') {
    throw new Error('無効なセッションIDです')
  }
  // Basic format validation: Stripe session IDs start with "cs_"
  if (!/^cs_(test_|live_)[a-zA-Z0-9]+$/.test(sessionId)) {
    throw new Error('無効なセッションIDの形式です')
  }
  const session = await stripe.checkout.sessions.retrieve(sessionId)
  // Only return the minimum data needed — never expose the full Stripe session object
  return {
    status: session.status,
    payment_status: session.payment_status,
  }
}
