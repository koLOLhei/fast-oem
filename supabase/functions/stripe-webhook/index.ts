import Stripe from 'stripe'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { processImage } from './process-image.ts'
import { sendEmails, sendCancellationNotification, sendAdminAlert } from './send-email.ts'
import { sendSlackMessage } from './slack.ts'

// ── Inline types for Supabase JSONB fields (Edge Functions can't import @/lib) ──
interface CustomerInfo {
  name?: string
  email?: string
  lastName?: string
  firstName?: string
  receiptAddressee?: string
}

interface ShippingAddress {
  lastName?: string
  firstName?: string
  postalCode?: string
  prefecture?: string
  city?: string
  address1?: string
  address2?: string
  phone?: string
  email?: string
  companyName?: string
  department?: string
  poNumber?: string
  receiptAddressee?: string
}

interface OrderItem {
  id: string
  order_id: string
  product_id: string
  product_name: string
  quantity: number
  unit_price: number
  total_price: number | null
  options: unknown[]
  status: string
  factory_id: string | null
  design_url: string | null
  converted_design_url: string | null
  delivery_pdf_url: string | null
  design_file_name: string | null
  back_design_url: string | null
  back_converted_design_url: string | null
  back_delivery_pdf_url: string | null
  mold_fee: number | null
  mold_order_id: string | null
  express_delivery: boolean | null
  express_delivery_fee: number | null
  tracking_number: string | null
}

// Deno Edge Runtime global (conditionally available)
declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void } | undefined

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') as string, {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
})

const cryptoProvider = Stripe.createSubtleCryptoProvider()

// ── PII redaction for Slack/logs ────────────────────────────────────────────
// Customer email/name were being posted raw to Slack. Redact by default; set
// SLACK_REDACT_PII=false in the Edge Function secrets to disable for debug.
const SLACK_REDACT_PII = (Deno.env.get('SLACK_REDACT_PII') ?? 'true') !== 'false'

function redactEmail(email: string | null | undefined): string {
  if (!email) return '—'
  if (!SLACK_REDACT_PII) return email
  const [local, domain] = email.split('@')
  if (!domain) return '***'
  const domParts = domain.split('.')
  const maskedLocal = local ? (local[0] ?? '') + '***' : '***'
  const maskedDom = (domParts[0]?.[0] ?? '') + '***' + (domParts.length > 1 ? '.' + domParts.slice(1).join('.') : '')
  return `${maskedLocal}@${maskedDom}`
}

function redactName(name: string | null | undefined): string {
  if (!name) return '—'
  if (!SLACK_REDACT_PII) return name
  const trimmed = name.trim()
  if (!trimmed) return '—'
  return trimmed[0] + '**'
}

// ── Event idempotency: record processed Stripe event IDs ────────────────────
// Uses the webhook_events table (added in 20260417000001). If the INSERT fails
// with a uniqueness violation (code 23505), the event has already been handled
// and we skip downstream side effects.
async function markEventProcessed(
  supa: ReturnType<typeof createClient>,
  event: Stripe.Event,
): Promise<{ alreadyProcessed: boolean }> {
  const { error } = await supa
    .from('webhook_events')
    .insert({ event_id: event.id, event_type: event.type })
  if (!error) return { alreadyProcessed: false }
  // Postgres unique_violation === duplicate
  // supabase-js returns { code: '23505' } on PostgREST error wrapping it.
  const code = (error as { code?: string }).code ?? ''
  if (code === '23505' || error.message?.includes('duplicate')) {
    return { alreadyProcessed: true }
  }
  // Unknown DB error — fail open (process the event) but log
  console.warn('[markEventProcessed] unexpected insert error, processing anyway:', error.message)
  return { alreadyProcessed: false }
}

serve(async (req: Request) => {
  const signature = req.headers.get('Stripe-Signature')
  if (!signature) {
    return new Response('Stripe signature missing', { status: 400 })
  }

  try {
    const body = await req.text()

    let event
    try {
      event = await stripe.webhooks.signature.verifyAsync(
        body,
        signature,
        Deno.env.get('STRIPE_WEBHOOK_SECRET') as string,
        cryptoProvider
      )
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err)
      console.error(`Webhook signature verification failed: ${errMsg}`)
      // Rate-limit Slack alerts for signature failures to 1 per 5 minutes.
      // Without this, a DDoS/spam attack would flood the Slack channel.
      try {
        const rateLimitClient = createClient(
          Deno.env.get('SUPABASE_URL') as string,
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string,
        )
        const windowStart = new Date(Date.now() - 5 * 60 * 1000).toISOString()
        const { count } = await rateLimitClient
          .from('admin_alerts')
          .select('*', { count: 'exact', head: true })
          .eq('source', 'webhook_sig_fail')
          .gte('created_at', windowStart)
        if ((count ?? 0) === 0) {
          await sendSlackMessage(`🔐 *Webhook署名検証失敗*\nエラー: ${errMsg}\n※不正なリクエストの可能性があります（5分間に1回のみ通知）`)
          await rateLimitClient.from('admin_alerts').insert({
            subject: 'Webhook署名検証失敗',
            body: errMsg,
            source: 'webhook_sig_fail',
          })
        }
      } catch (_) { /* rate limit check must never block the 400 response */ }
      return new Response('Invalid signature', { status: 400 })
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session

      const { orderId } = (session.metadata ?? {}) as Record<string, string>
      if (!orderId) throw new Error('No orderId in session metadata')

      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') as string,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string
      )

      // Update pending order → paid. Also store payment_intent_id for refund webhook lookups.
      // Primary lookup: by stripe_session_id (normal case)
      // Fallback: by DB UUID from metadata.dbOrderId (handles the rare case where
      // Step 5 of startCheckoutSession failed to update stripe_session_id before
      // the webhook fired, or where the row has the tmp_ placeholder)
      const paymentIntent = typeof session.payment_intent === 'string' ? session.payment_intent : null
      let { data: order, error: orderError } = await supabase
        .from('orders')
        .update({ status: 'paid', payment_intent_id: paymentIntent })
        .eq('stripe_session_id', session.id)
        .eq('status', 'pending')
        .select()
        .single()

      if ((!order || orderError?.code === 'PGRST116') && session.metadata?.dbOrderId) {
        // Primary lookup failed — try fallback via DB UUID and also fix the session ID
        const fallback = await supabase
          .from('orders')
          .update({ status: 'paid', stripe_session_id: session.id, payment_intent_id: paymentIntent })
          .eq('id', session.metadata.dbOrderId)
          .eq('status', 'pending')
          .select()
          .single()
        order = fallback.data
        orderError = fallback.error?.code === 'PGRST116' ? null : fallback.error ?? null
        if (order) {
          console.log(`[${orderId}] Used dbOrderId fallback to match order`)
        }
      }

      if (!order || orderError?.code === 'PGRST116') {
        // No pending row found → already paid (Stripe re-delivery) → skip
        console.log(`Order ${orderId} already paid or not found — skipping`)
        return new Response(JSON.stringify({ received: true }), {
          headers: { 'Content-Type': 'application/json' },
        })
      }
      if (orderError) throw orderError

      // Fetch order items saved at session creation
      const { data: orderItems, error: itemsError } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', order.id)

      if (itemsError) throw itemsError

      // Fetch per-product notification emails
      const productIds = [...new Set((orderItems ?? []).map((i: OrderItem) => i.product_id).filter(Boolean))]
      const { data: productRows } = productIds.length > 0
        ? await supabase.from('products').select('id, notification_email').in('id', productIds)
        : { data: [] }
      const productEmailMap: Record<string, string> = {}
      for (const p of productRows ?? []) {
        if (p.notification_email) productEmailMap[p.id] = p.notification_email
      }

      const customerInfo = order.customer_info as CustomerInfo

      // Notify admin on Slack immediately (before heavy background work)
      const adminUrl = `${Deno.env.get('NEXT_PUBLIC_SITE_URL') ?? 'https://fast-oem.soara-mu.jp'}/admin/orders/${order.id}`
      const itemSummary = (orderItems ?? []).map((i: OrderItem) => `• ${i.product_name} ×${i.quantity}`).join('\n')
      // Redact PII by default — admin can uncheck via SLACK_REDACT_PII=false
      const customerDisplay = customerInfo?.name
        ? redactName(customerInfo.name)
        : redactEmail(customerInfo?.email)
      await sendSlackMessage(
        `🎉 *新規注文* 注文番号: ${orderId}\n` +
        `顧客: ${customerDisplay}\n` +
        `合計: ¥${(order.total_price ?? 0).toLocaleString('ja-JP')}\n` +
        `${itemSummary}\n` +
        `<${adminUrl}|管理画面で確認する>`
      )

      // Heavy work (image processing + email) runs in background AFTER 200 response.
      // This prevents Stripe from timing out (30s limit) while Sharp converts images.
      const backgroundWork = (async () => {
        try {
          // Process design images SEQUENTIALLY to avoid memory exhaustion.
          // Running Sharp in parallel on many large images can exceed the Edge
          // Function memory limit (256 MB).  Sequential processing keeps peak
          // usage to a single image at a time at the cost of wall-clock time —
          // acceptable here because this runs in the background after the 200
          // response has already been sent to Stripe.
          const imageItems = (orderItems ?? []).filter((item: OrderItem) => !!item.design_url)
          for (const item of imageItems) {
            // ── Front design ──
            try {
              const convertedUrl = await processImage(supabase, item.design_url!, orderId, item.product_id)
              if (convertedUrl) {
                await supabase
                  .from('order_items')
                  .update({ converted_design_url: convertedUrl })
                  .eq('id', item.id)
              }
            } catch (imgErr: unknown) {
              console.error(`[${orderId}] Image processing failed for item ${item.id} (front): ${imgErr instanceof Error ? imgErr.message : String(imgErr)}`)
              // Continue with remaining items — one bad image must not block others
            }

            // ── Back design (double-sided products) ──
            if (item.back_design_url) {
              try {
                const backConvertedUrl = await processImage(supabase, item.back_design_url, orderId, item.product_id)
                if (backConvertedUrl) {
                  await supabase
                    .from('order_items')
                    .update({ back_converted_design_url: backConvertedUrl })
                    .eq('id', item.id)
                }
              } catch (imgErr: unknown) {
                console.error(`[${orderId}] Image processing failed for item ${item.id} (back): ${imgErr instanceof Error ? imgErr.message : String(imgErr)}`)
              }
            }
          }

          // Re-fetch items so the email has the updated converted_design_url.
          // Also resolve delivery_pdf_url storage paths → signed URLs so that
          // fetchPdfAsBase64 (called inside sendEmails) can actually fetch the file.
          const { data: freshItems } = await supabase
            .from('order_items')
            .select('*')
            .eq('order_id', order.id)

          // Helper: extract storage path from either a raw path or a legacy public URL.
          // Returns null for data: URIs or signed URLs (which we can't re-sign).
          const extractStoragePath = (raw: string | null | undefined): string | null => {
            if (!raw) return null
            if (raw.startsWith('data:')) return null
            // Legacy public URLs from when bucket was public
            const PUBLIC_PREFIX = '/storage/v1/object/public/designs/'
            if (raw.includes(PUBLIC_PREFIX)) {
              return raw.split(PUBLIC_PREFIX)[1] ?? null
            }
            // Already-signed URLs (have ?token=...) — pass through, don't re-sign
            if (raw.startsWith('http') && raw.includes('?token=')) return null
            // If still http without our public prefix, can't extract reliably
            if (raw.startsWith('http')) return null
            // Plain path
            return raw
          }

          const signIfPath = async (raw: string | null | undefined): Promise<string | null> => {
            const path = extractStoragePath(raw)
            if (!path) return raw ?? null
            const { data: signed } = await supabase.storage
              .from('designs')
              .createSignedUrl(path, 259200) // 72 hours
            return signed?.signedUrl ?? raw ?? null
          }

          const itemsForEmail = await Promise.all(
            (freshItems ?? orderItems ?? []).map(async (item: OrderItem) => {
              const updates: Partial<OrderItem> = {}

              // Resolve front delivery PDF
              const newPdfUrl = await signIfPath(item.delivery_pdf_url)
              if (newPdfUrl !== item.delivery_pdf_url) updates.delivery_pdf_url = newPdfUrl

              // Resolve back delivery PDF
              const newBackPdfUrl = await signIfPath(item.back_delivery_pdf_url)
              if (newBackPdfUrl !== item.back_delivery_pdf_url) updates.back_delivery_pdf_url = newBackPdfUrl

              // Resolve front design image (prefer converted, fallback to original)
              if (item.converted_design_url) {
                const newConverted = await signIfPath(item.converted_design_url)
                if (newConverted !== item.converted_design_url) updates.converted_design_url = newConverted
              } else if (item.design_url) {
                const newDesign = await signIfPath(item.design_url)
                if (newDesign !== item.design_url) updates.design_url = newDesign
              }

              // Resolve back design image (3D products)
              if (item.back_converted_design_url) {
                const newBackConverted = await signIfPath(item.back_converted_design_url)
                if (newBackConverted !== item.back_converted_design_url) updates.back_converted_design_url = newBackConverted
              } else if (item.back_design_url) {
                const newBackDesign = await signIfPath(item.back_design_url)
                if (newBackDesign !== item.back_design_url) updates.back_design_url = newBackDesign
              }

              return Object.keys(updates).length > 0 ? { ...item, ...updates } : item
            })
          )

          // ── Exactly-once email guard ──────────────────────────────────────
          // Atomically claim the "send confirmation email" slot.
          // If another invocation (Stripe webhook re-delivery, concurrent race)
          // already set confirmation_email_sent_at, this UPDATE returns 0 rows
          // and we skip sending — guaranteeing exactly-one delivery.
          const { data: claimed } = await supabase
            .from('orders')
            .update({ confirmation_email_sent_at: new Date().toISOString() })
            .eq('id', order.id)
            .is('confirmation_email_sent_at', null)
            .select('id')

          if (!claimed || claimed.length === 0) {
            console.log(`[${orderId}] Confirmation email already sent by another invocation — skipping`)
          } else {
            try {
              await sendEmails({
                orderId: order.id,
                orderNumber: orderId,
                accessToken: order.access_token,
                customerName: customerInfo?.name ?? '',
                customerEmail: customerInfo?.email ?? '',
                orderItems: itemsForEmail,
                totalPrice: order.total_price,
                shippingFee: order.shipping_fee ?? 0,
                shippingAddress: order.shipping_address as ShippingAddress,
                receiptAddressee: (order.shipping_address as ShippingAddress)?.receiptAddressee ?? customerInfo?.receiptAddressee,
                productEmailMap,
              })
              // Clear any prior email error on successful send
              await supabase
                .from('orders')
                .update({ email_send_error: null })
                .eq('id', order.id)
                .neq('email_send_error', null)
                .then(() => {})
            } catch (emailErr: unknown) {
              // Risk #3: record failure in DB so admin can see it and manually follow up
              const emailErrMsg = emailErr instanceof Error ? emailErr.message : String(emailErr)
              console.error(`[${orderId}] Confirmation email failed: ${emailErrMsg}`)
              // Reset the claim so the next Stripe webhook re-delivery can retry the send.
              // Without this reset the timestamp stays set and no retry ever fires.
              await supabase
                .from('orders')
                .update({ confirmation_email_sent_at: null, email_send_error: emailErrMsg || '不明なエラー' })
                .eq('id', order.id)
                .then(() => {})
              // Re-throw so the outer catch block sends a Slack alert
              throw emailErr
            }
          }

          // ── #4 Mold fee auto-detect: alert if customer may have had an existing mold ──
          // Items with mold_fee > 0 AND mold_order_id IS NULL paid for a new mold.
          // Check if the same email placed a previous paid order for the same product —
          // if so, admin should investigate whether a mold reuse discount should have applied.
          const newMoldItems = (freshItems ?? []).filter(
            (i: OrderItem) => (i.mold_fee ?? 0) > 0 && !i.mold_order_id
          )
          if (newMoldItems.length > 0 && customerInfo?.email) {
            try {
              for (const moldItem of newMoldItems) {
                const { data: prevOrders } = await supabase
                  .from('orders')
                  .select('id, order_number, order_items!inner(product_id)')
                  .in('status', ['paid', 'processing', 'partially_shipped', 'shipped', 'completed'])
                  .neq('id', order.id)
                  .filter('customer_info->>email', 'eq', customerInfo.email)
                  .filter('order_items.product_id', 'eq', moldItem.product_id)
                  .limit(1)

                if (prevOrders && prevOrders.length > 0) {
                  const prev = prevOrders[0].order_number ?? prevOrders[0].id
                  const adminUrl = `${Deno.env.get('NEXT_PUBLIC_SITE_URL') ?? 'https://fast-oem.soara-mu.jp'}/admin/orders/${order.id}`
                  await sendSlackMessage(
                    `🔔 *型代免除の可能性あり*\n` +
                    `注文番号: ${orderId}\n` +
                    `顧客: ${redactEmail(customerInfo.email)}\n` +
                    `商品: ${moldItem.product_name}\n` +
                    `型代: ¥${(moldItem.mold_fee ?? 0).toLocaleString('ja-JP')}\n` +
                    `過去注文: ${prev}\n\n` +
                    `同じ商品の過去注文があります。型の再利用免除が適用できる可能性があります。\n` +
                    `<${adminUrl}|管理画面で確認する>`
                  )
                }
              }
            } catch (moldCheckErr: unknown) {
              console.error(`[${orderId}] Mold check error: ${moldCheckErr instanceof Error ? moldCheckErr.message : String(moldCheckErr)}`)
            }
          }
        } catch (bgErr: unknown) {
          const bgErrObj = bgErr instanceof Error ? bgErr : new Error(String(bgErr))
          console.error(`[${orderId}] Background processing error: ${bgErrObj.message}`)
          const alertSubject = `バックグラウンド処理エラー: ${orderId}`
          const alertBody = `注文ID: ${order.id}\n注文番号: ${orderId}\nエラー: ${bgErrObj.message}\n\nStack:\n${bgErrObj.stack ?? '—'}`
          // sendAdminAlert never throws — both Slack and email are best-effort
          await sendAdminAlert(alertSubject, alertBody)
          // Always write to DB as a tertiary audit trail (independent of Slack/email success)
          await supabase.from('admin_alerts').insert({
            subject: alertSubject,
            body: alertBody,
            source: 'background_error',
            order_id: order.id,
          }).then(
            () => {},
            (dbErr: unknown) => console.error(`[${orderId}] admin_alerts DB write failed: ${dbErr instanceof Error ? dbErr.message : String(dbErr)}`),
          )
        }
      })()

      // Keep the Edge Function alive until background work completes.
      // If EdgeRuntime.waitUntil is unavailable (non-Deno env / unit tests),
      // fall back to awaiting inline so the work still runs.
      if (typeof EdgeRuntime !== 'undefined') {
        EdgeRuntime.waitUntil(backgroundWork)
      } else {
        await backgroundWork
      }
    }

    // ── Checkout session expired (customer abandoned without paying) ──────
    if (event.type === 'checkout.session.expired') {
      const session = event.data.object as Stripe.Checkout.Session
      const { orderId } = (session.metadata ?? {}) as Record<string, string>

      if (orderId) {
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL') as string,
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string
        )

        // Mark order as cancelled.
        // Primary lookup: by stripe_session_id (normal case).
        // Fallback: by DB UUID from metadata.dbOrderId — mirrors the completed handler,
        // handles the rare case where Step 6 of startCheckoutSession failed to persist
        // the real session ID before the expiry event fired.
        let { data: order } = await supabase
          .from('orders')
          .update({ status: 'cancelled' })
          .eq('stripe_session_id', session.id)
          .eq('status', 'pending')
          .select()
          .single()

        if (!order && session.metadata?.dbOrderId) {
          const fallback = await supabase
            .from('orders')
            .update({ status: 'cancelled', stripe_session_id: session.id })
            .eq('id', session.metadata.dbOrderId)
            .eq('status', 'pending')
            .select()
            .single()
          if (fallback.data) {
            order = fallback.data
            console.log(`[${orderId}] session.expired: used dbOrderId fallback to cancel order`)
          }
        }

        if (order) {
          // Fetch items BEFORE marking cancelled so we can read their storage paths
          const { data: orderItems } = await supabase
            .from('order_items')
            .select('*')
            .eq('order_id', order.id)

          // Mark all items as cancelled
          await supabase
            .from('order_items')
            .update({ status: 'cancelled' })
            .eq('order_id', order.id)

          // ── #3 Storage cleanup: delete orphaned design/PDF files ──────────
          // Only delete storage paths (not base64 data: URLs or http signed URLs
          // that have already been resolved, and not nulls).
          const storagePaths: string[] = []
          for (const item of orderItems ?? []) {
            // design_url: base64 data URLs start with "data:" — skip those
            if (item.design_url && !item.design_url.startsWith('data:') && !item.design_url.startsWith('http')) {
              storagePaths.push(item.design_url)
            }
            // converted_design_url: usually a full URL for paid orders, but
            // for expired sessions it would be a path if somehow set
            if (item.converted_design_url && !item.converted_design_url.startsWith('http')) {
              storagePaths.push(item.converted_design_url)
            }
            // delivery_pdf_url: stored as a path like "delivery/orderId/product.pdf"
            if (item.delivery_pdf_url && !item.delivery_pdf_url.startsWith('http')) {
              storagePaths.push(item.delivery_pdf_url)
            }
            // back design files (double-sided products)
            if (item.back_design_url && !item.back_design_url.startsWith('data:') && !item.back_design_url.startsWith('http')) {
              storagePaths.push(item.back_design_url)
            }
            if (item.back_converted_design_url && !item.back_converted_design_url.startsWith('http')) {
              storagePaths.push(item.back_converted_design_url)
            }
            if (item.back_delivery_pdf_url && !item.back_delivery_pdf_url.startsWith('http')) {
              storagePaths.push(item.back_delivery_pdf_url)
            }
          }
          if (storagePaths.length > 0) {
            const { error: storageErr } = await supabase.storage
              .from('designs')
              .remove(storagePaths)
            if (storageErr) {
              console.error(`[${orderId}] Storage cleanup failed: ${storageErr.message}`)
            } else {
              console.log(`[${orderId}] Deleted ${storagePaths.length} storage file(s) for cancelled order`)
            }
          }

          const assignedItems = (orderItems ?? []).filter((i: OrderItem) => i.factory_id)
          const customerInfo = order.customer_info as CustomerInfo

          // Fetch per-product notification emails for cancellation
          const cancelProductIds = [...new Set((orderItems ?? []).map((i: OrderItem) => i.product_id).filter(Boolean))]
          const { data: cancelProductRows } = cancelProductIds.length > 0
            ? await supabase.from('products').select('id, notification_email').in('id', cancelProductIds)
            : { data: [] }
          const cancelEmailMap: Record<string, string> = {}
          for (const p of cancelProductRows ?? []) {
            if (p.notification_email) cancelEmailMap[p.id] = p.notification_email
          }

          // Slack cancellation alert
          const cancelCustomer = customerInfo?.name
            ? redactName(customerInfo.name)
            : redactEmail(customerInfo?.email)
          await sendSlackMessage(
            `⚠️ *注文キャンセル* 注文番号: ${orderId}\n` +
            `顧客: ${cancelCustomer}\n` +
            `合計: ¥${(order.total_price ?? 0).toLocaleString('ja-JP')}\n` +
            `理由: Stripe Checkoutセッション期限切れ（未決済）`
          )

          // Notify factory only if items were already assigned
          if (assignedItems.length > 0) {
            const bgTask = sendCancellationNotification({
              orderNumber: orderId,
              customerName: customerInfo?.name ?? '',
              customerEmail: customerInfo?.email ?? '',
              orderItems: orderItems ?? [],
              totalPrice: order.total_price,
              cancelledAt: new Date().toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }) + ' (JST)',
              productEmailMap: cancelEmailMap,
            }).catch((e: unknown) => console.error(`[${orderId}] Cancellation email failed: ${e instanceof Error ? e.message : String(e)}`))

            if (typeof EdgeRuntime !== 'undefined') {
              EdgeRuntime.waitUntil(bgTask)
            } else {
              await bgTask
            }
          }

          console.log(`[${orderId}] Order cancelled (session expired)`)
        }
      }
    }

    // ── Risk #2: charge.refunded — record refund in DB ───────────────────────
    // Fires when a refund is created in Stripe (admin-initiated or chargeback).
    // Lookup: payment_intent_id stored when the order was paid.
    if (event.type === 'charge.refunded') {
      const charge = event.data.object as Stripe.Charge
      const paymentIntentId: string | null = typeof charge.payment_intent === 'string' ? charge.payment_intent : null
      const refundedAmount: number = charge.amount_refunded ?? 0
      const isFullRefund: boolean = charge.refunded === true

      if (paymentIntentId) {
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL') as string,
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string,
        )

        // Idempotency via event.id — but we intentionally do NOT *claim* the
        // event until the DB write succeeds. Claiming first (the old behaviour)
        // permanently swallowed the refund whenever the order row wasn't
        // updatable yet — e.g. a refund delivered before checkout.session.completed
        // set orders.payment_intent_id — because every Stripe re-delivery would
        // then short-circuit on the already-recorded event id. Here we only READ
        // first, and mark processed after a confirmed update.
        const { data: priorEvent } = await supabase
          .from('webhook_events')
          .select('event_id')
          .eq('event_id', event.id)
          .maybeSingle()
        if (priorEvent) {
          console.log(`[charge.refunded] ${event.id} already processed — skipping`)
        } else {
        // First fetch the current order status to avoid regressing shipped/completed orders
        const { data: currentOrder } = await supabase
          .from('orders')
          .select('id, order_number, total_price, status, refunded_amount')
          .eq('payment_intent_id', paymentIntentId)
          .single()

        // Secondary guard: if the same cumulative amount is already recorded,
        // this is the expected steady state after a previous partial event.
        const alreadyRecorded = currentOrder?.refunded_amount === refundedAmount
        if (alreadyRecorded) {
          console.log(`[charge.refunded] Duplicate event for payment_intent ${paymentIntentId} — skipping (amount=${refundedAmount})`)
          // Claim it now so we stop reprocessing this steady-state event.
          await markEventProcessed(supabase, event)
        } else {
          // Determine the new status: full refund → 'refunded', partial refund → keep current status
          // Never regress from processing/shipped/completed back to 'paid'
          const newStatus = isFullRefund
            ? 'refunded'
            : (currentOrder?.status ?? 'paid') // partial refund preserves current status

          const { data: refundedOrder, error: refundErr } = await supabase
            .from('orders')
            .update({
              status: newStatus,
              refunded_amount: refundedAmount,
              refunded_at: new Date().toISOString(),
            })
            .eq('payment_intent_id', paymentIntentId)
            .select('id, order_number, total_price')
            .single()

          if (refundErr || !refundedOrder) {
            console.error(`[charge.refunded] Failed to update order for payment_intent ${paymentIntentId}:`, refundErr)
            await sendAdminAlert(
              '返金記録失敗（再試行されます）',
              `payment_intent_id: ${paymentIntentId}\n返金額: ¥${refundedAmount.toLocaleString('en')}\n注文がまだ見つからないため記録できませんでした。Stripeが自動的に再送します。`,
            )
            // Do NOT mark processed. Return 5xx so Stripe retries with backoff —
            // by the next delivery the order's payment_intent_id should exist.
            return new Response('Refund not yet applicable — will retry', { status: 503 })
          } else {
            // Success — claim the event id so re-deliveries are idempotent, and
            // only notify if THIS delivery won the claim. Concurrent duplicate
            // deliveries both apply the (idempotent, absolute) update, so the
            // claim is the single arbiter that prevents a double Slack alert.
            const { alreadyProcessed } = await markEventProcessed(supabase, event)
            if (!alreadyProcessed) {
              const orderNumber = refundedOrder.order_number ?? refundedOrder.id
              const label = isFullRefund ? '全額返金' : '一部返金'
              console.log(`[${orderNumber}] ${label} 記録: ¥${refundedAmount}`)
              await sendSlackMessage(
                `💸 *${label}* 注文番号: ${orderNumber}\n` +
                `返金額: ¥${refundedAmount.toLocaleString('en-US')}\n` +
                `合計: ¥${(refundedOrder.total_price ?? 0).toLocaleString('en-US')}\n` +
                `Stripe charge ID: ${charge.id}`,
              )
            }
          }
        }
        } // end event.id idempotency else-branch
      } else {
        console.warn(`[charge.refunded] No payment_intent on charge ${charge.id} — skipped`)
      }
    }

    // ── charge.failed — alert only, do NOT cancel the order ──────────────────
    // For Stripe Embedded Checkout the customer can retry payment within the
    // same session, so cancelling on charge.failed would wrongly block retries.
    // We only alert admins; if the session later expires without payment,
    // checkout.session.expired handles the cancellation.
    if (event.type === 'charge.failed') {
      const charge = event.data.object as Stripe.Charge
      const paymentIntentId: string | null = typeof charge.payment_intent === 'string' ? charge.payment_intent : null
      const failureCode: string = charge.failure_code ?? 'unknown'
      const failureMsg: string = charge.failure_message ?? ''

      if (paymentIntentId) {
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL') as string,
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string,
        )

        // Look up the order for context — but do NOT update its status.
        const { data: order } = await supabase
          .from('orders')
          .select('id, order_number, status')
          .eq('payment_intent_id', paymentIntentId)
          .maybeSingle()

        const orderLabel = order?.order_number ?? paymentIntentId
        console.log(`[${orderLabel}] 決済失敗 (alert only, order NOT cancelled): ${failureCode}`)
        await sendSlackMessage(
          `⚠️ *決済失敗（再試行可能）* 注文番号: ${orderLabel}\n` +
          `理由: ${failureCode} — ${failureMsg}\n` +
          `現在のステータス: ${order?.status ?? '不明'}\n` +
          `顧客が別のカードで再試行できます。セッション期限切れ時にキャンセルされます。`,
        )
      }
    }

    // ── charge.dispute.created — log dispute to admin_alerts + Slack ────────
    // Disputes require manual resolution in the Stripe dashboard.
    // We record the dispute in admin_alerts so admins are aware immediately.
    if (event.type === 'charge.dispute.created') {
      const dispute = event.data.object as Stripe.Dispute
      const chargeId: string = typeof dispute.charge === 'string' ? dispute.charge : (dispute.charge as Stripe.Charge)?.id ?? '—'
      const paymentIntentId: string | null = typeof dispute.payment_intent === 'string' ? dispute.payment_intent : null
      const amount: number = dispute.amount ?? 0
      const reason: string = dispute.reason ?? 'unknown'
      const currency: string = dispute.currency ?? 'jpy'

      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') as string,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string,
      )

      // Idempotency: skip if Stripe re-delivers the same dispute event
      const { alreadyProcessed } = await markEventProcessed(supabase, event)
      if (alreadyProcessed) {
        console.log(`[charge.dispute.created] ${event.id} already processed — skipping`)
        return new Response(JSON.stringify({ received: true }), {
          headers: { 'Content-Type': 'application/json' },
        })
      }

      // Try to find the associated order for context
      let orderLabel = chargeId
      let orderId: string | null = null
      if (paymentIntentId) {
        const { data: order } = await supabase
          .from('orders')
          .select('id, order_number')
          .eq('payment_intent_id', paymentIntentId)
          .maybeSingle()
        if (order) {
          orderLabel = order.order_number ?? order.id
          orderId = order.id
        }
      }

      // Always insert an alert — with or without order match
      await supabase.from('admin_alerts').insert({
        subject: `チャージバック発生: ${orderLabel}`,
        body: [
          orderId ? `注文: ${orderLabel}` : `注文との紐付けができませんでした`,
          `Charge: ${chargeId}`,
          `金額: ${currency.toUpperCase()} ${amount}`,
          `理由: ${reason}`,
          '',
          'Stripe Dashboardで対応が必要です。',
        ].join('\n'),
        source: 'dispute_created',
        ...(orderId ? { order_id: orderId } : {}),
      })

      await sendSlackMessage(
        `🚨 *チャージバック発生*\n` +
        `注文: ${orderLabel}\n` +
        `金額: ${currency.toUpperCase()} ${amount.toLocaleString('en')}\n` +
        `理由: ${reason}\n` +
        `Charge ID: ${chargeId}\n\n` +
        `Stripe Dashboardで対応が必要です。`
      )
    }

    // Return 200 immediately — Stripe doesn't need to wait for images/emails
    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err: unknown) {
    const fatalErr = err instanceof Error ? err : new Error(String(err))
    console.error(`Edge Function Error: ${fatalErr.message}`)
    await sendSlackMessage(
      `🔴 *Edge Function 致命的エラー*\nエラー: ${fatalErr.message}\n\nStack:\n${(fatalErr.stack ?? '—').slice(0, 500)}`
    )
    return new Response('Internal server error', { status: 500 })
  }
})
