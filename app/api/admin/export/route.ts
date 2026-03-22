import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

/**
 * GET /api/admin/export?type=orders|items
 * Admin-only CSV export endpoint.
 * Returns UTF-8 BOM CSV for Excel compatibility.
 */
export async function GET(req: NextRequest) {
    // Verify admin role via session cookie
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return new NextResponse('Unauthorized', { status: 401 })

    // Use service client to bypass RLS — same pattern as auth.ts and guard.ts
    const { data: profile } = await createServiceClient()
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
    if (profile?.role !== 'admin') return new NextResponse('Forbidden', { status: 403 })

    const typeParam = req.nextUrl.searchParams.get('type') ?? 'orders'
    if (typeParam !== 'orders' && typeParam !== 'items') {
        return new NextResponse('Invalid type parameter (must be "orders" or "items")', { status: 400 })
    }
    const type: 'orders' | 'items' = typeParam
    const statusFilter = req.nextUrl.searchParams.get('status') // optional: paid|pending|cancelled
    const fromDate = req.nextUrl.searchParams.get('from')       // optional: YYYY-MM-DD
    const toDate = req.nextUrl.searchParams.get('to')           // optional: YYYY-MM-DD
    const service = createServiceClient()

    const EXPORT_MAX_ROWS = 10_000

    if (type === 'items') {
        // ── Order Items CSV ──────────────────────────────────────────
        let itemsQuery = service
            .from('order_items')
            .select(`
                id,
                product_name,
                quantity,
                unit_price,
                total_price,
                mold_fee,
                express_delivery_fee,
                express_delivery,
                status,
                tracking_number,
                options,
                created_at,
                orders (
                    order_number,
                    created_at,
                    customer_info,
                    shipping_address,
                    status
                ),
                factories ( name )
            `)
            .order('created_at', { ascending: false })
            .limit(EXPORT_MAX_ROWS)

        if (fromDate) itemsQuery = itemsQuery.gte('created_at', `${fromDate}T00:00:00Z`) as typeof itemsQuery
        if (toDate) itemsQuery = itemsQuery.lte('created_at', `${toDate}T23:59:59Z`) as typeof itemsQuery
        if (statusFilter) itemsQuery = itemsQuery.eq('status', statusFilter) as typeof itemsQuery

        const { data: items, error } = await itemsQuery

        if (error) {
            console.error('[export] DB error:', error.message)
            return new NextResponse('データの取得に失敗しました', { status: 500 })
        }

        const truncated = (items?.length ?? 0) >= EXPORT_MAX_ROWS

        const headers = [
            '注文番号', '注文日時', '顧客名', 'メールアドレス', '会社名',
            '商品名', '数量', '単価(税込)', '商品小計', '型代', '特急料金',
            'ステータス', '工場名', '追跡番号', 'オプション',
        ]

        const rows = (items ?? []).map((item: any) => {
            const order = item.orders as any
            const info = order?.customer_info as any
            const addr = order?.shipping_address as any
            const name = info?.name ?? `${info?.lastName ?? ''} ${info?.firstName ?? ''}`.trim()
            const opts = Array.isArray(item.options)
                ? item.options.map((o: any) => `${o.name}:${o.value}`).join(' / ')
                : ''
            return [
                order?.order_number ?? '',
                order?.created_at ? new Date(order.created_at).toLocaleString('ja-JP') : '',
                name,
                info?.email ?? '',
                addr?.companyName ?? '',
                item.product_name ?? '',
                item.quantity ?? '',
                item.unit_price ?? '',
                item.total_price ?? '',
                item.mold_fee ?? 0,
                item.express_delivery_fee ?? 0,
                item.status ?? '',
                (item.factories as any)?.name ?? '',
                item.tracking_number ?? '',
                opts,
            ]
        })

        const res = csvResponse(headers, rows, `items-${dateStamp()}.csv`)
        if (truncated) res.headers.set('X-Export-Truncated', `true; limit=${EXPORT_MAX_ROWS}`)
        return res
    }

    // ── Orders CSV (default) ─────────────────────────────────────────
    let ordersQuery = service
        .from('orders')
        .select(`
            id,
            order_number,
            stripe_session_id,
            customer_info,
            shipping_address,
            total_price,
            shipping_fee,
            status,
            created_at,
            order_items ( id, product_name, quantity, unit_price, total_price, mold_fee, express_delivery_fee, status, tracking_number )
        `)
        .order('created_at', { ascending: false })
        .limit(EXPORT_MAX_ROWS)

    if (statusFilter) ordersQuery = ordersQuery.eq('status', statusFilter) as typeof ordersQuery
    if (fromDate) ordersQuery = ordersQuery.gte('created_at', `${fromDate}T00:00:00Z`) as typeof ordersQuery
    if (toDate) ordersQuery = ordersQuery.lte('created_at', `${toDate}T23:59:59Z`) as typeof ordersQuery

    const { data: orders, error } = await ordersQuery

    if (error) return new NextResponse('DB Error: ' + error.message, { status: 500 })

    const truncated = (orders?.length ?? 0) >= EXPORT_MAX_ROWS

    const headers = [
        '注文番号', 'UUID', '注文日時', '顧客名', 'メールアドレス', '会社名', '部署名',
        '発注番号(PO)', '郵便番号', '都道府県', '市区町村', '住所1', '住所2', '電話番号',
        '合計金額(税込)', '送料', '消費税', 'ステータス', 'Stripe決済ID',
        'アイテム数', '発送済みアイテム数',
    ]

    const TAX_RATE = 0.1

    const rows = (orders ?? []).map((o: any) => {
        const info = o.customer_info as any
        const addr = o.shipping_address as any
        const name = info?.name ?? `${info?.lastName ?? ''} ${info?.firstName ?? ''}`.trim()
        const items = (o.order_items as any[]) ?? []
        const shippedCount = items.filter((i: any) => i.status === 'shipped').length
        const total = o.total_price ?? 0
        const tax = total - Math.round(total / (1 + TAX_RATE))
        return [
            o.order_number ?? '',
            o.id ?? '',
            o.created_at ? new Date(o.created_at).toLocaleString('ja-JP') : '',
            name,
            info?.email ?? '',
            addr?.companyName ?? '',
            addr?.department ?? '',
            addr?.poNumber ?? '',
            addr?.postalCode ?? '',
            addr?.prefecture ?? '',
            addr?.city ?? '',
            addr?.address1 ?? '',
            addr?.address2 ?? '',
            addr?.phone ?? '',
            total,
            o.shipping_fee ?? 0,
            tax,
            o.status ?? '',
            o.stripe_session_id ?? '',
            items.length,
            shippedCount,
        ]
    })

    const res = csvResponse(headers, rows, `orders-${dateStamp()}.csv`)
    if (truncated) res.headers.set('X-Export-Truncated', `true; limit=${EXPORT_MAX_ROWS}`)
    return res
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function escapeCell(value: unknown): string {
    const str = String(value ?? '')
    // Sanitize CSV formula injection: Excel/Sheets execute cells starting with =, +, -, @
    // Also prefix % and | which are used by DDE payloads in some legacy spreadsheet parsers
    const sanitized = str.length > 0 && '=+-@\t\r%|'.includes(str[0]) ? `'${str}` : str
    // Wrap in quotes if contains comma, newline, or quote; escape inner quotes
    if (sanitized.includes(',') || sanitized.includes('\n') || sanitized.includes('"')) {
        return `"${sanitized.replace(/"/g, '""')}"`
    }
    return sanitized
}

function csvResponse(headers: string[], rows: unknown[][], filename: string): NextResponse {
    const BOM = '\uFEFF' // UTF-8 BOM for Excel
    const lines = [
        headers.map(escapeCell).join(','),
        ...rows.map((row) => row.map(escapeCell).join(',')),
    ]
    const csv = BOM + lines.join('\r\n')

    return new NextResponse(csv, {
        status: 200,
        headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
        },
    })
}

function dateStamp(): string {
    const date = new Date().toISOString().slice(0, 10)
    const token = crypto.randomUUID().slice(0, 8)
    return `${date}-${token}`
}
