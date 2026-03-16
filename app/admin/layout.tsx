import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { logout } from '@/app/actions/auth'

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

    return (
        <div className="min-h-screen bg-muted/40 flex flex-col">
            <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6 mt-4 mb-8">
                <h1 className="flex-1 shrink-0 text-xl font-bold tracking-tight">
                    FAST OEM 管理センター
                </h1>
                <nav className="flex items-center gap-4 text-sm font-medium">
                    <Link href="/admin" className="text-foreground transition-colors hover:text-primary">
                        注文一覧
                    </Link>
                    <Link href="/admin/factories" className="text-foreground transition-colors hover:text-primary">
                        工場管理
                    </Link>
                    <form action={logout}>
                        <button className="text-muted-foreground transition-colors hover:text-foreground">
                            ログアウト
                        </button>
                    </form>
                </nav>
            </header>
            <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6">
                {children}
            </main>
        </div>
    )
}
