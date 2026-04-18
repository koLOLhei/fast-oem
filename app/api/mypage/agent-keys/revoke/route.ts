/**
 * POST /api/mypage/agent-keys/revoke
 * Disable an agent key (soft delete — the row stays for audit).
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const supa = await createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  let body: { agentKeyId?: unknown }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'invalid json' }, { status: 400 }) }
  const agentKeyId = typeof body.agentKeyId === 'string' ? body.agentKeyId : null
  if (!agentKeyId) return NextResponse.json({ error: 'agentKeyId required' }, { status: 400 })

  const svc = createServiceClient()
  const { data: keyRow } = await svc
    .from('agent_api_keys')
    .select('id, user_id')
    .eq('id', agentKeyId)
    .maybeSingle()
  if (!keyRow) return NextResponse.json({ error: 'not found' }, { status: 404 })
  if (keyRow.user_id !== user.id) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  await svc
    .from('agent_api_keys')
    .update({ enabled: false, disabled_at: new Date().toISOString() })
    .eq('id', agentKeyId)

  return NextResponse.json({ ok: true })
}
