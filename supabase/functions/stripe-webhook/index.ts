import Stripe from 'stripe'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { processImage } from './process-image.ts'
import { sendEmails, sendCancellationNotification, sendAdminAlert } from './send-email.ts'
import { sendSlackMessage } from './slack.ts'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') as string, {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
})

const cryptoProvider = Stripe.createSubtleCryptoProvider()

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
    } catch (err: any) {
      console.error(`Webhook signature verification failed: ${err.message}`)
      await sendSlackMessage(`🔐 *Webhook署名検証失敗*\nエラー: ${err.message}\n※不正なリクエストの可能性があります`)
      return new Response(`Webhook Error: ${err.message}`, { status: 400 })
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as any

      const { orderId } = session.metadata ?? {}
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
      let { data: order, error: orderError } = await supabase
        .from('orders')
        .update({ status: 'paid', payment_intent_id: session.payment_intent ?? null })
        .eq('stripe_session_id', session.id)
        .eq('status', 'pending')
        .select()
        .single()

      if ((!order || orderError?.code === 'PGRST116') && session.metadata?.dbOrderId) {
        // Primary lookup failed — try fallback via DB UUID and also fix the session ID
        const fallback = await supabase
          .from('orders')
          .update({ status: 'paid', stripe_session_id: session.id, payment_intent_id: session.payment_intent ?? null })
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
      const productIds = [...new Set((orderItems ?? []).map((i: any) => i.product_id).filter(Boolean))]
      const { data: productRows } = productIds.length > 0
        ? await supabase.from('products').select('id, notification_email').in('id', productIds)
        : { data: [] }
      const productEmailMap: Record<string, string> = {}
      for (const p of productRows ?? []) {
        if (p.notification_email) productEmailMap[p.id] = p.notification_email
      }

      const customerInfo = order.customer_info as any

      // Notify admin on Slack immediately (before heavy background work)
      const adminUrl = `${Deno.env.get('NEXT_PUBLIC_SITE_URL') ?? 'https://fast-oem.soara-mu.jp'}/admin/orders/${order.id}`
      const itemSummary = (orderItems ?? []).map((i: any) => `• ${i.product_name} ×${i.quantity}`).join('\n')
      await sendSlackMessage(
        `🎉 *新規注文* 注文番号: ${orderId}\n` +
        `顧客: ${customerInfo?.name ?? customerInfo?.email ?? '—'}\n` +
        `合計: ¥${(order.total_price ?? 0).toLocaleString('ja-JP')}\n` +
        `${itemSummary}\n` +
        `<${adminUrl}|管理画面で確認する>`
      )

      // Heavy work (image processing + email) runs in background AFTER 200 response.
      // This prevents Stripe from timing out (30s limit) while Sharp converts images.
      const backgroundWork = (async () => {
        try {
          // Process design images in parallel (base64 → Storage upload).
          // Promise.allSettled ensures one failing image doesn't block others.
          await Promise.allSettled(
            (orderItems ?? [])
              .filter((item: any) => item.design_url?.startsWith('data:'))
              .map(async (item: any) => {
                const convertedUrl = await processImage(supabase, item.design_url, orderId, item.product_id)
                if (convertedUrl) {
                  await supabase
                    .from('order_items')
                    .update({ converted_design_url: convertedUrl })
                    .eq('id', item.id)
                }
              })
          )

          // Re-fetch items so the email has the updated converted_design_url.
          // Also resolve delivery_pdf_url storage paths → signed URLs so that
          // fetchPdfAsBase64 (called inside sendEmails) can actually fetch the file.
          const { data: freshItems } = await supabase
            .from('order_items')
            .select('*')
            .eq('order_id', order.id)

          const itemsForEmail = await Promise.all(
            (freshItems ?? orderItems ?? []).map(async (item: any) => {
              const pdfPath: string | null = item.delivery_pdf_url ?? null
              if (!pdfPath || pdfPath.startsWith('http')) return item
              const { data: signed } = await supabase.storage
                .from('designs')
                .createSignedUrl(pdfPath, 86400) // 24 hours — email delivery may be delayed
              return { ...item, delivery_pdf_url: signed?.signedUrl ?? null }
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
                shippingFee: (order as any).shipping_fee ?? 0,
                shippingAddress: order.shipping_address as any,
                receiptAddressee: (order.shipping_address as any)?.receiptAddressee ?? customerInfo?.receiptAddressee,
                productEmailMap,
              })
              // Clear any prior email error on successful send
              await supabase
                .from('orders')
                .update({ email_send_error: null })
                .eq('id', order.id)
                .neq('email_send_error', null)
                .then(() => {})
            } catch (emailErr: any) {
              // Risk #3: record failure in DB so admin can see it and manually follow up
              console.error(`[${orderId}] Confirmation email failed: ${emailErr.message}`)
              await supabase
                .from('orders')
                .update({ email_send_error: emailErr.message ?? '不明なエラー' })
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
            (i: any) => (i.mold_fee ?? 0) > 0 && !i.mold_order_id
          )
          if (newMoldItems.length > 0 && customerInfo?.email) {
            try {
              for (const moldItem of newMoldItems) {
                const { data: prevOrders } = await supabase
                  .from('orders')
                  .select('id, order_number, order_items!inner(product_id)')
                  .eq('status', 'paid')
                  .neq('id', order.id)
                  .filter('customer_info->>email', 'eq', customerInfo.email)
                  .filter('order_items.product_id', 'eq', moldItem.product_id)
                  .limit(1)

                if (prevOrders && prevOrders.length > 0) {
                  const prev = (prevOrders[0] as any).order_number ?? prevOrders[0].id
                  const adminUrl = `${Deno.env.get('NEXT_PUBLIC_SITE_URL') ?? 'https://fast-oem.soara-mu.jp'}/admin/orders/${order.id}`
                  await sendSlackMessage(
                    `🔔 *型代免除の可能性あり*\n` +
                    `注文番号: ${orderId}\n` +
                    `顧客: ${customerInfo.email}\n` +
                    `商品: ${moldItem.product_name}\n` +
                    `型代: ¥${(moldItem.mold_fee ?? 0).toLocaleString('ja-JP')}\n` +
                    `過去注文: ${prev}\n\n` +
                    `同じ商品の過去注文があります。型の再利用免除が適用できる可能性があります。\n` +
                    `<${adminUrl}|管理画面で確認する>`
                  )
                }
              }
            } catch (moldCheckErr: any) {
              console.error(`[${orderId}] Mold check error: ${moldCheckErr.message}`)
            }
          }
        } catch (bgErr: any) {
          console.error(`[${orderId}] Background processing error: ${bgErr.message}`)
          const alertSubject = `バックグラウンド処理エラー: ${orderId}`
          const alertBody = `注文ID: ${order.id}\n注文番号: ${orderId}\nエラー: ${bgErr.message}\n\nStack:\n${bgErr.stack ?? '—'}`
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
            (dbErr: any) => console.error(`[${orderId}] admin_alerts DB write failed: ${dbErr.message}`),
          )
        }
      })()

      // Keep the Edge Function alive until background work completes.
      // If EdgeRuntime.waitUntil is unavailable (non-Deno env / unit tests),
      // fall back to awaiting inline so the work still runs.
      if (typeof (globalThis as any).EdgeRuntime !== 'undefined') {
        ;(globalThis as any).EdgeRuntime.waitUntil(backgroundWork)
      } else {
        await backgroundWork
      }
    }

    // ── Checkout session expired (customer abandoned without paying) ──────
    if (event.type === 'checkout.session.expired') {
      const session = event.data.object as any
      const { orderId } = session.metadata ?? {}

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

          const assignedItems = (orderItems ?? []).filter((i: any) => i.factory_id)
          const customerInfo = order.customer_info as any

          // Fetch per-product notification emails for cancellation
          const cancelProductIds = [...new Set((orderItems ?? []).map((i: any) => i.product_id).filter(Boolean))]
          const { data: cancelProductRows } = cancelProductIds.length > 0
            ? await supabase.from('products').select('id, notification_email').in('id', cancelProductIds)
            : { data: [] }
          const cancelEmailMap: Record<string, string> = {}
          for (const p of cancelProductRows ?? []) {
            if (p.notification_email) cancelEmailMap[p.id] = p.notification_email
          }

          // Slack cancellation alert
          await sendSlackMessage(
            `⚠️ *注文キャンセル* 注文番号: ${orderId}\n` +
            `顧客: ${customerInfo?.name ?? customerInfo?.email ?? '—'}\n` +
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
            }).catch((e: any) => console.error(`[${orderId}] Cancellation email failed: ${e.message}`))

            if (typeof (globalThis as any).EdgeRuntime !== 'undefined') {
              ;(globalThis as any).EdgeRuntime.waitUntil(bgTask)
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
      const charge = event.data.object as any
      const paymentIntentId: string | null = charge.payment_intent ?? null
      const refundedAmount: number = charge.amount_refunded ?? 0
      const isFullRefund: boolean = charge.refunded === true

      if (paymentIntentId) {
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL') as string,
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string,
        )

        const { data: refundedOrder, error: refundErr } = await supabase
          .from('orders')
          .update({
            status: isFullRefund ? 'refunded' : 'paid', // partial refund stays 'paid'
            refunded_amount: refundedAmount,
            refunded_at: new Date().toISOString(),
          })
          .eq('payment_intent_id', paymentIntentId)
          .select('id, order_number, total_price')
          .single()

        if (refundErr || !refundedOrder) {
          console.error(`[charge.refunded] Failed to update order for payment_intent ${paymentIntentId}:`, refundErr)
          await sendAdminAlert(
            '返金記録失敗',
            `payment_intent_id: ${paymentIntentId}\n返金額: ¥${refundedAmount.toLocaleString('en')}\n注文が見つからないか更新失敗。手動確認が必要です。`,
          )
        } else {
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
      } else {
        console.warn(`[charge.refunded] No payment_intent on charge ${charge.id} — skipped`)
      }
    }

    // ── Risk #2: charge.failed — record payment failure ───────────────────────
    // For Embedded Checkout, payment is confirmed before the order exists,
    // so this is uncommon but possible (e.g. ACH micro-deposit failure).
    if (event.type === 'charge.failed') {
      const charge = event.data.object as any
      const paymentIntentId: string | null = charge.payment_intent ?? null
      const failureCode: string = charge.failure_code ?? 'unknown'
      const failureMsg: string = charge.failure_message ?? ''

      if (paymentIntentId) {
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL') as string,
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string,
        )

        const { data: failedOrder } = await supabase
          .from('orders')
          .update({ status: 'cancelled' })
          .eq('payment_intent_id', paymentIntentId)
          .eq('status', 'pending')
          .select('id, order_number')
          .single()

        if (failedOrder) {
          const orderNumber = failedOrder.order_number ?? failedOrder.id
          console.log(`[${orderNumber}] 決済失敗: ${failureCode}`)
          await sendSlackMessage(
            `❌ *決済失敗* 注文番号: ${orderNumber}\n` +
            `理由: ${failureCode} — ${failureMsg}`,
          )
        }
      }
    }

    // Return 200 immediately — Stripe doesn't need to wait for images/emails
    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    console.error(`Edge Function Error: ${err.message}`)
    await sendSlackMessage(
      `🔴 *Edge Function 致命的エラー*\nエラー: ${err.message}\n\nStack:\n${(err.stack ?? '—').slice(0, 500)}`
    )
    return new Response(`Error: ${err.message}`, { status: 500 })
  }
})
