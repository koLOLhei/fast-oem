import { requireRole } from '@/lib/auth/guard'

export default async function FactoryLayout({
    children,
}: {
    children: React.ReactNode
}) {
    await requireRole('factory')

    return <div className="min-h-screen bg-muted/30">{children}</div>
}
