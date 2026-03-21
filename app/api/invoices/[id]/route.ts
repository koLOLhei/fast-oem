import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import fs from 'fs/promises'
import path from 'path'

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
    const addresseeParam = req.nextUrl.searchParams.get('addressee') ?? ''

    if (!token) {
        return new NextResponse('token parameter is required', { status: 400 })
    }

    const supabase = createServiceClient()

    const { data: order } = await supabase
        .from('orders')
        .select(`*, order_items(*)`)
        .eq('id', id)
        .eq('access_token', token)
        .single()

    if (!order) {
        return new NextResponse('Order not found', { status: 404 })
    }

    // Company info from site_settings (env > DB > hardcoded)
    const { data: settingRows } = await supabase
        .from('site_settings')
        .select('key, value')

    const s: Record<string, string> = {}
    for (const row of settingRows ?? []) s[row.key] = row.value

    const COMPANY_NAME    = process.env.COMPANY_NAME    ?? s.company_name    ?? '株式会社SOARA'
    const COMPANY_ADDRESS = process.env.COMPANY_ADDRESS ?? s.company_address ?? '〒221-0056 神奈川県横浜市神奈川区金港町5-14 クアドリフォリオ8階'
    const INVOICE_NUMBER  = process.env.INVOICE_QUALIFIED_NUMBER ?? s.invoice_number ?? 'T9020001159981'
    const TAX_RATE = 0.1

    const addr         = order.shipping_address as any
    const personName   = `${addr?.lastName ?? ''} ${addr?.firstName ?? ''}`.trim()
    const companyName  = addr?.companyName?.trim()  ?? ''
    const department   = addr?.department?.trim()   ?? ''
    const poNumber     = addr?.poNumber?.trim()     ?? ''

    // Addressee priority: explicit param > saved receiptAddressee > company name > person name
    const addressee = addresseeParam.trim()
        || addr?.receiptAddressee?.trim()
        || (companyName || personName)

    const orderItems   = order.order_items as any[]
    const orderTotal   = (order as any).total_price   ?? 0
    const shippingFee  = (order as any).shipping_fee  ?? 0
    const orderNumber  = (order as any).order_number  ?? id

    const itemsExTax = orderItems.reduce((sum: number, item: any) => {
        const itemTotal    = Math.round((item.unit_price * item.quantity) / (1 + TAX_RATE))
        const moldFeeExTax = item.mold_fee             ? Math.round(item.mold_fee             / (1 + TAX_RATE)) : 0
        const expressExTax = item.express_delivery_fee ? Math.round(item.express_delivery_fee / (1 + TAX_RATE)) : 0
        return sum + itemTotal + moldFeeExTax + expressExTax
    }, 0)
    const shippingFeeExTax = shippingFee > 0 ? Math.round(shippingFee / (1 + TAX_RATE)) : 0
    const priceExTax = itemsExTax + shippingFeeExTax
    const taxAmount  = orderTotal - priceExTax

    // --- PDF ---
    const pdfDoc = await PDFDocument.create()
    const page   = pdfDoc.addPage([595, 842]) // A4
    const { width, height } = page.getSize()

    const jaFontBytes = await loadJapaneseFont()
    const font = jaFontBytes
        ? await pdfDoc.embedFont(jaFontBytes, { subset: true })
        : await pdfDoc.embedFont(StandardFonts.Helvetica)

    const drawText = (
        text: string, x: number, yPos: number,
        size = 10, _bold = false, color = rgb(0, 0, 0)
    ) => { page.drawText(text, { x, y: yPos, size, font, color }) }

    const drawLine = (yPos: number, x1 = 40, x2 = width - 40) => {
        page.drawLine({
            start: { x: x1, y: yPos }, end: { x: x2, y: yPos },
            thickness: 0.5, color: rgb(0.8, 0.8, 0.8),
        })
    }

    let y = height - 60

    // ── Title ─────────────────────────────────────────────────────
    drawText('請　求　書', width / 2 - 50, y, 20, true)
    y -= 10

    // 支払済み badge (top-right)
    page.drawRectangle({ x: width - 95, y: y + 2, width: 64, height: 18, color: rgb(0.06, 0.54, 0.06) })
    drawText('支払済み', width - 92, y + 6, 9, true, rgb(1, 1, 1))

    y -= 40

    // ── Seller info (right) ────────────────────────────────────────
    drawText(COMPANY_NAME, width - 230, y, 10, true)
    drawText(COMPANY_ADDRESS, width - 230, y - 16, 7, false, rgb(0.3, 0.3, 0.3))
    drawText('適格請求書発行事業者', width - 230, y - 30, 7, false, rgb(0.3, 0.3, 0.3))
    drawText(`登録番号: ${INVOICE_NUMBER}`, width - 230, y - 43, 8, true, rgb(0.2, 0.2, 0.6))

    // ── Customer info (left) ───────────────────────────────────────
    if (companyName) {
        drawText(companyName, 40, y, 12, true)
        y -= 16
        if (department) {
            drawText(department, 40, y, 9, false, rgb(0.4, 0.4, 0.4))
            y -= 14
        }
        const contactLine = personName ? `ご担当: ${personName} 様` : `${addressee} 御中`
        drawText(contactLine, 40, y, 9, false, rgb(0.4, 0.4, 0.4))
    } else {
        drawText(`${addressee} 様`, 40, y, 13, true)
    }
    y -= 22

    // ── Invoice metadata ───────────────────────────────────────────
    const invoiceNo = `INV-${orderNumber}`
    const issueDate = new Date().toLocaleDateString('ja-JP')
    const paidDate  = new Date((order as any).created_at).toLocaleDateString('ja-JP')

    drawText(`請求書番号: ${invoiceNo}`, 40, y, 9, false, rgb(0.4, 0.4, 0.4))
    y -= 14
    drawText(`発行日: ${issueDate}`, 40, y, 9, false, rgb(0.4, 0.4, 0.4))
    y -= 14
    drawText(`お支払日: ${paidDate}（クレジットカード決済）`, 40, y, 9, false, rgb(0.4, 0.4, 0.4))
    y -= 14
    if (poNumber) {
        drawText(`お客様発注番号: ${poNumber}`, 40, y, 9, true, rgb(0.1, 0.3, 0.6))
        y -= 14
    }

    y -= 16
    drawLine(y)
    y -= 20

    // ── Table header ───────────────────────────────────────────────
    drawText('品目', 40, y, 9, true, rgb(0.4, 0.4, 0.4))
    drawText('数量', 340, y, 9, true, rgb(0.4, 0.4, 0.4))
    drawText('単価（税抜）', 380, y, 9, true, rgb(0.4, 0.4, 0.4))
    drawText('金額（税抜）', 470, y, 9, true, rgb(0.4, 0.4, 0.4))
    y -= 16
    drawLine(y)
    y -= 16

    // ── Line items ─────────────────────────────────────────────────
    for (const item of orderItems) {
        const unitExTax = Math.round(item.unit_price / (1 + TAX_RATE))
        const lineExTax = Math.round((item.unit_price * item.quantity) / (1 + TAX_RATE))
        drawText(item.product_name.slice(0, 36), 40, y, 9)
        drawText(`${item.quantity}`, 350, y, 9)
        drawText(`¥${unitExTax.toLocaleString('ja-JP')}`, 385, y, 9)
        drawText(`¥${lineExTax.toLocaleString('ja-JP')}`, 470, y, 9)
        y -= 16
        if (item.options?.length > 0) {
            const optText = (item.options as any[]).map((o: any) => `${o.name}: ${o.value}`).join(' / ')
            drawText(optText.slice(0, 58), 50, y, 7, false, rgb(0.5, 0.5, 0.5))
            y -= 14
        }
        if (item.mold_fee && item.mold_fee > 0) {
            const moldExTax = Math.round(item.mold_fee / (1 + TAX_RATE))
            drawText('型代（初回のみ）', 50, y, 8, false, rgb(0.8, 0.3, 0.2))
            drawText('1', 350, y, 8, false, rgb(0.8, 0.3, 0.2))
            drawText(`¥${moldExTax.toLocaleString('ja-JP')}`, 385, y, 8, false, rgb(0.8, 0.3, 0.2))
            drawText(`¥${moldExTax.toLocaleString('ja-JP')}`, 470, y, 8, false, rgb(0.8, 0.3, 0.2))
            y -= 16
        }
        if (item.express_delivery_fee && item.express_delivery_fee > 0) {
            const expressExTax = Math.round(item.express_delivery_fee / (1 + TAX_RATE))
            drawText('⚡ 特急料金', 50, y, 8, false, rgb(0.9, 0.4, 0.1))
            drawText('1', 350, y, 8, false, rgb(0.9, 0.4, 0.1))
            drawText(`¥${expressExTax.toLocaleString('ja-JP')}`, 385, y, 8, false, rgb(0.9, 0.4, 0.1))
            drawText(`¥${expressExTax.toLocaleString('ja-JP')}`, 470, y, 8, false, rgb(0.9, 0.4, 0.1))
            y -= 16
        }
    }

    if (shippingFee > 0) {
        drawText('送料（離島・遠隔地）', 40, y, 8, false, rgb(0.3, 0.3, 0.8))
        drawText('1', 350, y, 8, false, rgb(0.3, 0.3, 0.8))
        drawText(`¥${shippingFeeExTax.toLocaleString('ja-JP')}`, 470, y, 8, false, rgb(0.3, 0.3, 0.8))
        y -= 16
    }

    y -= 10
    drawLine(y)
    y -= 20

    // ── Totals ─────────────────────────────────────────────────────
    drawText('小計（税抜）', 350, y, 9)
    drawText(`¥${priceExTax.toLocaleString('ja-JP')}`, 470, y, 9)
    y -= 16
    drawText('消費税（10%）', 350, y, 9)
    drawText(`¥${taxAmount.toLocaleString('ja-JP')}`, 470, y, 9)
    y -= 20
    drawLine(y)
    y -= 24
    drawText('ご請求金額（税込）', 320, y, 12, true)
    drawText(`¥${orderTotal.toLocaleString('ja-JP')}`, 450, y, 14, true, rgb(0.1, 0.3, 0.8))

    y -= 44
    drawText('上記の通りご請求申し上げます。', 40, y, 9, false, rgb(0.4, 0.4, 0.4))
    y -= 14
    drawText('※ご請求金額はクレジットカードにてご決済済みです。', 40, y, 8, false, rgb(0.1, 0.5, 0.1))

    // ── Footer ─────────────────────────────────────────────────────
    drawLine(55)
    drawText(
        `${COMPANY_NAME}  |  適格請求書（インボイス）登録番号: ${INVOICE_NUMBER}`,
        40, 42, 7, false, rgb(0.5, 0.5, 0.5)
    )

    const pdfBytes = await pdfDoc.save()
    const safeNo   = invoiceNo.replace(/[^a-zA-Z0-9_-]/g, '_')

    return new NextResponse(Buffer.from(pdfBytes), {
        status: 200,
        headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="invoice-${safeNo}.pdf"`,
        },
    })
}
