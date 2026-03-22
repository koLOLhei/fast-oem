'use server'

import { createServiceClient } from '@/lib/supabase/service'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth/require-admin'

export async function getSiteSettings(): Promise<Record<string, string>> {
    const supabase = createServiceClient()
    const { data } = await supabase.from('site_settings').select('key, value')
    const settings: Record<string, string> = {}
    for (const row of data ?? []) settings[row.key] = row.value
    return settings
}

export async function updateSiteSettings(updates: Record<string, string>) {
    await requireAdmin()

    const service = createServiceClient()
    const now = new Date().toISOString()
    const results = await Promise.all(
        Object.entries(updates).map(async ([key, value]) => {
            const { error } = await service
                .from('site_settings')
                .update({ value, updated_at: now })
                .eq('key', key)
            return error ? `${key}: ${error.message}` : null
        })
    )
    const errors = results.filter(Boolean) as string[]
    if (errors.length > 0) throw new Error(`設定の保存に失敗しました: ${errors.join(', ')}`)
    revalidatePath('/admin/settings')
}
