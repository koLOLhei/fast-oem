'use client'

import { type Locale, translations } from '@/lib/i18n/factory-translations'
import { useState } from 'react'
import { updateItemStatus } from '@/app/actions/factory'
import { logout } from '@/app/actions/auth'

type Item = {
    id: string
    product_name: string
    quantity: number
    options: { name: string; value: string }[]
    status: string
    design_file_name: string | null
    design_url: string | null
    converted_design_url: string | null
    orders: {
        created_at: string
        shipping_address: any
    }
}

interface FactoryPortalClientProps {
    items: Item[]
    factoryName: string
}

const LOCALES: { code: Locale; label: string; flag: string }[] = [
    { code: 'ja', label: '日本語', flag: '🇯🇵' },
    { code: 'en', label: 'English', flag: '🇺🇸' },
    { code: 'zh', label: '中文', flag: '🇨🇳' },
    { code: 'vi', label: 'Tiếng Việt', flag: '🇻🇳' },
]

const STATUS_ORDER = ['assigned', 'manufacturing', 'shipped']

export function FactoryPortalClient({ items, factoryName }: FactoryPortalClientProps) {
    const [locale, setLocale] = useState<Locale>('en')
    const [loadingIds, setLoadingIds] = useState<string[]>([])
    const t = translations[locale]

    const statusColors: Record<string, string> = {
        unassigned: 'bg-gray-100 text-gray-700',
        assigned: 'bg-yellow-100 text-yellow-800',
        manufacturing: 'bg-blue-100 text-blue-800',
        shipped: 'bg-green-100 text-green-800',
    }

    const handleStatusUpdate = async (itemId: string, status: string) => {
        setLoadingIds((prev) => [...prev, itemId])
        try {
            await updateItemStatus(itemId, status)
        } finally {
            setLoadingIds((prev) => prev.filter((id) => id !== itemId))
        }
    }

    const nextStatus = (current: string) => {
        const idx = STATUS_ORDER.indexOf(current)
        return STATUS_ORDER[idx + 1] ?? null
    }

    return (
        <div className="min-h-screen bg-muted/30">
            {/* Header */}
            <header className="sticky top-0 z-30 border-b bg-background px-6 py-4 flex items-center justify-between shadow-sm">
                <div>
                    <h1 className="text-lg font-bold">{t.dashboardTitle}</h1>
                    <p className="text-xs text-muted-foreground">{factoryName}</p>
                </div>
                <div className="flex items-center gap-3">
                    {/* Language Switcher */}
                    <div className="flex gap-1 bg-muted rounded-lg p-1">
                        {LOCALES.map((loc) => (
                            <button
                                key={loc.code}
                                onClick={() => setLocale(loc.code)}
                                className={`px-2 py-1 rounded-md text-xs font-medium transition-all ${locale === loc.code
                                        ? 'bg-background shadow text-foreground'
                                        : 'text-muted-foreground hover:text-foreground'
                                    }`}
                                title={loc.label}
                            >
                                {loc.flag} {loc.label}
                            </button>
                        ))}
                    </div>
                    <form action={logout}>
                        <button className="text-sm text-muted-foreground hover:text-foreground transition px-3 py-1 border rounded-lg">
                            {t.logout}
                        </button>
                    </form>
                </div>
            </header>

            {/* Content */}
            <main className="max-w-6xl mx-auto p-6">
                <h2 className="text-xl font-bold mb-6">{t.orders}</h2>

                {items.length === 0 ? (
                    <div className="rounded-xl border bg-card p-16 text-center">
                        <p className="text-muted-foreground">{t.noOrders}</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {items.map((item) => {
                            const addr = item.orders?.shipping_address
                            const isLoading = loadingIds.includes(item.id)
                            const next = nextStatus(item.status)

                            return (
                                <div key={item.id} className="rounded-xl border bg-card shadow-sm overflow-hidden">
                                    <div className="flex items-center justify-between bg-muted/30 px-5 py-3 border-b">
                                        <p className="text-sm font-medium text-muted-foreground">
                                            {t.orderedAt}: {new Date(item.orders.created_at).toLocaleDateString()}
                                        </p>
                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusColors[item.status]}`}>
                                            {t[item.status as keyof typeof t] ?? item.status}
                                        </span>
                                    </div>
                                    <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-6">
                                        {/* Product Info */}
                                        <div className="md:col-span-2 space-y-2">
                                            <h3 className="font-semibold text-base">{item.product_name}</h3>
                                            <p className="text-sm text-muted-foreground">{t.quantity}: <span className="font-bold text-foreground">{item.quantity}</span></p>
                                            {item.options?.length > 0 && (
                                                <p className="text-sm text-muted-foreground">
                                                    {t.options}: {item.options.map((o) => `${o.name}: ${o.value}`).join(', ')}
                                                </p>
                                            )}
                                            {/* Design Files */}
                                            <div className="flex gap-2 mt-2 flex-wrap">
                                                {item.converted_design_url && (
                                                    <a
                                                        href={item.converted_design_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-medium rounded-lg hover:bg-primary/90 transition"
                                                    >
                                                        ↓ {t.download} (Processed)
                                                    </a>
                                                )}
                                                {item.design_url && (
                                                    <a
                                                        href={item.design_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 border text-xs font-medium rounded-lg hover:bg-muted transition"
                                                    >
                                                        ↓ {t.download} (Original)
                                                    </a>
                                                )}
                                            </div>
                                        </div>

                                        {/* Shipping Address */}
                                        <div className="space-y-2">
                                            <p className="text-sm font-medium">{t.shippingAddress}</p>
                                            {addr ? (
                                                <address className="not-italic text-sm text-muted-foreground leading-relaxed">
                                                    {addr.postalCode && <span>〒{addr.postalCode}<br /></span>}
                                                    {addr.prefecture}{addr.city}{addr.address1}<br />
                                                    {addr.lastName} {addr.firstName}
                                                </address>
                                            ) : (
                                                <p className="text-sm text-muted-foreground">—</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Status Update */}
                                    {next && (
                                        <div className="px-5 py-3 border-t bg-muted/20 flex justify-end">
                                            <button
                                                onClick={() => handleStatusUpdate(item.id, next)}
                                                disabled={isLoading}
                                                className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition disabled:opacity-60"
                                            >
                                                {isLoading ? '...' : `${t.updateStatus}: → ${t[next as keyof typeof t] ?? next}`}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                )}
            </main>
        </div>
    )
}
