'use client'

import { type Locale, translations } from '@/lib/i18n/factory-translations'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { updateItemStatus, submitTrackingNumber, revertItemStatus } from '@/app/actions/factory'
import { logout } from '@/app/actions/auth'

const POLL_INTERVAL_MS = 60_000 // 60 seconds

// Timezones relevant to partner factories (label → IANA tz)
const TIMEZONES: { label: string; tz: string }[] = [
    { label: '🇯🇵 JST (UTC+9)',  tz: 'Asia/Tokyo' },
    { label: '🇻🇳 ICT (UTC+7)',  tz: 'Asia/Ho_Chi_Minh' },
    { label: '🇨🇳 CST (UTC+8)',  tz: 'Asia/Shanghai' },
    { label: '🇰🇷 KST (UTC+9)',  tz: 'Asia/Seoul' },
    { label: '🌐 UTC',           tz: 'UTC' },
]

type Item = {
    id: string
    product_name: string
    quantity: number
    options: { name: string; value: string }[]
    status: string
    tracking_number: string | null
    design_file_name: string | null
    design_url: string | null
    converted_design_url: string | null
    delivery_pdf_url: string | null
    express_delivery?: boolean
    mold_order_id?: string | null
    orders: {
        created_at: string
        shipping_address: any
        order_number: string | null
        status: string | null
        factory_note: string | null
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

// assigned → manufacturing → ready_to_ship (all via button)
// manufacturing / ready_to_ship → shipped via tracking form
const STATUS_ORDER = ['assigned', 'manufacturing', 'ready_to_ship']

export function FactoryPortalClient({ items, factoryName }: FactoryPortalClientProps) {
    const [locale, setLocale] = useState<Locale>('en')
    const [timezone, setTimezone] = useState('Asia/Tokyo')
    const [showTzPicker, setShowTzPicker] = useState(false)
    const [loadingIds, setLoadingIds] = useState<string[]>([])
    const [trackingInputs, setTrackingInputs] = useState<Record<string, string>>({})
    const [trackingErrors, setTrackingErrors] = useState<Record<string, string>>({})
    const [successIds, setSuccessIds] = useState<Record<string, string>>({})
    const [showCancelled, setShowCancelled] = useState(false)
    const [showGuide, setShowGuide] = useState(false)
    const [statusFilter, setStatusFilter] = useState<string>('all')
    const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null)
    const router = useRouter()
    const t = translations[locale]

    // Restore preferences from localStorage on mount
    useEffect(() => {
        const savedLocale = localStorage.getItem('factory-locale') as Locale
        if (savedLocale && ['ja', 'en', 'zh', 'vi'].includes(savedLocale)) setLocale(savedLocale)

        const savedTz = localStorage.getItem('factory-timezone')
        if (savedTz && TIMEZONES.some((z) => z.tz === savedTz)) setTimezone(savedTz)

        if (!localStorage.getItem('factory-guide-seen')) setShowGuide(true)
    }, [])

    useEffect(() => { setLastRefreshed(new Date()) }, [])

    // Auto-refresh every 60 s to detect new orders and cancellations
    useEffect(() => {
        const id = setInterval(() => {
            router.refresh()
            setLastRefreshed(new Date())
        }, POLL_INTERVAL_MS)
        return () => clearInterval(id)
    }, [router])

    const handleLocaleChange = (code: Locale) => {
        setLocale(code)
        localStorage.setItem('factory-locale', code)
    }

    const handleTimezoneChange = (tz: string) => {
        setTimezone(tz)
        localStorage.setItem('factory-timezone', tz)
        setShowTzPicker(false)
    }

    const showSuccess = (itemId: string, message: string) => {
        setSuccessIds((prev) => ({ ...prev, [itemId]: message }))
        setTimeout(() => setSuccessIds((prev) => { const n = { ...prev }; delete n[itemId]; return n }), 4000)
    }

    const nonCancelledItems = items.filter((i) => i.status !== 'cancelled')
    const cancelledItems   = items.filter((i) => i.status === 'cancelled')

    // Express-first, then newest-first
    const sortedItems = [...nonCancelledItems].sort((a, b) => {
        if (a.express_delivery && !b.express_delivery) return -1
        if (!a.express_delivery && b.express_delivery) return 1
        return new Date(b.orders.created_at).getTime() - new Date(a.orders.created_at).getTime()
    })

    const activeItems = statusFilter === 'all'
        ? sortedItems
        : sortedItems.filter((i) => i.status === statusFilter)

    const expressCount = nonCancelledItems.filter((i) => i.express_delivery).length

    const statusColors: Record<string, string> = {
        unassigned:   'bg-gray-100 text-gray-700',
        assigned:     'bg-yellow-100 text-yellow-800',
        manufacturing:'bg-blue-100 text-blue-800',
        ready_to_ship:'bg-purple-100 text-purple-800',
        shipped:      'bg-green-100 text-green-800',
        cancelled:    'bg-red-100 text-red-700',
    }

    const handleStatusUpdate = async (itemId: string, targetStatus: string) => {
        setLoadingIds((prev) => [...prev, itemId])
        try {
            await updateItemStatus(itemId, targetStatus)
            const msg = targetStatus === 'ready_to_ship' ? t.successReadyToShip : t.successUpdated
            showSuccess(itemId, msg)
            router.refresh()
        } catch (err: any) {
            alert(err?.message ?? 'Error')
        } finally {
            setLoadingIds((prev) => prev.filter((id) => id !== itemId))
        }
    }

    const handleRevertStatus = async (itemId: string, currentStatus: string) => {
        const targetLabel =
            currentStatus === 'ready_to_ship'
                ? (locale === 'ja' ? '製造中' : locale === 'zh' ? '生产中' : locale === 'vi' ? 'Đang sản xuất' : 'Manufacturing')
                : (locale === 'ja' ? '割り当て済み' : locale === 'zh' ? '已分配' : locale === 'vi' ? 'Đã phân công' : 'Assigned')
        const confirmed = window.confirm(
            locale === 'ja' ? `「${targetLabel}」に戻しますか？` :
            locale === 'zh' ? `确认返回"${targetLabel}"状态？` :
            locale === 'vi' ? `Bạn có muốn quay lại "${targetLabel}"?` :
            `Revert status back to "${targetLabel}"?`
        )
        if (!confirmed) return
        setLoadingIds((prev) => [...prev, itemId])
        try {
            await revertItemStatus(itemId)
            showSuccess(itemId,
                locale === 'ja' ? `「${targetLabel}」に戻しました` :
                locale === 'zh' ? `已恢复为"${targetLabel}"` :
                locale === 'vi' ? `Đã hoàn tác về "${targetLabel}"` :
                `Reverted to ${targetLabel}`)
            router.refresh()
        } catch (err: any) {
            alert(err?.message ?? 'Error')
        } finally {
            setLoadingIds((prev) => prev.filter((id) => id !== itemId))
        }
    }

    const handleConfirmShipment = async (itemId: string) => {
        const tracking = trackingInputs[itemId]?.trim()
        if (!tracking) {
            setTrackingErrors((prev) => ({ ...prev, [itemId]: t.trackingRequired }))
            return
        }
        const message = t.confirmShipmentDialog.replace('{tracking}', tracking)
        if (!window.confirm(message)) return

        setTrackingErrors((prev) => { const n = { ...prev }; delete n[itemId]; return n })
        setLoadingIds((prev) => [...prev, itemId])
        try {
            await submitTrackingNumber(itemId, tracking)
            showSuccess(itemId, t.successShipped)
            setTrackingInputs((prev) => { const n = { ...prev }; delete n[itemId]; return n })
            router.refresh()
        } catch (err: any) {
            setTrackingErrors((prev) => ({ ...prev, [itemId]: err?.message ?? 'Error' }))
        } finally {
            setLoadingIds((prev) => prev.filter((id) => id !== itemId))
        }
    }

    const nextStatus = (current: string) => {
        const idx = STATUS_ORDER.indexOf(current)
        return STATUS_ORDER[idx + 1] ?? null
    }

    const formatDate = (iso: string) =>
        new Date(iso).toLocaleString(locale === 'ja' ? 'ja-JP' : locale === 'zh' ? 'zh-CN' : locale === 'vi' ? 'vi-VN' : 'en-US', { timeZone: timezone, month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })

    const currentTzLabel = TIMEZONES.find((z) => z.tz === timezone)?.label ?? timezone

    return (
        <div className="min-h-screen bg-muted/30">
            {/* Header */}
            <header className="sticky top-0 z-30 border-b bg-background px-4 sm:px-6 py-3 flex items-center justify-between shadow-sm gap-3">
                <div className="min-w-0">
                    <h1 className="text-base sm:text-lg font-bold truncate">{t.dashboardTitle}</h1>
                    <p className="text-xs text-muted-foreground truncate">
                        {factoryName}
                        <span className="ml-2 opacity-60">
                            · {locale === 'ja' ? '更新' : locale === 'zh' ? '更新' : locale === 'vi' ? 'Cập nhật' : 'Updated'}: {lastRefreshed ? lastRefreshed.toLocaleTimeString(undefined, { timeZone: timezone, hour: '2-digit', minute: '2-digit' }) : '—'}
                        </span>
                    </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    {/* Timezone selector */}
                    <div className="relative">
                        <button
                            onClick={() => setShowTzPicker((v) => !v)}
                            className="hidden sm:flex items-center gap-1 px-2 py-1.5 rounded-lg bg-muted text-xs text-muted-foreground hover:text-foreground transition"
                            title="Timezone"
                        >
                            🕐 <span className="hidden md:inline">{currentTzLabel}</span>
                        </button>
                        {showTzPicker && (
                            <div className="absolute right-0 top-full mt-1 z-50 bg-background border rounded-xl shadow-lg py-1 min-w-[180px]">
                                {TIMEZONES.map((z) => (
                                    <button
                                        key={z.tz}
                                        onClick={() => handleTimezoneChange(z.tz)}
                                        className={`w-full text-left px-4 py-2 text-xs hover:bg-muted transition ${timezone === z.tz ? 'font-bold text-primary' : ''}`}
                                    >
                                        {z.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Language Switcher */}
                    <div className="flex gap-0.5 bg-muted rounded-lg p-1">
                        {LOCALES.map((loc) => (
                            <button
                                key={loc.code}
                                onClick={() => handleLocaleChange(loc.code)}
                                className={`px-2 py-1.5 rounded-md text-xs font-medium transition-all min-w-[32px] ${locale === loc.code
                                    ? 'bg-background shadow text-foreground'
                                    : 'text-muted-foreground hover:text-foreground'
                                }`}
                                title={loc.label}
                            >
                                {loc.flag}
                            </button>
                        ))}
                    </div>
                    <form action={logout}>
                        <button className="text-sm text-muted-foreground hover:text-destructive transition px-3 py-2 border rounded-lg min-h-[40px]">
                            {t.logout}
                        </button>
                    </form>
                </div>
            </header>

            <main className="max-w-4xl mx-auto p-4 sm:p-6">

                {/* ── URGENT: Cancelled orders banner ─────────────────────────────── */}
                {/* Shown prominently at the TOP (not hidden at the bottom) so factory
                    workers cannot miss them and accidentally continue production.       */}
                {cancelledItems.length > 0 && (
                    <div className="mb-6 rounded-xl border-2 border-red-400 bg-red-50 overflow-hidden shadow-sm">
                        <button
                            onClick={() => setShowCancelled((v) => !v)}
                            className="w-full flex items-center justify-between px-5 py-4 text-left"
                        >
                            <div className="flex items-center gap-3">
                                <span className="text-2xl">🚨</span>
                                <div>
                                    <p className="font-bold text-red-800 text-sm">
                                        {locale === 'ja' ? `キャンセル済み注文 ${cancelledItems.length}件 — 製造を中止してください` :
                                         locale === 'zh' ? `${cancelledItems.length}件已取消 — 请立即停止生产` :
                                         locale === 'vi' ? `${cancelledItems.length} đơn đã hủy — Dừng sản xuất ngay` :
                                         `${cancelledItems.length} Cancelled Order${cancelledItems.length > 1 ? 's' : ''} — STOP PRODUCTION`}
                                    </p>
                                    <p className="text-xs text-red-600 mt-0.5">
                                        {locale === 'ja' ? 'タップして詳細を確認する' :
                                         locale === 'zh' ? '点击查看详情' :
                                         locale === 'vi' ? 'Nhấn để xem chi tiết' :
                                         'Tap to review'}
                                    </p>
                                </div>
                            </div>
                            <span className="text-red-700 text-lg">{showCancelled ? '▲' : '▼'}</span>
                        </button>

                        {showCancelled && (
                            <div className="border-t border-red-300 divide-y divide-red-200">
                                {cancelledItems.map((item) => (
                                    <div key={item.id} className="px-5 py-4">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="font-mono text-xs text-muted-foreground">{item.orders?.order_number ?? '—'}</p>
                                                <p className="font-bold text-base line-through text-muted-foreground mt-0.5">{item.product_name}</p>
                                                <p className="text-sm text-muted-foreground">
                                                    {locale === 'ja' ? '数量' : locale === 'zh' ? '数量' : locale === 'vi' ? 'SL' : 'Qty'}: {item.quantity}
                                                    {item.options?.length > 0 && (
                                                        <span className="ml-2">{item.options.map((o) => `${o.name}: ${o.value}`).join(' / ')}</span>
                                                    )}
                                                </p>
                                            </div>
                                            <span className="shrink-0 px-3 py-1 rounded-full text-xs font-bold bg-red-200 text-red-800">
                                                {t.cancelled}
                                            </span>
                                        </div>
                                        <p className="mt-3 text-sm font-bold text-red-700 bg-red-100 border border-red-300 rounded-lg px-4 py-3">
                                            ⛔ {t.doNotProduce}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* How-to Guide */}
                <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 overflow-hidden">
                    <button
                        onClick={() => {
                            setShowGuide((v) => !v)
                            localStorage.setItem('factory-guide-seen', '1')
                        }}
                        className="w-full flex items-center justify-between px-5 py-3 text-left min-h-[48px]"
                    >
                        <span className="font-semibold text-blue-900 text-sm">{t.guideTitle}</span>
                        <span className="text-blue-700 text-xs font-medium">
                            {showGuide ? t.guideClose : t.guideToggle}
                        </span>
                    </button>
                    {showGuide && (
                        <div className="px-5 pb-5 space-y-3 border-t border-blue-200">
                            <p className="text-sm text-blue-900 mt-3">{t.guideStep1}</p>
                            <p className="text-sm text-blue-900">{t.guideStep2}</p>
                            <p className="text-sm text-blue-900">{t.guideStep3}</p>
                            <p className="text-sm font-bold text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mt-2">
                                {t.guideCancelNote}
                            </p>
                        </div>
                    )}
                </div>

                {/* Status Filter + Summary */}
                <div className="mb-4 flex flex-col sm:flex-row sm:items-center gap-3">
                    <h2 className="text-xl font-bold shrink-0">{t.orders}</h2>
                    {expressCount > 0 && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-orange-100 text-orange-700 text-xs font-bold rounded-full">
                            {t.expressDelivery} × {expressCount}
                        </span>
                    )}
                    <div className="flex gap-1.5 flex-wrap ml-auto">
                        {[
                            { value: 'all',           label: locale === 'ja' ? `全て (${nonCancelledItems.length})` : locale === 'zh' ? `全部 (${nonCancelledItems.length})` : locale === 'vi' ? `Tất cả (${nonCancelledItems.length})` : `All (${nonCancelledItems.length})` },
                            { value: 'assigned',      label: t.assigned },
                            { value: 'manufacturing', label: t.manufacturing },
                            { value: 'ready_to_ship', label: t.ready_to_ship },
                            { value: 'shipped',       label: t.shipped },
                        ].map(({ value, label }) => (
                            <button
                                key={value}
                                onClick={() => setStatusFilter(value)}
                                className={`px-3 py-2 rounded-lg text-xs font-semibold transition min-h-[36px] ${statusFilter === value
                                    ? 'bg-primary text-primary-foreground shadow'
                                    : 'bg-muted text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>

                {nonCancelledItems.length === 0 && cancelledItems.length === 0 ? (
                    <div className="rounded-xl border bg-card p-16 text-center">
                        <p className="text-4xl mb-4">📭</p>
                        <p className="text-muted-foreground">{t.noOrders}</p>
                    </div>
                ) : activeItems.length === 0 ? (
                    <div className="rounded-xl border bg-card p-10 text-center">
                        <p className="text-muted-foreground text-sm">
                            {locale === 'ja' ? 'このステータスの注文はありません' :
                             locale === 'zh' ? '没有此状态的订单' :
                             locale === 'vi' ? 'Không có đơn hàng nào ở trạng thái này' :
                             'No orders with this status'}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-5">
                        {activeItems.map((item) => {
                            const addr = item.orders?.shipping_address
                            const isLoading = loadingIds.includes(item.id)
                            const next = nextStatus(item.status)
                            const isManufacturing = item.status === 'manufacturing'
                            const isReadyToShip   = item.status === 'ready_to_ship'
                            const isShipped       = item.status === 'shipped'
                            const orderRef        = item.orders?.order_number ?? '—'
                            const successMsg      = successIds[item.id]

                            return (
                                <div key={item.id} className="rounded-xl border bg-card shadow-sm overflow-hidden">
                                    {/* Card Header */}
                                    <div className="flex items-center justify-between bg-muted/40 px-4 sm:px-5 py-3 border-b gap-3">
                                        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-wrap">
                                            <p className="text-xs text-muted-foreground shrink-0">{formatDate(item.orders.created_at)}</p>
                                            <span className="font-mono text-xs font-bold text-foreground truncate">{orderRef}</span>
                                            {item.express_delivery && (
                                                <span className="shrink-0 px-2.5 py-1 bg-orange-100 text-orange-700 text-xs font-bold rounded-full">
                                                    {t.expressDelivery}
                                                </span>
                                            )}
                                            {item.mold_order_id && (
                                                <span className="shrink-0 px-2.5 py-1 bg-purple-100 text-purple-700 text-xs font-bold rounded-full border border-purple-200">
                                                    {locale === 'ja' ? '🔁 リピート注文' : locale === 'zh' ? '🔁 重复订单' : locale === 'vi' ? '🔁 Đặt lại' : '🔁 Repeat'}
                                                </span>
                                            )}
                                        </div>
                                        <span className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold ${statusColors[item.status]}`}>
                                            {t[item.status as keyof typeof t] ?? item.status}
                                        </span>
                                    </div>

                                    <div className="p-4 sm:p-5 space-y-4">
                                        {/* Product Info */}
                                        <div>
                                            <h3 className="font-bold text-lg">{item.product_name}</h3>
                                            <p className="text-base mt-1">
                                                <span className="text-muted-foreground">{t.quantity}: </span>
                                                <span className="font-bold text-2xl text-primary">{item.quantity}</span>
                                                <span className="text-muted-foreground ml-1 text-sm">{locale === 'ja' ? '個' : locale === 'zh' ? '个' : 'pcs'}</span>
                                            </p>
                                            {item.options?.length > 0 && (
                                                <div className="mt-2 flex flex-wrap gap-2">
                                                    {item.options.map((o, i) => (
                                                        <span key={i} className="px-2.5 py-1 bg-muted rounded-lg text-xs text-foreground">
                                                            {o.name}: <span className="font-semibold">{o.value}</span>
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                            {item.mold_order_id && (
                                                <div className="mt-2 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                                                    <p className="text-xs text-purple-800">
                                                        <span className="font-bold">
                                                            {locale === 'ja' ? '型再利用' : locale === 'zh' ? '模具复用' : locale === 'vi' ? 'Tái sử dụng khuôn' : 'Mold Reuse'}
                                                        </span>
                                                        {' — '}
                                                        {locale === 'ja' ? '前回注文番号:' : locale === 'zh' ? '原始订单号:' : locale === 'vi' ? 'Mã đơn gốc:' : 'Original order:'}
                                                        {' '}
                                                        <span className="font-mono font-semibold">{item.mold_order_id}</span>
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Design Downloads */}
                                        <div>
                                            <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">{t.designFile}</p>
                                            <div className="flex gap-2 flex-wrap">
                                                {item.delivery_pdf_url ? (
                                                    <a
                                                        href={item.delivery_pdf_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1.5 px-4 py-3 bg-green-600 text-white text-sm font-semibold rounded-xl hover:bg-green-700 transition shadow-sm min-h-[48px]"
                                                    >
                                                        {t.deliveryPdf}
                                                    </a>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 px-4 py-3 bg-muted text-muted-foreground text-sm rounded-xl border border-dashed min-h-[48px]">
                                                        📄 PDF {locale === 'ja' ? '準備中' : locale === 'zh' ? '准备中' : locale === 'vi' ? 'đang chuẩn bị' : 'preparing...'}
                                                    </span>
                                                )}
                                                {item.converted_design_url && (
                                                    <a
                                                        href={item.converted_design_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1.5 px-4 py-3 bg-primary text-primary-foreground text-sm font-medium rounded-xl hover:bg-primary/90 transition min-h-[48px]"
                                                    >
                                                        {t.compositeDesign}
                                                    </a>
                                                )}
                                                {item.design_url && !item.design_url.startsWith('data:') && (
                                                    <a
                                                        href={item.design_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1.5 px-4 py-3 border text-sm font-medium rounded-xl hover:bg-muted transition min-h-[48px]"
                                                    >
                                                        {t.originalDesign}
                                                    </a>
                                                )}
                                            </div>
                                        </div>

                                        {/* Shipping Address */}
                                        <div className="rounded-lg bg-muted/40 border p-4">
                                            <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">{t.shippingAddress}</p>
                                            {addr ? (
                                                <address className="not-italic text-sm leading-relaxed space-y-0.5">
                                                    {addr.companyName && (
                                                        <p className="font-semibold text-foreground">{addr.companyName}{addr.department ? ` ${addr.department}` : ''}</p>
                                                    )}
                                                    <p className="font-medium">〒{addr.postalCode}</p>
                                                    <p>{addr.prefecture}{addr.city}{addr.address1}</p>
                                                    {addr.address2 && <p>{addr.address2}</p>}
                                                    <p className="font-semibold">{addr.lastName} {addr.firstName}</p>
                                                    {addr.phone && <p className="text-muted-foreground">{t.phone}: {addr.phone}</p>}
                                                </address>
                                            ) : (
                                                <p className="text-sm text-muted-foreground">—</p>
                                            )}
                                        </div>

                                        {/* Factory note from admin */}
                                        {item.orders?.factory_note && (
                                            <div className="p-3 bg-yellow-50 border border-yellow-300 rounded-lg">
                                                <p className="text-xs font-bold text-yellow-800 mb-1">
                                                    {locale === 'ja' ? '📋 管理者からの特記事項' :
                                                     locale === 'zh' ? '📋 管理员备注' :
                                                     locale === 'vi' ? '📋 Ghi chú từ quản lý' :
                                                     '📋 Note from Admin'}
                                                </p>
                                                <p className="text-sm text-yellow-900 whitespace-pre-wrap">{item.orders.factory_note}</p>
                                            </div>
                                        )}

                                        {/* Already shipped: show tracking number */}
                                        {isShipped && item.tracking_number && (
                                            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                                                <p className="text-xs font-semibold text-green-800">{t.trackingNumber}</p>
                                                <p className="font-mono text-base font-bold text-green-900 mt-0.5">{item.tracking_number}</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Success feedback */}
                                    {successMsg && (
                                        <div className="px-5 py-3 bg-green-50 border-t border-green-200">
                                            <p className="text-sm font-semibold text-green-800">{successMsg}</p>
                                        </div>
                                    )}

                                    {/* Status Update: assigned → manufacturing, manufacturing → ready_to_ship */}
                                    {next && (
                                        <div className={`px-4 sm:px-5 py-4 border-t flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 ${next === 'ready_to_ship' ? 'bg-purple-50/60' : 'bg-yellow-50/50'}`}>
                                            <p className={`text-sm ${next === 'ready_to_ship' ? 'text-purple-800' : 'text-yellow-800'}`}>
                                                {next === 'ready_to_ship' ? t.readyToShipDesc :
                                                    locale === 'ja' ? '製造を開始する準備ができたらボタンを押してください。' :
                                                    locale === 'zh' ? '准备开始生产时，请点击按钮。' :
                                                    locale === 'vi' ? 'Khi sẵn sàng sản xuất, hãy nhấn nút.' :
                                                    'When ready to start production, press the button.'}
                                            </p>
                                            <button
                                                onClick={() => handleStatusUpdate(item.id, next)}
                                                disabled={isLoading}
                                                className={`shrink-0 px-6 py-3.5 text-sm font-bold rounded-xl transition disabled:opacity-60 shadow-sm min-h-[52px] ${next === 'ready_to_ship' ? 'bg-purple-600 hover:bg-purple-700 text-white' : 'bg-primary hover:bg-primary/90 text-primary-foreground'}`}
                                            >
                                                {isLoading ? t.loading : (next === 'ready_to_ship' ? t.markReadyToShip : t.startManufacturing)}
                                            </button>
                                        </div>
                                    )}

                                    {/* Tracking Number Input: manufacturing or ready_to_ship → shipped */}
                                    {(isManufacturing || isReadyToShip) && (
                                        <div className="px-4 sm:px-5 py-4 border-t bg-blue-50/60 space-y-3">
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <p className="text-sm font-bold text-blue-900 mb-0.5">{t.trackingNumber}</p>
                                                    <p className="text-xs text-blue-700">
                                                        {locale === 'ja' ? '発送後、伝票（ラベル）に印字されている番号を入力してください。' :
                                                         locale === 'zh' ? '发货后，请输入快递面单上的单号。' :
                                                         locale === 'vi' ? 'Sau khi giao hàng, nhập mã trên phiếu vận chuyển.' :
                                                         'After shipping, enter the number printed on the shipping label.'}
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={() => handleRevertStatus(item.id, item.status)}
                                                    disabled={isLoading}
                                                    className="shrink-0 text-xs px-3 py-2.5 border border-gray-300 text-gray-500 rounded-lg hover:bg-gray-100 transition disabled:opacity-50 min-h-[44px]"
                                                >
                                                    {isReadyToShip
                                                        ? (locale === 'ja' ? '↩ 製造中に戻す' : locale === 'zh' ? '↩ 返回生产中' : locale === 'vi' ? '↩ Quay lại sản xuất' : '↩ Back to Mfg')
                                                        : (locale === 'ja' ? '↩ 割り当て済みに戻す' : locale === 'zh' ? '↩ 撤回' : locale === 'vi' ? '↩ Hoàn tác' : '↩ Undo')}
                                                </button>
                                            </div>
                                            <div className="flex flex-col sm:flex-row gap-2">
                                                <input
                                                    type="text"
                                                    inputMode="numeric"
                                                    value={trackingInputs[item.id] ?? ''}
                                                    onChange={(e) => setTrackingInputs((prev) => ({ ...prev, [item.id]: e.target.value }))}
                                                    placeholder={t.trackingPlaceholder}
                                                    className="flex-1 px-4 py-3.5 text-base border-2 border-blue-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 font-mono min-h-[52px]"
                                                    disabled={isLoading}
                                                />
                                                <button
                                                    onClick={() => handleConfirmShipment(item.id)}
                                                    disabled={isLoading || !trackingInputs[item.id]?.trim()}
                                                    className="shrink-0 px-6 py-3.5 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-xl transition disabled:opacity-50 shadow-sm min-h-[52px]"
                                                >
                                                    {isLoading ? t.loading : t.confirmShipment}
                                                </button>
                                            </div>
                                            {trackingErrors[item.id] && (
                                                <p className="text-sm font-semibold text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-3">
                                                    ⚠ {trackingErrors[item.id]}
                                                </p>
                                            )}
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
