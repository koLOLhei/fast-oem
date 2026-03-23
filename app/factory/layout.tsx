import type { Metadata } from 'next'
import { requireRole } from '@/lib/auth/guard'

export const metadata: Metadata = {
    robots: { index: false, follow: false },
}

export default async function FactoryLayout({
    children,
}: {
    children: React.ReactNode
}) {
    await requireRole('factory')

    return <div className="min-h-screen bg-muted/30">{children}</div>
}
