'use server'

import { createClient } from '@/lib/supabase/server'

interface MoldReuseResult {
    valid: boolean
    reason?: string
}

/**
 * Checks if a user's previous order can be reused for mold fee exemption.
 * Validates that the order belongs to the current user AND is for the same product.
 */
export async function checkMoldReuse(
    previousOrderId: string,
    productId: string
): Promise<MoldReuseResult> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { valid: false, reason: 'ログインが必要です' }
    }

    if (!previousOrderId.trim()) {
        return { valid: false, reason: '注文番号を入力してください' }
    }

    // Find the order with matching customer email and product
    const { data: order } = await supabase
        .from('orders')
        .select(`
      id,
      customer_info,
      order_items (
        product_id
      )
    `)
        .ilike('stripe_session_id', `%${previousOrderId.trim()}%`)
        .single()

    if (!order) {
        return { valid: false, reason: '注文が見つかりません。注文番号をご確認ください。' }
    }

    // Check the order belongs to this user by email
    const customerEmail = (order.customer_info as any)?.email
    if (customerEmail !== user.email) {
        return { valid: false, reason: 'この注文番号はご利用のアカウントと一致しません。' }
    }

    // Check that one of the items is the same product
    const hasProduct = (order.order_items as any[]).some(
        (item) => item.product_id === productId
    )

    if (!hasProduct) {
        return {
            valid: false,
            reason: 'この注文番号に同じ商品の型がありません。別の注文番号をお試しください。',
        }
    }

    return { valid: true }
}
