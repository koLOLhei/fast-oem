'use server'

import { createServiceClient } from '@/lib/supabase/service'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth/require-admin'

export async function getSiteSettings(): Promise<Record<string, string>> {
    // Guard: only admins should read all settings via server action.
    // Public pages that need individual settings read them directly from DB.
    await requireAdmin()
    const supabase = createServiceClient()
    const { data } = await supabase.from('site_settings').select('key, value')
    const settings: Record<string, string> = {}
    for (const row of data ?? []) settings[row.key] = row.value
    return settings
}

const MAX_SETTING_VALUE_LENGTH = 2000

export async function updateSiteSettings(updates: Record<string, string>) {
    await requireAdmin()

    // Validate value sizes to prevent DB bloat
    for (const [key, value] of Object.entries(updates)) {
        if (value.length > MAX_SETTING_VALUE_LENGTH) {
            throw new Error(`設定値「${key}」が長すぎます（最大${MAX_SETTING_VALUE_LENGTH}文字）`)
        }
    }

    const service = createServiceClient()
    const now = new Date().toISOString()
    const results = await Promise.all(
        Object.entries(updates).map(async ([key, value]) => {
            // Update and check that at least one row was matched
            const { error, data: updated } = await service
                .from('site_settings')
                .update({ value, updated_at: now })
                .eq('key', key)
                .select('key')
            if (error) return `${key}: ${error.message}`
            if (!updated || updated.length === 0) return `${key}: 設定キーが存在しません`
            return null
        })
    )
    const errors = results.filter(Boolean) as string[]
    if (errors.length > 0) throw new Error(`設定の保存に失敗しました: ${errors.join(', ')}`)
    revalidatePath('/admin/settings')
}
