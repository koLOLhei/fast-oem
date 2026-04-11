import type { Metadata } from 'next'
import { requireRole } from '@/lib/auth/guard'

export const metadata: Metadata = {
    robots: { index: false, follow: false },
}

export default async function MypageLayout({
    children,
}: {
    children: React.ReactNode
}) {
    // Consistent with admin/factory layouts: enforce auth at layout level.
    // Individual pages may do additional checks (e.g. data ownership).
    await requireRole('customer')

    return <>{children}</>
}
