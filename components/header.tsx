import Link from 'next/link'
import Image from 'next/image'
import { ChevronDown, User } from 'lucide-react'
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

const navLinkClass =
  'text-foreground/80 hover:text-primary hover:bg-secondary transition-colors h-10 px-3.5 rounded-lg flex items-center text-sm font-semibold'

export async function Header() {
  const products = await getProductsFromDb()
  const productNav = products.map((p) => ({ slug: p.slug, name: p.name }))

  return (
    <header className="sticky top-0 z-50 bg-background/85 backdrop-blur-md border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <span className="w-10 h-10 rounded-xl bg-white ring-1 ring-border flex items-center justify-center overflow-hidden shadow-card transition-transform group-hover:-translate-y-0.5">
              <Image src="/logo.png" alt="FAST OEM logo" width={40} height={40} className="w-full h-full object-contain" />
            </span>
            <span className="flex flex-col">
              <span className="font-extrabold text-lg text-foreground leading-none tracking-tight">FAST OEM</span>
              <span className="text-[10px] text-brand-blue font-bold leading-none mt-1 tracking-wide">オリジナルグッズ製作</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-0.5">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className={`${navLinkClass} gap-1`}>
                  商品一覧
                  <ChevronDown className="h-4 w-4 opacity-70" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56 rounded-xl border-border shadow-float">
                <DropdownMenuItem asChild>
                  <Link href="/products" className="cursor-pointer font-bold text-primary">
                    すべての商品
                  </Link>
                </DropdownMenuItem>
                <div className="h-px bg-border my-1" />
                {productNav.map((product) => (
                  <DropdownMenuItem key={product.slug} asChild>
                    <Link href={`/products/${product.slug}`} className="cursor-pointer">
                      {product.name}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Link href="/guide" className={navLinkClass}>製作ガイド</Link>
            <Link href="/cases" className={navLinkClass}>製作事例</Link>
            <Link href="/blog" className={navLinkClass}>コラム</Link>
            <Link href="/contact" className={navLinkClass}>お問い合わせ</Link>
          </nav>

          {/* Cart & CTA */}
          <div className="flex items-center gap-1.5">
            <Link
              href="/mypage"
              className="hidden md:flex items-center justify-center h-10 w-10 rounded-lg text-foreground/70 hover:text-primary hover:bg-secondary transition-colors"
              title="マイページ"
            >
              <User className="h-5 w-5" />
              <span className="sr-only">マイページ</span>
            </Link>

            <CartBadge />

            <Button
              asChild
              className="hidden sm:flex bg-primary hover:bg-brand-blue-dark text-primary-foreground h-10 px-5 rounded-lg font-bold shadow-brand"
            >
              <Link href="/products">今すぐ作成</Link>
            </Button>

            <MobileMenu products={productNav} />
          </div>
        </div>
      </div>
    </header>
  )
}
