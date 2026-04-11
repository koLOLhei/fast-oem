import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase/service'
import { formatPrice } from '@/lib/products'
import { addBusinessDays } from '@/lib/holidays'
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '@/lib/status-labels'
import { isValidUUID } from '@/lib/validation'
import { ReceiptButton } from './receipt-button'
import { InvoiceButton } from './invoice-button'
import { StatusPoller } from './status-poller'
import type { OrderRow, OrderItemRow, CustomerInfo, OrderItemOption } from '@/lib/database.types'
import type { ShippingAddress } from '@/lib/order'

type StatusPageItem = OrderItemRow & { _convertedUrl: string | null; _originalUrl: string | null }

export default async function OrderStatusPage({
    params,
    searchParams,
}: {
    params: Promise<{ id: string }>
    searchParams: Promise<{ token?: string }>
}) {
    const { id } = await params
    const { token } = await searchParams

    if (!token || !isValidUUID(id)) notFound()

    const supabase = createServiceClient()

    const { data: order, error: orderError } = await supabase
        .from('orders')
        .select(`*, order_items(*)`)
        .eq('id', id)
        .eq('access_token', token)
        .single()

    if (orderError) {
        console.error('[OrderStatusPage] Query error:', orderError.message)
    }
    if (!order) notFound()

    // Generate short-lived signed URLs so the customer can re-download their design files.
    // We do this server-side so the private bucket key never reaches the browser.
    const itemsWithUrls = await Promise.all(
        ((order.order_items as OrderItemRow[]) ?? []).map(async (item) => {
            let convertedUrl: string | null = item.converted_design_url ?? null
            let originalUrl: string | null = null

            // converted_design_url is stored as a storage path after processing
            if (convertedUrl && !convertedUrl.startsWith('http')) {
                const { data } = await supabase.storage.from('designs').createSignedUrl(convertedUrl, 3600)
                convertedUrl = data?.signedUrl ?? null
            }
            // original design: may be a storage path (not base64 / not http)
            if (item.design_url && !item.design_url.startsWith('data:') && !item.design_url.startsWith('http')) {
                const { data } = await supabase.storage.from('designs').createSignedUrl(item.design_url, 3600)
                originalUrl = data?.signedUrl ?? null
            }

            return { ...item, _convertedUrl: convertedUrl, _originalUrl: originalUrl }
        })
    )

    const customerInfo = order.customer_info as CustomerInfo
    const addr = order.shipping_address as ShippingAddress
    const personName = customerInfo?.name ?? `${customerInfo?.lastName ?? ''} ${customerInfo?.firstName ?? ''}`.trim()
    // For the ReceiptButton default: use saved receiptAddressee, then company name alone
    // (most corporations want "株式会社〇〇" without appending the person's name),
    // falling back to personal name only for individual customers.
    const companyNameStr: string = addr?.companyName?.trim() ?? ''
    const defaultReceiptAddressee = addr?.receiptAddressee?.trim()
        || customerInfo?.receiptAddressee?.trim()
        || companyNameStr
        || personName
    const CONTACT_EMAIL = process.env.CONTACT_EMAIL ?? 'contact@soara-mu.com'
    const TAX_RATE = 0.1

    const typedOrder = order as unknown as OrderRow
    const orderTotal: number = typedOrder.total_price ?? 0
    const shippingFee: number = typedOrder.shipping_fee ?? 0

    const items = itemsWithUrls
    const itemsTotal = items.reduce(
        (sum: number, item: StatusPageItem) => sum + (item.total_price ?? (item.unit_price * item.quantity)),
        0
    )
    const moldTotal = items.reduce((sum: number, item: StatusPageItem) => sum + (item.mold_fee ?? 0), 0)
    const expressTotal = items.reduce((sum: number, item: StatusPageItem) => sum + (item.express_delivery_fee ?? 0), 0)
    const priceExTax = Math.round(orderTotal / (1 + TAX_RATE))
    const taxAmount = orderTotal - priceExTax

    const statusLabel = ORDER_STATUS_LABELS
    const statusColor = ORDER_STATUS_COLORS

    const allShipped = items.every((item: StatusPageItem) => item.status === 'shipped')
    const someShipped = !allShipped && items.some((item: StatusPageItem) => item.status === 'shipped')
    const anyProcessing = items.some((item: StatusPageItem) =>
        ['manufacturing', 'ready_to_ship', 'assigned'].includes(item.status)
    )
    // Trust DB status for terminal states. 'completed' and 'shipped' are also
    // terminal — do not re-derive from item statuses to avoid stale-item edge cases.
    const displayStatus =
        ['pending', 'cancelled', 'refunded', 'completed', 'shipped'].includes(order.status)
            ? order.status
        : allShipped ? 'shipped'
        : someShipped ? 'partially_shipped'
        : anyProcessing ? 'processing'
        : 'paid'

    // Interpret created_at in JST for all date calculations.
    // Supabase stores timestamps in UTC; on Vercel (UTC server) Date methods
    // return UTC values. Offsetting by +9 h makes local date methods return
    // the JST calendar date, so business-day and holiday checks are correct.
    const JST_OFFSET_MS = 9 * 60 * 60 * 1000
    const orderDate = new Date(new Date(order.created_at).getTime() + JST_OFFSET_MS)
    const moldExpiryDate = new Date(orderDate)
    moldExpiryDate.setFullYear(moldExpiryDate.getFullYear() + 1)
    const hasMoldItems = items.some((item: StatusPageItem) => (item.mold_fee ?? 0) > 0)
    const now = new Date()
    const moldDaysLeft = Math.ceil((moldExpiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    const moldExpired = moldDaysLeft <= 0
    const moldExpiringSoon = !moldExpired && moldDaysLeft <= 60  // warn within 60 days

    // Estimated delivery (shown when not yet shipped)
    const hasExpress = items.some((item: StatusPageItem) => (item.express_delivery_fee ?? 0) > 0)
    const deliveryBusinessDays = hasExpress ? 12 : 15
    const estimatedDeliveryDate = addBusinessDays(orderDate, deliveryBusinessDays)
    const estimatedDeliveryStr = estimatedDeliveryDate.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' })

    return (
        <div className="min-h-screen bg-muted/30 py-12">
            {/* Auto-refresh every 30 s so status updates are reflected without manual reload */}
            <StatusPoller orderId={id} currentStatus={displayStatus} intervalMs={30000} />
            <div className="max-w-2xl mx-auto px-4 space-y-6">
                {/* Header */}
                <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                        <h1 className="text-2xl font-bold">注文状況の確認</h1>
                        <p className="text-sm text-muted-foreground">
                            このページのURLはあなた専用です。他の方と共有しないようにご注意ください。
                        </p>
                    </div>
                    {/* Receipt and invoice only available after payment is confirmed */}
                    {!['pending', 'cancelled', 'refunded'].includes(displayStatus) && (
                        <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                            <ReceiptButton
                                orderId={id}
                                token={token}
                                defaultName={defaultReceiptAddressee}
                            />
                            <InvoiceButton
                                orderId={id}
                                token={token}
                                defaultName={defaultReceiptAddressee}
                            />
                        </div>
                    )}
                </div>

                {/* Status Card */}
                <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs text-muted-foreground">注文番号</p>
                            <p className="font-mono text-xs mt-0.5">{typedOrder.order_number ?? order.stripe_session_id}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${statusColor[displayStatus] ?? 'bg-gray-100 text-gray-700'}`}>
                            {statusLabel[displayStatus] ?? order.status}
                        </span>
                    </div>
                    <hr />
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <p className="text-muted-foreground">注文日</p>
                            <p className="mt-0.5">{new Date(order.created_at).toLocaleDateString('ja-JP')}</p>
                        </div>
                        <div>
                            <p className="text-muted-foreground">お名前</p>
                            {companyNameStr && (
                                <p className="mt-0.5 text-xs text-muted-foreground">{companyNameStr}</p>
                            )}
                            <p className="mt-0.5">{personName}</p>
                        </div>
                    </div>
                </div>

                {/* Estimated delivery */}
                {displayStatus === 'pending' && (
                    <div className="rounded-xl border border-[#00c8c8]/40 bg-[#00c8c8]/5 p-4 flex items-center gap-3 text-sm">
                        <span className="text-2xl">🚚</span>
                        <div>
                            <p className="text-xs text-muted-foreground">お届け目安</p>
                            <p className="font-bold text-foreground">
                                入金確認後、{hasExpress ? '約12' : '約15'}営業日以内
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {hasExpress ? '⚡ 特急プラン・' : ''}土日祝を除く（目安）
                            </p>
                        </div>
                    </div>
                )}
                {!['pending', 'shipped', 'completed', 'cancelled', 'refunded'].includes(displayStatus) && (
                    <div className="rounded-xl border border-[#00c8c8]/40 bg-[#00c8c8]/5 p-4 flex items-center gap-3 text-sm">
                        <span className="text-2xl">🚚</span>
                        <div>
                            <p className="text-xs text-muted-foreground">お届け予定日</p>
                            <p className="font-bold text-foreground">{estimatedDeliveryStr} 頃</p>
                            <p className="text-xs text-muted-foreground">
                                {hasExpress ? '⚡ 特急プラン・' : ''}土日祝を除く{deliveryBusinessDays}営業日（目安）
                            </p>
                        </div>
                    </div>
                )}

                {/* Items */}
                <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b font-semibold text-sm">ご注文内容</div>
                    <table className="w-full text-sm">
                        <tbody>
                            {items.map((item: StatusPageItem) => {
                                // product_id is the slug for legacy products; newer ones use UUID
                                const productSlug = item.product_id as string | undefined
                                return (
                                <tr key={item.id} className="border-b last:border-0">
                                    <td className="p-4">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <p className="font-medium">{item.product_name}</p>
                                                {item.options?.length > 0 && (
                                                    <p className="text-xs text-muted-foreground mt-0.5">
                                                        {(item.options as OrderItemOption[]).map((o) => `${o.name}: ${o.value}`).join(' / ')}
                                                    </p>
                                                )}
                                                {(item.mold_fee ?? 0) > 0 && (
                                                    <p className="text-xs text-orange-600 mt-0.5">+ 型代 {formatPrice(item.mold_fee ?? 0)}</p>
                                                )}
                                            </div>
                                            {productSlug && (
                                                <Link
                                                    href={`/products/${productSlug}`}
                                                    className="shrink-0 text-xs text-primary border border-primary/30 hover:bg-primary/5 rounded-full px-2 py-0.5 whitespace-nowrap transition"
                                                >
                                                    再注文 →
                                                </Link>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-4 text-right text-muted-foreground whitespace-nowrap">
                                        {item.quantity}個
                                    </td>
                                    <td className="p-4 text-right whitespace-nowrap">
                                        {formatPrice(item.total_price ?? (item.unit_price * item.quantity))}
                                    </td>
                                </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Price Breakdown */}
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
                        {expressTotal > 0 && (
                            <div className="flex justify-between">
                                <dt className="text-muted-foreground">⚡ 特急料金</dt>
                                <dd className="text-orange-600">{formatPrice(expressTotal)}</dd>
                            </div>
                        )}
                        {shippingFee > 0 && (
                            <div className="flex justify-between">
                                <dt className="text-muted-foreground">送料（離島・遠隔地）</dt>
                                <dd className="text-orange-600">{formatPrice(shippingFee)}</dd>
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
                            <dd className="text-primary">{formatPrice(orderTotal)}</dd>
                        </div>
                    </dl>
                </div>

                {/* Progress Stepper */}
                <div className="rounded-xl border bg-card p-5 shadow-sm">
                    <p className="font-semibold text-sm mb-5">注文の進捗</p>
                    <div className="relative flex items-start justify-between">
                        {/* Connector line */}
                        <div className="absolute top-5 left-0 right-0 h-1 bg-muted mx-10" />
                        <div
                            className="absolute top-5 left-0 h-1 bg-primary transition-all duration-500"
                            style={{
                                marginLeft: '2.5rem',
                                width: displayStatus === 'paid'
                                    ? '0%'
                                    : displayStatus === 'processing'
                                    ? '50%'
                                    : displayStatus === 'partially_shipped'
                                    ? '75%'
                                    : '100%',
                                right: 'auto',
                            }}
                        />
                        {([
                            { key: 'paid',       icon: '💳', label: '入金確認済み' },
                            { key: 'processing', icon: '🏭', label: '製造中' },
                            { key: 'shipped',    icon: '🚚', label: '発送完了' },
                        ] as const).map(({ key, icon, label }, i) => {
                            // partially_shipped maps between processing and shipped
                            const stepMap: Record<string, number> = { paid: 0, processing: 1, partially_shipped: 1, shipped: 2 }
                            const currentIdx = stepMap[displayStatus] ?? 0
                            const stepIdx = i
                            const isDone = stepIdx <= currentIdx
                            const isCurrent = stepIdx === currentIdx
                            return (
                                <div key={key} className="relative flex flex-col items-center gap-2 flex-1">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg border-2 transition-all z-10 ${
                                        isCurrent
                                            ? 'border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/30 scale-110'
                                            : isDone
                                            ? 'border-primary bg-primary/10 text-primary'
                                            : 'border-muted bg-background text-muted-foreground'
                                    }`}>
                                        {isDone && !isCurrent ? '✓' : icon}
                                    </div>
                                    <span className={`text-xs font-semibold text-center leading-tight ${
                                        isCurrent ? 'text-primary' : isDone ? 'text-foreground' : 'text-muted-foreground'
                                    }`}>
                                        {label}
                                    </span>
                                    {isCurrent && (
                                        <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                                            現在
                                        </span>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* Item Status Timeline */}
                <div className="rounded-xl border bg-card p-5 shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                        <p className="font-semibold text-sm">商品ごとのステータス</p>
                        {someShipped && (
                            <span className="text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                                一部発送済み ({items.filter((i: StatusPageItem) => i.status === 'shipped').length}/{items.length})
                            </span>
                        )}
                    </div>
                    {items.map((item: StatusPageItem) => {
                        const itemStatusLabel: Record<string, string> = {
                            unassigned: '工場割り当て待ち',
                            assigned: '工場に割り当て済み',
                            manufacturing: '製造中',
                            ready_to_ship: '発送準備中',
                            shipped: '発送完了',
                            cancelled: 'キャンセル',
                        }
                        const itemStatusColor: Record<string, string> = {
                            unassigned: 'text-gray-500',
                            assigned: 'text-blue-600',
                            manufacturing: 'text-yellow-600',
                            ready_to_ship: 'text-purple-600',
                            shipped: 'text-green-600',
                            cancelled: 'text-red-500',
                        }
                        return (
                            <div key={item.id} className="flex items-center justify-between text-sm gap-3">
                                <span className="text-muted-foreground min-w-0 truncate">{item.product_name}（{item.quantity}個）</span>
                                <span className={`shrink-0 font-medium ${itemStatusColor[item.status] ?? 'text-gray-500'}`}>
                                    {item.tracking_number && item.status === 'shipped'
                                        ? `発送完了 — ${item.tracking_number}`
                                        : (itemStatusLabel[item.status] ?? item.status)}
                                </span>
                            </div>
                        )
                    })}
                </div>

                {/* Mold expiry reminder */}
                {hasMoldItems && !moldExpired && (
                    <div className={`rounded-xl border p-4 shadow-sm ${moldExpiringSoon ? 'border-orange-300 bg-orange-50' : 'border-border bg-card'}`}>
                        <div className="flex items-start gap-3">
                            <span className="text-xl shrink-0">{moldExpiringSoon ? '⚠️' : '🔖'}</span>
                            <div>
                                <p className={`font-semibold text-sm ${moldExpiringSoon ? 'text-orange-800' : 'text-foreground'}`}>
                                    {moldExpiringSoon ? '型の保管期限が近づいています' : '型の保管期限'}
                                </p>
                                <p className={`text-xs mt-0.5 ${moldExpiringSoon ? 'text-orange-700' : 'text-muted-foreground'}`}>
                                    今回の型は <strong>{moldExpiryDate.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}</strong> まで保管されます。
                                    {moldExpiringSoon
                                        ? `（残り${moldDaysLeft}日）期限内に再注文すると型代が不要です。`
                                        : '期限内の再注文で型代が不要になります。'}
                                </p>
                                {moldExpiringSoon && (
                                    <Link href="/products" className="inline-block mt-2 text-xs font-semibold text-orange-700 border border-orange-300 hover:bg-orange-100 rounded-full px-3 py-0.5 transition">
                                        今すぐ再注文する →
                                    </Link>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Design file download */}
                {items.some((item: StatusPageItem) => item._convertedUrl || item._originalUrl) && (
                    <div className="rounded-xl border bg-card p-5 shadow-sm space-y-3">
                        <p className="font-semibold text-sm">入稿データのダウンロード</p>
                        <p className="text-xs text-muted-foreground">変換済みデータ・元データをダウンロードできます（リンクは1時間有効）。</p>
                        {items.map((item: StatusPageItem) => {
                            if (!item._convertedUrl && !item._originalUrl) return null
                            return (
                                <div key={item.id} className="space-y-1.5">
                                    <p className="text-xs font-medium text-muted-foreground truncate">{item.product_name}</p>
                                    <div className="flex flex-wrap gap-2">
                                        {item._convertedUrl && (
                                            <a
                                                href={item._convertedUrl}
                                                download
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90 transition"
                                            >
                                                ⬇ 変換済みデータ (.png)
                                            </a>
                                        )}
                                        {item._originalUrl && (
                                            <a
                                                href={item._originalUrl}
                                                download
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 border text-xs font-medium rounded-lg hover:bg-muted transition"
                                            >
                                                ⬇ 元データ
                                            </a>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}

                {/* Address correction request — only shown before shipment starts */}
                {['pending', 'paid', 'processing'].includes(displayStatus) && (
                    <div className="rounded-xl border bg-card p-5 shadow-sm space-y-2">
                        <p className="font-semibold text-sm">配送先住所の変更依頼</p>
                        <p className="text-xs text-muted-foreground">
                            製造開始前であれば住所を変更できる場合があります。できるだけお早めにご連絡ください。
                        </p>
                        <a
                            href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(`【住所変更依頼】注文番号: ${typedOrder.order_number ?? id}`)}&body=${encodeURIComponent(`注文番号: ${typedOrder.order_number ?? id}\n\n変更後の住所:\n〒\n都道府県:\n市区町村:\n番地:\nマンション名等:\n\nお名前:\n`)}`}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-lg transition"
                        >
                            📧 住所変更をメールで依頼する
                        </a>
                    </div>
                )}

                <div className="rounded-xl border bg-card p-5 shadow-sm text-center space-y-1 pb-8">
                    <p className="text-sm font-semibold text-foreground">ご不明な点はお気軽にお問い合わせください</p>
                    <p className="text-sm text-muted-foreground">
                        メール：<a href={`mailto:${CONTACT_EMAIL}`} className="text-primary underline hover:text-primary/80">{CONTACT_EMAIL}</a>
                    </p>
                    <p className="text-xs text-muted-foreground">平日 10:00〜18:00 対応（土日祝除く）</p>
                    <p className="text-xs text-muted-foreground mt-1">
                        <a href="/faq" className="underline hover:text-foreground">よくある質問（FAQ）</a>もご参照ください
                    </p>
                </div>
            </div>
        </div>
    )
}
