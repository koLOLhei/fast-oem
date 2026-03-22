/**
 * Next.js Stripe Webhook Handler (fallback / local dev)
 *
 * In production, the Supabase Edge Function handles checkout.session.completed
 * (including image processing and email sending).
 *
 * This route is a lightweight fallback that handles:
 *   - checkout.session.completed: pending → paid (idempotent, Edge Function takes priority)
 *   - charge.refunded: records refund in DB if Edge Function missed it
 *   - charge.dispute.created: logs dispute alert
 *
 * All handlers are idempotent — if the Edge Function already processed the event,
 * these UPDATEs match 0 rows and are harmless.
 */

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { stripe } from '@/lib/stripe'
import { createServiceClient } from '@/lib/supabase/service'
import { sendSlackMessage } from '@/lib/slack'
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
      const { error } = await supabase
        .from('orders')
        .update({ status: 'paid' })
        .eq('stripe_session_id', session.id)
        .eq('status', 'pending')

      if (error) {
        console.error('Webhook [checkout.session.completed] DB error:', error)
        await sendSlackMessage(
          `❌ *Webhookエラー: checkout.session.completed*\nセッションID: ${session.id}\nエラー: ${error.message}`
        ).catch(() => {})
        return NextResponse.json({ error: 'Failed to update order' }, { status: 500 })
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
