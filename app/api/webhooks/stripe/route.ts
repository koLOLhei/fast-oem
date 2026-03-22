/**
 * Next.js Stripe Webhook Handler (fallback / local dev)
 *
 * In production, the Supabase Edge Function handles checkout.session.completed
 * (including image processing and email sending).
 *
 * This route is a lightweight fallback that only updates the order status from
 * pending → paid. It is safe to register alongside the Edge Function because:
 *   - It only UPDATEs rows where status = 'pending' (idempotent)
 *   - If the Edge Function already set status = 'paid', this UPDATE matches 0 rows
 *
 * Emails are NOT sent here — the Edge Function handles that.
 */

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { stripe } from '@/lib/stripe'
import { createServiceClient } from '@/lib/supabase/service'
import { revalidatePath } from 'next/cache'

export async function POST(req: Request) {
  const body = await req.text()
  const signature = (await headers()).get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session

    try {
      const supabase = createServiceClient()

      // Update pending → paid using stripe_session_id (set at order creation)
      // If already paid (Edge Function ran first), this matches 0 rows — harmless
      const { error } = await supabase
        .from('orders')
        .update({ status: 'paid' })
        .eq('stripe_session_id', session.id)
        .eq('status', 'pending')

      if (error) {
        console.error('Failed to update order status:', error)
        return NextResponse.json({ error: 'Failed to update order' }, { status: 500 })
      }

      revalidatePath('/admin')
      revalidatePath('/admin/orders/[id]', 'page')
      console.log(`Webhook: order status updated for session ${session.id}`)
    } catch (error) {
      console.error('Error processing webhook:', error)
      return NextResponse.json({ error: 'Internal error' }, { status: 500 })
    }
  }

  return NextResponse.json({ received: true })
}
