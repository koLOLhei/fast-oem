import { createServiceClient } from '@/lib/supabase/service'
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '@/lib/status-labels'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 50

const formatPrice = (yen: number) =>
    new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(yen)

function daysSince(dateStr: string) {
    return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24))
}

export default async function AdminPage({
    searchParams,
}: {
    searchParams: Promise<{ status?: string; q?: string; page?: string }>
}) {
    const { status: filterStatus, q: searchQuery, page: pageParam } = await searchParams
    const currentPage = Math.max(1, parseInt(pageParam ?? '1', 10) || 1)
    const offset = (currentPage - 1) * PAGE_SIZE

    // Role is already enforced by admin/layout.tsx (requireRole check).
    // Use service client to bypass RLS — all 5 queries avoid per-row policy evaluation.
    const supabase = createServiceClient()

    // ── Data Fetch ────────────────────────────────────────────────
    // All 5 queries are independent — run them in parallel.

    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()

    // Paginated list query: build before Promise.all (needs searchParams)
    let listQuery = supabase
        .from('orders')
        .select(`
            id, order_number, customer_info, customer_email,
            total_price, status, created_at,
            order_items(id, status, factory_id, factories(name))
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1)

    if (filterStatus) listQuery = listQuery.eq('status', filterStatus)
    if (searchQuery) {
        // Escape PostgREST special characters so a comma (or other syntax chars)
        // in the search term doesn't break the .or() filter string.
        const q = searchQuery.replace(/[%_,()]/g, (c) => `\\${c}`)
        listQuery = listQuery.or(`order_number.ilike.%${q}%,customer_email.ilike.%${q}%`)
    }

    const [
        { data: orderStats },
        { data: pipelineItems },
        { data: factories },
        { data: stuckItems },
        { data: pagedOrders, count: totalCount },
    ] = await Promise.all([
        // KPI query: recent orders only (past 13 months covers this + last month comparison).
        // Older all-time revenue is added from a separate count to avoid a full-table scan.
        supabase
            .from('orders')
            .select('id, status, total_price, created_at')
            .gte('created_at', new Date(new Date().getFullYear() - 1, new Date().getMonth(), 1).toISOString())
            .limit(5000),
        // Pipeline query: active order_items only, capped to prevent unbounded scans.
        supabase
            .from('order_items')
            .select('id, status, factory_id, factories(id, name), orders!inner(id, order_number, status, created_at)')
            .not('orders.status', 'in', '("cancelled","refunded","completed")')
            .limit(2000),
        supabase
            .from('factories')
            .select('id, name, country'),
        // Stuck items: paid orders > 2 hours old with no converted design
        supabase
            .from('order_items')
            .select('id, product_name, converted_design_url, orders!inner(id, order_number, status, created_at)')
            .is('converted_design_url', null)
            .lt('created_at', twoHoursAgo)
            .eq('orders.status', 'paid'),
        listQuery,
    ])

    const totalPages = Math.ceil((totalCount ?? 0) / PAGE_SIZE)

    // ── KPI Calculations ──────────────────────────────────────────
    const now = new Date()
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)

    const allOrderStats = orderStats ?? []
    const REVENUE_STATUSES = ['paid', 'processing', 'partially_shipped', 'shipped', 'completed']
    const revenueStats = allOrderStats.filter((o) => REVENUE_STATUSES.includes(o.status))
    const pendingStats = allOrderStats.filter((o) => o.status === 'pending')

    const totalRevenue = revenueStats.reduce((s, o) => s + (o.total_price || 0), 0)
    const thisMonthRevenue = revenueStats
        .filter((o) => new Date(o.created_at) >= thisMonthStart)
        .reduce((s, o) => s + (o.total_price || 0), 0)
    const lastMonthRevenue = revenueStats
        .filter((o) => new Date(o.created_at) >= lastMonthStart && new Date(o.created_at) < thisMonthStart)
        .reduce((s, o) => s + (o.total_price || 0), 0)
    const revenueGrowth = lastMonthRevenue > 0
        ? Math.round(((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100)
        : null

    // Pipeline item counts from pipelineItems
    const allItems = pipelineItems ?? []

    const itemCounts = {
        unassigned: allItems.filter((i) => i.status === 'unassigned').length,
        assigned: allItems.filter((i) => i.status === 'assigned').length,
        manufacturing: allItems.filter((i) => i.status === 'manufacturing').length,
        ready_to_ship: allItems.filter((i) => i.status === 'ready_to_ship').length,
        shipped: allItems.filter((i) => i.status === 'shipped').length,
    }
    const totalItems = allItems.length
    const activeItems = totalItems - itemCounts.shipped

    // Delay alerts (paid orders only)
    const THRESHOLDS = { unassigned: 3, assigned: 7, manufacturing: 14 }
    const delayedItems = allItems.filter((item) => {
        const order = item.orders as any
        const activeOrderStatuses = ['paid', 'processing', 'partially_shipped']
        if (!activeOrderStatuses.includes(order?.status)) return false
        const days = daysSince(order.created_at)
        if (item.status === 'unassigned' && days > THRESHOLDS.unassigned) return true
        if (item.status === 'assigned' && days > THRESHOLDS.assigned) return true
        if (item.status === 'manufacturing' && days > THRESHOLDS.manufacturing) return true
        return false
    })
    const criticalItems = delayedItems.filter((i) => i.status === 'unassigned')
    const warningItems = delayedItems.filter((i) => i.status !== 'unassigned')

    // Factory workload
    const factoryStats = (factories ?? []).map((f) => {
        const fItems = allItems.filter((i) => i.factory_id === f.id)
        return {
            ...f,
            active: fItems.filter((i) => i.status !== 'shipped').length,
            manufacturing: fItems.filter((i) => i.status === 'manufacturing').length,
            assigned: fItems.filter((i) => i.status === 'assigned').length,
            shipped: fItems.filter((i) => i.status === 'shipped').length,
        }
    }).sort((a, b) => b.active - a.active)
    const maxFactoryActive = Math.max(1, ...factoryStats.map((f) => f.active))

    // Factory overload: flag factories with 10+ active items
    const FACTORY_OVERLOAD_THRESHOLD = 10
    const overloadedFactories = factoryStats.filter((f) => f.active >= FACTORY_OVERLOAD_THRESHOLD)

    // Completion rate (shipped / total active+shipped)
    const completionRate = totalItems > 0 ? Math.round((itemCounts.shipped / totalItems) * 100) : 0

    // Stuck items: already filtered to paid orders in the DB query
    const stuckPaidItems = stuckItems ?? []
    // Set of order IDs with stuck design processing — used to annotate the order list
    const stuckOrderIds = new Set(
        stuckPaidItems.map((item) => (item.orders as any)?.id).filter(Boolean) as string[]
    )

    const statusColors = ORDER_STATUS_COLORS
    const statusLabels = ORDER_STATUS_LABELS

    // Build pagination URL helper
    function buildUrl(p: number) {
        const params = new URLSearchParams()
        if (filterStatus) params.set('status', filterStatus)
        if (searchQuery) params.set('q', searchQuery)
        if (p > 1) params.set('page', String(p))
        const qs = params.toString()
        return `/admin${qs ? `?${qs}` : ''}`
    }

    return (
        <div className="space-y-8">
            {/* ── Section 1: Top Stats ─────────────────────────────── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Revenue this month */}
                <div className="rounded-xl border bg-card p-5 shadow-sm">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">今月の売上</p>
                    <p className="text-2xl font-bold text-primary mt-1">{formatPrice(thisMonthRevenue)}</p>
                    {revenueGrowth !== null && (
                        <p className={`text-xs mt-1 font-medium ${revenueGrowth >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                            {revenueGrowth >= 0 ? '▲' : '▼'} {Math.abs(revenueGrowth)}% 先月比
                        </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">累計: {formatPrice(totalRevenue)}</p>
                </div>
                {/* Active orders */}
                <div className="rounded-xl border bg-card p-5 shadow-sm">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">進行中注文</p>
                    <p className="text-2xl font-bold mt-1">{activeItems}</p>
                    <p className="text-xs text-muted-foreground mt-1">累計アイテム: {totalItems}件</p>
                    <div className="mt-2 bg-muted rounded-full h-1.5 overflow-hidden">
                        <div className="bg-green-500 h-full rounded-full" style={{ width: `${completionRate}%` }} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">発送完了率 {completionRate}%</p>
                </div>
                {/* Delay alerts */}
                <div className={`rounded-xl border p-5 shadow-sm ${delayedItems.length > 0 ? 'bg-red-50 border-red-200' : 'bg-card'}`}>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">遅延アラート</p>
                    <p className={`text-2xl font-bold mt-1 ${delayedItems.length > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {delayedItems.length > 0 ? `${delayedItems.length}件` : '問題なし'}
                    </p>
                    {criticalItems.length > 0 && (
                        <p className="text-xs text-red-600 font-semibold mt-1">🔴 未割当 {criticalItems.length}件</p>
                    )}
                    {warningItems.length > 0 && (
                        <p className="text-xs text-orange-500 font-semibold mt-0.5">🟡 遅延中 {warningItems.length}件</p>
                    )}
                </div>
                {/* Unassigned (action required) */}
                <div className={`rounded-xl border p-5 shadow-sm ${itemCounts.unassigned > 0 ? 'bg-orange-50 border-orange-200' : 'bg-card'}`}>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">未割当アイテム</p>
                    <p className={`text-2xl font-bold mt-1 ${itemCounts.unassigned > 0 ? 'text-destructive' : 'text-foreground'}`}>
                        {itemCounts.unassigned}件
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">要対応：工場割り当て</p>
                    {itemCounts.unassigned > 0 && (
                        <Link href="/admin?status=paid" className="text-xs text-primary underline mt-1 block">注文一覧で割り当て →</Link>
                    )}
                    {pendingStats.length > 0 && (
                        <Link href="/admin?status=pending" className="text-xs text-yellow-600 underline mt-1 block">
                            未払い {pendingStats.length}件あり →
                        </Link>
                    )}
                </div>
            </div>

            {/* ── Section 2: Production Pipeline ───────────────────── */}
            <div className="rounded-xl border bg-card p-6 shadow-sm">
                <h2 className="text-base font-bold mb-5">製造パイプライン</h2>
                <div className="flex items-stretch gap-0">
                    {[
                        { key: 'unassigned', label: '未割当', count: itemCounts.unassigned, color: 'bg-gray-100 border-gray-300', textColor: 'text-gray-700', dot: 'bg-gray-400', pct: totalItems > 0 ? Math.round(itemCounts.unassigned / totalItems * 100) : 0 },
                        { key: 'assigned', label: '対応開始', count: itemCounts.assigned, color: 'bg-yellow-50 border-yellow-300', textColor: 'text-yellow-800', dot: 'bg-yellow-400', pct: totalItems > 0 ? Math.round(itemCounts.assigned / totalItems * 100) : 0 },
                        { key: 'manufacturing', label: '製造中', count: itemCounts.manufacturing, color: 'bg-blue-50 border-blue-300', textColor: 'text-blue-800', dot: 'bg-blue-500', pct: totalItems > 0 ? Math.round(itemCounts.manufacturing / totalItems * 100) : 0 },
                        { key: 'ready_to_ship', label: '発送待ち', count: itemCounts.ready_to_ship, color: 'bg-purple-50 border-purple-300', textColor: 'text-purple-800', dot: 'bg-purple-500', pct: totalItems > 0 ? Math.round(itemCounts.ready_to_ship / totalItems * 100) : 0 },
                        { key: 'shipped', label: '発送完了', count: itemCounts.shipped, color: 'bg-green-50 border-green-300', textColor: 'text-green-800', dot: 'bg-green-500', pct: totalItems > 0 ? Math.round(itemCounts.shipped / totalItems * 100) : 0 },
                    ].map((stage, i) => (
                        <div key={stage.key} className="flex items-center flex-1">
                            <div className={`flex-1 rounded-xl border-2 ${stage.color} px-4 py-5 text-center`}>
                                <div className={`w-3 h-3 rounded-full ${stage.dot} mx-auto mb-2`} />
                                <p className={`text-2xl font-black ${stage.textColor}`}>{stage.count}</p>
                                <p className={`text-xs font-semibold ${stage.textColor} mt-0.5`}>{stage.label}</p>
                                <p className="text-xs text-muted-foreground mt-1">{stage.pct}%</p>
                            </div>
                            {i < 4 && (
                                <div className="flex items-center px-1 text-muted-foreground text-lg select-none">→</div>
                            )}
                        </div>
                    ))}
                </div>
                {/* Progress bar */}
                <div className="mt-5 flex h-3 rounded-full overflow-hidden gap-px bg-muted">
                    {totalItems > 0 && itemCounts.unassigned > 0 && <div className="bg-gray-400" style={{ width: `${Math.round(itemCounts.unassigned / totalItems * 100)}%` }} />}
                    {totalItems > 0 && itemCounts.assigned > 0 && <div className="bg-yellow-400" style={{ width: `${Math.round(itemCounts.assigned / totalItems * 100)}%` }} />}
                    {totalItems > 0 && itemCounts.manufacturing > 0 && <div className="bg-blue-500" style={{ width: `${Math.round(itemCounts.manufacturing / totalItems * 100)}%` }} />}
                    {totalItems > 0 && itemCounts.ready_to_ship > 0 && <div className="bg-purple-500" style={{ width: `${Math.round(itemCounts.ready_to_ship / totalItems * 100)}%` }} />}
                    {totalItems > 0 && itemCounts.shipped > 0 && <div className="bg-green-500" style={{ width: `${Math.round(itemCounts.shipped / totalItems * 100)}%` }} />}
                </div>
            </div>

            {/* ── Section 3: Delay Alerts ───────────────────────────── */}
            {delayedItems.length > 0 && (
                <div className="rounded-xl border border-red-200 bg-red-50/50 p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                        <span className="text-lg">⚠️</span>
                        <h2 className="text-base font-bold text-red-800">遅延アラート ({delayedItems.length}件)</h2>
                        <span className="text-xs text-red-600 ml-auto">未割当 {THRESHOLDS.unassigned}日超・対応開始 {THRESHOLDS.assigned}日超・製造中 {THRESHOLDS.manufacturing}日超</span>
                    </div>
                    <div className="rounded-xl overflow-hidden border border-red-200 bg-white">
                        <table className="w-full text-sm">
                            <thead className="bg-red-100/70 border-b border-red-200">
                                <tr>
                                    <th scope="col" className="text-left px-4 py-3 font-semibold text-red-900">注文番号</th>
                                    <th scope="col" className="text-left px-4 py-3 font-semibold text-red-900">ステータス</th>
                                    <th scope="col" className="text-left px-4 py-3 font-semibold text-red-900">工場</th>
                                    <th scope="col" className="text-right px-4 py-3 font-semibold text-red-900">経過日数</th>
                                    <th scope="col" className="px-4 py-3"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {delayedItems.map((item) => {
                                    const order = item.orders as any
                                    const days = daysSince(order.created_at)
                                    const isCritical = item.status === 'unassigned'
                                    return (
                                        <tr key={item.id} className={`border-b last:border-0 ${isCritical ? 'bg-red-50' : 'bg-orange-50/30'}`}>
                                            <td className="px-4 py-3 font-mono text-xs font-semibold">
                                                {order.order_number ?? '—'}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${isCritical ? 'bg-red-200 text-red-800' : 'bg-orange-200 text-orange-800'}`}>
                                                    {item.status === 'unassigned' ? '🔴 未割当' : item.status === 'assigned' ? '🟡 対応開始' : '🟡 製造中'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-muted-foreground">
                                                {(item.factories as any)?.name ?? <span className="text-red-500 font-semibold">未割当</span>}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <span className={`font-bold text-sm ${days > 14 ? 'text-red-600' : 'text-orange-500'}`}>
                                                    {days}日
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <Link
                                                    href={`/admin/orders/${order.id}`}
                                                    className="text-xs text-primary hover:underline whitespace-nowrap"
                                                >
                                                    対応する →
                                                </Link>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ── Section 3b: Stuck Orders (image processing failure) ── */}
            {stuckPaidItems.length > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                        <span className="text-lg">🔧</span>
                        <h2 className="text-base font-bold text-amber-900">画像処理エラー ({stuckPaidItems.length}件)</h2>
                        <span className="text-xs text-amber-700 ml-auto">支払済みだがデザイン変換未完了 (2時間超)</span>
                    </div>
                    <div className="rounded-xl overflow-hidden border border-amber-200 bg-white">
                        <table className="w-full text-sm">
                            <thead className="bg-amber-100/70 border-b border-amber-200">
                                <tr>
                                    <th scope="col" className="text-left px-4 py-3 font-semibold text-amber-900">注文番号</th>
                                    <th scope="col" className="text-left px-4 py-3 font-semibold text-amber-900">商品</th>
                                    <th scope="col" className="px-4 py-3"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {stuckPaidItems.map((item) => {
                                    const order = item.orders as any
                                    return (
                                        <tr key={item.id} className="border-b last:border-0 bg-amber-50/30">
                                            <td className="px-4 py-3 font-mono text-xs font-semibold">
                                                {order?.order_number ?? '—'}
                                            </td>
                                            <td className="px-4 py-3 font-medium">{item.product_name}</td>
                                            <td className="px-4 py-3 text-right">
                                                <Link
                                                    href={`/admin/orders/${order?.id}`}
                                                    className="text-xs text-primary hover:underline whitespace-nowrap"
                                                >
                                                    確認する →
                                                </Link>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                    <p className="text-xs text-amber-700 mt-3">
                        ⚠ デザインデータの自動変換が完了していません。工場ポータルでPDFが表示されない可能性があります。手動で確認してください。
                    </p>
                </div>
            )}

            {/* ── Section 4: Factory Workload ───────────────────────── */}
            {factoryStats.length > 0 && (
                <div className="rounded-xl border bg-card p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <h2 className="text-base font-bold">工場別ワークロード</h2>
                        {overloadedFactories.length > 0 && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded-full">
                                ⚠ 過負荷 {overloadedFactories.length}工場
                            </span>
                        )}
                    </div>
                    <div className="space-y-3">
                        {factoryStats.map((f) => {
                            const isOverloaded = f.active >= FACTORY_OVERLOAD_THRESHOLD
                            return (
                            <div key={f.id} className={`flex items-center gap-4 ${isOverloaded ? 'rounded-lg bg-red-50 px-3 py-2 -mx-3' : ''}`}>
                                <div className="w-36 shrink-0">
                                    <div className="flex items-center gap-1.5">
                                        <p className="text-sm font-semibold truncate">{f.name}</p>
                                        {isOverloaded && <span className="text-red-500 text-xs font-bold shrink-0">⚠</span>}
                                    </div>
                                    <p className="text-xs text-muted-foreground">{f.country}</p>
                                </div>
                                <div className="flex-1">
                                    <div className="flex gap-px h-5 rounded-full overflow-hidden bg-muted">
                                        {f.manufacturing > 0 && (
                                            <div className="bg-blue-500 flex items-center justify-center" style={{ width: `${Math.max(4, (f.manufacturing / maxFactoryActive) * 100)}%` }}>
                                                <span className="text-[10px] text-white font-bold px-1">{f.manufacturing}</span>
                                            </div>
                                        )}
                                        {f.assigned > 0 && (
                                            <div className="bg-yellow-400 flex items-center justify-center" style={{ width: `${Math.max(4, (f.assigned / maxFactoryActive) * 100)}%` }}>
                                                <span className="text-[10px] text-yellow-900 font-bold px-1">{f.assigned}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="w-40 shrink-0 flex gap-3 text-xs text-right">
                                    <span className="text-blue-700 font-semibold">製造中 {f.manufacturing}</span>
                                    <span className="text-yellow-700 font-semibold">対応中 {f.assigned}</span>
                                    <span className="text-green-600">済 {f.shipped}</span>
                                </div>
                            </div>
                            )
                        })}
                    </div>
                    <div className="flex gap-4 mt-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-500 inline-block" /> 製造中</span>
                        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-yellow-400 inline-block" /> 対応開始</span>
                        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-500 inline-block" /> 発送済</span>
                    </div>
                </div>
            )}

            {/* ── Section 5: Order List ────────────────────────────── */}
            <div>
                <div className="flex flex-col gap-3 mb-4">
                    <div className="flex items-center justify-between gap-4">
                        <h2 className="text-lg font-bold shrink-0">
                            注文一覧
                            {totalCount !== null && (
                                <span className="ml-2 text-sm font-normal text-muted-foreground">({totalCount}件)</span>
                            )}
                        </h2>
                        {/* CSV Export Buttons */}
                        <div className="flex gap-2 shrink-0">
                            <a
                                href={`/api/admin/export?type=orders${filterStatus ? `&status=${filterStatus}` : ''}`}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition"
                            >
                                ↓ 注文CSV
                            </a>
                            <a
                                href="/api/admin/export?type=items"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg transition"
                            >
                                ↓ 明細CSV
                            </a>
                        </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                        {/* Status Filter Tabs */}
                        <div className="flex gap-1 text-sm flex-wrap">
                            {[
                                { label: '全て', value: '' },
                                { label: '支払済', value: 'paid' },
                                { label: '発送完了', value: 'shipped' },
                                { label: '未払い', value: 'pending' },
                                { label: 'キャンセル', value: 'cancelled' },
                                { label: '返金済', value: 'refunded' },
                            ].map(({ label, value }) => (
                                <Link
                                    key={value}
                                    href={value ? `/admin?status=${value}${searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ''}` : `/admin${searchQuery ? `?q=${encodeURIComponent(searchQuery)}` : ''}`}
                                    className={`px-3 py-1.5 rounded-lg transition-colors ${
                                        (filterStatus ?? '') === value
                                            ? 'bg-primary text-primary-foreground font-medium'
                                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                    }`}
                                >
                                    {label}
                                </Link>
                            ))}
                        </div>
                        {/* Search Form */}
                        <form method="GET" action="/admin" className="flex gap-2 flex-1 min-w-0">
                            {filterStatus && <input type="hidden" name="status" value={filterStatus} />}
                            <input
                                type="text"
                                name="q"
                                defaultValue={searchQuery ?? ''}
                                placeholder="注文番号・メールで検索..."
                                className="flex-1 min-w-0 px-3 py-1.5 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                            />
                            <button
                                type="submit"
                                className="px-3 py-1.5 text-sm bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition shrink-0"
                            >
                                検索
                            </button>
                            {searchQuery && (
                                <Link
                                    href={filterStatus ? `/admin?status=${filterStatus}` : '/admin'}
                                    className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition shrink-0"
                                >
                                    ✕ クリア
                                </Link>
                            )}
                        </form>
                    </div>
                    {searchQuery && (
                        <p className="text-xs text-muted-foreground">
                            「{searchQuery}」の検索結果：{totalCount ?? 0}件
                        </p>
                    )}
                </div>
                <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/50 border-b">
                            <tr>
                                <th scope="col" className="text-left p-4 font-semibold">注文番号</th>
                                <th scope="col" className="text-left p-4 font-semibold">顧客情報</th>
                                <th scope="col" className="text-left p-4 font-semibold">金額</th>
                                <th scope="col" className="text-left p-4 font-semibold">ステータス</th>
                                <th scope="col" className="text-left p-4 font-semibold">製造進捗</th>
                                <th scope="col" className="text-left p-4 font-semibold">注文日時</th>
                                <th scope="col" className="text-left p-4 font-semibold">操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(pagedOrders ?? []).length > 0 ? (pagedOrders ?? []).map((order) => {
                                const info = order.customer_info as any
                                const items = (order.order_items as any[]) ?? []
                                const allShipped = items.length > 0 && items.every((i) => i.status === 'shipped')
                                const hasUnassigned = items.some((i) => i.status === 'unassigned')
                                const days = daysSince(order.created_at)
                                const isLate = !allShipped && order.status === 'paid' && days > 14
                                const hasStuckDesign = stuckOrderIds.has(order.id)
                                return (
                                    <tr key={order.id} className={`border-b last:border-0 transition-colors ${hasStuckDesign ? 'bg-amber-50/40 hover:bg-amber-50/60' : isLate ? 'bg-orange-50/30 hover:bg-orange-50/50' : 'hover:bg-muted/30'}`}>
                                        <td className="p-4">
                                            <div className="font-mono font-semibold text-sm">{order.order_number ?? '—'}</div>
                                            {isLate && <div className="text-[11px] text-orange-500 font-semibold mt-0.5">⚠ {days}日経過</div>}
                                            {hasStuckDesign && <div className="text-[11px] text-amber-600 font-semibold mt-0.5">🔧 デザインエラー</div>}
                                        </td>
                                        <td className="p-4">
                                            <div className="font-medium">{info?.name ?? (`${info?.lastName ?? ''} ${info?.firstName ?? ''}`.trim() || '—')}</div>
                                            <div className="text-xs text-muted-foreground">{info?.email ?? '—'}</div>
                                        </td>
                                        <td className="p-4 font-semibold whitespace-nowrap">{formatPrice(order.total_price)}</td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[order.status] ?? 'bg-gray-100 text-gray-700'}`}>
                                                {statusLabels[order.status] ?? order.status}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            {items.length === 0 ? (
                                                <span className="text-xs text-muted-foreground">—</span>
                                            ) : allShipped ? (
                                                <span className="text-xs font-semibold text-green-600">✅ 全発送済</span>
                                            ) : (
                                                <div className="flex flex-col gap-0.5">
                                                    {hasUnassigned && <span className="text-xs text-red-500 font-semibold">🔴 未割当あり</span>}
                                                    <span className="text-xs text-muted-foreground">
                                                        {items.filter((i) => i.status === 'shipped').length}/{items.length} 発送済
                                                    </span>
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-4 text-xs text-muted-foreground whitespace-nowrap">
                                            {new Date(order.created_at).toLocaleString('ja-JP')}
                                        </td>
                                        <td className="p-4">
                                            <Link href={`/admin/orders/${order.id}`} className="text-primary hover:underline text-sm whitespace-nowrap font-medium">
                                                詳細 →
                                            </Link>
                                        </td>
                                    </tr>
                                )
                            }) : (
                                <tr>
                                    <td colSpan={7} className="p-8 text-center text-muted-foreground">
                                        {searchQuery
                                            ? `「${searchQuery}」に一致する注文はありません`
                                            : filterStatus
                                            ? `「${statusLabels[filterStatus] ?? filterStatus}」の注文はありません`
                                            : '注文がまだありません'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4">
                        <p className="text-xs text-muted-foreground">
                            {offset + 1}〜{Math.min(offset + PAGE_SIZE, totalCount ?? 0)}件 / 全{totalCount ?? 0}件
                        </p>
                        <div className="flex items-center gap-1">
                            {currentPage > 1 && (
                                <Link
                                    href={buildUrl(currentPage - 1)}
                                    className="px-3 py-1.5 text-sm bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition"
                                >
                                    ← 前へ
                                </Link>
                            )}
                            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                                // Show pages around current page
                                let p: number
                                if (totalPages <= 7) {
                                    p = i + 1
                                } else if (currentPage <= 4) {
                                    p = i + 1
                                } else if (currentPage >= totalPages - 3) {
                                    p = totalPages - 6 + i
                                } else {
                                    p = currentPage - 3 + i
                                }
                                return (
                                    <Link
                                        key={p}
                                        href={buildUrl(p)}
                                        className={`px-3 py-1.5 text-sm rounded-lg transition ${
                                            p === currentPage
                                                ? 'bg-primary text-primary-foreground font-medium'
                                                : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                        }`}
                                    >
                                        {p}
                                    </Link>
                                )
                            })}
                            {currentPage < totalPages && (
                                <Link
                                    href={buildUrl(currentPage + 1)}
                                    className="px-3 py-1.5 text-sm bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition"
                                >
                                    次へ →
                                </Link>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
