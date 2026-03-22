import { requireRole } from '@/lib/auth/guard'
import { AdminNav } from './admin-nav'

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    await requireRole(['admin', 'super_admin'])

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
