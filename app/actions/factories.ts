'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/service'
import { requireAdmin } from '@/lib/auth/require-admin'
import { isValidUUID } from '@/lib/validation'

export type ActionResult = { error?: string }

// 工場作成
export async function createFactory(formData: FormData): Promise<ActionResult> {
    try {
        await requireAdmin()
    } catch {
        return { error: '認証エラーが発生しました。再度ログインしてください。' }
    }

    const name = (formData.get('name') as string)?.trim()
    const country = (formData.get('country') as string)?.trim()
    const contactEmail = (formData.get('contact_email') as string)?.trim()
    const contactName = (formData.get('contact_name') as string)?.trim()
    const phone = (formData.get('phone') as string)?.trim()
    const address = (formData.get('address') as string)?.trim()
    const maxCapacity = formData.get('max_capacity') as string | null

    if (!name) {
        return { error: '工場名は必須です' }
    }

    const parsedMaxCapacity = maxCapacity ? parseInt(maxCapacity, 10) : null
    if (parsedMaxCapacity !== null && (isNaN(parsedMaxCapacity) || parsedMaxCapacity < 1)) {
        return { error: '最大生産能力は1以上の整数で入力してください' }
    }

    const supabase = createServiceClient()
    const { error } = await supabase
        .from('factories')
        .insert({
            name,
            country: country || null,
            contact_email: contactEmail || null,
            contact_name: contactName || null,
            phone: phone || null,
            address: address || null,
            max_capacity: parsedMaxCapacity,
            is_active: true,
        })

    if (error) {
        console.error('[createFactory] DB error:', error)
        return { error: '工場の登録に失敗しました' }
    }

    revalidatePath('/admin/factories')
    return {}
}

// 工場更新
export async function updateFactory(factoryId: string, formData: FormData): Promise<ActionResult> {
    try {
        await requireAdmin()
    } catch {
        return { error: '認証エラーが発生しました。再度ログインしてください。' }
    }
    if (!isValidUUID(factoryId)) return { error: '無効な工場IDです' }

    const maxCapacityRaw = formData.get('max_capacity') as string | null

    const supabase = createServiceClient()
    const { error } = await supabase
        .from('factories')
        .update({
            name: (formData.get('name') as string)?.trim(),
            country: (formData.get('country') as string)?.trim() || null,
            contact_email: (formData.get('contact_email') as string)?.trim() || null,
            contact_name: (formData.get('contact_name') as string)?.trim() || null,
            phone: (formData.get('phone') as string)?.trim() || null,
            address: (formData.get('address') as string)?.trim() || null,
            max_capacity: maxCapacityRaw ? Math.min(parseInt(maxCapacityRaw, 10), 1_000_000) : null,
            is_active: formData.get('is_active') === 'true',
        })
        .eq('id', factoryId)

    if (error) {
        console.error('[updateFactory] DB error:', error)
        return { error: '工場の更新に失敗しました' }
    }

    revalidatePath('/admin/factories')
    return {}
}

// 工場削除
export async function deleteFactory(factoryId: string): Promise<ActionResult> {
    try {
        await requireAdmin()
    } catch {
        return { error: '認証エラーが発生しました。再度ログインしてください。' }
    }
    if (!isValidUUID(factoryId)) return { error: '無効な工場IDです' }

    const supabase = createServiceClient()

    // 注文アイテム・ユーザーが紐づいている場合は削除不可
    const [{ count: itemCount }, { count: userCount }] = await Promise.all([
        supabase
            .from('order_items')
            .select('*', { count: 'exact', head: true })
            .eq('factory_id', factoryId),
        supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('factory_id', factoryId),
    ])

    if ((itemCount ?? 0) > 0) {
        return { error: 'この工場には注文アイテムが存在するため削除できません。先に工場の割り当てを解除してください。' }
    }

    if ((userCount ?? 0) > 0) {
        return { error: 'この工場には担当ユーザーが存在するため削除できません。先にユーザーの工場割り当てを解除してください。' }
    }

    const { error } = await supabase
        .from('factories')
        .delete()
        .eq('id', factoryId)

    if (error) {
        console.error('[deleteFactory] DB error:', error)
        return { error: '工場の削除に失敗しました' }
    }

    revalidatePath('/admin/factories')
    return {}
}
