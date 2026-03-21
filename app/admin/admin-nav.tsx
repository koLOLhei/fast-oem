'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { logout } from '@/app/actions/auth'

const NAV_ITEMS = [
    { href: '/admin', label: 'ダッシュボード', exact: true },
    { href: '/admin/factories', label: '工場管理', exact: false },
    { href: '/admin/products', label: '商品管理', exact: false },
    { href: '/admin/users', label: 'ユーザー管理', exact: false },
    { href: '/admin/reports', label: 'レポート', exact: false },
    { href: '/admin/settings', label: 'サイト設定', exact: false },
]

export function AdminNav() {
    const pathname = usePathname()

    return (
        <nav className="flex items-center gap-1 text-sm font-medium">
            {NAV_ITEMS.map((item) => {
                const isActive = item.exact
                    ? pathname === item.href
                    : pathname.startsWith(item.href)
                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`px-3 py-1.5 rounded-lg transition-colors ${
                            isActive
                                ? 'bg-primary text-primary-foreground font-semibold'
                                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                        }`}
                    >
                        {item.label}
                    </Link>
                )
            })}
            <form action={logout} className="ml-2">
                <button className="px-3 py-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-red-50 transition-colors">
                    ログアウト
                </button>
            </form>
        </nav>
    )
}
