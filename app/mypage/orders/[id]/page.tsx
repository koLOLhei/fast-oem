import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { formatPrice } from '@/lib/products'
import { Fragment } from 'react'
import type { OrderItemRow, OrderItemOption } from '@/lib/database.types'
import type { ShippingAddress } from '@/lib/order'

export default async function MyOrderDetailPage({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: order } = await supabase
        .from('orders')
        .select(`*, order_items(*)`)
        .eq('id', id)
        .eq('customer_info->>email', user.email) // Security: only the right customer can see this
        .single()

    if (!order) notFound()

    const shippingAddress = order.shipping_address as ShippingAddress
    const TAX_RATE = 0.1

    // Calculate totals
    const items = order.order_items as OrderItemRow[]
    const itemsTotal = items.reduce((sum, item) => sum + (item.total_price ?? (item.unit_price * item.quantity)), 0)
    const moldTotal = items.reduce((sum, item) => sum + (item.mold_fee ?? 0), 0)

    const priceExTax = Math.round(order.total_price / (1 + TAX_RATE))
    const taxAmount = order.total_price - priceExTax

    return (
        <div className="min-h-screen bg-muted/30 py-12">
            <div className="max-w-3xl mx-auto px-4 space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <Link href="/mypage" className="text-sm text-primary hover:underline">← 注文一覧に戻る</Link>
                        <h1 className="text-2xl font-bold mt-2">注文詳細・領収書</h1>
                    </div>
                    <a
                        href={`/api/receipts/${order.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition"
                    >
                        📄 領収書PDFをダウンロード
                    </a>
                </div>

                {/* Order Info */}
                <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <p className="text-muted-foreground">注文番号</p>
                            <p className="font-mono mt-0.5 text-xs">{order.stripe_session_id}</p>
                        </div>
                        <div>
                            <p className="text-muted-foreground">注文日</p>
                            <p className="mt-0.5">{new Date(order.created_at).toLocaleDateString('ja-JP')}</p>
                        </div>
                    </div>
                    <hr />
                    <div className="font-semibold">お届け先</div>
                    <address className="not-italic text-sm text-muted-foreground leading-relaxed">
                        〒{shippingAddress?.postalCode}<br />
                        {shippingAddress?.prefecture}{shippingAddress?.city}{shippingAddress?.address1}<br />
                        {shippingAddress?.lastName} {shippingAddress?.firstName} 様<br />
                        TEL: {shippingAddress?.phone}
                    </address>
                </div>

                {/* Items */}
                <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/50 border-b">
                            <tr>
                                <th className="text-left p-4 font-semibold">商品</th>
                                <th className="text-right p-4 font-semibold">数量</th>
                                <th className="text-right p-4 font-semibold">小計</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(order.order_items as OrderItemRow[]).map((item) => (
                                <Fragment key={item.id}>
                                    <tr className="border-b">
                                        <td className="p-4">
                                            <p className="font-medium">{item.product_name}</p>
                                            {item.options?.length > 0 && (
                                                <p className="text-xs text-muted-foreground">
                                                    {(item.options as OrderItemOption[]).map((o) => `${o.name}: ${o.value}`).join(' / ')}
                                                </p>
                                            )}
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {formatPrice(item.unit_price)} × {item.quantity}個
                                            </p>
                                        </td>
                                        <td className="p-4 text-right">{item.quantity}個</td>
                                        <td className="p-4 text-right">{formatPrice(item.total_price ?? (item.unit_price * item.quantity))}</td>
                                    </tr>
                                    {item.mold_fee && item.mold_fee > 0 && (
                                        <tr className="border-b last:border-0 bg-orange-50/30">
                                            <td className="p-4 pl-8">
                                                <p className="text-sm text-orange-700">
                                                    型代（初回のみ）
                                                    {item.mold_order_id && <span className="ml-2 text-xs">(再利用)</span>}
                                                </p>
                                            </td>
                                            <td className="p-4 text-right text-muted-foreground">1</td>
                                            <td className="p-4 text-right text-orange-700 font-medium">{formatPrice(item.mold_fee)}</td>
                                        </tr>
                                    )}
                                </Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Price breakdown */}
                <div className="rounded-xl border bg-card p-5 shadow-sm">
                    <dl className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <dt className="text-muted-foreground">商品代</dt>
                            <dd>{formatPrice(itemsTotal)}</dd>
                        </div>
                        {moldTotal > 0 && (
                            <div className="flex justify-between">
                                <dt className="text-muted-foreground">型代（初回のみ）</dt>
                                <dd className="text-orange-700">{formatPrice(moldTotal)}</dd>
                            </div>
                        )}
                        <div className="flex justify-between">
                            <dt className="text-muted-foreground">小計（税抜）</dt>
                            <dd>{formatPrice(priceExTax)}</dd>
                        </div>
                        <div className="flex justify-between">
                            <dt className="text-muted-foreground">消費税（10%）</dt>
                            <dd>{formatPrice(taxAmount)}</dd>
                        </div>
                        <hr />
                        <div className="flex justify-between font-bold text-base">
                            <dt>合計（税込）</dt>
                            <dd className="text-primary">{formatPrice(order.total_price)}</dd>
                        </div>
                    </dl>
                </div>
            </div>
        </div>
    )
}
