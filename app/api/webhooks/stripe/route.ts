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
        const { data: order } = await supabase
          .from('orders')
          .select('*, order_items(*)')
          .eq('stripe_session_id', session.id)
          .single()

        if (order && !order.confirmation_email_sent_at) {
          const customerInfo = order.customer_info as any
          const shippingAddr = order.shipping_address as any
          const customerName = customerInfo?.name
            || `${customerInfo?.lastName || ''} ${customerInfo?.firstName || ''}`.trim()
            || 'お客様'
          const customerEmail = customerInfo?.email || session.customer_email || ''

          const emailData = {
            orderId: order.id,
            orderNumber: order.order_number,
            orderDate: order.created_at,
            accessToken: order.access_token,
            customerEmail,
            customerName,
            items: ((order.order_items as any[]) ?? []).map((item: any) => ({
              productId: item.product_id,
              productName: item.product_name,
              quantity: item.quantity,
              unitPrice: item.unit_price,
              totalPrice: item.total_price,
              moldFee: item.mold_fee,
              moldOrderId: item.mold_order_id,
              options: item.options ?? [],
              designFileName: item.design_file_name,
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

          // Send both emails in parallel, mark as sent
          const [custResult, factResult] = await Promise.allSettled([
            sendCustomerConfirmation(emailData),
            sendFactoryNotification(emailData),
          ])

          // Mark email as sent to prevent duplicates
          await supabase
            .from('orders')
            .update({ confirmation_email_sent_at: new Date().toISOString() })
            .eq('id', order.id)

          if (custResult.status === 'rejected') {
            console.error('[webhook] Customer email failed:', custResult.reason)
          } else {
            console.log('[webhook] Customer confirmation email sent for', order.order_number)
          }
          if (factResult.status === 'rejected') {
            console.error('[webhook] Factory email failed:', factResult.reason)
          } else {
            console.log('[webhook] Factory notification email sent for', order.order_number)
          }

          // Slack notification
          await sendSlackMessage(
            `🎉 *新規注文* ${order.order_number}\n顧客: ${customerName}\n合計: ¥${order.total_price?.toLocaleString()}\n${((order.order_items as any[]) ?? []).map((i: any) => `• ${i.product_name} ×${i.quantity}`).join('\n')}`
          ).catch(() => {})
        }
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
