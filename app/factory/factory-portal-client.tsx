'use client'

import { type Locale, translations } from '@/lib/i18n/factory-translations'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { updateItemStatus, submitTrackingNumber, revertItemStatus } from '@/app/actions/factory'
import { logout } from '@/app/actions/auth'

const POLL_INTERVAL_MS = 60_000 // 60 seconds

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

    // Restore language preference from localStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem('factory-locale') as Locale
        if (saved && ['ja', 'en', 'zh', 'vi'].includes(saved)) {
            setLocale(saved)
        }
        // Show guide on first visit
        if (!localStorage.getItem('factory-guide-seen')) {
            setShowGuide(true)
        }
    }, [])

    // Set initial lastRefreshed on client only (avoids SSR hydration mismatch)
    useEffect(() => {
        setLastRefreshed(new Date())
    }, [])

    // Auto-refresh every 60 seconds to detect cancellations
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

    const showSuccess = (itemId: string, message: string) => {
        setSuccessIds((prev) => ({ ...prev, [itemId]: message }))
        setTimeout(() => {
            setSuccessIds((prev) => {
                const next = { ...prev }
                delete next[itemId]
                return next
            })
        }, 4000)
    }

    const nonCancelledItems = items.filter((i) => i.status !== 'cancelled')
    const cancelledItems = items.filter((i) => i.status === 'cancelled')

    // Express-first sort, then by order date (newest first)
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
        unassigned: 'bg-gray-100 text-gray-700',
        assigned: 'bg-yellow-100 text-yellow-800',
        manufacturing: 'bg-blue-100 text-blue-800',
        ready_to_ship: 'bg-purple-100 text-purple-800',
        shipped: 'bg-green-100 text-green-800',
        cancelled: 'bg-red-100 text-red-700',
    }

    const handleStatusUpdate = async (itemId: string, targetStatus: string) => {
        setLoadingIds((prev) => [...prev, itemId])
        try {
            await updateItemStatus(itemId, targetStatus)
            const msg = targetStatus === 'ready_to_ship' ? t.successReadyToShip : t.successUpdated
            showSuccess(itemId, msg)
        } catch (err: any) {
            alert(err?.message ?? 'Error')
        } finally {
            setLoadingIds((prev) => prev.filter((id) => id !== itemId))
        }
    }

    const handleRevertStatus = async (itemId: string) => {
        const confirmed = window.confirm(
            locale === 'ja' ? '「製造中」を「割り当て済み」に戻しますか？' :
            locale === 'zh' ? '是否将"生产中"恢复为"已分配"？' :
            locale === 'vi' ? 'Bạn có muốn quay lại trạng thái "Đã phân công" không?' :
            'Revert status from "Manufacturing" back to "Assigned"?'
        )
        if (!confirmed) return
        setLoadingIds((prev) => [...prev, itemId])
        try {
            await revertItemStatus(itemId)
            showSuccess(itemId, locale === 'ja' ? '「割り当て済み」に戻しました' : locale === 'zh' ? '已恢复为"已分配"' : locale === 'vi' ? 'Đã hoàn tác về "Đã phân công"' : 'Reverted to Assigned')
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

        // Confirm before submitting
        const message = t.confirmShipmentDialog.replace('{tracking}', tracking)
        if (!window.confirm(message)) return

        setTrackingErrors((prev) => { const n = { ...prev }; delete n[itemId]; return n })
        setLoadingIds((prev) => [...prev, itemId])
        try {
            await submitTrackingNumber(itemId, tracking)
            showSuccess(itemId, t.successShipped)
            setTrackingInputs((prev) => { const n = { ...prev }; delete n[itemId]; return n })
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

    return (
        <div className="min-h-screen bg-muted/30">
            {/* Header */}
            <header className="sticky top-0 z-30 border-b bg-background px-4 sm:px-6 py-4 flex items-center justify-between shadow-sm gap-3">
                <div className="min-w-0">
                    <h1 className="text-lg font-bold truncate">{t.dashboardTitle}</h1>
                    <p className="text-xs text-muted-foreground truncate">
                        {factoryName}
                        <span className="ml-2 opacity-60">
                            · {locale === 'ja' ? '最終更新' : locale === 'zh' ? '最后更新' : locale === 'vi' ? 'Cập nhật' : 'Updated'}: {lastRefreshed ? lastRefreshed.toLocaleTimeString('ja-JP', { timeZone: 'Asia/Tokyo' }) : '—'}
                        </span>
                    </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    {/* Language Switcher */}
                    <div className="flex gap-1 bg-muted rounded-lg p-1">
                        {LOCALES.map((loc) => (
                            <button
                                key={loc.code}
                                onClick={() => handleLocaleChange(loc.code)}
                                className={`px-2 py-1 rounded-md text-xs font-medium transition-all ${locale === loc.code
                                    ? 'bg-background shadow text-foreground'
                                    : 'text-muted-foreground hover:text-foreground'
                                    }`}
                                title={loc.label}
                            >
                                {loc.flag} <span className="hidden sm:inline">{loc.label}</span>
                            </button>
                        ))}
                    </div>
                    <form action={logout}>
                        <button className="text-sm text-muted-foreground hover:text-destructive transition px-3 py-1.5 border rounded-lg">
                            {t.logout}
                        </button>
                    </form>
                </div>
            </header>

            {/* Content */}
            <main className="max-w-4xl mx-auto p-4 sm:p-6">

                {/* How-to Guide */}
                <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 overflow-hidden">
                    <button
                        onClick={() => {
                            setShowGuide((v) => !v)
                            localStorage.setItem('factory-guide-seen', '1')
                        }}
                        className="w-full flex items-center justify-between px-5 py-3 text-left"
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
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-orange-100 text-orange-700 text-xs font-bold rounded-full">
                            {t.expressDelivery} × {expressCount}
                        </span>
                    )}
                    <div className="flex gap-1 flex-wrap ml-auto">
                        {[
                            { value: 'all', label: locale === 'ja' ? `全て (${nonCancelledItems.length})` : locale === 'zh' ? `全部 (${nonCancelledItems.length})` : locale === 'vi' ? `Tất cả (${nonCancelledItems.length})` : `All (${nonCancelledItems.length})` },
                            { value: 'assigned', label: t.assigned },
                            { value: 'manufacturing', label: t.manufacturing },
                            { value: 'ready_to_ship', label: t.ready_to_ship },
                            { value: 'shipped', label: t.shipped },
                        ].map(({ value, label }) => (
                            <button
                                key={value}
                                onClick={() => setStatusFilter(value)}
                                className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${statusFilter === value
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
                            const isReadyToShip = item.status === 'ready_to_ship'
                            const isShipped = item.status === 'shipped'
                            const orderRef = item.orders?.order_number ?? '—'
                            const successMsg = successIds[item.id]

                            return (
                                <div key={item.id} className="rounded-xl border bg-card shadow-sm overflow-hidden">
                                    {/* Card Header */}
                                    <div className="flex items-center justify-between bg-muted/40 px-5 py-3 border-b gap-3">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <p className="text-sm text-muted-foreground shrink-0">
                                                {t.orderedAt}: {new Date(item.orders.created_at).toLocaleDateString()}
                                            </p>
                                            <span className="font-mono text-xs font-bold text-foreground truncate">
                                                {orderRef}
                                            </span>
                                            {item.express_delivery && (
                                                <span className="shrink-0 px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-bold rounded-full">
                                                    {t.expressDelivery}
                                                </span>
                                            )}
                                        </div>
                                        <span className={`shrink-0 px-3 py-1 rounded-full text-xs font-bold ${statusColors[item.status]}`}>
                                            {t[item.status as keyof typeof t] ?? item.status}
                                        </span>
                                    </div>

                                    <div className="p-5 space-y-4">
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
                                                        <span key={i} className="px-2 py-0.5 bg-muted rounded text-xs text-foreground">
                                                            {o.name}: <span className="font-semibold">{o.value}</span>
                                                        </span>
                                                    ))}
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
                                                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 transition shadow-sm"
                                                    >
                                                        {t.deliveryPdf}
                                                    </a>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 px-4 py-2 bg-muted text-muted-foreground text-sm rounded-lg border border-dashed">
                                                        📄 PDF {locale === 'ja' ? '準備中' : locale === 'zh' ? '准备中' : locale === 'vi' ? 'đang chuẩn bị' : 'preparing...'}
                                                    </span>
                                                )}
                                                {item.converted_design_url && (
                                                    <a
                                                        href={item.converted_design_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition"
                                                    >
                                                        {t.compositeDesign}
                                                    </a>
                                                )}
                                                {item.design_url && !item.design_url.startsWith('data:') && (
                                                    <a
                                                        href={item.design_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1.5 px-4 py-2 border text-sm font-medium rounded-lg hover:bg-muted transition"
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
                                                    {addr.phone && (
                                                        <p className="text-muted-foreground">{t.phone}: {addr.phone}</p>
                                                    )}
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
                                        <div className={`px-5 py-4 border-t flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${next === 'ready_to_ship' ? 'bg-purple-50/60' : 'bg-yellow-50/50'}`}>
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
                                                className={`shrink-0 px-5 py-2.5 text-sm font-bold rounded-lg transition disabled:opacity-60 shadow-sm ${next === 'ready_to_ship' ? 'bg-purple-600 hover:bg-purple-700 text-white' : 'bg-primary hover:bg-primary/90 text-primary-foreground'}`}
                                            >
                                                {isLoading ? t.loading : (next === 'ready_to_ship' ? t.markReadyToShip : t.startManufacturing)}
                                            </button>
                                        </div>
                                    )}

                                    {/* Tracking Number Input: manufacturing or ready_to_ship → shipped */}
                                    {(isManufacturing || isReadyToShip) && (
                                        <div className="px-5 py-4 border-t bg-blue-50/60 space-y-3">
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
                                                    onClick={() => handleRevertStatus(item.id)}
                                                    disabled={isLoading}
                                                    className="shrink-0 text-xs px-3 py-1.5 border border-gray-300 text-gray-500 rounded-lg hover:bg-gray-100 transition disabled:opacity-50"
                                                >
                                                    {isReadyToShip
                                                        ? (locale === 'ja' ? '↩ 製造中に戻す' : locale === 'zh' ? '↩ 返回生产中' : locale === 'vi' ? '↩ Quay lại sản xuất' : '↩ Back to Manufacturing')
                                                        : (locale === 'ja' ? '↩ 製造前に戻す' : locale === 'zh' ? '↩ 撤回' : locale === 'vi' ? '↩ Hoàn tác' : '↩ Undo')}
                                                </button>
                                            </div>
                                            <div className="flex flex-col sm:flex-row gap-2">
                                                <input
                                                    type="text"
                                                    value={trackingInputs[item.id] ?? ''}
                                                    onChange={(e) => setTrackingInputs((prev) => ({ ...prev, [item.id]: e.target.value }))}
                                                    placeholder={t.trackingPlaceholder}
                                                    className="flex-1 px-4 py-2.5 text-base border-2 border-blue-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 font-mono"
                                                    disabled={isLoading}
                                                />
                                                <button
                                                    onClick={() => handleConfirmShipment(item.id)}
                                                    disabled={isLoading || !trackingInputs[item.id]?.trim()}
                                                    className="shrink-0 px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-lg transition disabled:opacity-50 shadow-sm"
                                                >
                                                    {isLoading ? t.loading : t.confirmShipment}
                                                </button>
                                            </div>
                                            {trackingErrors[item.id] && (
                                                <p className="text-sm font-semibold text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
                                                    ⚠ {trackingErrors[item.id]}
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )
                        })}

                        {/* Cancelled Orders Section */}
                        {cancelledItems.length > 0 && (
                            <div className="mt-8">
                                <button
                                    onClick={() => setShowCancelled((v) => !v)}
                                    className="flex items-center gap-2 text-sm font-bold text-red-600 hover:text-red-700 mb-3"
                                >
                                    <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-bold">
                                        {cancelledItems.length}
                                    </span>
                                    {t.cancelledOrders} {showCancelled ? '▲' : '▼'}
                                </button>

                                {showCancelled && (
                                    <div className="space-y-3">
                                        {cancelledItems.map((item) => {
                                            const orderRef = item.orders?.order_number ?? '—'
                                            return (
                                                <div key={item.id} className="rounded-xl border-2 border-red-300 bg-red-50 overflow-hidden">
                                                    <div className="flex items-center justify-between px-5 py-3 border-b border-red-200 bg-red-100">
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-sm text-muted-foreground">
                                                                {new Date(item.orders.created_at).toLocaleDateString()}
                                                            </span>
                                                            <span className="font-mono text-xs font-bold">{orderRef}</span>
                                                        </div>
                                                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-200 text-red-800">
                                                            {t.cancelled}
                                                        </span>
                                                    </div>
                                                    <div className="p-5">
                                                        <p className="font-semibold line-through text-muted-foreground">{item.product_name}</p>
                                                        <p className="text-sm text-muted-foreground mt-1">{t.quantity}: {item.quantity}</p>
                                                        {item.options?.length > 0 && (
                                                            <div className="flex flex-wrap gap-1 mt-1">
                                                                {item.options.map((o, i) => (
                                                                    <span key={i} className="text-xs text-muted-foreground">{o.name}: {o.value}</span>
                                                                ))}
                                                            </div>
                                                        )}
                                                        <p className="text-sm font-bold text-red-700 bg-red-100 border border-red-300 rounded-lg px-3 py-2 mt-3">
                                                            {t.doNotProduce}
                                                        </p>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    )
}
