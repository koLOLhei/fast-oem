'use client'

import { createContext, useContext, useEffect, useState, useCallback, useMemo, type ReactNode } from 'react'
import {
  type Cart,
  type CartItem,
  createEmptyCart,
  calculateCartTotals,
  generateCartItemId,
} from '@/lib/cart'
import { calculateUnitPrice, calculateTotalPrice, calculateMoldFee, getProductById } from '@/lib/products'

interface CartContextType {
  cart: Cart
  addItem: (item: Omit<CartItem, 'id' | 'unitPrice' | 'totalPrice'> & { unitPrice?: number; totalPrice?: number }) => void
  /** Replace the entire CartItem at itemId. Used by the "edit from cart" flow. */
  replaceItem: (itemId: string, replacement: Omit<CartItem, 'id'>) => void
  updateItemQuantity: (itemId: string, quantity: number) => void
  removeItem: (itemId: string) => void
  clearCart: () => void
  isLoading: boolean
}

const CartContext = createContext<CartContextType | undefined>(undefined)

const CART_STORAGE_KEY = 'fast-oem-cart'

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<Cart>(createEmptyCart())
  const [isLoading, setIsLoading] = useState(true)

  // Load cart from localStorage on mount
  useEffect(() => {
    try {
      const savedCart = localStorage.getItem(CART_STORAGE_KEY)
      if (savedCart) {
        const parsedCart = JSON.parse(savedCart) as Cart
        setCart(parsedCart)
      }
    } catch {
      console.error('Failed to load cart from localStorage')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Save cart to localStorage whenever it changes.
  // Large data:URI design images (base64) can exceed the ~5MB localStorage limit,
  // so we strip them before storing (deliveryPdfUrl is the authoritative source for checkout).
  useEffect(() => {
    if (!isLoading) {
      const MAX_DESIGN_URI_LEN = 150_000 // ~110 KB base64 threshold
      const stripLargeImages = (c: Cart): Cart => ({
        ...c,
        items: c.items.map((item) => ({
          ...item,
          designImage:
            item.designImage?.startsWith('data:') && item.designImage.length > MAX_DESIGN_URI_LEN
              ? null
              : item.designImage,
          // Always strip preview data URLs from localStorage — they're only for in-session display
          designPreviewDataUrl: null,
          backDesignPreviewDataUrl: null,
        })),
      })
      try {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(stripLargeImages(cart)))
      } catch (e: any) {
        // Fallback: strip ALL data:URI images if quota is still exceeded
        if (e?.name === 'QuotaExceededError' || e?.code === 22) {
          try {
            const stripped: Cart = {
              ...cart,
              items: cart.items.map((item) => ({
                ...item,
                designImage: item.designImage?.startsWith('data:') ? null : item.designImage,
                designPreviewDataUrl: null,
                backDesignPreviewDataUrl: null,
              })),
            }
            localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(stripped))
          } catch {
            console.error('カートの保存に失敗しました（ストレージ容量不足）')
          }
        } else {
          console.error('Failed to save cart to localStorage', e)
        }
      }
    }
  }, [cart, isLoading])

  const addItem = useCallback((itemData: Omit<CartItem, 'id' | 'unitPrice' | 'totalPrice'> & { unitPrice?: number; totalPrice?: number }) => {
    let unitPrice = itemData.unitPrice
    let totalPrice = itemData.totalPrice

    if (unitPrice === undefined || totalPrice === undefined) {
      const product = getProductById(itemData.productId)
      if (!product) return

      const selectedOptions: Record<string, string> = {}
      itemData.options.forEach((opt) => {
        selectedOptions[opt.id] = opt.value
      })
      unitPrice = calculateUnitPrice(product, itemData.quantity, selectedOptions)
      totalPrice = calculateTotalPrice(product, itemData.quantity, selectedOptions)
    }

    const newItem: CartItem = {
      ...itemData,
      id: generateCartItemId(),
      unitPrice,
      totalPrice,
    }

    setCart((prevCart) => {
      const newItems = [...prevCart.items, newItem]
      const totals = calculateCartTotals(newItems)
      return { items: newItems, ...totals }
    })
  }, [])

  const updateItemQuantity = useCallback((itemId: string, quantity: number) => {
    setCart((prevCart) => {
      const newItems = prevCart.items.map((item) => {
        if (item.id === itemId) {
          const product = getProductById(item.productId)

          if (!product) {
            // DB-only product: recalculate total from existing unit price.
            // The server re-validates all prices at checkout so this is safe.
            const totalPrice = item.unitPrice * quantity
            return { ...item, quantity, totalPrice }
          }

          const selectedOptions: Record<string, string> = {}
          item.options.forEach((opt) => {
            selectedOptions[opt.id] = opt.value
          })

          const unitPrice = calculateUnitPrice(product, quantity, selectedOptions)
          const totalPrice = calculateTotalPrice(product, quantity, selectedOptions)
          // Recalculate moldFee since it can be quantity-dependent (moldFeeRules)
          const moldInfo = calculateMoldFee(product, selectedOptions, quantity)
          const moldFee = moldInfo.requiresMold && !item.moldOrderId
            ? moldInfo.moldFee
            : item.moldOrderId ? 0 : undefined
          return { ...item, quantity, unitPrice, totalPrice, moldFee }
        }
        return item
      })
      const totals = calculateCartTotals(newItems)
      return { items: newItems, ...totals }
    })
  }, [])

  const removeItem = useCallback((itemId: string) => {
    setCart((prevCart) => {
      const newItems = prevCart.items.filter((item) => item.id !== itemId)
      const totals = calculateCartTotals(newItems)
      return { items: newItems, ...totals }
    })
  }, [])

  const replaceItem = useCallback((itemId: string, replacement: Omit<CartItem, 'id'>) => {
    setCart((prevCart) => {
      const idx = prevCart.items.findIndex((i) => i.id === itemId)
      if (idx < 0) return prevCart

      // Re-derive unit price / total price / mold fee from the product master
      // whenever possible — trust the DB-backed calculation over any client
      // value that could have been tampered with via DevTools.
      let unitPrice = replacement.unitPrice
      let totalPrice = replacement.totalPrice
      let moldFee = replacement.moldFee
      const product = getProductById(replacement.productId)
      if (product) {
        const selectedOptions: Record<string, string> = {}
        replacement.options.forEach((opt) => {
          selectedOptions[opt.id] = opt.value
        })
        unitPrice = calculateUnitPrice(product, replacement.quantity, selectedOptions)
        totalPrice = calculateTotalPrice(product, replacement.quantity, selectedOptions)
        const moldInfo = calculateMoldFee(product, selectedOptions, replacement.quantity)
        moldFee = moldInfo.requiresMold && !replacement.moldOrderId
          ? moldInfo.moldFee
          : replacement.moldOrderId ? 0 : replacement.moldFee
      }

      const next = [...prevCart.items]
      next[idx] = {
        ...replacement,
        id: itemId,
        unitPrice,
        totalPrice,
        moldFee,
      } as CartItem
      const totals = calculateCartTotals(next)
      return { items: next, ...totals }
    })
  }, [])

  const clearCart = useCallback(() => {
    setCart(createEmptyCart())
  }, [])

  const value = useMemo(() => ({
    cart,
    addItem,
    replaceItem,
    updateItemQuantity,
    removeItem,
    clearCart,
    isLoading,
  }), [cart, addItem, replaceItem, updateItemQuantity, removeItem, clearCart, isLoading])

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}
