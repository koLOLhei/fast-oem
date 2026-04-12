export interface CartItemOption {
  id: string
  name: string
  value: string
}

export interface DesignImageEntry {
  viewId: string
  viewLabel: string
  storagePath: string
  fileName: string
  deliveryPdfUrl?: string
}

export interface CartItem {
  id: string
  productId: string
  productName: string
  quantity: number
  unitPrice: number
  totalPrice: number
  options: CartItemOption[]
  designImage: string | null
  designPreviewDataUrl: string | null  // canvas data URL for display in cart/checkout
  designFileName: string | null
  moldFee?: number
  moldOrderId?: string
  expressDelivery?: boolean
  expressDeliveryFee?: number
  deliveryPdfUrl?: string | null
  designImages?: DesignImageEntry[]  // multi-view for 3D products
  backDesignImage?: string | null       // storage path for back design (double-sided)
  backDesignPreviewDataUrl?: string | null  // preview data URL for back design
  backDesignFileName?: string | null
  backDeliveryPdfUrl?: string | null    // delivery PDF URL for back design
  shippingModifier?: number          // extra shipping from options
}

export interface Cart {
  items: CartItem[]
  totalItems: number
  totalPrice: number
}

export function createEmptyCart(): Cart {
  return {
    items: [],
    totalItems: 0,
    totalPrice: 0,
  }
}

export function calculateCartTotals(items: CartItem[]): { totalItems: number; totalPrice: number } {
  return {
    totalItems: items.reduce((sum, item) => sum + item.quantity, 0),
    totalPrice: items.reduce((sum, item) => sum + item.totalPrice + (item.moldFee || 0) + (item.expressDeliveryFee || 0) + (item.shippingModifier || 0), 0),
  }
}

export function calculateTotalQuantity(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity, 0)
}

export function generateCartItemId(): string {
  // crypto.randomUUID() guarantees uniqueness even when items are added
  // in rapid succession (bulk add), unlike Date.now() which can collide.
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `cart-${crypto.randomUUID()}`
  }
  // Fallback for very old environments
  return `cart-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}
