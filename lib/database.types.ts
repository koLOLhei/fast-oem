/**
 * Supabase Database Row types — single source of truth for table schemas.
 *
 * These types eliminate `as any` casts when accessing Supabase query results.
 * They mirror the actual PostgreSQL schema (snake_case column names).
 *
 * Usage:
 *   import type { OrderRow, OrderItemRow, ... } from '@/lib/database.types'
 */

import type { ShippingAddress } from './order'
import type {
  PriceTier,
  ProductOption,
  MoldFeeRule,
  ImageView,
  ComplexityRule,
} from './products'

// ─── Enum-like string literals ──────────────────────────────────────────────

export type OrderStatus =
  | 'pending'
  | 'paid'
  | 'processing'
  | 'partially_shipped'
  | 'shipped'
  | 'completed'
  | 'cancelled'
  | 'refunded'

export type ItemStatus =
  | 'unassigned'
  | 'assigned'
  | 'manufacturing'
  | 'ready_to_ship'
  | 'shipped'
  | 'cancelled'

export type UserRole = 'super_admin' | 'admin' | 'factory' | 'customer'

// ─── JSONB sub-types ────────────────────────────────────────────────────────

export interface CustomerInfo {
  name: string
  email: string
  lastName?: string
  firstName?: string
  receiptAddressee?: string
}

export interface OrderItemOption {
  id: string
  name: string
  value: string
}

// ─── Table Row types ────────────────────────────────────────────────────────

export interface OrderRow {
  id: string
  stripe_session_id: string
  order_number: string | null
  customer_info: CustomerInfo
  shipping_address: ShippingAddress
  total_price: number
  shipping_fee: number | null
  status: OrderStatus
  access_token: string
  payment_intent_id: string | null
  admin_notes: string | null
  factory_note: string | null
  confirmation_email_sent_at: string | null
  email_send_error: string | null
  refunded_amount: number | null
  refunded_at: string | null
  admin_cancel_reason: string | null
  cancelled_by_admin_at: string | null
  customer_email: string | null    // generated column
  customer_name: string | null     // generated column
  created_at: string
  updated_at: string
}

export interface OrderItemRow {
  id: string
  order_id: string
  product_id: string
  product_name: string
  quantity: number
  unit_price: number
  total_price: number | null
  mold_fee: number | null
  mold_order_id: string | null
  options: OrderItemOption[]
  design_file_name: string | null
  design_url: string | null
  converted_design_url: string | null
  delivery_pdf_url: string | null
  express_delivery: boolean | null
  express_delivery_fee: number | null
  factory_id: string | null
  status: ItemStatus
  tracking_number: string | null
  design_images: unknown[]
  shipping_modifier: number
  created_at: string
  updated_at: string
}

export interface ProductRow {
  id: string
  slug: string
  name: string
  description: string
  short_description: string
  category: string
  requires_mold: boolean
  mold_fee: number
  mold_fee_rules: MoldFeeRule[]
  lead_time_days: number
  express_delivery_fee: number | null
  notification_email: string
  default_factory_id: string | null
  min_quantity: number
  max_quantity: number
  image_url: string
  features: string[]
  quantity_presets: number[]
  price_tiers: PriceTier[]
  options: ProductOption[]
  is_active: boolean
  is_3d: boolean
  image_views: ImageView[]
  fixed_unit_price: boolean
  complexity_rules: ComplexityRule[]
  created_at: string
  updated_at: string
}

export interface ProfileRow {
  id: string
  role: UserRole
  factory_id: string | null
  name: string | null
  email: string | null
  is_active: boolean
  created_at: string
}

export interface FactoryRow {
  id: string
  name: string
  country: string | null
  contact_email: string | null
  contact_name: string | null
  phone: string | null
  address: string | null
  max_capacity: number | null
  is_active: boolean
  created_at: string
}

export interface SiteSettingRow {
  key: string
  label: string
  value: string
  updated_at: string
}

export interface StaffInvitationRow {
  id: string
  email: string
  role: UserRole
  factory_id: string | null
  invited_by: string | null
  created_at: string
  used_at: string | null
}

export interface AdminAlertRow {
  id: string
  created_at: string
  subject: string
  body: string
  source: string | null
  order_id: string | null
  slack_failed: boolean
  resolved_at: string | null
}

// ─── Common JOIN result types ───────────────────────────────────────────────

/** order_items row with nested orders relation (many-to-one) */
export interface OrderItemWithOrder extends OrderItemRow {
  orders: Pick<OrderRow, 'id' | 'order_number' | 'status' | 'created_at' | 'access_token' | 'customer_info' | 'shipping_address' | 'factory_note'> | null
}

/** order_items row with nested factories relation (many-to-one) */
export interface OrderItemWithFactory extends OrderItemRow {
  factories: Pick<FactoryRow, 'id' | 'name'> | null
}

/** order_items with both orders and factories */
export interface OrderItemWithOrderAndFactory extends OrderItemRow {
  orders: Pick<OrderRow, 'id' | 'order_number' | 'status' | 'created_at' | 'customer_info' | 'shipping_address' | 'factory_note'> | null
  factories: Pick<FactoryRow, 'id' | 'name'> | null
}

/** orders row with nested order_items array */
export interface OrderWithItems extends OrderRow {
  order_items: OrderItemRow[]
}

/** orders row with items that include factory info */
export interface OrderWithItemsAndFactories extends OrderRow {
  order_items: (OrderItemRow & { factories?: Pick<FactoryRow, 'id' | 'name'> | null })[]
}

/** profiles row with nested factories relation */
export interface ProfileWithFactory extends ProfileRow {
  factories: Pick<FactoryRow, 'id' | 'name'> | null
}

/** staff_invitations row with nested factories relation */
export interface StaffInvitationWithFactory extends StaffInvitationRow {
  factories: Pick<FactoryRow, 'name'> | null
}

// ─── Utility: "pick" an order for lightweight listing ───────────────────────

/** Admin dashboard order item with minimal order + factory */
export interface DashboardOrderItem {
  id: string
  product_name: string
  quantity: number
  status: ItemStatus
  factory_id: string | null
  order_id: string
  orders: Pick<OrderRow, 'id' | 'order_number' | 'status' | 'created_at'> | null
  factories: Pick<FactoryRow, 'name'> | null
}

/** Admin reports: order with items + factory names */
export interface ReportOrder {
  id: string
  total_price: number
  created_at: string
  order_items: (Pick<OrderItemRow, 'product_name' | 'total_price' | 'factory_id' | 'status'> & {
    factories: Pick<FactoryRow, 'name'> | null
  })[]
}

/** Admin reports: order item with order + factory for item-level reports */
export interface ReportOrderItem {
  id: string
  product_name: string
  quantity: number
  unit_price: number
  total_price: number | null
  factory_id: string | null
  status: ItemStatus
  created_at: string
  orders: Pick<OrderRow, 'created_at'> | null
  factories: Pick<FactoryRow, 'name'> | null
}
