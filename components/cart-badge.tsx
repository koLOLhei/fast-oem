'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ShoppingCart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCart } from '@/components/cart-provider'

export function CartBadge() {
  const { cart } = useCart()
  // Suppress the badge count until after hydration — the cart is restored from
  // localStorage in a client-only useEffect, so SSR always produces 0 while
  // the client may have items. Rendering cart.totalItems on first paint causes
  // a hydration mismatch (React error #418).
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  const showBadge = mounted && cart.totalItems > 0

  return (
    <Link href="/cart" className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="relative h-11 w-11 rounded-xl hover:bg-[#f5a623]/20 border-2 border-transparent hover:border-[#f5a623]"
      >
        <ShoppingCart className="h-6 w-6" />
        {showBadge && (
          <span className="absolute -top-2 -right-2 bg-[#1e73be] text-white text-[10px] font-black min-w-[1.25rem] h-5 px-1 rounded-full flex items-center justify-center shadow-lg border-2 border-white">
            {cart.totalItems > 99 ? '99+' : cart.totalItems}
          </span>
        )}
        <span className="sr-only">カート</span>
      </Button>
    </Link>
  )
}
