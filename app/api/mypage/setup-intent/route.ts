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
    // Atomic claim: only persist when stripe_customer_id is still NULL. Without
    // the `.is(null)` guard, two concurrent "save card" requests would each
    // create a Customer and the second update would clobber the first, orphaning
    // a Stripe Customer (and any card later attached to it).
    const { data: claimed } = await svc
      .from('agent_api_keys')
      .update({ stripe_customer_id: customer.id })
      .eq('id', agentKeyId)
      .is('stripe_customer_id', null)
      .select('stripe_customer_id')
      .maybeSingle()
    if (claimed?.stripe_customer_id === customer.id) {
      customerId = customer.id
    } else {
      // A concurrent request won the race — reuse the persisted customer and
      // discard the one we just created so it doesn't dangle.
      const { data: fresh } = await svc
        .from('agent_api_keys')
        .select('stripe_customer_id')
        .eq('id', agentKeyId)
        .maybeSingle()
      customerId = fresh?.stripe_customer_id ?? customer.id
      if (customerId !== customer.id) {
        try { await stripe.customers.del(customer.id) } catch { /* best-effort cleanup */ }
      }
    }
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
