export interface CartItemOption {
  id: string
  name: string
  value: string
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
  designFileName: string | null
  moldFee?: number
  moldOrderId?: string
  expressDelivery?: boolean
  expressDeliveryFee?: number
  deliveryPdfUrl?: string | null
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
    totalPrice: items.reduce((sum, item) => sum + item.totalPrice + (item.moldFee || 0) + (item.expressDeliveryFee || 0), 0),
  }
}

export function generateCartItemId(): string {
  return `cart-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}
