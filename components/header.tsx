'use client'

import Link from 'next/link'
import { ShoppingCart, Menu, X, ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useCart } from '@/components/cart-provider'

type ProductNav = { slug: string; name: string }

export function Header({ products }: { products: ProductNav[] }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { cart } = useCart()

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b-4 border-[#ffe135]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18 py-3">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-11 h-11 bg-white rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform overflow-hidden">
              <img src="/logo.png" alt="FAST OEM logo" className="w-full h-full object-contain" />
            </div>
            <div className="flex flex-col">
              <span className="font-black text-xl text-foreground leading-none">
                FAST OEM
              </span>
              <span className="text-[10px] text-[#00c8c8] font-bold leading-none mt-1">
                オリジナルグッズ製作
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="text-foreground hover:text-[#00c8c8] hover:bg-[#00c8c8]/10 transition-colors h-11 px-4 rounded-xl font-bold"
                >
                  商品一覧
                  <ChevronDown className="ml-1 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56 rounded-xl border-2 border-[#00c8c8]/20">
                <DropdownMenuItem asChild>
                  <Link href="/products" className="cursor-pointer font-bold text-[#00c8c8]">
                    すべての商品
                  </Link>
                </DropdownMenuItem>
                <div className="h-px bg-[#ffe135] my-1" />
                {products.map((product) => (
                  <DropdownMenuItem key={product.slug} asChild>
                    <Link
                      href={`/products/${product.slug}`}
                      className="cursor-pointer hover:text-[#ff7b54] transition-colors"
                    >
                      {product.name}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Link
              href="/#how-it-works"
              className="text-foreground hover:text-[#00c8c8] hover:bg-[#00c8c8]/10 transition-colors h-11 px-4 rounded-xl flex items-center text-sm font-bold"
            >
              ご利用方法
            </Link>
            <Link
              href="/contact"
              className="text-foreground hover:text-[#00c8c8] hover:bg-[#00c8c8]/10 transition-colors h-11 px-4 rounded-xl flex items-center text-sm font-bold"
            >
              お問い合わせ
            </Link>
          </nav>

          {/* Cart & CTA */}
          <div className="flex items-center gap-3">

            <Link href="/cart" className="relative">
              <Button
                variant="ghost"
                size="icon"
                className="relative h-11 w-11 rounded-xl hover:bg-[#ffe135]/20 border-2 border-transparent hover:border-[#ffe135]"
              >
                <ShoppingCart className="h-6 w-6" />
                {cart.totalItems > 0 && (
                  <span className="absolute -top-2 -right-2 bg-[#ff7b54] text-white text-xs font-black w-6 h-6 rounded-full flex items-center justify-center shadow-lg border-2 border-white">
                    {cart.totalItems}
                  </span>
                )}
                <span className="sr-only">カート</span>
              </Button>
            </Link>

            <Button
              asChild
              className="hidden sm:flex bg-[#ff7b54] hover:bg-[#ff6b3d] text-white h-11 px-6 rounded-xl shadow-lg shadow-[#ff7b54]/30 font-bold border-2 border-white"
            >
              <Link href="/products">今すぐ作成</Link>
            </Button>

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden h-11 w-11 rounded-xl hover:bg-[#00c8c8]/10"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              <span className="sr-only">メニュー</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div className="md:hidden bg-white border-t-2 border-[#00c8c8]/20">
          <nav className="flex flex-col px-4 py-4 gap-1">
            <div className="py-2 px-3 text-xs font-bold text-[#00c8c8] uppercase tracking-wider">
              商品カテゴリ
            </div>
            {products.map((product, index) => {
              const colors = ['text-[#00c8c8]', 'text-[#ffe135]', 'text-[#ff7b54]', 'text-[#7ed957]', 'text-[#a78bfa]']
              return (
                <Link
                  key={product.slug}
                  href={`/products/${product.slug}`}
                  className={`text-foreground py-3 px-3 hover:bg-[#00c8c8]/10 rounded-xl transition-colors font-medium flex items-center gap-3`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  <span className={`w-2 h-2 rounded-full ${colors[index % colors.length].replace('text-', 'bg-')}`} />
                  {product.name}
                </Link>
              )
            })}
            <div className="h-px bg-[#ffe135] my-2" />
            <Link
              href="/products"
              className="text-white py-3 px-4 bg-[#00c8c8] rounded-xl transition-colors font-bold text-center"
              onClick={() => setIsMenuOpen(false)}
            >
              すべての商品を見る
            </Link>
            <Link
              href="/#how-it-works"
              className="text-foreground py-3 px-3 hover:bg-[#ffe135]/20 rounded-xl transition-colors font-medium"
              onClick={() => setIsMenuOpen(false)}
            >
              ご利用方法
            </Link>
            <Link
              href="/contact"
              className="text-foreground py-3 px-3 hover:bg-[#ffe135]/20 rounded-xl transition-colors font-medium"
              onClick={() => setIsMenuOpen(false)}
            >
              お問い合わせ
            </Link>
          </nav>
        </div>
      )}
    </header>
  )
}
