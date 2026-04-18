/**
 * POST /api/mypage/setup-intent
 * Create (or re-use) a Stripe Customer + SetupIntent so the user can save a
 * card that the FAST OEM agent API will later use for off-session charging.
 *
 * Flow:
 *   1. UI calls this → receives clientSecret
 *   2. UI mounts Stripe Elements, confirms the SetupIntent with user's card
 *   3. On success, UI POSTs /api/mypage/agent-keys/<id>/attach-pm with the
 *      paymentMethod.id to pin it as the default PM for that agent key.
 */
import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const supa = await createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  let body: { agentKeyId?: unknown }
  try { body = await req.json() } catch { body = {} }
  const agentKeyId = typeof body.agentKeyId === 'string' ? body.agentKeyId : null
  if (!agentKeyId) return NextResponse.json({ error: 'agentKeyId required' }, { status: 400 })

  const svc = createServiceClient()

  // Verify the key belongs to the authed user.
  const { data: keyRow, error: keyErr } = await svc
    .from('agent_api_keys')
    .select('id, user_id, stripe_customer_id')
    .eq('id', agentKeyId)
    .maybeSingle()
  if (keyErr || !keyRow) return NextResponse.json({ error: 'key not found' }, { status: 404 })
  if (keyRow.user_id !== user.id) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  // Create or re-use a Stripe Customer attached to this agent key.
  let customerId = keyRow.stripe_customer_id
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      metadata: { agent_key_id: agentKeyId, user_id: user.id },
    })
    customerId = customer.id
    await svc.from('agent_api_keys').update({ stripe_customer_id: customerId }).eq('id', agentKeyId)
  }

  const si = await stripe.setupIntents.create({
    customer: customerId,
    usage: 'off_session',
    payment_method_types: ['card'],
    metadata: { agent_key_id: agentKeyId, user_id: user.id },
  })

  return NextResponse.json({
    clientSecret: si.client_secret,
    setupIntentId: si.id,
    customerId,
    publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  })
}
