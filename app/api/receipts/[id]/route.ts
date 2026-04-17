import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { isValidUUID, MAX_ADDRESSEE_LENGTH } from '@/lib/validation'
import type { OrderRow, OrderItemRow, OrderItemOption } from '@/lib/database.types'
import type { ShippingAddress } from '@/lib/order'
import fs from 'fs/promises'
import path from 'path'

// ---------------------------------------------------------------------------
// Japanese font — read from /public/fonts/NotoSansJP-Regular.ttf on first
// call and cached in memory for the lifetime of the process.
// Falls back to Helvetica (Latin-only) if the file is missing.
// ---------------------------------------------------------------------------
let _jaFontCache: Uint8Array | undefined = undefined

async function loadJapaneseFont(): Promise<Uint8Array> {
    if (_jaFontCache != null) return _jaFontCache
    // Throw rather than falling back to Helvetica — Helvetica cannot render Japanese
    // characters and would produce a broken PDF with mojibake.
    const fontPath = path.join(process.cwd(), 'public', 'fonts', 'NotoSansJP-Regular.ttf')
    const buffer = await fs.readFile(fontPath)
    _jaFontCache = new Uint8Array(buffer)
    return _jaFontCache
}

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    const token = req.nextUrl.searchParams.get('token')
    const rawAddressee = req.nextUrl.searchParams.get('addressee') ?? ''
    const isReissue = req.nextUrl.searchParams.get('reissue') === 'true'

    if (!isValidUUID(id)) {
        return new NextResponse('Invalid order ID', { status: 400 })
    }
    if (!token) {
        return new NextResponse('token parameter is required', { status: 400 })
    }
    // Sanitize addressee: limit length and strip control characters
    const addresseeParam = rawAddressee.slice(0, MAX_ADDRESSEE_LENGTH).replace(/[\x00-\x1f\x7f]/g, '')

    const supabase = createServiceClient()

    // Validate ownership via access_token
    const { data: order } = await supabase
        .from('orders')
        .select(`*, order_items(*)`)
        .eq('id', id)
        .eq('access_token', token)
        .single()

    if (!order) {
        return new NextResponse('Order not found', { status: 404 })
    }

    // C-2: Reject expired access tokens
    if (order.access_token_expires_at && new Date(order.access_token_expires_at) < new Date()) {
        return new NextResponse('Access token expired', { status: 403 })
    }

    const typedOrder = order as unknown as OrderRow & { order_items: OrderItemRow[] }

    // Read company info from DB (falls back to env vars then hardcoded defaults)
    const { data: settingRows } = await supabase
        .from('site_settings')
        .select('key, value')

    const s: Record<string, string> = {}
    for (const row of settingRows ?? []) s[row.key] = row.value

    const COMPANY_NAME    = process.env.COMPANY_NAME    ?? s.company_name    ?? '株式会社SOARA'
    const COMPANY_ADDRESS = process.env.COMPANY_ADDRESS ?? s.company_address ?? '〒221-0056 神奈川県横浜市神奈川区金港町5-14 クアドリフォリオ8階'
    const INVOICE_NUMBER  = process.env.INVOICE_QUALIFIED_NUMBER ?? s.invoice_number ?? 'T9020001159981'
    const TAX_RATE = 0.1

    const addr: ShippingAddress = typedOrder.shipping_address
    const registeredName = `${addr?.lastName ?? ''} ${addr?.firstName ?? ''}`.trim()
    // Priority: explicit query param > saved receiptAddressee > full name
    const addressee = addresseeParam.trim()
        || addr?.receiptAddressee?.trim()
        || registeredName
    const companyName: string = addr?.companyName?.trim() ?? ''
    const department: string  = addr?.department?.trim()  ?? ''
    const poNumber: string    = addr?.poNumber?.trim()    ?? ''

    const orderItems: OrderItemRow[] = typedOrder.order_items ?? []
    const orderTotal: number = typedOrder.total_price ?? 0
    const shippingFee: number = typedOrder.shipping_fee ?? 0

    // Tax calculation: derive ex-tax from the authoritative total to avoid
    // rounding errors from summing individually-rounded line items.
    const priceExTax = Math.round(orderTotal / (1 + TAX_RATE))
    const taxAmount = orderTotal - priceExTax
    const shippingFeeExTax = shippingFee > 0 ? Math.round(shippingFee / (1 + TAX_RATE)) : 0

    // --- PDF Generation ---
    const pdfDoc = await PDFDocument.create()
    const page = pdfDoc.addPage([595, 842]) // A4
    const { width, height } = page.getSize()

    // Japanese font is REQUIRED. Helvetica cannot render Japanese characters —
    // falling back would produce a broken PDF with mojibake, which is unacceptable
    // for a receipt with Japanese customer data. Fail fast instead.
    let font
    try {
        const jaFontBytes = await loadJapaneseFont()
        font = await pdfDoc.embedFont(jaFontBytes, { subset: true })
    } catch (fontErr) {
        console.error('[receipt] Japanese font load failed:', (fontErr as Error).message)
        return new Response('領収書の生成に失敗しました（フォント読み込みエラー）。時間をおいて再度お試しください。', { status: 500 })
    }

    // Track current page so drawText/drawLine always write to the active page.
    let currentPage = page
    const FOOTER_MARGIN = 80 // leave room for footer (footer is at y=55, totals need ~60px above)

    // Add a new page when content would overflow into the footer area.
    const ensureSpace = (neededPx: number): number => {
        if (y - neededPx >= FOOTER_MARGIN) return y
        // Draw footer on current page before starting a new one
        currentPage.drawLine({
            start: { x: 40, y: 55 },
            end: { x: width - 40, y: 55 },
            thickness: 0.5,
            color: rgb(0.8, 0.8, 0.8),
        })
        currentPage.drawText(
            `${COMPANY_NAME}  |  適格請求書（インボイス）登録番号: ${INVOICE_NUMBER}`,
            { x: 40, y: 42, size: 7, font, color: rgb(0.5, 0.5, 0.5) },
        )
        currentPage = pdfDoc.addPage([595, 842])
        return height - 60
    }

    const drawText = (
        text: string,
        x: number,
        yPos: number,
        size = 10,
        _bold = false,      // bold param kept for API compat; use larger size for emphasis
        color = rgb(0, 0, 0)
    ) => {
        currentPage.drawText(text, { x, y: yPos, size, font, color })
    }

    const drawLine = (yPos: number, x1 = 40, x2 = width - 40) => {
        currentPage.drawLine({
            start: { x: x1, y: yPos },
            end: { x: x2, y: yPos },
            thickness: 0.5,
            color: rgb(0.8, 0.8, 0.8),
        })
    }

    let y = height - 60

    // Title
    drawText('領　収　書', width / 2 - 50, y, 20, true)
    y -= 10

    // Re-issue badge (small, top-right of title)
    if (isReissue) {
        drawText('再発行', width - 80, y + 10, 8, false, rgb(0.6, 0.1, 0.1))
    }

    y -= 40

    // Company info (right side)
    drawText(COMPANY_NAME, width - 230, y, 10, true)
    drawText(COMPANY_ADDRESS, width - 230, y - 16, 7, false, rgb(0.3, 0.3, 0.3))
    drawText('適格請求書発行事業者', width - 230, y - 30, 7, false, rgb(0.3, 0.3, 0.3))
    drawText(`登録番号: ${INVOICE_NUMBER}`, width - 230, y - 43, 8, true, rgb(0.2, 0.2, 0.6))

    // Customer info (left side)
    if (companyName) {
        drawText(companyName, 40, y, 11, true)
        y -= 16
        if (department) {
            drawText(department, 40, y, 9, false, rgb(0.4, 0.4, 0.4))
            y -= 14
        }
    }
    drawText(`${addressee} 様`, 40, y, 13, true)
    y -= 22
    const orderNumber = typedOrder.order_number ?? typedOrder.id
    drawText(`注文番号: ${orderNumber}`, 40, y, 9, false, rgb(0.4, 0.4, 0.4))
    y -= 16
    if (poNumber) {
        drawText(`発注番号: ${poNumber}`, 40, y, 9, true, rgb(0.1, 0.3, 0.6))
        y -= 16
    }
    drawText(`発行日: ${new Date().toLocaleDateString('ja-JP')}`, 40, y, 9, false, rgb(0.4, 0.4, 0.4))
    if (isReissue) {
        drawText('（再発行）', 150, y, 8, false, rgb(0.6, 0.1, 0.1))
    }

    y -= 40
    drawLine(y)
    y -= 20

    drawText('商品', 40, y, 9, true, rgb(0.4, 0.4, 0.4))
    drawText('数量', 360, y, 9, true, rgb(0.4, 0.4, 0.4))
    drawText('金額（税抜）', 435, y, 9, true, rgb(0.4, 0.4, 0.4))
    y -= 16
    drawLine(y)
    y -= 16

    for (const item of orderItems) {
        // Each item needs at least 16px; options/fees add up to 46px more
        const optLines = (item.options?.length > 0 ? 14 : 0)
        const feeLines = ((item.mold_fee ?? 0) > 0 ? 16 : 0) + ((item.express_delivery_fee ?? 0) > 0 ? 16 : 0)
        y = ensureSpace(16 + optLines + feeLines)

        const itemPriceExTax = Math.round((item.unit_price * item.quantity) / (1 + TAX_RATE))
        drawText(item.product_name.slice(0, 38), 40, y, 9)
        drawText(`${item.quantity}`, 370, y, 9)
        drawText(`¥${itemPriceExTax.toLocaleString('ja-JP')}`, 440, y, 9)
        y -= 16
        if (item.options?.length > 0) {
            const optText = (item.options as OrderItemOption[]).map((o) => `${o.name}: ${o.value}`).join(' / ')
            drawText(optText.slice(0, 58), 50, y, 7, false, rgb(0.5, 0.5, 0.5))
            y -= 14
        }
        if (item.mold_fee && item.mold_fee > 0) {
            const moldFeeExTax = Math.round(item.mold_fee / (1 + TAX_RATE))
            drawText('型代（初回のみ）', 50, y, 8, false, rgb(0.8, 0.3, 0.2))
            drawText('1', 370, y, 8, false, rgb(0.8, 0.3, 0.2))
            drawText(`¥${moldFeeExTax.toLocaleString('ja-JP')}`, 440, y, 8, false, rgb(0.8, 0.3, 0.2))
            y -= 16
        }
        if (item.express_delivery_fee && item.express_delivery_fee > 0) {
            const expressExTax = Math.round(item.express_delivery_fee / (1 + TAX_RATE))
            drawText('⚡ 特急料金', 50, y, 8, false, rgb(0.9, 0.4, 0.1))
            drawText('1', 370, y, 8, false, rgb(0.9, 0.4, 0.1))
            drawText(`¥${expressExTax.toLocaleString('ja-JP')}`, 440, y, 8, false, rgb(0.9, 0.4, 0.1))
            y -= 16
        }
    }

    y -= 10
    drawLine(y)
    y -= 20

    if (shippingFee > 0) {
        y = ensureSpace(42)
        drawText('送料（離島・遠隔地）', 40, y, 8, false, rgb(0.3, 0.3, 0.8))
        drawText('1', 370, y, 8, false, rgb(0.3, 0.3, 0.8))
        drawText(`¥${shippingFeeExTax.toLocaleString('ja-JP')}`, 440, y, 8, false, rgb(0.3, 0.3, 0.8))
        y -= 16
        drawLine(y)
        y -= 10
    }

    // Totals block: ~100px needed (subtotal + tax + total + "received" line)
    y = ensureSpace(100)
    drawText('小計（税抜）', 340, y, 9)
    drawText(`¥${priceExTax.toLocaleString('ja-JP')}`, 470, y, 9)
    y -= 16
    drawText('消費税（10%）', 340, y, 9)
    drawText(`¥${taxAmount.toLocaleString('ja-JP')}`, 470, y, 9)
    y -= 20
    drawLine(y)
    y -= 22
    drawText('合計（税込）', 330, y, 11, true)
    drawText(`¥${orderTotal.toLocaleString('ja-JP')}`, 455, y, 13, true, rgb(0.1, 0.3, 0.8))

    y -= 50
    drawText('上記の金額を領収いたしました。', 40, y, 9, false, rgb(0.4, 0.4, 0.4))

    // Footer
    drawLine(55)
    drawText(
        `${COMPANY_NAME}  |  適格請求書（インボイス）登録番号: ${INVOICE_NUMBER}`,
        40, 42, 7, false, rgb(0.5, 0.5, 0.5)
    )

    const pdfBytes = await pdfDoc.save()
    const safeNo = String(orderNumber).replace(/[^a-zA-Z0-9_-]/g, '_')

    return new NextResponse(Buffer.from(pdfBytes), {
        status: 200,
        headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="receipt-${safeNo}.pdf"`,
            // Prevent the access token in the URL from leaking via Referer
            // when the PDF is rendered/shared. "no-referrer" is safe here
            // because the endpoint is only linked to from authenticated pages.
            'Referrer-Policy': 'no-referrer',
            // Belt-and-braces: ask CDNs not to cache the PDF across users.
            'Cache-Control': 'private, no-store',
        },
    })
}
