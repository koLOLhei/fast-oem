/**
 * POST /api/mypage/agent-keys/attach-pm
 * Pin the Stripe PaymentMethod saved via SetupIntent as the default off-session
 * PM for the given agent key.
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

  let body: { agentKeyId?: unknown; paymentMethodId?: unknown }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'invalid json' }, { status: 400 }) }

  const agentKeyId = typeof body.agentKeyId === 'string' ? body.agentKeyId : null
  const pmId = typeof body.paymentMethodId === 'string' ? body.paymentMethodId : null
  if (!agentKeyId || !pmId) return NextResponse.json({ error: 'agentKeyId and paymentMethodId are required' }, { status: 400 })
  if (!/^pm_[a-zA-Z0-9_]+$/.test(pmId)) return NextResponse.json({ error: 'invalid paymentMethodId format' }, { status: 400 })

  const svc = createServiceClient()
  const { data: keyRow } = await svc
    .from('agent_api_keys')
    .select('id, user_id, stripe_customer_id')
    .eq('id', agentKeyId)
    .maybeSingle()

  if (!keyRow) return NextResponse.json({ error: 'key not found' }, { status: 404 })
  if (keyRow.user_id !== user.id) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  if (!keyRow.stripe_customer_id) return NextResponse.json({ error: 'no stripe customer — create setup intent first' }, { status: 400 })

  // Confirm PM is attached to this customer (security: don't let a client pass
  // someone else's pm_xxx and have it saved under their key).
  const pm = await stripe.paymentMethods.retrieve(pmId)
  if (pm.customer !== keyRow.stripe_customer_id) {
    return NextResponse.json({ error: 'payment method not attached to this customer' }, { status: 400 })
  }

  await svc.from('agent_api_keys').update({ stripe_default_pm_id: pmId }).eq('id', agentKeyId)

  return NextResponse.json({ ok: true, agentKeyId, paymentMethodId: pmId })
}
