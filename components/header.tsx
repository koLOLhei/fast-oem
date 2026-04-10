import Link from 'next/link'
import Image from 'next/image'
import { ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { CartBadge } from '@/components/cart-badge'
import { MobileMenu } from '@/components/mobile-menu'
import { getProductsFromDb } from '@/lib/products-db'

export async function Header() {
  const products = await getProductsFromDb()
  const productNav = products.map((p) => ({ slug: p.slug, name: p.name }))

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b-4 border-[#ffe135]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18 py-3">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-11 h-11 bg-white rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform overflow-hidden">
              <Image src="/logo.png" alt="FAST OEM logo" width={44} height={44} className="w-full h-full object-contain" />
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
                {productNav.map((product) => (
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
              href="/guide"
              className="text-foreground hover:text-[#00c8c8] hover:bg-[#00c8c8]/10 transition-colors h-11 px-4 rounded-xl flex items-center text-sm font-bold"
            >
              製作ガイド
            </Link>
            <Link
              href="/cases"
              className="text-foreground hover:text-[#00c8c8] hover:bg-[#00c8c8]/10 transition-colors h-11 px-4 rounded-xl flex items-center text-sm font-bold"
            >
              製作事例
            </Link>
            <Link
              href="/blog"
              className="text-foreground hover:text-[#00c8c8] hover:bg-[#00c8c8]/10 transition-colors h-11 px-4 rounded-xl flex items-center text-sm font-bold"
            >
              コラム
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

            <CartBadge />

            <Button
              asChild
              className="hidden sm:flex bg-[#ff7b54] hover:bg-[#ff6b3d] text-white h-11 px-6 rounded-xl shadow-lg shadow-[#ff7b54]/30 font-bold border-2 border-white"
            >
              <Link href="/products">今すぐ作成</Link>
            </Button>

            {/* Mobile Menu Button + Panel */}
            <MobileMenu products={productNav} />
          </div>
        </div>
      </div>
    </header>
  )
}
