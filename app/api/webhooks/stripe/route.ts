/**
 * Next.js Stripe Webhook Handler — Cache Revalidation Only
 *
 * Architecture:
 *   PRIMARY handler: Supabase Edge Function (supabase/functions/stripe-webhook/)
 *     → DB updates, image processing, email sending, mold detection, alerts
 *   THIS handler: Next.js cache revalidation only
 *     → revalidatePath() cannot be called from Edge Functions
 *
 * Previously this route duplicated the Edge Function's DB writes and email
 * sending. Although idempotency guards (confirmation_email_sent_at, status
 * checks) prevented double-processing, the duplication created a maintenance
 * burden and divergence risk. Now all business logic lives in the Edge
 * Function alone.
 */

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { revalidatePath } from 'next/cache'

/** Event types that affect admin dashboard data. */
const REVALIDATE_EVENTS = new Set([
  'checkout.session.completed',
  'checkout.session.expired',
  'charge.refunded',
  'charge.failed',
  'charge.dispute.created',
])

export async function POST(req: Request) {
  const body = await req.text()
  const signature = (await headers()).get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 })
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error('[webhook/nextjs] STRIPE_WEBHOOK_SECRET is not configured')
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
  }

  try {
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret)

    if (REVALIDATE_EVENTS.has(event.type)) {
      revalidatePath('/admin')
      revalidatePath('/admin/orders/[id]', 'page')
    }

    return NextResponse.json({ received: true })
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }
}
