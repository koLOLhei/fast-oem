import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { assignFactory } from '@/app/actions/factory'

export default async function OrderDetailPage({
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
        .select(`*, order_items(*, factories(id, name))`)
        .eq('id', id)
        .single()

    if (!order) notFound()

    const { data: factories } = await supabase.from('factories').select('id, name, country')

    const formatPrice = (yen: number) =>
        new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(yen)

    const shippingAddress = order.shipping_address as any

    return (
        <div className="space-y-8 max-w-4xl">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold">注文詳細</h2>
                    <p className="text-sm text-muted-foreground mt-1 font-mono">{order.stripe_session_id}</p>
                </div>
                <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${order.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'
                    }`}>
                    {order.status}
                </span>
            </div>

            {/* Customer & Shipping Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-xl border bg-card p-5">
                    <h3 className="font-semibold mb-3">顧客情報</h3>
                    <dl className="space-y-1 text-sm">
                        <div className="flex gap-2"><dt className="text-muted-foreground w-24">氏名</dt><dd>{(order.customer_info as any)?.name}</dd></div>
                        <div className="flex gap-2"><dt className="text-muted-foreground w-24">Email</dt><dd>{(order.customer_info as any)?.email}</dd></div>
                    </dl>
                </div>
                <div className="rounded-xl border bg-card p-5">
                    <h3 className="font-semibold mb-3">配送先</h3>
                    <address className="not-italic text-sm text-muted-foreground">
                        〒{shippingAddress?.postalCode}<br />
                        {shippingAddress?.prefecture}{shippingAddress?.city}{shippingAddress?.address1}<br />
                        {shippingAddress?.lastName} {shippingAddress?.firstName}<br />
                        TEL: {shippingAddress?.phone}
                    </address>
                </div>
            </div>

            {/* Total */}
            <div className="rounded-xl border bg-card p-5">
                <p className="text-sm text-muted-foreground">合計金額</p>
                <p className="text-3xl font-bold text-primary">{formatPrice(order.total_price)}</p>
            </div>

            {/* Order Items with Factory Assignment */}
            <div>
                <h3 className="text-lg font-bold mb-4">注文アイテム・工場割り当て</h3>
                <div className="space-y-4">
                    {(order.order_items as any[]).map((item) => (
                        <div key={item.id} className="rounded-xl border bg-card p-5">
                            <div className="flex flex-col md:flex-row gap-4">
                                <div className="flex-1 space-y-2">
                                    <h4 className="font-semibold">{item.product_name}</h4>
                                    <div className="text-sm space-y-1">
                                        <p className="text-muted-foreground">数量: {item.quantity}個</p>
                                        <p className="text-muted-foreground">
                                            単価: {formatPrice(item.unit_price)}
                                        </p>
                                        <p className="font-medium">
                                            商品小計: {formatPrice(item.total_price || item.unit_price * item.quantity)}
                                        </p>
                                        {item.mold_fee && item.mold_fee > 0 && (
                                            <p className="text-orange-700 font-medium">
                                                + 型代: {formatPrice(item.mold_fee)}
                                                {item.mold_order_id && ' (再利用)'}
                                            </p>
                                        )}
                                    </div>
                                    {item.options?.length > 0 && (
                                        <p className="text-sm text-muted-foreground">
                                            オプション: {(item.options as any[]).map((o: any) => `${o.name}: ${o.value}`).join(', ')}
                                        </p>
                                    )}
                                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${item.status === 'shipped' ? 'bg-green-100 text-green-800' :
                                            item.status === 'manufacturing' ? 'bg-blue-100 text-blue-800' :
                                                item.status === 'assigned' ? 'bg-yellow-100 text-yellow-800' :
                                                    'bg-gray-100 text-gray-700'
                                        }`}>
                                        {item.status}
                                    </span>
                                    {item.converted_design_url && (
                                        <div>
                                            <a
                                                href={item.converted_design_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-xs text-primary underline"
                                            >
                                                変換済みデザインをDL
                                            </a>
                                        </div>
                                    )}
                                </div>

                                {/* Factory Assignment */}
                                <div className="md:w-64 space-y-2">
                                    <p className="text-sm font-medium">割り当て工場</p>
                                    <p className="text-sm text-muted-foreground">
                                        現在: {item.factories?.name ?? '未割り当て'}
                                    </p>
                                    <form>
                                        <input type="hidden" name="itemId" value={item.id} />
                                        <select
                                            name="factoryId"
                                            className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background mb-2"
                                            defaultValue={item.factory_id ?? ''}
                                        >
                                            <option value="">-- 工場を選択 --</option>
                                            {factories?.map((f) => (
                                                <option key={f.id} value={f.id}>
                                                    {f.name} ({f.country})
                                                </option>
                                            ))}
                                        </select>
                                        <AssignButton itemId={item.id} />
                                    </form>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

// Small inline client component for the factory assignment button
function AssignButton({ itemId }: { itemId: string }) {
    return (
        <button
            type="submit"
            formAction={async (fd: FormData) => {
                'use server'
                const fId = fd.get('factoryId') as string
                if (fId) await assignFactory(itemId, fId)
            }}
            className="w-full bg-primary text-primary-foreground text-sm px-4 py-2 rounded-lg hover:bg-primary/90 transition"
        >
            割り当てを保存
        </button>
    )
}
