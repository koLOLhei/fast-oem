import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AgentAccessClient } from './agent-access-client'

export const metadata: Metadata = {
  title: 'Agent API キー | FAST OEM',
  description: 'AIエージェント経由で自動発注するための API キーを発行します。',
  robots: { index: false, follow: false },
}

export default async function AgentAccessPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/mypage/agent-access')
  return <AgentAccessClient userEmail={user.email ?? ''} />
}
