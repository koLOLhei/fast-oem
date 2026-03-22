import { createServiceClient } from '@/lib/supabase/service'
import { notFound, redirect } from 'next/navigation'
import { assignFactory, updateOrderNote, updateFactoryNote } from '@/app/actions/factory'
import { SecretUrlCopier } from './secret-url-copier'
import { ConfirmBulkAssignForm } from './confirm-bulk-assign-button'
import { CancelOrderForm } from './cancel-order-form'
import { toSignedUrls } from '@/lib/supabase/storage'
import { ITEM_STATUS_LABELS, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '@/lib/status-labels'

export const dynamic = 'force-dynamic'

export default async function OrderDetailPage({
    params,
    searchParams,
}: {
    params: Promise<{ id: string }>
    searchParams: Promise<{ msg?: string }>
}) {
    const { id } = await params
    const { msg } = await searchParams
    // Auth + role already enforced by admin/layout.tsx — use service client to skip RLS.
    const supabase = createServiceClient()

    // Run order and factories lookups in parallel.
    const [{ data: order }, { data: factories }] = await Promise.all([
        supabase
            .from('orders')
            .select(`*, order_items(*, factories(id, name))`)
            .eq('id', id)
            .single(),
        supabase.from('factories').select('id, name, country').eq('is_active', true),
    ])

    if (!order) notFound()

    // Validate that a URL (public or signed) belongs to our Supabase project.
    // Signed URLs contain a `token` query param; public URLs do not.
    // Both are accepted; non-Supabase hostnames are rejected to prevent open-redirect / XSS.
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
    function isSafeStorageUrl(url: string | null | undefined): boolean {
        if (!url) return false
        try {
            const { hostname } = new URL(url)
            const allowed = new URL(SUPABASE_URL).hostname
            return hostname === allowed
        } catch {
            return false
        }
    }

    // Pre-sign all design/PDF URLs so client receives only short-lived signed URLs.
    // `isSafeStorageUrl` still guards against open-redirect, but signed URLs are
    // the primary access control mechanism once the bucket is set to private.
    const rawItems = (order.order_items as any[]) ?? []
    const allPaths = rawItems.flatMap((item) => [
        item.converted_design_url as string | null,
        item.delivery_pdf_url as string | null,
    ])
    const signedUrls = await toSignedUrls(allPaths, 43200)
    const orderItems: any[] = rawItems.map((item, i) => ({
        ...item,
        converted_design_url: signedUrls[i * 2],
        delivery_pdf_url: signedUrls[i * 2 + 1],
    }))

    const unassignedCount = orderItems.filter((i) => i.status === 'unassigned').length
    const msgDecoded = msg ? decodeURIComponent(msg) : null
    const msgIsError = msgDecoded?.startsWith('❌') ?? false

    const formatPrice = (yen: number) =>
        new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(yen)

    const shippingAddress = order.shipping_address as any
    const companyName  = shippingAddress?.companyName?.trim()  ?? ''
    const department   = shippingAddress?.department?.trim()   ?? ''
    const poNumber     = shippingAddress?.poNumber?.trim()     ?? ''

    return (
        <div className="space-y-8 max-w-4xl">
            {msgDecoded && (
                <div className={`px-4 py-3 rounded-xl text-sm font-medium border ${msgIsError ? 'bg-red-50 border-red-200 text-red-800' : 'bg-green-50 border-green-200 text-green-800'}`}>
                    {msgIsError ? msgDecoded : `✅ ${msgDecoded}`}
                </div>
            )}

            {/* Risk #3: Email delivery failure alert */}
            {(order as any).email_send_error && (
                <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-4 space-y-2">
                    <p className="text-sm font-semibold text-red-800">⚠️ 確認メールの送信に失敗しました</p>
                    <p className="text-xs text-red-700 font-mono break-all">{(order as any).email_send_error}</p>
                    <p className="text-xs text-red-700">
                        顧客メール: <strong>{(order.customer_info as any)?.email ?? '—'}</strong> に手動で確認メールを送信してください。
                    </p>
                </div>
            )}

            {/* Risk #2: Refund alert */}
            {(order as any).refunded_at && (
                <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-4 space-y-1">
                    <p className="text-sm font-semibold text-amber-800">
                        💸 返金済み — ¥{((order as any).refunded_amount ?? 0).toLocaleString('ja-JP')}
                        {(order as any).refunded_amount < (order as any).total_price ? '（一部返金）' : '（全額）'}
                    </p>
                    <p className="text-xs text-amber-700">
                        返金日時: {new Date((order as any).refunded_at).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}
                    </p>
                </div>
            )}

            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold">注文詳細</h2>
                    <p className="text-sm text-muted-foreground mt-1 font-mono">{order.stripe_session_id}</p>
                </div>
                <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${ORDER_STATUS_COLORS[order.status] ?? 'bg-gray-100 text-gray-700'}`}>
                    {ORDER_STATUS_LABELS[order.status] ?? order.status}
                </span>
            </div>

            {/* IDs & Customer Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-xl border bg-card p-5 space-y-3">
                    <h3 className="font-semibold">注文・顧客情報</h3>
                    <dl className="space-y-2 text-sm">
                        <div className="flex gap-2">
                            <dt className="text-muted-foreground w-32 shrink-0">注文番号</dt>
                            <dd className="font-mono font-semibold">{(order as any).order_number ?? '—'}</dd>
                        </div>
                        <div className="flex gap-2">
                            <dt className="text-muted-foreground w-32 shrink-0">注文者番号（UUID）</dt>
                            <dd className="font-mono text-xs break-all">{order.id}</dd>
                        </div>
                        <div className="flex gap-2">
                            <dt className="text-muted-foreground w-32 shrink-0">Stripe決済ID</dt>
                            <dd className="font-mono text-xs break-all text-blue-700">{order.stripe_session_id}</dd>
                        </div>
                        {companyName && (
                            <div className="flex gap-2">
                                <dt className="text-muted-foreground w-32 shrink-0">会社名</dt>
                                <dd className="font-semibold">
                                    {companyName}{department && ` ${department}`}
                                </dd>
                            </div>
                        )}
                        {poNumber && (
                            <div className="flex gap-2">
                                <dt className="text-muted-foreground w-32 shrink-0">発注番号</dt>
                                <dd className="font-mono font-semibold text-blue-700">{poNumber}</dd>
                            </div>
                        )}
                        <div className="flex gap-2">
                            <dt className="text-muted-foreground w-32 shrink-0">氏名</dt>
                            <dd>{(order.customer_info as any)?.name ?? `${(order.customer_info as any)?.lastName ?? ''} ${(order.customer_info as any)?.firstName ?? ''}`.trim()}</dd>
                        </div>
                        <div className="flex gap-2">
                            <dt className="text-muted-foreground w-32 shrink-0">メールアドレス</dt>
                            <dd className="text-blue-700">{(order.customer_info as any)?.email ?? '—'}</dd>
                        </div>
                    </dl>
                </div>
                <div className="rounded-xl border bg-card p-5">
                    <h3 className="font-semibold mb-3">配送先</h3>
                    <address className="not-italic text-sm text-muted-foreground space-y-0.5">
                        {companyName && (
                            <p className="font-semibold text-foreground">
                                {companyName}{department && ` ${department}`}
                            </p>
                        )}
                        <p>〒{shippingAddress?.postalCode}</p>
                        <p>{shippingAddress?.prefecture}{shippingAddress?.city}{shippingAddress?.address1}</p>
                        <p>{shippingAddress?.lastName} {shippingAddress?.firstName}</p>
                        <p>TEL: {shippingAddress?.phone}</p>
                    </address>
                </div>
            </div>

            {/* Total */}
            <div className="rounded-xl border bg-card p-5">
                <p className="text-sm text-muted-foreground">合計金額</p>
                <p className="text-3xl font-bold text-primary">{formatPrice(order.total_price)}</p>
            </div>

            {/* Customer Secret URL */}
            {order.access_token && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 space-y-2">
                    <p className="text-sm font-semibold text-amber-900">顧客専用の注文確認URL</p>
                    <p className="text-xs text-amber-700">
                        このURLを顧客に共有することで、ログイン不要で注文状況を確認できます。
                    </p>
                    {!process.env.NEXT_PUBLIC_SITE_URL && (
                        <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded px-3 py-1.5 font-semibold">
                            ⚠ NEXT_PUBLIC_SITE_URL が未設定です。相対URLになるため顧客に正しく送付できません。
                        </p>
                    )}
                    <SecretUrlCopier
                        url={`${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/orders/${order.id}/status?token=${order.access_token}`}
                    />
                </div>
            )}

            {/* Bulk Assign */}
            {unassignedCount > 0 && factories && factories.length > 0 && (
                <div className="rounded-xl border border-orange-200 bg-orange-50 p-5 space-y-3">
                    <p className="text-sm font-semibold text-orange-900">
                        ⚡ 一括工場割り当て（未割当 {unassignedCount}件）
                    </p>
                    <ConfirmBulkAssignForm
                        orderId={order.id}
                        unassignedCount={unassignedCount}
                        factories={factories}
                    />
                </div>
            )}

            {/* Admin Notes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-xl border bg-card p-5 space-y-3">
                    <p className="text-sm font-semibold">📝 内部メモ（管理者のみ表示）</p>
                    <form>
                        <input type="hidden" name="orderId" value={order.id} />
                        <textarea
                            name="note"
                            defaultValue={(order as any).admin_notes ?? ''}
                            rows={3}
                            placeholder="対応履歴、社内連絡事項など..."
                            className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background resize-none"
                        />
                        <SaveNoteButton />
                    </form>
                </div>
                <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-5 space-y-3">
                    <p className="text-sm font-semibold text-blue-900">🏭 工場向けメモ（工場ポータルに表示）</p>
                    <form>
                        <input type="hidden" name="orderId" value={order.id} />
                        <textarea
                            name="note"
                            defaultValue={(order as any).factory_note ?? ''}
                            rows={3}
                            placeholder="特記事項、仕上げ指示、注意点など..."
                            className="w-full text-sm border border-blue-300 rounded-lg px-3 py-2 bg-white resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
                        />
                        <SaveFactoryNoteButton />
                    </form>
                </div>
            </div>

            {/* Cancel Order */}
            <CancelOrderForm
                orderId={order.id}
                orderNumber={(order as any).order_number ?? order.id}
                status={order.status}
                totalPrice={order.total_price}
            />

            {/* Order Items with Factory Assignment */}
            <div>
                <h3 className="text-lg font-bold mb-4">注文アイテム・工場割り当て</h3>
                <div className="space-y-4">
                    {orderItems.map((item) => (
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
                                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                                        ({
                                            shipped: 'bg-green-100 text-green-800',
                                            ready_to_ship: 'bg-purple-100 text-purple-800',
                                            manufacturing: 'bg-blue-100 text-blue-800',
                                            assigned: 'bg-yellow-100 text-yellow-800',
                                            cancelled: 'bg-red-100 text-red-700',
                                        } as Record<string, string>)[item.status] ?? 'bg-gray-100 text-gray-700'
                                    }`}>
                                        {ITEM_STATUS_LABELS[item.status as string] ?? item.status}
                                    </span>
                                    {isSafeStorageUrl((item as any).delivery_pdf_url) && (
                                        <div>
                                            <a
                                                href={(item as any).delivery_pdf_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-xs text-green-700 font-semibold underline"
                                            >
                                                📄 納品PDF（枠付き）
                                            </a>
                                        </div>
                                    )}
                                    {isSafeStorageUrl(item.converted_design_url) && (
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
                                        <AssignButton itemId={item.id} orderId={order.id} />
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

function AssignButton({ itemId, orderId }: { itemId: string; orderId: string }) {
    return (
        <button
            type="submit"
            formAction={async (fd: FormData) => {
                'use server'
                const fId = fd.get('factoryId') as string
                if (!fId) redirect(`/admin/orders/${orderId}?msg=${encodeURIComponent('工場を選択してください')}`)
                try {
                    await assignFactory(itemId, fId)
                } catch (e: any) {
                    redirect(`/admin/orders/${orderId}?msg=${encodeURIComponent('❌ エラー: ' + (e?.message ?? '工場割り当てに失敗しました'))}`)
                }
                redirect(`/admin/orders/${orderId}?msg=${encodeURIComponent('工場を割り当てました')}`)
            }}
            className="w-full bg-primary text-primary-foreground text-sm px-4 py-2 rounded-lg hover:bg-primary/90 transition"
        >
            割り当てを保存
        </button>
    )
}


function SaveNoteButton() {
    return (
        <button
            type="submit"
            formAction={async (fd: FormData) => {
                'use server'
                const orderId = fd.get('orderId') as string
                const note = fd.get('note') as string
                try {
                    await updateOrderNote(orderId, note ?? '')
                } catch (e: any) {
                    redirect(`/admin/orders/${orderId}?msg=${encodeURIComponent('❌ エラー: ' + (e?.message ?? 'メモの保存に失敗しました'))}`)
                }
                redirect(`/admin/orders/${orderId}?msg=${encodeURIComponent('内部メモを保存しました')}`)
            }}
            className="mt-2 bg-secondary text-secondary-foreground text-sm px-4 py-2 rounded-lg hover:bg-secondary/80 transition"
        >
            メモを保存
        </button>
    )
}

function SaveFactoryNoteButton() {
    return (
        <button
            type="submit"
            formAction={async (fd: FormData) => {
                'use server'
                const orderId = fd.get('orderId') as string
                const note = fd.get('note') as string
                try {
                    await updateFactoryNote(orderId, note ?? '')
                } catch (e: any) {
                    redirect(`/admin/orders/${orderId}?msg=${encodeURIComponent('❌ エラー: ' + (e?.message ?? 'メモの保存に失敗しました'))}`)
                }
                redirect(`/admin/orders/${orderId}?msg=${encodeURIComponent('工場向けメモを保存しました')}`)
            }}
            className="mt-2 bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
            工場向けメモを保存
        </button>
    )
}
