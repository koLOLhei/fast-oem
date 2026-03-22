/**
 * Centralised order/item status labels and colours.
 * Import from here instead of duplicating inline constants.
 */

/** Human-readable Japanese labels for order-level statuses. */
export const ORDER_STATUS_LABELS: Record<string, string> = {
    pending: '決済待ち',
    paid: '入金確認済み',
    processing: '製造中',
    partially_shipped: '一部発送済み',
    shipped: '発送完了',
    completed: '完了',
    cancelled: 'キャンセル済み',
    refunded: '返金済み',
}

/** Human-readable Japanese labels for order-item-level statuses. */
export const ITEM_STATUS_LABELS: Record<string, string> = {
    unassigned: '未割当',
    assigned: '割当済み',
    manufacturing: '製造中',
    ready_to_ship: '出荷準備完了',
    shipped: '発送済み',
    cancelled: 'キャンセル済み',
}

/** Tailwind colour classes for order status badges. */
export const ORDER_STATUS_COLORS: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    paid: 'bg-green-100 text-green-800',
    processing: 'bg-blue-100 text-blue-800',
    partially_shipped: 'bg-indigo-100 text-indigo-800',
    shipped: 'bg-purple-100 text-purple-800',
    completed: 'bg-gray-100 text-gray-700',
    cancelled: 'bg-red-100 text-red-800',
    refunded: 'bg-orange-100 text-orange-800',
    failed: 'bg-red-100 text-red-800',
}

/** Statuses from which an admin can cancel an order. */
export const CANCELLABLE_STATUSES = ['pending', 'paid', 'processing', 'partially_shipped'] as const

/** Human-readable Japanese labels for user roles. */
export const ROLE_LABELS: Record<string, string> = {
    super_admin: 'スーパー管理者',
    admin: '管理者',
    factory: '工場',
    customer: '顧客',
}

/** Tailwind colour classes for role badges. */
export const ROLE_COLORS: Record<string, string> = {
    super_admin: 'bg-red-100 text-red-800',
    admin: 'bg-purple-100 text-purple-800',
    factory: 'bg-blue-100 text-blue-800',
    customer: 'bg-gray-100 text-gray-700',
}
