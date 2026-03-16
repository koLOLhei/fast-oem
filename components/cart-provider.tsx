'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import {
  type Cart,
  type CartItem,
  createEmptyCart,
  calculateCartTotals,
  generateCartItemId,
} from '@/lib/cart'
import { calculateUnitPrice, calculateTotalPrice, getProductById } from '@/lib/products'

interface CartContextType {
  cart: Cart
  addItem: (item: Omit<CartItem, 'id' | 'unitPrice' | 'totalPrice'>) => void
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

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (!isLoading) {
      try {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart))
      } catch {
        console.error('Failed to save cart to localStorage')
      }
    }
  }, [cart, isLoading])

  const addItem = (itemData: Omit<CartItem, 'id' | 'unitPrice' | 'totalPrice'>) => {
    const product = getProductById(itemData.productId)
    if (!product) return

    // Convert options array to Record<string, string> for price calculation
    const selectedOptions: Record<string, string> = {}
    itemData.options.forEach((opt) => {
      selectedOptions[opt.id] = opt.value
    })

    const unitPrice = calculateUnitPrice(product, itemData.quantity, selectedOptions)
    const totalPrice = calculateTotalPrice(product, itemData.quantity, selectedOptions)

    const newItem: CartItem = {
      ...itemData,
      id: generateCartItemId(),
      unitPrice,
      totalPrice,
    }

    setCart((prevCart) => {
      const newItems = [...prevCart.items, newItem]
      const totals = calculateCartTotals(newItems)
      return {
        items: newItems,
        ...totals,
      }
    })
  }

  const updateItemQuantity = (itemId: string, quantity: number) => {
    setCart((prevCart) => {
      const newItems = prevCart.items.map((item) => {
        if (item.id === itemId) {
          const product = getProductById(item.productId)
          if (!product) return item

          // Convert options array to Record<string, string> for price calculation
          const selectedOptions: Record<string, string> = {}
          item.options.forEach((opt) => {
            selectedOptions[opt.id] = opt.value
          })

          const unitPrice = calculateUnitPrice(product, quantity, selectedOptions)
          const totalPrice = calculateTotalPrice(product, quantity, selectedOptions)
          return {
            ...item,
            quantity,
            unitPrice,
            totalPrice,
          }
        }
        return item
      })
      const totals = calculateCartTotals(newItems)
      return {
        items: newItems,
        ...totals,
      }
    })
  }

  const removeItem = (itemId: string) => {
    setCart((prevCart) => {
      const newItems = prevCart.items.filter((item) => item.id !== itemId)
      const totals = calculateCartTotals(newItems)
      return {
        items: newItems,
        ...totals,
      }
    })
  }

  const clearCart = () => {
    setCart(createEmptyCart())
  }

  return (
    <CartContext.Provider
      value={{
        cart,
        addItem,
        updateItemQuantity,
        removeItem,
        clearCart,
        isLoading,
      }}
    >
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
