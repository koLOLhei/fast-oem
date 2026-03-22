import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'

export type StaffRole = 'super_admin' | 'admin' | 'factory' | 'customer'

/** Mapping from role to its home portal URL */
const ROLE_PORTAL: Record<string, string> = {
    super_admin: '/admin',
    admin: '/admin',
    factory: '/factory',
    customer: '/mypage',
}

/**
 * Server-component guard for role-protected layouts.
 *
 * - Unauthenticated       → /login
 * - Profile missing       → /login with error message
 * - Account disabled      → /login?error=account_disabled
 * - Wrong role (staff)    → redirect to their own portal
 * - Wrong role (customer) → /login
 *
 * Accepts a single role or an array of allowed roles.
 */
export async function requireRole(requiredRole: StaffRole | StaffRole[]): Promise<void> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/login')

    const serviceClient = createServiceClient()
    const { data: profile } = await serviceClient
        .from('profiles')
        .select('role, is_active')
        .eq('id', user.id)
        .single()

    if (!profile) {
        redirect('/login?message=' + encodeURIComponent('アカウント情報が見つかりません。管理者にお問い合わせください'))
    }

    const { role, is_active } = profile as { role: string; is_active: boolean }

    if (is_active === false) {
        redirect('/login?error=account_disabled')
    }

    const allowed = Array.isArray(requiredRole) ? requiredRole : [requiredRole]
    if (!allowed.includes(role as StaffRole)) {
        redirect(ROLE_PORTAL[role] ?? '/login')
    }
}
