import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { formatPrice } from '@/lib/products'
import { ORDER_STATUS_LABELS } from '@/lib/status-labels'
import type { OrderItemRow } from '@/lib/database.types'

export const metadata: Metadata = {
    title: 'マイページ',
    robots: { index: false, follow: false },
}

export default async function MypagePage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    // Run profile check and orders fetch in parallel to reduce latency.
    // Use service client for both to bypass RLS — customers don't have
    // SELECT policies on orders, so the anon client would return empty results.
    const serviceClient = createServiceClient()
    const [{ data: profile }, { data: orders }] = await Promise.all([
        serviceClient
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single(),
        serviceClient
            .from('orders')
            .select(`*, order_items(product_name, quantity)`)
            .eq('customer_info->>email', user.email ?? '')
            .order('created_at', { ascending: false }),
    ])

    // Redirect staff roles to their own portals — prevents accidental /mypage access
    if (profile?.role === 'admin' || profile?.role === 'super_admin') redirect('/admin')
    if (profile?.role === 'factory') redirect('/factory')

    const statusLabels = ORDER_STATUS_LABELS

    return (
        <div className="min-h-screen bg-muted/30 py-12">
            <div className="max-w-4xl mx-auto px-4">
                <div className="mb-8">
                    <h1 className="text-2xl font-bold">マイページ</h1>
                    <p className="text-sm text-muted-foreground mt-1">{user.email}</p>
                </div>

                <div>
                    <h2 className="text-xl font-semibold mb-4">注文履歴</h2>
                    {(!orders || orders.length === 0) ? (
                        <div className="rounded-xl border bg-card p-12 text-center text-muted-foreground">
                            注文履歴がありません
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {orders.map((order) => (
                                <div key={order.id} className="rounded-xl border bg-card p-5 shadow-sm">
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                        <div className="space-y-1">
                                            <p className="text-xs text-muted-foreground font-mono truncate max-w-xs">
                                                注文番号: {order.stripe_session_id?.slice(8, 28)}...
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {new Date(order.created_at).toLocaleDateString('ja-JP')}
                                            </p>
                                            <p className="text-sm">
                                                {(order.order_items as Pick<OrderItemRow, 'product_name' | 'quantity'>[]).map((i) => `${i.product_name} ×${i.quantity}`).join(', ')}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <p className="font-bold text-primary">{formatPrice(order.total_price)}</p>
                                            <span className={`px-2 py-1 text-xs rounded-full font-medium ${order.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                                }`}>
                                                {statusLabels[order.status] ?? order.status}
                                            </span>
                                            <Link
                                                href={`/mypage/orders/${order.id}`}
                                                className="text-sm text-primary hover:underline whitespace-nowrap"
                                            >
                                                詳細・領収書
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
