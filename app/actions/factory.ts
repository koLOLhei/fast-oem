'use server'

import { createServiceClient } from '@/lib/supabase/service'
import { revalidatePath } from 'next/cache'
import { sendShippingNotification, sendAllShippedNotification } from '@/app/actions/order'
import { stripe } from '@/lib/stripe'
import { sendSlackMessage } from '@/lib/slack'
import { requireAdmin, requireFactory } from '@/lib/auth/require-admin'
import { escapeHtml } from '@/lib/utils'
import { isValidUUID } from '@/lib/validation'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://fast-oem.soara-mu.jp').replace(/\/$/, '')
const FROM_EMAIL = process.env.FROM_EMAIL ?? 'FAST OEM <noreply@soara-mu.com>'
const CONTACT_EMAIL = process.env.CONTACT_EMAIL ?? 'contact@soara-mu.com'

export async function assignFactory(itemId: string, factoryId: string) {
    await requireAdmin()
    if (!isValidUUID(itemId) || !isValidUUID(factoryId)) {
        throw new Error('無効なIDが指定されました')
    }
    const { error } = await createServiceClient()
        .from('order_items')
        .update({ factory_id: factoryId, status: 'assigned' })
        .eq('id', itemId)

    if (error) {
        console.error('[assignFactory] DB error:', { itemId, factoryId, error })
        throw new Error('工場の割り当てに失敗しました')
    }
    revalidatePath('/admin')
    revalidatePath('/admin/orders/[id]', 'page')
}

const VALID_ITEM_STATUSES = ['unassigned', 'assigned', 'manufacturing', 'ready_to_ship', 'shipped', 'cancelled'] as const

export async function updateItemStatus(itemId: string, status: string) {
    if (!isValidUUID(itemId)) throw new Error('無効なアイテムIDです')
    if (!(VALID_ITEM_STATUSES as readonly string[]).includes(status)) {
        throw new Error(`無効なステータスです: ${status}`)
    }

    // Factory users may only update items assigned to their factory.
    // If factoryId is null the account has no factory assignment — deny outright
    // to prevent an unconstrained UPDATE that would touch all items.
    const { factoryId } = await requireFactory()
    if (!factoryId) throw new Error('工場が割り当てられていません。管理者に連絡してください。')

    const { error } = await createServiceClient()
        .from('order_items')
        .update({ status })
        .eq('id', itemId)
        .eq('factory_id', factoryId)

    if (error) {
        console.error('[updateItemStatus] DB error:', error.message)
        throw new Error('ステータスの更新に失敗しました')
    }
    revalidatePath('/admin')
    revalidatePath('/factory')
    revalidatePath('/admin/orders/[id]', 'page')
    revalidatePath('/orders/[id]/status', 'page')
}

/**
 * Revert a manufacturing item back to assigned status.
 * Useful when a factory mistakenly pressed "start manufacturing".
 */
export async function revertItemStatus(itemId: string) {
    if (!isValidUUID(itemId)) throw new Error('無効なアイテムIDです')
    const { factoryId } = await requireFactory()
    if (!factoryId) throw new Error('工場が割り当てられていません。管理者に連絡してください。')

    const service = createServiceClient()

    const { data: item, error: fetchError } = await service
        .from('order_items')
        .select('status, factory_id')
        .eq('id', itemId)
        .single()

    if (fetchError || !item) throw new Error('アイテムが見つかりません')
    if (!['manufacturing', 'ready_to_ship'].includes(item.status)) {
        throw new Error('製造中または発送待ちのアイテムのみ戻せます')
    }
    if (item.factory_id !== factoryId) throw new Error('このアイテムへのアクセス権限がありません')

    // manufacturing → assigned, ready_to_ship → manufacturing
    const targetStatus = item.status === 'ready_to_ship' ? 'manufacturing' : 'assigned'

    // Optimistic lock: include status in WHERE to detect concurrent changes
    const { data: updated, error } = await service
        .from('order_items')
        .update({ status: targetStatus })
        .eq('id', itemId)
        .eq('status', item.status)
        .select('id')

    if (error) {
        console.error('[revertItemStatus] DB error:', error.message)
        throw new Error('ステータスの変更に失敗しました')
    }
    if (!updated || updated.length === 0) {
        throw new Error('ステータスが既に変更されています。ページを更新して再度お試しください。')
    }
    revalidatePath('/factory')
    revalidatePath('/admin')
    revalidatePath('/admin/orders/[id]', 'page')
    revalidatePath('/orders/[id]/status', 'page')
}

const VALID_ORDER_STATUSES = ['pending', 'paid', 'processing', 'partially_shipped', 'shipped', 'completed', 'cancelled', 'refunded'] as const

/**
 * Allowed order status transitions. Keys are the current status,
 * values are the statuses that the order may transition to.
 * This prevents nonsensical jumps (e.g. pending → shipped).
 */
const ALLOWED_ORDER_TRANSITIONS: Record<string, readonly string[]> = {
    pending: ['paid', 'cancelled'],
    paid: ['processing', 'cancelled', 'refunded'],
    processing: ['partially_shipped', 'shipped', 'cancelled', 'refunded'],
    partially_shipped: ['shipped', 'cancelled', 'refunded'],
    shipped: ['completed', 'refunded'],
    completed: ['refunded'],
    cancelled: [],   // terminal
    refunded: [],    // terminal
}

export async function updateOrderStatus(orderId: string, status: string) {
    if (!isValidUUID(orderId)) throw new Error('無効な注文IDです')
    if (!(VALID_ORDER_STATUSES as readonly string[]).includes(status)) {
        throw new Error(`無効なステータスです: ${status}`)
    }
    await requireAdmin()

    const service = createServiceClient()

    // Fetch current status to validate the transition
    const { data: current, error: fetchError } = await service
        .from('orders')
        .select('status')
        .eq('id', orderId)
        .single()

    if (fetchError || !current) throw new Error('注文が見つかりません')

    const allowed = ALLOWED_ORDER_TRANSITIONS[current.status] ?? []
    if (!allowed.includes(status)) {
        throw new Error(
            `ステータスを「${current.status}」から「${status}」に変更することはできません`
        )
    }

    // Optimistic lock: only update if status hasn't changed since we read it
    const { data: updated, error } = await service
        .from('orders')
        .update({ status })
        .eq('id', orderId)
        .eq('status', current.status)
        .select('id')

    if (error) {
        console.error('[updateOrderStatus] DB error:', error.message)
        throw new Error('ステータスの更新に失敗しました')
    }
    if (!updated || updated.length === 0) {
        throw new Error('ステータスが既に変更されています。ページを更新して再度お試しください。')
    }

    revalidatePath('/admin')
    revalidatePath(`/admin/orders/${orderId}`)
}

/**
 * Called by factory when shipping is complete.
 * Saves the tracking number, updates status to "shipped",
 * then sends a shipping notification email to the customer.
 */
export async function submitTrackingNumber(itemId: string, trackingNumber: string) {
    if (!isValidUUID(itemId)) throw new Error('無効なアイテムIDです')
    const tracking = trackingNumber.trim()
    if (!tracking) throw new Error('追跡番号を入力してください')
    if (tracking.length < 5) throw new Error('追跡番号が短すぎます（5文字以上）')
    if (tracking.length > 100) throw new Error('追跡番号が長すぎます（100文字以内）')
    // Allow digits, letters, hyphens, spaces only
    if (!/^[a-zA-Z0-9\- ]+$/.test(tracking)) {
        throw new Error('追跡番号に使用できない文字が含まれています（半角英数字・ハイフン・スペースのみ）')
    }

    // Verify the caller is a factory user and get their factory_id
    const { factoryId } = await requireFactory()
    if (!factoryId) throw new Error('工場が割り当てられていません。管理者に連絡してください。')

    // Use service client to read order data (bypasses RLS for factory user)
    const service = createServiceClient()

    // Fetch item + parent order in one query
    const { data: item, error: itemError } = await service
        .from('order_items')
        .select(`
            id,
            product_name,
            quantity,
            order_id,
            factory_id,
            orders (
                id,
                order_number,
                access_token,
                customer_info
            )
        `)
        .eq('id', itemId)
        .single()

    if (itemError || !item) throw new Error('アイテムが見つかりません')

    // Verify this item belongs to the current factory user
    if ((item as any).factory_id !== factoryId) {
        throw new Error('このアイテムへのアクセス権限がありません')
    }

    const order = item.orders as any
    const customerInfo = order?.customer_info as any
    const customerEmail = customerInfo?.email as string
    const customerName = customerInfo?.name ?? `${customerInfo?.lastName ?? ''} ${customerInfo?.firstName ?? ''}`.trim()
    const orderId = order?.id as string
    const orderNumber = (order?.order_number ?? orderId) as string
    const accessToken = order?.access_token as string

    if (!customerEmail) throw new Error('顧客メールアドレスが見つかりません')
    if (!accessToken) throw new Error('アクセストークンが見つかりません')

    // Update item: save tracking number + mark as shipped
    const { error: updateError } = await service
        .from('order_items')
        .update({ tracking_number: tracking, status: 'shipped' })
        .eq('id', itemId)

    if (updateError) {
        console.error('[submitTrackingNumber] Failed to update item:', { itemId, error: updateError.message })
        throw new Error('追跡番号の保存に失敗しました')
    }

    // Update order-level status based on how many items are now shipped
    const { data: siblings } = await service
        .from('order_items')
        .select('id, status')
        .eq('order_id', orderId)

    const activeSiblings = (siblings ?? []).filter((s) => s.status !== 'cancelled')
    const allShipped = activeSiblings.every((s) => s.id === itemId || s.status === 'shipped')
    const anyShipped = activeSiblings.some((s) => s.id === itemId || s.status === 'shipped')
    // Use a conditional update (neq guard) as an optimistic lock so that only the
    // request that actually transitions the order to 'shipped' sends the completion
    // email — prevents duplicate emails when multiple items are submitted concurrently.
    let isFirstToComplete = false
    if (orderId) {
        if (allShipped) {
            const { data: shippedRows } = await service
                .from('orders')
                .update({ status: 'shipped' })
                .eq('id', orderId)
                .neq('status', 'shipped')
                .select('id')
            isFirstToComplete = (shippedRows?.length ?? 0) > 0
        } else if (anyShipped) {
            await service.from('orders').update({ status: 'partially_shipped' }).eq('id', orderId)
        }
    }

    // When ALL items are shipped: send consolidated summary only (not per-item + summary)
    // When SOME items remain: send per-item notification
    if (allShipped && isFirstToComplete) {
        try {
            const { data: allItems } = await service
                .from('order_items')
                .select('product_name, quantity, tracking_number')
                .eq('order_id', orderId)

            const shippedItems = (allItems ?? [])
                .filter((s) => s.tracking_number)
                .map((s) => ({
                    productName: s.product_name as string,
                    quantity: s.quantity as number,
                    trackingNumber: s.tracking_number as string,
                }))

            // Include the current item in case DB hasn't refreshed yet
            const hasCurrentItem = shippedItems.some((s) => s.trackingNumber === tracking)
            if (!hasCurrentItem) {
                shippedItems.push({
                    productName: item.product_name,
                    quantity: item.quantity ?? 1,
                    trackingNumber: tracking,
                })
            }

            if (shippedItems.length > 0) {
                await sendAllShippedNotification({
                    customerEmail,
                    customerName,
                    orderNumber,
                    orderId,
                    accessToken,
                    items: shippedItems,
                })
            }
        } catch (allEmailErr) {
            const errMsg = allEmailErr instanceof Error ? allEmailErr.message : String(allEmailErr)
            console.error('[submitTrackingNumber] All-shipped summary email failed:', {
                itemId, orderId, orderNumber, customerEmail, error: allEmailErr,
            })
            await service.from('orders').update({
                email_send_error: `発送完了メール送信失敗 (${new Date().toISOString()}): ${errMsg}`,
            }).eq('id', orderId)
        }
    } else {
        // Partial shipment: notify customer about this specific item
        try {
            await sendShippingNotification({
                customerEmail,
                customerName,
                orderNumber,
                orderId,
                accessToken,
                trackingNumber: tracking,
                productName: item.product_name,
            })
        } catch (emailErr) {
            const errMsg = emailErr instanceof Error ? emailErr.message : String(emailErr)
            console.error('[submitTrackingNumber] Shipping notification email failed:', {
                itemId, orderId, orderNumber, customerEmail, error: emailErr,
            })
            // Do NOT re-throw: tracking number is saved, only email failed
            await service.from('orders').update({
                email_send_error: `発送通知メール送信失敗 (${new Date().toISOString()}): ${errMsg}`,
            }).eq('id', orderId)
        }
    }

    revalidatePath('/factory')
    revalidatePath('/admin')
    revalidatePath(`/admin/orders/${orderId}`)
    revalidatePath('/orders/[id]/status', 'page')
}

export async function updateOrderNote(orderId: string, note: string) {
    if (!isValidUUID(orderId)) throw new Error('無効な注文IDです')
    await requireAdmin()
    // Use service client to bypass RLS — same pattern as adminCancelOrder
    const service = createServiceClient()
    const trimmed = note.trim().slice(0, 1000)
    if (!trimmed) {
        // Allow clearing: just save empty
        const { error } = await service.from('orders').update({ admin_notes: '' }).eq('id', orderId)
        if (error) {
            console.error('[updateOrderNote] DB error:', error.message)
            throw new Error('メモの更新に失敗しました')
        }
        revalidatePath(`/admin/orders/${orderId}`)
        return
    }

    // Prepend new entry with timestamp, preserving history
    const { data: existing } = await service
        .from('orders').select('admin_notes').eq('id', orderId).single()
    const stamp = new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })
    const prev = (existing as any)?.admin_notes ?? ''
    const newNotes = `[${stamp}]\n${trimmed}${prev ? `\n\n${prev}` : ''}`.slice(0, 4000)

    const { error } = await service
        .from('orders').update({ admin_notes: newNotes }).eq('id', orderId)
    if (error) {
        console.error('[updateOrderNote] DB error:', error.message)
        throw new Error('メモの更新に失敗しました')
    }
    revalidatePath(`/admin/orders/${orderId}`)
}

export async function updateFactoryNote(orderId: string, note: string) {
    if (!isValidUUID(orderId)) throw new Error('無効な注文IDです')
    await requireAdmin()
    // Use service client to bypass RLS — same pattern as adminCancelOrder
    const { error } = await createServiceClient()
        .from('orders')
        .update({ factory_note: note.slice(0, 1000) })
        .eq('id', orderId)

    if (error) {
        console.error('[updateFactoryNote] DB error:', error.message)
        throw new Error('工場メモの更新に失敗しました')
    }
    revalidatePath(`/admin/orders/${orderId}`)
}

export async function bulkAssignFactory(orderId: string, factoryId: string) {
    if (!isValidUUID(orderId) || !isValidUUID(factoryId)) throw new Error('無効なIDが指定されました')
    await requireAdmin()
    const service = createServiceClient()

    // First, fetch the unassigned item IDs to prevent concurrent double-assignment.
    const { data: unassigned, error: fetchErr } = await service
        .from('order_items')
        .select('id')
        .eq('order_id', orderId)
        .eq('status', 'unassigned')

    if (fetchErr) {
        console.error('[bulkAssignFactory] Fetch error:', fetchErr.message)
        throw new Error('アイテム情報の取得に失敗しました')
    }
    if (!unassigned || unassigned.length === 0) {
        throw new Error('割り当て可能なアイテムがありません')
    }

    // Use explicit ID list + status guard as optimistic lock
    const { data: updated, error } = await service
        .from('order_items')
        .update({ factory_id: factoryId, status: 'assigned' })
        .in('id', unassigned.map(i => i.id))
        .eq('status', 'unassigned')
        .select('id')

    if (error) {
        console.error('[bulkAssignFactory] DB error:', error.message)
        throw new Error('工場の一括割り当てに失敗しました')
    }
    if ((updated?.length ?? 0) < unassigned.length) {
        console.warn(`[bulkAssignFactory] Partial assignment: ${updated?.length}/${unassigned.length} items (concurrent modification)`)
    }

    revalidatePath(`/admin/orders/${orderId}`)
    revalidatePath('/admin')
}

/**
 * Admin-initiated order cancellation.
 * - Cancels the order and all its items in DB
 * - Issues a full Stripe refund if the order was paid
 * - Sends cancellation email to the customer
 * - Sends Slack notification
 *
 * Cancellable statuses: pending, paid, processing, partially_shipped
 */
export async function adminCancelOrder(orderId: string, reason: string, cancellationFee?: number): Promise<void> {
    if (!isValidUUID(orderId)) throw new Error('無効な注文IDです')
    await requireAdmin()

    if (!reason.trim()) throw new Error('キャンセル理由を入力してください')

    const supabase = createServiceClient()

    const { data: order, error: fetchError } = await supabase
        .from('orders')
        .select(`*, order_items(*)`)
        .eq('id', orderId)
        .single()

    if (fetchError || !order) throw new Error('注文が見つかりません')

    const CANCELLABLE = ['pending', 'paid', 'processing', 'partially_shipped']
    if (!CANCELLABLE.includes(order.status)) {
        throw new Error(`このステータス（${order.status}）の注文はキャンセルできません`)
    }

    // ── Determine refund amount ──────────────────────────────────────────────
    // For partially_shipped orders: refund only the items that have NOT shipped yet.
    // For all other paid statuses: full refund.
    const items = (order as any).order_items as Array<{
        id: string
        status: string
        unit_price: number
        quantity: number
        mold_fee?: number
        express_delivery_fee?: number
    }> ?? []

    const isPartiallyShipped = order.status === 'partially_shipped'
    const unshippedItems = isPartiallyShipped
        ? items.filter((i) => i.status !== 'shipped')
        : items

    // Amount in smallest currency unit (JPY = no decimals → same as yen amount)
    const partialRefundAmount = isPartiallyShipped
        ? unshippedItems.reduce((sum, i) => {
            const lineTotal = (i.unit_price ?? 0) * (i.quantity ?? 1)
            const mold = i.mold_fee ?? 0
            const express = i.express_delivery_fee ?? 0
            return sum + lineTotal + mold + express
          }, 0)
        : 0

    // ── Stripe refund (paid orders only) ────────────────────────────────────
    const fee = cancellationFee && cancellationFee > 0 ? cancellationFee : 0
    let refundIssued = false
    let refundAmount = 0 // 0 = full refund
    if (order.status !== 'pending') {
        try {
            const paymentIntentId: string | null =
                (order as any).payment_intent_id ?? null

            let piId = paymentIntentId

            // Fallback: retrieve payment intent from Stripe session
            if (!piId && order.stripe_session_id && !order.stripe_session_id.startsWith('tmp_')) {
                const session = await stripe.checkout.sessions.retrieve(order.stripe_session_id)
                piId = typeof session.payment_intent === 'string' ? session.payment_intent : null
            }

            if (piId) {
                if (isPartiallyShipped && partialRefundAmount > 0) {
                    // Partial refund: only the unshipped items' value minus cancellation fee
                    const actualRefund = Math.max(0, partialRefundAmount - fee)
                    if (actualRefund > 0) {
                        await stripe.refunds.create({ payment_intent: piId, amount: actualRefund })
                    }
                    refundAmount = actualRefund
                } else if (!isPartiallyShipped) {
                    // Full or partial refund (minus cancellation fee)
                    const orderTotal = (order as any).total_price ?? 0
                    const actualRefund = Math.max(0, orderTotal - fee)
                    if (actualRefund > 0) {
                        await stripe.refunds.create({ payment_intent: piId, amount: actualRefund })
                    }
                    refundAmount = actualRefund
                }
                refundIssued = true
            } else {
                console.warn(`[adminCancelOrder] ${orderId}: payment_intent not found — skipping Stripe refund`)
            }
        } catch (stripeErr: any) {
            // Non-fatal: log and alert, but still cancel in DB so ops can handle manually
            console.error(`[adminCancelOrder] Stripe refund failed for ${orderId}:`, stripeErr.message)
            await sendSlackMessage(
                `❌ *返金失敗（要手動対応）*\n注文番号: ${(order as any).order_number ?? orderId}\n` +
                `エラー: ${stripeErr.message}\n手動でStripeダッシュボードから返金してください。`,
            ).catch(() => {})
        }
    }

    // ── DB updates ───────────────────────────────────────────────────────────
    await supabase
        .from('orders')
        .update({
            status: refundIssued ? 'refunded' : 'cancelled',
            admin_cancel_reason: reason.trim(),
            cancelled_by_admin_at: new Date().toISOString(),
            ...(refundIssued ? {
                refunded_at: new Date().toISOString(),
                refunded_amount: refundAmount,
                cancellation_fee: fee > 0 ? fee : null,
            } : {}),
        })
        .eq('id', orderId)

    // For partially_shipped: only cancel unshipped items; keep shipped items as-is
    if (isPartiallyShipped && unshippedItems.length > 0) {
        await supabase
            .from('order_items')
            .update({ status: 'cancelled' })
            .in('id', unshippedItems.map((i) => i.id))
    } else {
        await supabase
            .from('order_items')
            .update({ status: 'cancelled' })
            .eq('order_id', orderId)
    }

    // ── Customer email ───────────────────────────────────────────────────────
    const customerInfo = order.customer_info as any
    const customerEmail: string = customerInfo?.email ?? ''
    const customerName: string = customerInfo?.name ?? `${customerInfo?.lastName ?? ''} ${customerInfo?.firstName ?? ''}`.trim()
    const orderNumber: string = (order as any).order_number ?? orderId

    if (customerEmail) {
        try {
            const statusLink = order.access_token
                ? `${SITE_URL}/orders/${orderId}/status?token=${order.access_token}`
                : null

            const cancelText = [
                `${customerName} 様`,
                '',
                'FAST OEMをご利用いただき、誠にありがとうございます。',
                '誠に恐れ入りますが、下記の注文につきまして、キャンセルさせていただくこととなりました。',
                '',
                `【注文番号】 ${orderNumber}`,
                '',
                refundIssued
                    ? fee > 0
                        ? `■ ご返金について\nキャンセル料 ¥${fee.toLocaleString('ja-JP')} を差し引いた ¥${refundAmount.toLocaleString('ja-JP')} をご返金いたします。\nカード会社の処理により、反映まで数営業日かかる場合がございます。`
                        : refundAmount > 0 && isPartiallyShipped
                        ? `■ ご返金について\n未発送分の商品代金 ¥${refundAmount.toLocaleString('ja-JP')} をご返金いたします。\n既に発送済みの商品につきましては返金対象外となります。\nカード会社の処理により、反映まで数営業日かかる場合がございます。`
                        : '■ ご返金について\nご決済いただいた金額は全額ご返金いたします。\nカード会社の処理により、反映まで数営業日かかる場合がございます。'
                    : '',
                'ご不便をおかけしてしまい、大変申し訳ございません。',
                statusLink ? `\n■ 注文状況の確認\n${statusLink}` : '',
                `\nお問い合わせ: ${CONTACT_EMAIL}\n平日 10:00〜18:00（土日祝除く）`,
                '',
                `FAST OEM\n${SITE_URL}`,
            ].filter(Boolean).join('\n')

            await resend.emails.send({
                from: FROM_EMAIL,
                to: customerEmail,
                subject: `【FAST OEM】ご注文のキャンセルについて（注文番号: ${orderNumber}）`,
                text: cancelText,
                html: `
                  <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#ffffff;">
                    <h2 style="color:#1f2937;">${escapeHtml(customerName)} 様</h2>
                    <p style="color:#4b5563;line-height:1.7;font-size:14px;">
                      FAST OEMをご利用いただき、誠にありがとうございます。<br/>
                      誠に恐れ入りますが、下記の注文につきまして、弊社都合によりキャンセルさせていただくこととなりました。
                    </p>

                    <div style="margin:20px 0;padding:14px 16px;background:#f3f4f6;border-radius:8px;">
                      <p style="margin:0;font-size:12px;color:#6b7280;">注文番号</p>
                      <p style="margin:4px 0 0;font-family:monospace;font-weight:bold;font-size:15px;">${escapeHtml(orderNumber)}</p>
                    </div>

                    ${refundIssued ? `
                    <div style="margin:20px 0;padding:16px;background:#f0fdf4;border:1px solid #86efac;border-radius:8px;">
                      <p style="margin:0;font-size:14px;font-weight:bold;color:#166534;">💳 ご返金について</p>
                      <p style="margin:8px 0 0;font-size:13px;color:#4b5563;">
                        ${fee > 0
                          ? `キャンセル料 <strong>¥${fee.toLocaleString('ja-JP')}</strong> を差し引いた <strong>¥${refundAmount.toLocaleString('ja-JP')}</strong> をご返金いたします。`
                          : refundAmount > 0 && isPartiallyShipped
                          ? `未発送分の商品代金 <strong>¥${refundAmount.toLocaleString('ja-JP')}</strong> をご返金いたします。<br/>既に発送済みの商品につきましては返金対象外となります。`
                          : 'ご決済いただいた金額は全額ご返金いたします。'
                        }<br/>
                        カード会社の処理により、反映まで数営業日かかる場合がございます。
                      </p>
                    </div>
                    ` : ''}

                    <p style="color:#4b5563;line-height:1.7;font-size:14px;">
                      ご不便をおかけしてしまい、大変申し訳ございません。<br/>
                      ご不明な点がございましたら、下記までお気軽にお問い合わせください。
                    </p>

                    ${statusLink ? `
                    <div style="margin:20px 0;padding:16px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;">
                      <a href="${statusLink}" style="display:inline-block;padding:10px 20px;background:#2563eb;color:white;text-decoration:none;border-radius:6px;font-size:14px;font-weight:bold;">
                        注文状況を確認する
                      </a>
                    </div>
                    ` : ''}

                    <p style="font-size:12px;color:#9ca3af;border-top:1px solid #f3f4f6;padding-top:16px;margin-top:8px;">
                      お問い合わせ：<a href="mailto:${CONTACT_EMAIL}" style="color:#6b7280;">${CONTACT_EMAIL}</a><br/>
                      平日 10:00〜18:00（土日祝除く）
                    </p>
                  </div>
                `,
            })
        } catch (emailErr: any) {
            const errMsg = emailErr?.message ?? String(emailErr)
            console.error(`[adminCancelOrder] Customer email failed: ${errMsg}`)
            await supabase.from('orders').update({
                email_send_error: `キャンセル通知メール送信失敗 (${new Date().toISOString()}): ${errMsg}`,
            }).eq('id', orderId)
        }
    }

    // ── Slack notification ───────────────────────────────────────────────────
    const adminUrl = `${SITE_URL}/admin/orders/${orderId}`
    await sendSlackMessage(
        `🚫 *管理者キャンセル* 注文番号: ${orderNumber}\n` +
        `顧客: ${customerName}（${customerEmail}）\n` +
        `合計: ¥${((order as any).total_price ?? 0).toLocaleString('ja-JP')}\n` +
        `理由: ${reason.trim()}\n` +
        `${refundIssued ? `💳 Stripe返金を発行しました${refundAmount > 0 ? `（一部返金: ¥${refundAmount.toLocaleString('ja-JP')}）` : '（全額）'}\n` : ''}` +
        `<${adminUrl}|管理画面で確認>`,
    ).catch(() => {})

    revalidatePath(`/admin/orders/${orderId}`)
    revalidatePath('/admin/orders/[id]', 'page')
    revalidatePath('/admin')
    revalidatePath('/orders/[id]/status', 'page')
}

// Assign a Supabase Auth user to a factory (factory role)
export async function linkUserToFactory(userId: string, factoryId: string) {
    if (!isValidUUID(userId) || !isValidUUID(factoryId)) throw new Error('無効なIDが指定されました')
    await requireAdmin()
    const { error } = await createServiceClient()
        .from('profiles')
        .update({ factory_id: factoryId, role: 'factory' })
        .eq('id', userId)

    if (error) {
        console.error('[linkUserToFactory] DB error:', error.message)
        throw new Error('ユーザーの工場割り当てに失敗しました')
    }
    revalidatePath('/admin')
}
