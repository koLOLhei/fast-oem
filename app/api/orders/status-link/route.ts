import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

/**
 * GET /api/orders/status-link?session_id=cs_test_...
 *
 * Called from the checkout complete page to retrieve the secret status URL
 * right after payment. The webhook may still be processing, so this endpoint
 * returns 404 until the order appears in the DB.
 */
export async function GET(req: NextRequest) {
    const sessionId = req.nextUrl.searchParams.get('session_id')

    if (!sessionId || !sessionId.startsWith('cs_') || sessionId.length > 200) {
        return NextResponse.json({ error: 'Invalid session_id' }, { status: 400 })
    }

    const supabase = createServiceClient()

    const { data: order } = await supabase
        .from('orders')
        .select('id, access_token, access_token_expires_at, status')
        .eq('stripe_session_id', sessionId)
        .single()

    if (!order) {
        // Webhook hasn't processed yet — caller should retry
        return NextResponse.json({ pending: true }, { status: 404 })
    }

    // Reject expired access tokens
    if (order.access_token_expires_at && new Date(order.access_token_expires_at) < new Date()) {
        return NextResponse.json({ error: 'Access token expired' }, { status: 403 })
    }

    // Don't expose status URL for cancelled orders
    if (order.status === 'cancelled') {
        return NextResponse.json({ error: 'Order cancelled' }, { status: 410 })
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? ''
    const statusUrl = `${siteUrl}/orders/${order.id}/status?token=${order.access_token}`

    return NextResponse.json({ orderId: order.id, statusUrl })
}
