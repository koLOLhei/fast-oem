'use server'

import { createServiceClient } from '@/lib/supabase/service'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth/require-admin'

/**
 * Invite a new staff member (admin, super_admin, or factory).
 * Stores the invitation record, then sends an invite email via Supabase Auth.
 * When the user accepts the invite and registers, the trigger auto-sets their role.
 */
export async function inviteStaffUser(formData: FormData) {
    const { adminId, isSuperAdmin } = await requireAdmin()
    const service = createServiceClient()

    const email = (formData.get('email') as string).trim().toLowerCase()
    const name = (formData.get('name') as string).trim()
    const role = formData.get('role') as 'super_admin' | 'admin' | 'factory'
    const factoryId = (formData.get('factory_id') as string) || null

    if (!email || !role) throw new Error('メールアドレスとロールは必須です')
    if (role === 'factory' && !factoryId) throw new Error('工場ユーザーには工場の選択が必要です')
    if (role === 'super_admin' && !isSuperAdmin) {
        throw new Error('スーパー管理者ロールを招待できるのはスーパー管理者のみです')
    }

    // Block re-invite if the email already has an accepted invitation
    const { data: existing } = await service
        .from('staff_invitations')
        .select('used_at')
        .eq('email', email)
        .maybeSingle()
    if (existing?.used_at != null) throw new Error('このメールアドレスはすでに招待を承認済みです。ロール変更は「ユーザー管理」から行ってください。')

    // Upsert invitation record (overwrite only if not yet accepted)
    const { error: inviteRecordError } = await service
        .from('staff_invitations')
        .upsert(
            { email, role, factory_id: factoryId, invited_by: adminId, used_at: null },
            { onConflict: 'email' }
        )
    if (inviteRecordError) throw new Error('招待記録の保存に失敗しました: ' + inviteRecordError.message)

    // Send invite email via Supabase Auth admin API.
    // Pass role/factory_id in user_metadata as belt-and-suspenders alongside the invitation record.
    const { error: authError } = await service.auth.admin.inviteUserByEmail(email, {
        data: { full_name: name || undefined, role, factory_id: factoryId ?? undefined },
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
    const { adminId, isSuperAdmin } = await requireAdmin()
    if (userId === adminId) throw new Error('自分自身のロールを変更することはできません')
    if (!isSuperAdmin) {
        const { data: target } = await createServiceClient()
            .from('profiles').select('role').eq('id', userId).single()
        if (target?.role === 'super_admin') throw new Error('スーパー管理者のロールを変更する権限がありません')
        if (role === 'super_admin') throw new Error('スーパー管理者ロールを付与する権限がありません')
    }
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
    const { adminId, isSuperAdmin } = await requireAdmin()
    if (!isActive && userId === adminId) throw new Error('自分自身を無効化することはできません')
    if (!isSuperAdmin) {
        const { data: target } = await createServiceClient()
            .from('profiles').select('role').eq('id', userId).single()
        if (target?.role === 'super_admin') throw new Error('スーパー管理者を無効化する権限がありません')
    }
    const service = createServiceClient()

    const { error } = await service
        .from('profiles')
        .update({ is_active: isActive })
        .eq('id', userId)

    if (error) throw new Error(error.message)
    revalidatePath('/admin/users')
}

/**
 * Update a user's profile fields: name, role, factory_id, is_active.
 */
export async function updateUser(
    userId: string,
    data: { name: string; role: string; factory_id: string | null; is_active: boolean }
) {
    const { adminId, isSuperAdmin } = await requireAdmin()

    // Cannot change own role
    if (userId === adminId) {
        const ownRole = isSuperAdmin ? 'super_admin' : 'admin'
        if (data.role !== ownRole) throw new Error('自分自身のロールを変更することはできません')
        if (!data.is_active) throw new Error('自分自身を無効化することはできません')
    }

    const service = createServiceClient()

    // Admin cannot edit super_admin users or promote anyone to super_admin
    if (!isSuperAdmin) {
        const { data: target } = await service
            .from('profiles').select('role').eq('id', userId).single()
        if (target?.role === 'super_admin') {
            throw new Error('スーパー管理者のユーザー情報を変更する権限がありません')
        }
        if (data.role === 'super_admin') {
            throw new Error('スーパー管理者ロールを付与する権限がありません')
        }
    }

    const { error } = await service
        .from('profiles')
        .update({
            name: data.name,
            role: data.role,
            factory_id: data.role === 'factory' ? data.factory_id : null,
            is_active: data.is_active,
        })
        .eq('id', userId)

    if (error) throw new Error(error.message)
    revalidatePath('/admin/users')
}

/**
 * Delete a user from auth (ON DELETE CASCADE removes the profiles row too).
 */
export async function deleteUser(userId: string) {
    const { adminId, isSuperAdmin } = await requireAdmin()
    if (userId === adminId) throw new Error('自分自身を削除することはできません')

    const service = createServiceClient()

    // Admin cannot delete super_admin users
    if (!isSuperAdmin) {
        const { data: target } = await service
            .from('profiles').select('role').eq('id', userId).single()
        if (target?.role === 'super_admin') {
            throw new Error('スーパー管理者を削除する権限がありません')
        }
    }

    const { error } = await service.auth.admin.deleteUser(userId)
    if (error) throw new Error(error.message)
    revalidatePath('/admin/users')
}

/**
 * Cancel a pending (unused) invitation.
 */
export async function cancelInvitation(invitationId: string) {
    const { isSuperAdmin } = await requireAdmin()
    const service = createServiceClient()

    // Admin cannot cancel super_admin invitations
    if (!isSuperAdmin) {
        const { data: inv } = await service
            .from('staff_invitations').select('role').eq('id', invitationId).single()
        if (inv?.role === 'super_admin') {
            throw new Error('スーパー管理者の招待をキャンセルする権限がありません')
        }
    }

    const { error } = await service
        .from('staff_invitations')
        .delete()
        .eq('id', invitationId)
        .is('used_at', null)

    if (error) throw new Error(error.message)
    revalidatePath('/admin/users')
}
