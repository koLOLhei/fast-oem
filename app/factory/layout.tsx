import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'

export default async function FactoryLayout({
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

    if ((profile as any).role !== 'factory') {
        // Send admin users to their portal, others to login
        if ((profile as any).role === 'admin') redirect('/admin')
        redirect('/login')
    }

    return <div className="min-h-screen bg-muted/30">{children}</div>
}
