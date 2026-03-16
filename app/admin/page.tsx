import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'

export default async function AdminPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    // Fetch all orders with items
    const { data: orders } = await supabase
        .from('orders')
        .select(`*, order_items(*, factories(name))`)
        .order('created_at', { ascending: false })

    const totalRevenue = orders?.reduce((sum, o) => sum + (o.total_price || 0), 0) ?? 0
    const unassignedCount = orders?.reduce((sum, o) => {
        return sum + (o.order_items?.filter((i: any) => i.status === 'unassigned').length ?? 0)
    }, 0) ?? 0

    const formatPrice = (yen: number) =>
        new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(yen)

    const statusColors: Record<string, string> = {
        paid: 'bg-green-100 text-green-800',
        pending: 'bg-yellow-100 text-yellow-800',
        failed: 'bg-red-100 text-red-800',
    }

    return (
        <div className="space-y-8">
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-xl border bg-card p-6 shadow-sm">
                    <p className="text-sm text-muted-foreground">総売上</p>
                    <p className="text-3xl font-bold text-primary mt-1">{formatPrice(totalRevenue)}</p>
                </div>
                <div className="rounded-xl border bg-card p-6 shadow-sm">
                    <p className="text-sm text-muted-foreground">総注文件数</p>
                    <p className="text-3xl font-bold mt-1">{orders?.length ?? 0}</p>
                </div>
                <div className="rounded-xl border bg-card p-6 shadow-sm">
                    <p className="text-sm text-muted-foreground">未割り当てアイテム数</p>
                    <p className="text-3xl font-bold text-destructive mt-1">{unassignedCount}</p>
                </div>
            </div>

            {/* Quick Nav */}
            <div className="flex gap-3">
                <Link
                    href="/admin/factories"
                    className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition"
                >
                    工場管理
                </Link>
            </div>

            {/* Order List */}
            <div>
                <h2 className="text-xl font-bold mb-4">注文一覧</h2>
                <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/50 border-b">
                            <tr>
                                <th className="text-left p-4 font-semibold">注文番号</th>
                                <th className="text-left p-4 font-semibold">顧客</th>
                                <th className="text-left p-4 font-semibold">金額</th>
                                <th className="text-left p-4 font-semibold">ステータス</th>
                                <th className="text-left p-4 font-semibold">日時</th>
                                <th className="text-left p-4 font-semibold">操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders && orders.length > 0 ? orders.map((order) => (
                                <tr key={order.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                                    <td className="p-4 font-mono text-xs text-muted-foreground">
                                        {order.stripe_session_id?.slice(8, 20)}...
                                    </td>
                                    <td className="p-4">
                                        <div>{(order.customer_info as any)?.name ?? '—'}</div>
                                        <div className="text-xs text-muted-foreground">{(order.customer_info as any)?.email ?? ''}</div>
                                    </td>
                                    <td className="p-4 font-semibold">{formatPrice(order.total_price)}</td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[order.status] ?? 'bg-gray-100 text-gray-700'}`}>
                                            {order.status}
                                        </span>
                                    </td>
                                    <td className="p-4 text-xs text-muted-foreground">
                                        {new Date(order.created_at).toLocaleString('ja-JP')}
                                    </td>
                                    <td className="p-4">
                                        <Link
                                            href={`/admin/orders/${order.id}`}
                                            className="text-primary hover:underline text-sm"
                                        >
                                            詳細・割り当て
                                        </Link>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                                        注文がまだありません
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
