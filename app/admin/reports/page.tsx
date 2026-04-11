import { createServiceClient } from '@/lib/supabase/service'
import type { ReportOrder, ReportOrderItem } from '@/lib/database.types'

export const dynamic = 'force-dynamic'

const formatPrice = (yen: number) =>
    new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(yen)

function monthKey(dateStr: string) {
    const d = new Date(dateStr)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
function monthLabel(key: string) {
    const [y, m] = key.split('-')
    return `${y}年${parseInt(m)}月`
}

export default async function ReportsPage() {
    // Auth + role already enforced by admin/layout.tsx — use service client to skip RLS.
    const supabase = createServiceClient()

    // ── Fetch last 6 months of paid orders ────────────────────────────────
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5)
    sixMonthsAgo.setDate(1)
    sixMonthsAgo.setHours(0, 0, 0, 0)

    // Run all 4 queries in parallel
    const [
        { data: revenueOrders },
        { data: activeItems },
        { data: shippedItems },
    ] = await Promise.all([
        supabase
            .from('orders')
            .select('id, total_price, created_at, order_items(product_name, total_price, factory_id, status, factories(name))')
            .in('status', ['paid', 'processing', 'partially_shipped', 'shipped', 'completed'])
            .gte('created_at', sixMonthsAgo.toISOString())
            .order('created_at', { ascending: true }),
        // Fetch all active items (non-shipped) with factory info, capped to prevent full scans
        supabase
            .from('order_items')
            .select('id, status, factory_id, created_at, orders(created_at, status), factories(name)')
            .not('factory_id', 'is', null)
            .not('status', 'in', '("shipped","cancelled")')
            .limit(2000),
        // Count shipped items per factory (last 6 months)
        supabase
            .from('order_items')
            .select('factory_id, factories(name)')
            .eq('status', 'shipped')
            .gte('created_at', sixMonthsAgo.toISOString())
            .not('factory_id', 'is', null),
    ])

    const allOrders = revenueOrders ?? []

    // ── Monthly revenue (last 6 months) ───────────────────────────────────
    const monthlyRevenue: Record<string, number> = {}
    const monthlyCount: Record<string, number> = {}
    // Build all 6 month keys so empty months show 0
    for (let i = 5; i >= 0; i--) {
        const d = new Date()
        d.setMonth(d.getMonth() - i)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        monthlyRevenue[key] = 0
        monthlyCount[key] = 0
    }
    for (const o of allOrders) {
        const key = monthKey(o.created_at)
        if (key in monthlyRevenue) {
            monthlyRevenue[key] = (monthlyRevenue[key] ?? 0) + (o.total_price ?? 0)
            monthlyCount[key] = (monthlyCount[key] ?? 0) + 1
        }
    }
    const maxRevenue = Math.max(1, ...Object.values(monthlyRevenue))

    // ── Top products by revenue ────────────────────────────────────────────
    const productRevenue: Record<string, number> = {}
    const productCount: Record<string, number> = {}
    for (const o of allOrders) {
        for (const item of (o as unknown as ReportOrder).order_items ?? []) {
            const name = item.product_name ?? '不明'
            productRevenue[name] = (productRevenue[name] ?? 0) + (item.total_price ?? 0)
            productCount[name] = (productCount[name] ?? 0) + 1
        }
    }
    const topProducts = Object.entries(productRevenue)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
    const maxProductRevenue = Math.max(1, ...topProducts.map(([, v]) => v))

    // ── Factory performance ────────────────────────────────────────────────
    const factoryStats: Record<string, { name: string; total: number; delayed: number; shipped: number }> = {}
    const DELAY_DAYS = 14
    const now = Date.now()

    for (const item of activeItems ?? []) {
        const fId = item.factory_id as string
        const typedItem = item as unknown as ReportOrderItem
        const fName = typedItem.factories?.name ?? fId
        if (!factoryStats[fId]) factoryStats[fId] = { name: fName, total: 0, delayed: 0, shipped: 0 }
        factoryStats[fId].total++
        const orderCreatedAt = typedItem.orders?.created_at
        if (orderCreatedAt) {
            const daysOld = Math.floor((now - new Date(orderCreatedAt).getTime()) / 86400000)
            if (daysOld > DELAY_DAYS) factoryStats[fId].delayed++
        }
    }

    for (const item of shippedItems ?? []) {
        const fId = item.factory_id as string
        const fName = (item as unknown as ReportOrderItem).factories?.name ?? fId
        if (!factoryStats[fId]) factoryStats[fId] = { name: fName, total: 0, delayed: 0, shipped: 0 }
        factoryStats[fId].shipped++
    }

    const factoryList = Object.values(factoryStats).sort((a, b) => b.total - a.total)

    // ── Summary totals ─────────────────────────────────────────────────────
    const totalRevenue6m = Object.values(monthlyRevenue).reduce((s, v) => s + v, 0)
    const totalOrders6m = Object.values(monthlyCount).reduce((s, v) => s + v, 0)
    const avgOrderValue = totalOrders6m > 0 ? Math.round(totalRevenue6m / totalOrders6m) : 0

    return (
        <div className="space-y-8 max-w-5xl">
            <div>
                <h2 className="text-2xl font-bold">レポート・分析</h2>
                <p className="text-sm text-muted-foreground mt-1">直近6ヶ月の売上・工場パフォーマンスを確認できます</p>
            </div>

            {/* ── サマリーKPI ─────────────────────────────────────── */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="rounded-xl border bg-card p-5 shadow-sm">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">6ヶ月売上</p>
                    <p className="text-2xl font-bold text-primary mt-1">{formatPrice(totalRevenue6m)}</p>
                </div>
                <div className="rounded-xl border bg-card p-5 shadow-sm">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">6ヶ月注文数</p>
                    <p className="text-2xl font-bold mt-1">{totalOrders6m}件</p>
                </div>
                <div className="rounded-xl border bg-card p-5 shadow-sm col-span-2 md:col-span-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">平均注文単価</p>
                    <p className="text-2xl font-bold mt-1">{formatPrice(avgOrderValue)}</p>
                </div>
            </div>

            {/* ── 月別売上グラフ ───────────────────────────────────── */}
            <div className="rounded-xl border bg-card p-6 shadow-sm">
                <h3 className="text-base font-bold mb-6">月別売上（直近6ヶ月）</h3>
                <div className="flex items-end gap-3 h-48">
                    {Object.entries(monthlyRevenue).map(([key, revenue]) => {
                        const pct = maxRevenue > 0 ? Math.round((revenue / maxRevenue) * 100) : 0
                        const isCurrentMonth = key === monthKey(new Date().toISOString())
                        return (
                            <div key={key} className="flex-1 flex flex-col items-center gap-2">
                                <p className="text-xs font-semibold text-muted-foreground">
                                    {revenue > 0 ? formatPrice(revenue) : '—'}
                                </p>
                                <div className="w-full flex items-end" style={{ height: '120px' }}>
                                    <div
                                        className={`w-full rounded-t-lg transition-all ${isCurrentMonth ? 'bg-primary' : 'bg-primary/40'}`}
                                        style={{ height: `${Math.max(pct, revenue > 0 ? 4 : 0)}%` }}
                                    />
                                </div>
                                <div className="text-center">
                                    <p className="text-xs text-muted-foreground">{monthLabel(key)}</p>
                                    <p className="text-xs text-muted-foreground">{monthlyCount[key]}件</p>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* ── 商品別売上 & 工場パフォーマンス ─────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Top products */}
                <div className="rounded-xl border bg-card p-6 shadow-sm">
                    <h3 className="text-base font-bold mb-5">商品別売上 TOP5（6ヶ月）</h3>
                    {topProducts.length === 0 ? (
                        <p className="text-sm text-muted-foreground">データなし</p>
                    ) : (
                        <div className="space-y-4">
                            {topProducts.map(([name, revenue], i) => (
                                <div key={name}>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span className="text-xs font-bold text-muted-foreground w-4 shrink-0">{i + 1}</span>
                                            <span className="text-sm font-medium truncate">{name}</span>
                                        </div>
                                        <div className="shrink-0 text-right ml-2">
                                            <span className="text-sm font-bold">{formatPrice(revenue)}</span>
                                            <span className="text-xs text-muted-foreground ml-1">({productCount[name]}件)</span>
                                        </div>
                                    </div>
                                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-primary rounded-full"
                                            style={{ width: `${Math.round((revenue / maxProductRevenue) * 100)}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Factory performance */}
                <div className="rounded-xl border bg-card p-6 shadow-sm">
                    <h3 className="text-base font-bold mb-5">工場別パフォーマンス</h3>
                    {factoryList.length === 0 ? (
                        <p className="text-sm text-muted-foreground">データなし</p>
                    ) : (
                        <div className="space-y-3">
                            {factoryList.map((f) => {
                                const delayRate = f.total > 0 ? Math.round((f.delayed / f.total) * 100) : 0
                                return (
                                    <div key={f.name} className="rounded-lg border p-3 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-semibold">{f.name}</p>
                                            {delayRate > 30 ? (
                                                <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                                                    遅延 {delayRate}%
                                                </span>
                                            ) : delayRate > 0 ? (
                                                <span className="text-xs font-semibold text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full">
                                                    遅延 {delayRate}%
                                                </span>
                                            ) : (
                                                <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                                                    遅延なし
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex gap-4 text-xs text-muted-foreground">
                                            <span>進行中 <strong className="text-foreground">{f.total}</strong>件</span>
                                            <span>遅延 <strong className={delayRate > 0 ? 'text-orange-500' : 'text-foreground'}>{f.delayed}</strong>件</span>
                                            <span>発送済(6ヶ月) <strong className="text-green-600">{f.shipped}</strong>件</span>
                                        </div>
                                        {f.total > 0 && (
                                            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full ${delayRate > 30 ? 'bg-red-500' : delayRate > 0 ? 'bg-orange-400' : 'bg-green-500'}`}
                                                    style={{ width: `${Math.min(100, delayRate)}%` }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-4">
                        ※遅延：注文日から{DELAY_DAYS}日超が経過した進行中アイテム
                    </p>
                </div>
            </div>
        </div>
    )
}
