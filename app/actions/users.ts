'use server'

import { createServiceClient } from '@/lib/supabase/service'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth/require-admin'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://fast-oem.soara-mu.jp'

export type ActionResult = { error?: string }

const VALID_ROLES = ['super_admin', 'admin', 'factory'] as const
type ValidRole = typeof VALID_ROLES[number]

function isValidRole(role: string): role is ValidRole {
    return (VALID_ROLES as readonly string[]).includes(role)
}

/**
 * Invite a new staff member (admin, super_admin, or factory).
 * Stores the invitation record, then sends an invite email via Supabase Auth.
 * When the user accepts the invite and registers, the trigger auto-sets their role.
 */
export async function inviteStaffUser(formData: FormData): Promise<ActionResult> {
    let adminId: string
    let isSuperAdmin: boolean
    try {
        const ctx = await requireAdmin()
        adminId = ctx.adminId
        isSuperAdmin = ctx.isSuperAdmin
    } catch {
        return { error: '認証エラーが発生しました。再度ログインしてください。' }
    }

    const service = createServiceClient()

    const email = (formData.get('email') as string).trim().toLowerCase()
    const name = (formData.get('name') as string).trim()
    const role = formData.get('role') as 'super_admin' | 'admin' | 'factory'
    const factoryId = (formData.get('factory_id') as string) || null

    if (!email || !role) return { error: 'メールアドレスとロールは必須です' }
    if (role === 'factory' && !factoryId) return { error: '工場ユーザーには工場の選択が必要です' }
    if (role === 'super_admin' && !isSuperAdmin) {
        return { error: 'スーパー管理者ロールを招待できるのはスーパー管理者のみです' }
    }

    // Check for existing invitation
    const { data: existing } = await service
        .from('staff_invitations')
        .select('id, used_at')
        .eq('email', email)
        .maybeSingle()

    // Check if a profile with this email already exists (user already registered)
    const { data: existingProfile } = await service
        .from('profiles')
        .select('id')
        .eq('email', email)
        .maybeSingle()
    if (existingProfile) {
        return { error: 'このメールアドレスは既に登録済みです。ロール変更は「ユーザー管理」から行ってください。' }
    }

    if (existing?.used_at != null) {
        // Invitation was used but the profile no longer exists (user was deleted).
        // Delete the stale invitation so we can re-invite.
        await service.from('staff_invitations').delete().eq('id', existing.id)
    } else if (existing) {
        // Delete old pending invitation, then insert fresh
        await service.from('staff_invitations').delete().eq('id', existing.id)
    }

    const { error: inviteRecordError } = await service
        .from('staff_invitations')
        .insert({ email, role, factory_id: factoryId, invited_by: adminId })
    if (inviteRecordError) return { error: '招待記録の保存に失敗しました: ' + inviteRecordError.message }

    // Send invite email via Supabase Auth admin API.
    // Pass role/factory_id in user_metadata as belt-and-suspenders alongside the invitation record.
    const { error: authError } = await service.auth.admin.inviteUserByEmail(email, {
        data: { full_name: name || undefined, role, factory_id: factoryId ?? undefined },
        redirectTo: `${SITE_URL}/auth/callback?next=/reset-password/confirm`,
    })
    if (authError) {
        // Rollback invitation record on auth failure
        await service.from('staff_invitations').delete().eq('email', email)
        return { error: '招待メールの送信に失敗しました: ' + authError.message }
    }

    revalidatePath('/admin/users')
    return {}
}

/**
 * Update an existing user's role and factory assignment.
 */
export async function updateUserRole(userId: string, role: string, factoryId: string | null): Promise<ActionResult> {
    if (!isValidRole(role)) return { error: `無効なロールです: ${role}` }

    let adminId: string
    let isSuperAdmin: boolean
    try {
        const ctx = await requireAdmin()
        adminId = ctx.adminId
        isSuperAdmin = ctx.isSuperAdmin
    } catch {
        return { error: '認証エラーが発生しました。再度ログインしてください。' }
    }

    if (userId === adminId) return { error: '自分自身のロールを変更することはできません' }
    if (!isSuperAdmin) {
        const { data: target } = await createServiceClient()
            .from('profiles').select('role').eq('id', userId).single()
        if (target?.role === 'super_admin') return { error: 'スーパー管理者のロールを変更する権限がありません' }
        if (role === 'super_admin') return { error: 'スーパー管理者ロールを付与する権限がありません' }
    }
    const service = createServiceClient()

    const update: Record<string, unknown> = { role }
    update.factory_id = role === 'factory' ? factoryId : null

    const { error } = await service
        .from('profiles')
        .update(update)
        .eq('id', userId)

    if (error) return { error: error.message }
    revalidatePath('/admin/users')
    revalidatePath('/admin/factories')
    return {}
}

/**
 * Toggle a user's active status.
 * Inactive users are blocked at the middleware level.
 */
export async function setUserActive(userId: string, isActive: boolean): Promise<ActionResult> {
    let adminId: string
    let isSuperAdmin: boolean
    try {
        const ctx = await requireAdmin()
        adminId = ctx.adminId
        isSuperAdmin = ctx.isSuperAdmin
    } catch {
        return { error: '認証エラーが発生しました。再度ログインしてください。' }
    }

    if (!isActive && userId === adminId) return { error: '自分自身を無効化することはできません' }
    if (!isSuperAdmin) {
        const { data: target } = await createServiceClient()
            .from('profiles').select('role').eq('id', userId).single()
        if (target?.role === 'super_admin') return { error: 'スーパー管理者を無効化する権限がありません' }
    }
    const service = createServiceClient()

    const { error } = await service
        .from('profiles')
        .update({ is_active: isActive })
        .eq('id', userId)

    if (error) return { error: error.message }
    revalidatePath('/admin/users')
    return {}
}

/**
 * Update a user's profile fields: name, role, factory_id, is_active.
 */
export async function updateUser(
    userId: string,
    data: { name: string; role: string; factory_id: string | null; is_active: boolean }
): Promise<ActionResult> {
    let adminId: string
    let isSuperAdmin: boolean
    try {
        const ctx = await requireAdmin()
        adminId = ctx.adminId
        isSuperAdmin = ctx.isSuperAdmin
    } catch {
        return { error: '認証エラーが発生しました。再度ログインしてください。' }
    }

    if (!isValidRole(data.role)) return { error: `無効なロールです: ${data.role}` }

    // Cannot change own role
    if (userId === adminId) {
        const ownRole = isSuperAdmin ? 'super_admin' : 'admin'
        if (data.role !== ownRole) return { error: '自分自身のロールを変更することはできません' }
        if (!data.is_active) return { error: '自分自身を無効化することはできません' }
    }

    const service = createServiceClient()

    // Admin cannot edit super_admin users or promote anyone to super_admin
    if (!isSuperAdmin) {
        const { data: target } = await service
            .from('profiles').select('role').eq('id', userId).single()
        if (target?.role === 'super_admin') {
            return { error: 'スーパー管理者のユーザー情報を変更する権限がありません' }
        }
        if (data.role === 'super_admin') {
            return { error: 'スーパー管理者ロールを付与する権限がありません' }
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

    if (error) return { error: error.message }
    revalidatePath('/admin/users')
    return {}
}

/**
 * Delete a user from auth (ON DELETE CASCADE removes the profiles row too).
 */
export async function deleteUser(userId: string): Promise<ActionResult> {
    let adminId: string
    let isSuperAdmin: boolean
    try {
        const ctx = await requireAdmin()
        adminId = ctx.adminId
        isSuperAdmin = ctx.isSuperAdmin
    } catch {
        return { error: '認証エラーが発生しました。再度ログインしてください。' }
    }

    if (userId === adminId) return { error: '自分自身を削除することはできません' }

    const service = createServiceClient()

    // Admin cannot delete super_admin users
    if (!isSuperAdmin) {
        const { data: target } = await service
            .from('profiles').select('role').eq('id', userId).single()
        if (target?.role === 'super_admin') {
            return { error: 'スーパー管理者を削除する権限がありません' }
        }
    }

    // Fetch email before deleting auth user so we can clean up invitation records
    const { data: profile } = await service
        .from('profiles').select('email').eq('id', userId).single()

    const { error } = await service.auth.admin.deleteUser(userId)
    if (error) return { error: error.message }

    // Clean up staff_invitations so the email can be re-invited later
    if (profile?.email) {
        await service.from('staff_invitations').delete().eq('email', profile.email.toLowerCase())
    }

    revalidatePath('/admin/users')
    return {}
}

/**
 * Cancel a pending (unused) invitation.
 */
export async function cancelInvitation(invitationId: string): Promise<ActionResult> {
    let isSuperAdmin: boolean
    try {
        const ctx = await requireAdmin()
        isSuperAdmin = ctx.isSuperAdmin
    } catch {
        return { error: '認証エラーが発生しました。再度ログインしてください。' }
    }

    const service = createServiceClient()

    // Admin cannot cancel super_admin invitations
    if (!isSuperAdmin) {
        const { data: inv } = await service
            .from('staff_invitations').select('role').eq('id', invitationId).single()
        if (inv?.role === 'super_admin') {
            return { error: 'スーパー管理者の招待をキャンセルする権限がありません' }
        }
    }

    const { error } = await service
        .from('staff_invitations')
        .delete()
        .eq('id', invitationId)
        .is('used_at', null)

    if (error) return { error: error.message }
    revalidatePath('/admin/users')
    return {}
}
