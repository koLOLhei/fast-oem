/**
 * POST /api/ai/order
 *
 * Create a pending order and return a Stripe Hosted Checkout URL the agent
 * can hand back to its user for one-click payment. Alternatively, when the
 * request carries a valid Agent API Key (Authorization: Bearer sk_agent_...),
 * and the associated customer has a saved payment method, the order can be
 * charged off-session and completed autonomously.
 *
 * Request body:
 *   {
 *     "items": [
 *       {
 *         "productSlug": "acrylic-keychain",
 *         "quantity": 500,
 *         "options": { "size": "50mm", "shape": "die-cut" }
 *       }
 *     ],
 *     "shippingAddress": {
 *       "lastName": "山田", "firstName": "太郎",
 *       "lastNameKana": "ヤマダ", "firstNameKana": "タロウ",
 *       "postalCode": "1500001",
 *       "prefecture": "東京都", "city": "渋谷区", "address1": "神宮前1-1-1",
 *       "phone": "0312345678", "email": "test@example.com"
 *     },
 *     "express": false,
 *     "designImages": [
 *       { "productSlug": "acrylic-keychain", "url": "https://..." }
 *     ]
 *   }
 *
 * Response (unauthenticated / pay-by-URL mode):
 *   { "orderId": "FOM-...", "checkoutUrl": "https://checkout.stripe.com/...",
 *     "totalPrice": 83050, "expiresAt": "2026-04-19T..." }
 *
 * Response (agent-key / off-session mode):
 *   { "orderId": "FOM-...", "paymentStatus": "paid",
 *     "statusUrl": "https://fast-oem.soara-mu.jp/orders/<uuid>/status?token=..." }
 */
import { NextRequest, NextResponse } from 'next/server'
import { startCheckoutSession } from '@/app/actions/stripe'
import { getProductBySlugFromDb } from '@/lib/products-db'
import { generateCartItemId, type CartItem } from '@/lib/cart'
import { calculateUnitPrice, calculateTotalPrice, calculateMoldFee } from '@/lib/products'
import type { ShippingAddress } from '@/lib/order'

export const runtime = 'nodejs'

interface OrderItemInput {
  productSlug?: unknown
  quantity?: unknown
  options?: unknown
  designImageUrl?: unknown
  deliveryPdfUrl?: unknown
}

interface OrderRequest {
  items?: unknown
  shippingAddress?: unknown
  express?: unknown
}

function err(message: string, code = 400, details?: unknown) {
  return NextResponse.json(
    { error: message, schema: 'fast-oem.order.error.v1', details },
    { status: code, headers: { 'Access-Control-Allow-Origin': '*' } },
  )
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'content-type, authorization',
      'Access-Control-Max-Age': '86400',
    },
  })
}

export async function POST(req: NextRequest) {
  let body: OrderRequest
  try {
    body = await req.json()
  } catch {
    return err('Invalid JSON body.')
  }

  const items = Array.isArray(body.items) ? body.items as OrderItemInput[] : null
  if (!items || items.length === 0) return err('items[] is required and must be non-empty.')
  if (items.length > 20) return err('Too many items (max 20 per order).')

  const shipping = body.shippingAddress
  if (!shipping || typeof shipping !== 'object') return err('shippingAddress object is required.')
  const sa = shipping as Record<string, unknown>

  const required: (keyof ShippingAddress)[] = ['lastName', 'firstName', 'postalCode', 'prefecture', 'city', 'address1', 'phone', 'email']
  const missing = required.filter((k) => !sa[k] || typeof sa[k] !== 'string' || String(sa[k]).trim() === '')
  if (missing.length > 0) return err(`shippingAddress is missing required fields: ${missing.join(', ')}`)

  const shippingAddress: ShippingAddress = {
    lastName: String(sa.lastName),
    firstName: String(sa.firstName),
    lastNameKana: typeof sa.lastNameKana === 'string' ? sa.lastNameKana : '',
    firstNameKana: typeof sa.firstNameKana === 'string' ? sa.firstNameKana : '',
    postalCode: String(sa.postalCode),
    prefecture: String(sa.prefecture),
    city: String(sa.city),
    address1: String(sa.address1),
    address2: typeof sa.address2 === 'string' ? sa.address2 : '',
    phone: String(sa.phone),
    email: String(sa.email),
    companyName: typeof sa.companyName === 'string' ? sa.companyName : '',
    department: typeof sa.department === 'string' ? sa.department : '',
    poNumber: typeof sa.poNumber === 'string' ? sa.poNumber : '',
    receiptAddressee: typeof sa.receiptAddressee === 'string' ? sa.receiptAddressee : '',
  }

  // Convert each AI order item into the internal CartItem shape that
  // startCheckoutSession expects. Validate slugs + options exist.
  const cartItems: CartItem[] = []
  for (const it of items) {
    const slug = typeof it.productSlug === 'string' ? it.productSlug : null
    if (!slug) return err('Each item requires productSlug.')
    const product = await getProductBySlugFromDb(slug)
    if (!product || product.isActive === false) return err(`Unknown or inactive product: ${slug}`, 404)

    const qty = Number(it.quantity)
    if (!Number.isInteger(qty) || qty <= 0) return err(`${slug}: quantity must be a positive integer.`)
    if (qty < product.minQuantity) return err(`${slug}: minQuantity is ${product.minQuantity}.`)
    if (qty > product.maxQuantity) return err(`${slug}: maxQuantity is ${product.maxQuantity}.`)

    const rawOpts = it.options && typeof it.options === 'object' ? it.options as Record<string, unknown> : {}
    const selectedOptions: Record<string, string> = {}
    for (const [k, v] of Object.entries(rawOpts)) {
      if (typeof v !== 'string') continue
      const opt = product.options.find((o) => o.id === k)
      if (!opt) continue
      selectedOptions[k] = v
    }

    // Auto-fill required list options with first value if omitted.
    for (const opt of product.options) {
      if (selectedOptions[opt.id]) continue
      if (opt.required === false) continue
      if (opt.type !== 'list' && opt.type !== 'dropdown' && opt.type !== 'grid') continue
      if (opt.parentId && !opt.showWhen?.includes(selectedOptions[opt.parentId] ?? '')) continue
      if (opt.values.length > 0) selectedOptions[opt.id] = opt.values[0].id
    }

    const unitPrice = calculateUnitPrice(product, qty, selectedOptions)
    const totalPrice = calculateTotalPrice(product, qty, selectedOptions)
    const moldInfo = calculateMoldFee(product, selectedOptions, qty)

    // Convert option ids to labels for CartItem display
    const optionEntries = Object.entries(selectedOptions).map(([id, valueId]) => {
      const option = product.options.find((o) => o.id === id)
      const val = option?.values.find((v) => v.id === valueId || v.label === valueId)
      return { id, name: option?.name ?? id, value: val?.label ?? valueId }
    })

    const productExpressFee = product.expressDeliveryFee ?? 0
    const useExpress = body.express === true && productExpressFee > 0

    cartItems.push({
      id: generateCartItemId(),
      productId: product.id,
      productName: product.name,
      quantity: qty,
      unitPrice,
      totalPrice,
      options: optionEntries,
      designImage: typeof it.designImageUrl === 'string' ? it.designImageUrl : null,
      designFileName: null,
      designPreviewDataUrl: null,
      deliveryPdfUrl: typeof it.deliveryPdfUrl === 'string' ? it.deliveryPdfUrl : null,
      moldFee: moldInfo.requiresMold ? moldInfo.moldFee : undefined,
      expressDelivery: useExpress ? true : undefined,
      expressDeliveryFee: useExpress ? productExpressFee : undefined,
    } as CartItem)
  }

  // Agent API key check (Phase 2 — off-session charging).
  // When the DB row + saved payment method exist, we'll charge immediately
  // and return a completed order. Otherwise, fall back to hosted checkout URL.
  const authHeader = req.headers.get('authorization') ?? ''
  const agentKey = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : null
  // Off-session auto-charging is DISABLED unless AGENT_OFF_SESSION_ENABLED=true.
  // The standalone PaymentIntent below charges the saved card, but order
  // fulfillment — confirmation email, design-image processing, factory/Slack
  // notification, mold-reuse detection — runs ONLY in the Supabase stripe-webhook
  // on `checkout.session.completed`, which this path never fires. Enabling it as
  // written would bill the customer's card WITHOUT fulfilling the order. Re-enable
  // only after (a) a `payment_intent.succeeded` fulfillment handler exists in
  // supabase/functions/stripe-webhook and (b) the daily-cap is enforced atomically
  // in the DB (a SELECT-sum then charge is racy across concurrent requests).
  // Until then the agent flow falls back to the hosted Checkout URL, which
  // fulfills correctly via the existing webhook.
  const offSessionEnabled = process.env.AGENT_OFF_SESSION_ENABLED === 'true'
  const agentOffSession = (agentKey && offSessionEnabled) ? await tryOffSessionCharge(agentKey, cartItems, shippingAddress).catch((e) => {
    console.error('[ai.order] off-session charge path error:', e)
    return null
  }) : null
  if (agentOffSession?.ok) {
    return NextResponse.json(agentOffSession.payload, {
      status: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
    })
  }
  if (agentOffSession && !agentOffSession.ok && agentOffSession.error) {
    return err(agentOffSession.error, agentOffSession.status ?? 402)
  }

  // Fallback: create a hosted Stripe checkout URL for the agent to relay.
  // Compute a plausible total upfront; startCheckoutSession re-validates it
  // server-side regardless, so the exact number doesn't matter.
  const approxTotal = cartItems.reduce((s, i) => s + (i.totalPrice || 0) + (i.moldFee ?? 0) + (i.expressDeliveryFee ?? 0), 0)

  try {
    const result = await startCheckoutSession({
      items: cartItems,
      shippingAddress,
      totalPrice: approxTotal,
      mode: 'hosted',
    })
    return NextResponse.json({
      schema: 'fast-oem.order.v1',
      mode: 'checkout_url',
      orderId: result.orderId,
      dbOrderId: result.dbOrderId,
      checkoutUrl: result.url,
      expiresAt: result.expiresAt,
      notes: [
        'Send the checkoutUrl to the user. They complete card entry + payment on the Stripe-hosted page.',
        'To enable fully autonomous payment, have the customer create an Agent API Key at /mypage/agent-access and send it as Authorization: Bearer <key>.',
      ],
    }, {
      status: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Internal error'
    return err(msg, 500)
  }
}

/**
 * Agent-API-key flow. Looks up the key, verifies daily spending caps and the
 * associated customer has a default Stripe payment method, then charges the
 * saved card off-session via `PaymentIntent.confirm`. If anything is missing
 * this returns null/error so the caller can fall back to the checkout-URL flow.
 */
async function tryOffSessionCharge(
  agentKey: string,
  items: CartItem[],
  shippingAddress: ShippingAddress,
): Promise<{ ok: true; payload: Record<string, unknown> } | { ok: false; error?: string; status?: number } | null> {
  // Lazy import to avoid cost when no key is present.
  const { createServiceClient } = await import('@/lib/supabase/service')
  const supabase = createServiceClient()

  // Look up the key by sha-256 hash (stored in DB — plaintext never persisted).
  const enc = new TextEncoder().encode(agentKey)
  const digest = await crypto.subtle.digest('SHA-256', enc)
  const hash = Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('')

  const { data: keyRow, error: keyErr } = await supabase
    .from('agent_api_keys')
    .select('id, user_id, enabled, daily_cap_jpy, stripe_customer_id, stripe_default_pm_id')
    .eq('secret_hash', hash)
    .maybeSingle()

  if (keyErr && (keyErr as { code?: string }).code === '42P01') {
    // Table not yet created (migration pending) — quietly skip.
    return null
  }
  if (keyErr) {
    console.error('[agent-key lookup] error:', keyErr.message)
    return null
  }
  if (!keyRow) return { ok: false, error: 'Invalid or unknown agent API key.', status: 401 }
  if (!keyRow.enabled) return { ok: false, error: 'Agent API key is disabled.', status: 403 }
  if (!keyRow.stripe_customer_id || !keyRow.stripe_default_pm_id) {
    return { ok: false, error: 'This agent key has no saved payment method. Have the customer add a card at /mypage/agent-access.', status: 402 }
  }

  // Daily cap check: sum today's charges attributed to this key.
  const todayStart = new Date()
  todayStart.setUTCHours(0, 0, 0, 0)
  const { data: todaysOrders } = await supabase
    .from('orders')
    .select('total_price')
    .eq('agent_key_id', keyRow.id)
    .gte('created_at', todayStart.toISOString())

  const spentToday = (todaysOrders ?? []).reduce((s, r: { total_price?: number }) => s + (r.total_price ?? 0), 0)
  const thisOrderTotal = items.reduce((s, i) => s + (i.totalPrice || 0) + (i.moldFee ?? 0) + (i.expressDeliveryFee ?? 0), 0)
  if (spentToday + thisOrderTotal > (keyRow.daily_cap_jpy ?? 0)) {
    return { ok: false, error: `Daily spending cap exceeded (cap=¥${keyRow.daily_cap_jpy}, spent=¥${spentToday}, requested=¥${thisOrderTotal}).`, status: 402 }
  }

  // Create the order via startCheckoutSession in hosted mode (gets us a
  // Session with line_items already computed server-side), then immediately
  // charge off-session using the saved PaymentMethod.
  const { stripe } = await import('@/lib/stripe')

  const approxTotal = thisOrderTotal
  const result = await startCheckoutSession({
    items,
    shippingAddress,
    totalPrice: approxTotal,
    mode: 'hosted',
    agentKeyId: keyRow.id,
  })

  // Fetch the amount_total the session was created with (authoritative — this
  // is exactly what will be charged and stored as orders.total_price, and it
  // INCLUDES shipping, which the pre-session estimate above omits).
  const session = await stripe.checkout.sessions.retrieve(result.sessionId)
  const amountTotal = session.amount_total ?? approxTotal

  // Re-enforce the daily cap against the authoritative charge amount. The
  // earlier estimate excluded shipping/modifiers, so a borderline order could
  // slip past it. NOTE: this is still not atomic across concurrent requests —
  // true enforcement requires a DB transaction (see route gating comment).
  if (spentToday + amountTotal > (keyRow.daily_cap_jpy ?? 0)) {
    try { await supabase.from('orders').delete().eq('id', result.dbOrderId) } catch { /* best-effort cleanup */ }
    return {
      ok: false,
      error: `Daily spending cap exceeded (cap=¥${keyRow.daily_cap_jpy}, spent=¥${spentToday}, requested=¥${amountTotal}).`,
      status: 402,
    }
  }

  try {
    const pi = await stripe.paymentIntents.create({
      amount: amountTotal,
      currency: 'jpy',
      customer: keyRow.stripe_customer_id,
      payment_method: keyRow.stripe_default_pm_id,
      off_session: true,
      confirm: true,
      metadata: {
        orderId: result.orderId,
        dbOrderId: result.dbOrderId,
        agentKeyId: keyRow.id,
        origin: 'agent_api_off_session',
      },
    })

    // Link PI back to the order so the webhook (checkout.session.completed)
    // finalizes the same row.
    await supabase
      .from('orders')
      .update({ payment_intent_id: pi.id, status: 'paid' })
      .eq('id', result.dbOrderId)

    const BASE = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://fast-oem.soara-mu.jp').replace(/\/$/, '')
    // Pull the generated access_token so we can hand the customer a status link.
    const { data: finalOrder } = await supabase
      .from('orders')
      .select('access_token')
      .eq('id', result.dbOrderId)
      .maybeSingle()

    const statusUrl = finalOrder?.access_token
      ? `${BASE}/orders/${result.dbOrderId}/status?token=${finalOrder.access_token}`
      : `${BASE}/orders/${result.dbOrderId}/status`

    return {
      ok: true,
      payload: {
        schema: 'fast-oem.order.v1',
        mode: 'paid_off_session',
        orderId: result.orderId,
        dbOrderId: result.dbOrderId,
        paymentIntentId: pi.id,
        paymentStatus: pi.status,
        totalPrice: amountTotal,
        statusUrl,
      },
    }
  } catch (stripeErr: unknown) {
    const msg = stripeErr instanceof Error ? stripeErr.message : 'Stripe charge failed'
    // Reset the order back to pending so the customer can still retry.
    try {
      await supabase.from('orders').delete().eq('id', result.dbOrderId)
    } catch { /* best-effort cleanup */ }
    return { ok: false, error: `Off-session charge failed: ${msg}`, status: 402 }
  }
}
