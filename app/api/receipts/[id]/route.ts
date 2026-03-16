import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return new NextResponse('Unauthorized', { status: 401 })
    }

    const { data: order } = await supabase
        .from('orders')
        .select(`*, order_items(*)`)
        .eq('id', id)
        .eq('customer_info->>email', user.email)
        .single()

    if (!order) {
        return new NextResponse('Order not found', { status: 404 })
    }

    // --- PDF Generation ---
    const pdfDoc = await PDFDocument.create()
    const page = pdfDoc.addPage([595, 842]) // A4
    const { width, height } = page.getSize()

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

    const COMPANY_NAME = process.env.COMPANY_NAME ?? 'FAST OEM株式会社'
    const COMPANY_ADDRESS = process.env.COMPANY_ADDRESS ?? '東京都〇〇区〇〇1-2-3'
    const INVOICE_NUMBER = process.env.INVOICE_QUALIFIED_NUMBER ?? 'T0000000000000'
    const TAX_RATE = 0.1

    const addr = order.shipping_address as any
    const customerName = `${addr?.lastName ?? ''} ${addr?.firstName ?? ''}`

    // Calculate totals including mold fees (will use items variable later)
    const orderItems = order.order_items as any[]
    const totalExTax = orderItems.reduce((sum: number, item: any) => {
        const itemTotal = Math.round((item.unit_price * item.quantity) / (1 + TAX_RATE))
        const moldFeeExTax = item.mold_fee ? Math.round(item.mold_fee / (1 + TAX_RATE)) : 0
        return sum + itemTotal + moldFeeExTax
    }, 0)

    const priceExTax = totalExTax
    const taxAmount = order.total_price - priceExTax

    let y = height - 60

    const drawText = (
        text: string,
        x: number,
        yPos: number,
        size = 10,
        bold = false,
        color = rgb(0, 0, 0)
    ) => {
        page.drawText(text, {
            x,
            y: yPos,
            size,
            font: bold ? fontBold : font,
            color,
        })
    }

    const drawLine = (yPos: number) => {
        page.drawLine({
            start: { x: 40, y: yPos },
            end: { x: width - 40, y: yPos },
            thickness: 0.5,
            color: rgb(0.8, 0.8, 0.8),
        })
    }

    // Title
    drawText('領　収　書', width / 2 - 40, y, 20, true)
    y -= 50

    // Company info (right side)
    drawText(COMPANY_NAME, width - 220, y, 10, true)
    drawText(COMPANY_ADDRESS, width - 220, y - 16, 8)
    drawText(`適格請求書発行事業者`, width - 220, y - 32, 8)
    drawText(`登録番号: ${INVOICE_NUMBER}`, width - 220, y - 46, 9, true, rgb(0.2, 0.2, 0.6))

    // Customer info (left side)
    drawText(`${customerName} 様`, 40, y, 12, true)
    y -= 20
    const sessionShort = (order.stripe_session_id ?? '').slice(8, 28)
    drawText(`注文番号: ${sessionShort}`, 40, y, 9, false, rgb(0.4, 0.4, 0.4))
    y -= 16
    drawText(`発行日: ${new Date().toLocaleDateString('ja-JP')}`, 40, y, 9, false, rgb(0.4, 0.4, 0.4))

    y -= 40
    drawLine(y)
    y -= 20

    // Section: Items
    drawText('商品', 40, y, 9, true, rgb(0.4, 0.4, 0.4))
    drawText('数量', 360, y, 9, true, rgb(0.4, 0.4, 0.4))
    drawText('金額（税抜）', 440, y, 9, true, rgb(0.4, 0.4, 0.4))
    y -= 16
    drawLine(y)
    y -= 16

    for (const item of orderItems) {
        const itemPriceExTax = Math.round((item.unit_price * item.quantity) / (1 + TAX_RATE))
        const nameText = item.product_name.slice(0, 40)
        drawText(nameText, 40, y, 9)
        drawText(`${item.quantity}`, 370, y, 9)
        drawText(`¥${itemPriceExTax.toLocaleString('ja-JP')}`, 440, y, 9)
        y -= 16
        if (item.options?.length > 0) {
            const optText = (item.options as any[]).map((o: any) => `${o.name}: ${o.value}`).join(' / ')
            drawText(optText.slice(0, 60), 50, y, 7, false, rgb(0.5, 0.5, 0.5))
            y -= 14
        }

        // Show mold fee if applicable
        if (item.mold_fee && item.mold_fee > 0) {
            const moldFeeExTax = Math.round(item.mold_fee / (1 + TAX_RATE))
            drawText('型代（初回のみ）', 50, y, 8, false, rgb(0.8, 0.3, 0.2))
            drawText('1', 370, y, 8, false, rgb(0.8, 0.3, 0.2))
            drawText(`¥${moldFeeExTax.toLocaleString('ja-JP')}`, 440, y, 8, false, rgb(0.8, 0.3, 0.2))
            y -= 16
        }
    }

    y -= 10
    drawLine(y)
    y -= 20

    // Totals
    drawText('小計（税抜）', 350, y, 9)
    drawText(`¥${priceExTax.toLocaleString('ja-JP')}`, 480, y, 9)
    y -= 16
    drawText('消費税（10%）', 350, y, 9)
    drawText(`¥${taxAmount.toLocaleString('ja-JP')}`, 480, y, 9)
    y -= 20
    drawLine(y)
    y -= 22
    drawText('合計（税込）', 340, y, 11, true)
    drawText(`¥${order.total_price.toLocaleString('ja-JP')}`, 465, y, 13, true, rgb(0.1, 0.3, 0.8))

    y -= 50
    drawText('上記の金額を領収いたしました。', 40, y, 9, false, rgb(0.4, 0.4, 0.4))

    // Footer
    drawLine(60)
    drawText(
        `${COMPANY_NAME}  |  適格請求書（インボイス）登録番号: ${INVOICE_NUMBER}`,
        40, 45, 7, false, rgb(0.5, 0.5, 0.5)
    )

    const pdfBytes = await pdfDoc.save()

    return new NextResponse(Buffer.from(pdfBytes), {
        status: 200,
        headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="receipt-${sessionShort}.pdf"`,
        },
    })
}
