'use server'

import { createServiceClient } from '@/lib/supabase/service'

interface MoldReuseResult {
    valid: boolean
    reason?: string
    previousOptions?: { id: string; value: string }[]  // optionId → value label from last order
}

/**
 * Checks if a previous order can be reused for mold fee exemption.
 * Accepts either a human-readable order number (FO-XXXX-XXXX) or a UUID.
 * Requires the email used at checkout as ownership proof.
 * Returns the previous order's option selections for auto-fill.
 */
export async function checkMoldReuse(
    previousOrderRef: string,
    email: string,
    productId: string
): Promise<MoldReuseResult> {
    if (!previousOrderRef.trim()) {
        return { valid: false, reason: '注文番号を入力してください' }
    }

    if (!email.trim()) {
        return { valid: false, reason: 'メールアドレスを入力してください' }
    }

    const supabase = createServiceClient()

    // Support both human-readable order_number (FO-...) and UUID
    const ref = previousOrderRef.trim()
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ref)

    // Fetch mold reuse expiration from site_settings (default 12 months; 0 = unlimited)
    const { data: settingRow } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'mold_reuse_months')
        .single()
    const parsed = parseInt(settingRow?.value ?? '12', 10)
    const reuseMonths = isNaN(parsed) ? 12 : parsed

    // Only allow reuse from orders that were actually paid/fulfilled (not cancelled/pending)
    const VALID_STATUSES = ['paid', 'processing', 'partially_shipped', 'shipped', 'completed']

    const query = supabase
        .from('orders')
        .select(`
            id,
            created_at,
            customer_info,
            order_items (
                product_id,
                options
            )
        `)
        .in('status', VALID_STATUSES)

    const { data: order } = isUuid
        ? await query.eq('id', ref).single()
        : await query.eq('order_number', ref).single()

    if (!order) {
        return { valid: false, reason: '注文が見つかりません。注文番号をご確認ください。' }
    }

    // Check expiration
    if (reuseMonths > 0) {
        const cutoff = new Date()
        cutoff.setMonth(cutoff.getMonth() - reuseMonths)
        if (new Date((order as any).created_at) < cutoff) {
            return {
                valid: false,
                reason: `ご注文から1年以上経過しているため、型の再利用ができません。`,
            }
        }
    }

    // Verify ownership via email
    const customerEmail = (order.customer_info as any)?.email as string | undefined
    if (!customerEmail || customerEmail.toLowerCase() !== email.trim().toLowerCase()) {
        return { valid: false, reason: 'この注文番号とメールアドレスの組み合わせが一致しません。' }
    }

    // Find the order_item for the same product
    const matchedItem = (order.order_items as any[]).find(
        (item) => item.product_id === productId
    )

    if (!matchedItem) {
        return {
            valid: false,
            reason: 'この注文番号に同じ商品の型がありません。別の注文番号をお試しください。',
        }
    }

    // Return the stored options for auto-fill: [{id: optionId, value: label}]
    const previousOptions = Array.isArray(matchedItem.options)
        ? (matchedItem.options as { id: string; name: string; value: string }[]).map((o) => ({
              id: o.id,
              value: o.value,
          }))
        : undefined

    return { valid: true, previousOptions }
}
