'use client'

import Link from 'next/link'
import { ShoppingCart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCart } from '@/components/cart-provider'

export function CartBadge() {
  const { cart } = useCart()

  return (
    <Link href="/cart" className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="relative h-11 w-11 rounded-xl hover:bg-[#ffe135]/20 border-2 border-transparent hover:border-[#ffe135]"
      >
        <ShoppingCart className="h-6 w-6" />
        {cart.totalItems > 0 && (
          <span className="absolute -top-2 -right-2 bg-[#ff7b54] text-white text-[10px] font-black min-w-[1.25rem] h-5 px-1 rounded-full flex items-center justify-center shadow-lg border-2 border-white">
            {cart.totalItems > 99 ? '99+' : cart.totalItems}
          </span>
        )}
        <span className="sr-only">カート</span>
      </Button>
    </Link>
  )
}
