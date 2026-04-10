'use client'

import Link from 'next/link'
import { Menu, X } from 'lucide-react'
import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'

type ProductNav = { slug: string; name: string }

export function MobileMenuButton({
  onClick,
  isOpen,
}: {
  onClick: () => void
  isOpen: boolean
}) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className="md:hidden h-11 w-11 rounded-xl hover:bg-[#00c8c8]/10"
      onClick={onClick}
    >
      {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      <span className="sr-only">メニュー</span>
    </Button>
  )
}

export function MobileMenu({ products }: { products: ProductNav[] }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const pathname = usePathname()

  // Close mobile menu on route change (SPA navigation)
  useEffect(() => {
    setIsMenuOpen(false)
  }, [pathname])

  const colors = ['text-[#00c8c8]', 'text-[#ffe135]', 'text-[#ff7b54]', 'text-[#7ed957]', 'text-[#a78bfa]']

  return (
    <>
      {/* Mobile Menu Button - rendered inline in the header bar */}
      <MobileMenuButton
        isOpen={isMenuOpen}
        onClick={() => setIsMenuOpen(!isMenuOpen)}
      />

      {/* Mobile Navigation Panel */}
      {isMenuOpen && (
        <div className="md:hidden bg-white border-t-2 border-[#00c8c8]/20 absolute left-0 right-0 top-full z-50">
          <nav className="flex flex-col px-4 py-4 gap-1">
            <div className="py-2 px-3 text-xs font-bold text-[#00c8c8] uppercase tracking-wider">
              商品カテゴリ
            </div>
            {products.map((product, index) => (
              <Link
                key={product.slug}
                href={`/products/${product.slug}`}
                className={`text-foreground py-3 px-3 hover:bg-[#00c8c8]/10 rounded-xl transition-colors font-medium flex items-center gap-3`}
                onClick={() => setIsMenuOpen(false)}
              >
                <span className={`w-2 h-2 rounded-full ${colors[index % colors.length].replace('text-', 'bg-')}`} />
                {product.name}
              </Link>
            ))}
            <div className="h-px bg-[#ffe135] my-2" />
            <Link
              href="/products"
              className="text-white py-3 px-4 bg-[#00c8c8] rounded-xl transition-colors font-bold text-center"
              onClick={() => setIsMenuOpen(false)}
            >
              すべての商品を見る
            </Link>
            <Link
              href="/guide"
              className="text-foreground py-3 px-3 hover:bg-[#ffe135]/20 rounded-xl transition-colors font-medium"
              onClick={() => setIsMenuOpen(false)}
            >
              製作ガイド
            </Link>
            <Link
              href="/cases"
              className="text-foreground py-3 px-3 hover:bg-[#ffe135]/20 rounded-xl transition-colors font-medium"
              onClick={() => setIsMenuOpen(false)}
            >
              製作事例
            </Link>
            <Link
              href="/blog"
              className="text-foreground py-3 px-3 hover:bg-[#ffe135]/20 rounded-xl transition-colors font-medium"
              onClick={() => setIsMenuOpen(false)}
            >
              コラム
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
    </>
  )
}
