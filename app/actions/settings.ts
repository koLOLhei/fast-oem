'use server'

import { createServiceClient } from '@/lib/supabase/service'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getSiteSettings(): Promise<Record<string, string>> {
    const supabase = createServiceClient()
    const { data } = await supabase.from('site_settings').select('key, value')
    const settings: Record<string, string> = {}
    for (const row of data ?? []) settings[row.key] = row.value
    return settings
}

export async function updateSiteSettings(updates: Record<string, string>) {
    // Require admin role
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('認証が必要です')
    // Use service client to bypass RLS — same pattern as auth.ts and guard.ts
    const { data: profile } = await createServiceClient().from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') throw new Error('管理者権限が必要です')

    const service = createServiceClient()
    const errors: string[] = []
    for (const [key, value] of Object.entries(updates)) {
        const { error } = await service
            .from('site_settings')
            .update({ value, updated_at: new Date().toISOString() })
            .eq('key', key)
        if (error) errors.push(`${key}: ${error.message}`)
    }
    if (errors.length > 0) throw new Error(`設定の保存に失敗しました: ${errors.join(', ')}`)
    revalidatePath('/admin/settings')
}
