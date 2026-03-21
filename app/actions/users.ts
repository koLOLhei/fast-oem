'use server'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { revalidatePath } from 'next/cache'

async function requireAdmin() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('認証が必要です')
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
    if (profile?.role !== 'admin') throw new Error('管理者権限が必要です')
    return { supabase, adminId: user.id }
}

/**
 * Invite a new staff member (admin or factory).
 * Stores the invitation record, then sends an invite email via Supabase Auth.
 * When the user accepts the invite and registers, the trigger auto-sets their role.
 */
export async function inviteStaffUser(formData: FormData) {
    const { adminId } = await requireAdmin()
    const service = createServiceClient()

    const email = (formData.get('email') as string).trim().toLowerCase()
    const name = (formData.get('name') as string).trim()
    const role = formData.get('role') as 'admin' | 'factory'
    const factoryId = (formData.get('factory_id') as string) || null

    if (!email || !role) throw new Error('メールアドレスとロールは必須です')
    if (role === 'factory' && !factoryId) throw new Error('工場ユーザーには工場の選択が必要です')

    // Upsert invitation record (overwrite if re-inviting)
    const { error: inviteRecordError } = await service
        .from('staff_invitations')
        .upsert(
            { email, role, factory_id: factoryId, invited_by: adminId, used_at: null },
            { onConflict: 'email' }
        )
    if (inviteRecordError) throw new Error('招待記録の保存に失敗しました: ' + inviteRecordError.message)

    // Send invite email via Supabase Auth admin API
    const { error: authError } = await service.auth.admin.inviteUserByEmail(email, {
        data: { full_name: name },
    })
    if (authError) {
        // Rollback invitation record on auth failure
        await service.from('staff_invitations').delete().eq('email', email)
        throw new Error('招待メールの送信に失敗しました: ' + authError.message)
    }

    revalidatePath('/admin/users')
}

/**
 * Update an existing user's role and factory assignment.
 */
export async function updateUserRole(userId: string, role: string, factoryId: string | null) {
    await requireAdmin()
    const service = createServiceClient()

    const update: Record<string, unknown> = { role }
    update.factory_id = role === 'factory' ? factoryId : null

    const { error } = await service
        .from('profiles')
        .update(update)
        .eq('id', userId)

    if (error) throw new Error(error.message)
    revalidatePath('/admin/users')
    revalidatePath('/admin/factories')
}

/**
 * Toggle a user's active status.
 * Inactive users are blocked at the middleware level.
 */
export async function setUserActive(userId: string, isActive: boolean) {
    await requireAdmin()
    const service = createServiceClient()

    const { error } = await service
        .from('profiles')
        .update({ is_active: isActive })
        .eq('id', userId)

    if (error) throw new Error(error.message)
    revalidatePath('/admin/users')
}

/**
 * Cancel a pending (unused) invitation.
 */
export async function cancelInvitation(invitationId: string) {
    await requireAdmin()
    const service = createServiceClient()

    const { error } = await service
        .from('staff_invitations')
        .delete()
        .eq('id', invitationId)
        .is('used_at', null)

    if (error) throw new Error(error.message)
    revalidatePath('/admin/users')
}
