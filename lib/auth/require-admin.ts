import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

export interface AdminContext {
    /** The authenticated user's ID */
    adminId: string
    /** Whether the user has the super_admin role */
    isSuperAdmin: boolean
}

/**
 * Defence-in-depth admin guard for server actions.
 * The middleware guards the /admin page routes, but server actions are
 * callable via POST from any client that knows the action ID.
 * This check ensures only active admin-role users can proceed.
 *
 * Throws on: unauthenticated, no profile, disabled account, wrong role.
 * Returns context so callers can branch on isSuperAdmin without re-querying.
 */
export async function requireAdmin(): Promise<AdminContext> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('認証が必要です')

    const { data: profile } = await createServiceClient()
        .from('profiles')
        .select('role, is_active')
        .eq('id', user.id)
        .single()

    if ((profile as any)?.is_active === false) {
        throw new Error('このアカウントは無効化されています')
    }
    if (profile?.role !== 'admin' && profile?.role !== 'super_admin') {
        throw new Error('管理者権限が必要です')
    }

    return { adminId: user.id, isSuperAdmin: profile.role === 'super_admin' }
}

export interface FactoryContext {
    factoryId: string | null
}

/**
 * Defence-in-depth factory guard for server actions.
 */
export async function requireFactory(): Promise<FactoryContext> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('認証が必要です')

    const { data: profile } = await createServiceClient()
        .from('profiles')
        .select('role, factory_id, is_active')
        .eq('id', user.id)
        .single()

    if ((profile as any)?.is_active === false) {
        throw new Error('このアカウントは無効化されています')
    }
    if (profile?.role !== 'factory') {
        throw new Error('工場権限が必要です')
    }

    return { factoryId: profile.factory_id as string | null }
}
