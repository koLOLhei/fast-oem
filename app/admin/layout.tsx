import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import { AdminNav } from './admin-nav'

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Use service-role to bypass RLS — guarantees we always get the real role
    const serviceClient = createServiceClient()
    const { data: profile } = await serviceClient
        .from('profiles')
        .select('role, is_active')
        .eq('id', user!.id)
        .single()

    if (!profile) {
        redirect('/login?message=' + encodeURIComponent('アカウント情報が見つかりません。管理者にお問い合わせください'))
    }

    if ((profile as any).is_active === false) {
        redirect('/login?error=account_disabled')
    }

    if ((profile as any).role !== 'admin') {
        // Send factory users to their portal, others to login
        if ((profile as any).role === 'factory') redirect('/factory')
        redirect('/login')
    }

    return (
        <div className="min-h-screen bg-muted/40 flex flex-col">
            <header className="sticky top-0 z-30 border-b bg-background shadow-sm">
                <div className="flex h-14 items-center gap-4 px-4 sm:px-6 max-w-7xl mx-auto">
                    <h1 className="flex-1 shrink-0 text-lg font-bold tracking-tight whitespace-nowrap">
                        FAST OEM 管理センター
                    </h1>
                    <AdminNav />
                </div>
            </header>
            <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6">
                {children}
            </main>
        </div>
    )
}
