/**
 * Authenticated mypage API for creating / listing / revoking Agent API keys.
 *
 *   GET  /api/mypage/agent-keys           → list the user's keys (no secrets)
 *   POST /api/mypage/agent-keys           → create a new key. Returns plaintext ONCE.
 *   POST /api/mypage/agent-keys/<id>/revoke → disable a key
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

export const runtime = 'nodejs'

async function getAuthedUser() {
  const supa = await createClient()
  const { data: { user } } = await supa.auth.getUser()
  return user
}

export async function GET() {
  const user = await getAuthedUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const svc = createServiceClient()
  const { data, error } = await svc
    .from('agent_api_keys')
    .select('id, name, prefix, daily_cap_jpy, enabled, stripe_default_pm_id, last_used_at, created_at, disabled_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ keys: data ?? [] })
}

export async function POST(req: NextRequest) {
  const user = await getAuthedUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  let body: { name?: unknown; dailyCapJpy?: unknown }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'invalid json' }, { status: 400 }) }

  const name = typeof body.name === 'string' && body.name.trim() ? body.name.trim() : 'Default Agent Key'
  const dailyCap = Number(body.dailyCapJpy ?? 100000)
  if (!Number.isInteger(dailyCap) || dailyCap < 0 || dailyCap > 10_000_000) {
    return NextResponse.json({ error: 'dailyCapJpy must be integer between 0 and 10,000,000' }, { status: 400 })
  }

  // Generate a 256-bit key with the 'sk_agent_' prefix for visual identification.
  const rand = new Uint8Array(32)
  crypto.getRandomValues(rand)
  const randomBase32 = Array.from(rand).map((b) => b.toString(16).padStart(2, '0')).join('')
  const plaintext = `sk_agent_${randomBase32}`

  // Store only the SHA-256 hash. Plaintext is shown once to the user.
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(plaintext))
  const hash = Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('')

  const svc = createServiceClient()
  const { data, error } = await svc
    .from('agent_api_keys')
    .insert({
      user_id: user.id,
      name,
      secret_hash: hash,
      prefix: plaintext.slice(0, 16), // 'sk_agent_xxxxxxx'
      daily_cap_jpy: dailyCap,
      enabled: true,
    })
    .select('id, name, prefix, daily_cap_jpy, enabled, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    ...data,
    secret: plaintext,
    warning: 'Store this key immediately — it will never be shown again.',
  }, { status: 201 })
}
