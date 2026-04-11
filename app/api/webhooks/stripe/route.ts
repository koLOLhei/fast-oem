/**
 * Next.js Stripe Webhook Handler
 *
 * Handles:
 *   - checkout.session.completed: pending → paid, sends confirmation emails
 *   - charge.refunded: records refund in DB
 *   - charge.dispute.created: logs dispute alert
 *
 * Email sending is idempotent — uses confirmation_email_sent_at to prevent duplicates.
 */

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { stripe } from '@/lib/stripe'
import { createServiceClient } from '@/lib/supabase/service'
import { sendSlackMessage } from '@/lib/slack'
import { sendCustomerConfirmation, sendFactoryNotification } from '@/app/actions/order'
import { revalidatePath } from 'next/cache'

export async function POST(req: Request) {
  const body = await req.text()
  const signature = (await headers()).get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 })
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error('[webhook] STRIPE_WEBHOOK_SECRET is not configured')
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    await sendSlackMessage(`🚨 *Stripe Webhook署名検証エラー*\n${(err as Error).message}\n\nWebhookシークレットの設定を確認してください。`).catch(() => {})
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = createServiceClient()

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session

    try {
      // Update pending → paid using stripe_session_id (set at order creation)
      // If already paid (Edge Function ran first), this matches 0 rows — harmless
      const paymentIntentId = typeof session.payment_intent === 'string'
        ? session.payment_intent
        : null
      const { error } = await supabase
        .from('orders')
        .update({
          status: 'paid',
          ...(paymentIntentId ? { payment_intent_id: paymentIntentId } : {}),
        })
        .eq('stripe_session_id', session.id)
        .eq('status', 'pending')

      if (error) {
        console.error('Webhook [checkout.session.completed] DB error:', error)
        await sendSlackMessage(
          `❌ *Webhookエラー: checkout.session.completed*\nセッションID: ${session.id}\nエラー: ${error.message}`
        ).catch(() => {})
        return NextResponse.json({ error: 'Failed to update order' }, { status: 500 })
      }

      // ── Send confirmation emails (best-effort, non-blocking) ──
      try {
        // Fetch full order with items for email
        const { data: order, error: orderFetchError } = await supabase
          .from('orders')
          .select('*, order_items(*)')
          .eq('stripe_session_id', session.id)
          .single()

        if (orderFetchError || !order) {
          console.error('[webhook] Failed to fetch order for email:', orderFetchError?.message ?? 'no rows')
        } else {
          // Atomically claim email-sending responsibility to prevent duplicate
          // emails when concurrent webhook deliveries race on the same order.
          const { data: claimed } = await supabase
            .from('orders')
            .update({ confirmation_email_sent_at: new Date().toISOString() })
            .eq('id', order.id)
            .is('confirmation_email_sent_at', null)
            .select('id')

          if (claimed && claimed.length > 0) {
          const customerInfo = order.customer_info as any
          const shippingAddr = order.shipping_address as any
          const customerName = customerInfo?.name
            || `${customerInfo?.lastName || ''} ${customerInfo?.firstName || ''}`.trim()
            || 'お客様'
          const customerEmail = customerInfo?.email || session.customer_email || ''

          // Resolve factory notification email:
          // 1. product.notification_email (per-product override)
          // 2. factory.contact_email (from product's default_factory_id or order_item's factory_id)
          // 3. FACTORY_DEFAULT_EMAIL env var
          const orderItems = (order.order_items as any[]) ?? []
          const productIds = [...new Set(orderItems.map((i: any) => i.product_id))]
          const factoryIds = [...new Set(orderItems.map((i: any) => i.factory_id).filter(Boolean))]
          let factoryEmail = ''

          // Try product.notification_email first
          if (productIds.length > 0) {
            const { data: products } = await supabase
              .from('products')
              .select('notification_email, default_factory_id')
              .in('id', productIds)
            const productWithEmail = products?.find((p: any) => p.notification_email)
            if (productWithEmail?.notification_email) {
              factoryEmail = productWithEmail.notification_email
            }
            // Collect default_factory_ids from products too
            products?.forEach((p: any) => {
              if (p.default_factory_id && !factoryIds.includes(p.default_factory_id)) {
                factoryIds.push(p.default_factory_id)
              }
            })
          }

          // If no product email, try factory.contact_email
          if (!factoryEmail && factoryIds.length > 0) {
            const { data: factories } = await supabase
              .from('factories')
              .select('contact_email')
              .in('id', factoryIds)
            factoryEmail = factories?.find((f: any) => f.contact_email)?.contact_email ?? ''
          }

          // Generate signed download URLs for design files (valid 7 days)
          const itemsWithUrls = await Promise.all(orderItems.map(async (item: any) => {
            let designDownloadUrl = ''
            let deliveryPdfDownloadUrl = ''
            if (item.design_url && !item.design_url.startsWith('data:')) {
              const path = item.design_url.replace(/.*\/storage\/v1\/object\/public\/designs\//, '')
              const { data } = await supabase.storage.from('designs').createSignedUrl(path, 604800)
              if (data?.signedUrl) designDownloadUrl = data.signedUrl
            }
            if (item.delivery_pdf_url) {
              const path = item.delivery_pdf_url.replace(/.*\/storage\/v1\/object\/public\/designs\//, '')
              const { data } = await supabase.storage.from('designs').createSignedUrl(path, 604800)
              if (data?.signedUrl) deliveryPdfDownloadUrl = data.signedUrl
            }
            return { ...item, designDownloadUrl, deliveryPdfDownloadUrl }
          }))

          const emailData = {
            orderId: order.id,
            orderNumber: order.order_number,
            orderDate: order.created_at,
            accessToken: order.access_token,
            customerEmail,
            customerName,
            notificationEmail: factoryEmail,
            items: itemsWithUrls.map((item: any) => ({
              productId: item.product_id,
              productName: item.product_name,
              quantity: item.quantity,
              unitPrice: item.unit_price,
              totalPrice: item.total_price,
              moldFee: item.mold_fee,
              moldOrderId: item.mold_order_id,
              options: item.options ?? [],
              designFileName: item.design_file_name,
              designDownloadUrl: item.designDownloadUrl,
              deliveryPdfDownloadUrl: item.deliveryPdfDownloadUrl,
            })),
            shippingAddress: {
              lastName: shippingAddr?.lastName ?? '',
              firstName: shippingAddr?.firstName ?? '',
              postalCode: shippingAddr?.postalCode ?? '',
              prefecture: shippingAddr?.prefecture ?? '',
              city: shippingAddr?.city ?? '',
              address1: shippingAddr?.address1 ?? '',
              address2: shippingAddr?.address2 ?? '',
              phone: shippingAddr?.phone ?? '',
              email: customerEmail,
            },
            totalPrice: order.total_price,
          }

          // Send both emails in parallel
          const [custResult, factResult] = await Promise.allSettled([
            sendCustomerConfirmation(emailData),
            sendFactoryNotification(emailData),
          ])

          const emailErrors: string[] = []
          if (custResult.status === 'rejected') {
            const msg = custResult.reason instanceof Error ? custResult.reason.message : String(custResult.reason)
            console.error('[webhook] Customer email failed:', msg)
            emailErrors.push(`顧客メール: ${msg}`)
          } else {
            const custVal = custResult.value as any
            console.log('[webhook] Customer email result:', order.order_number, custVal?.success ? 'SENT' : 'FAILED', custVal?.error || '')
            if (!custVal?.success) emailErrors.push(`顧客メール: ${custVal?.error ?? 'unknown'}`)
          }
          if (factResult.status === 'rejected') {
            const msg = factResult.reason instanceof Error ? factResult.reason.message : String(factResult.reason)
            console.error('[webhook] Factory email failed:', msg)
            emailErrors.push(`工場メール: ${msg}`)
          } else {
            const factVal = factResult.value as any
            console.log('[webhook] Factory email result:', order.order_number, 'to=' + factoryEmail, factVal?.success ? 'SENT' : 'FAILED', factVal?.error || '')
            if (!factVal?.success) emailErrors.push(`工場メール: ${factVal?.error ?? 'unknown'}`)
          }

          // Record email failures in DB so admins can see them in the dashboard
          if (emailErrors.length > 0) {
            await supabase
              .from('orders')
              .update({
                email_send_error: `確認メール送信失敗 (${new Date().toISOString()}): ${emailErrors.join('; ')}`,
              })
              .eq('id', order.id)
          }

          // Slack notification
          await sendSlackMessage(
            `🎉 *新規注文* ${order.order_number}\n顧客: ${customerName}\n合計: ¥${order.total_price?.toLocaleString()}\n${orderItems.map((i: any) => `• ${i.product_name} ×${i.quantity}`).join('\n')}`
          ).catch(() => {})

          // Auto-set converted_design_url from design_url for items that have it.
          // This replaces the Edge Function image processing that was never configured.
          for (const item of orderItems) {
            if (!item.converted_design_url && item.design_url) {
              await supabase
                .from('order_items')
                .update({ converted_design_url: item.design_url })
                .eq('id', item.id)
            }
          }
          } // end if (claimed)
        } // end if order fetched
      } catch (emailErr) {
        // Email failure must NOT affect webhook response
        console.error('[webhook] Email sending failed (non-fatal):', emailErr)
      }

      revalidatePath('/admin')
      revalidatePath('/admin/orders/[id]', 'page')
    } catch (err) {
      console.error('Webhook [checkout.session.completed] unexpected error:', err)
      return NextResponse.json({ error: 'Internal error' }, { status: 500 })
    }
  }

  // Fallback: record refund if Edge Function missed it (e.g. was down during refund)
  if (event.type === 'charge.refunded') {
    const charge = event.data.object as Stripe.Charge
    const paymentIntentId = typeof charge.payment_intent === 'string' ? charge.payment_intent : null

    if (paymentIntentId) {
      try {
        // Only update orders not already in refunded state (Edge Function takes priority)
        const { error } = await supabase
          .from('orders')
          .update({
            status: 'refunded',
            refunded_at: new Date().toISOString(),
            refunded_amount: charge.amount_refunded,
          })
          .eq('payment_intent_id', paymentIntentId)
          .not('status', 'eq', 'refunded')

        if (error) {
          console.error('Webhook [charge.refunded] DB error:', error)
          await sendSlackMessage(
            `❌ *Webhookエラー: charge.refunded*\nPaymentIntent: ${paymentIntentId}\nエラー: ${error.message}\n\n手動でDBを確認してください。`
          ).catch(() => {})
        }

        revalidatePath('/admin')
        revalidatePath('/admin/orders/[id]', 'page')
      } catch (err) {
        console.error('Webhook [charge.refunded] unexpected error:', err)
      }
    }
  }

  return NextResponse.json({ received: true })
}
