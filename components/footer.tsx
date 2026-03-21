import Link from 'next/link'
import { Mail, ArrowRight, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'

type ProductNav = { slug: string; name: string }

export function Footer({ products }: { products: ProductNav[] }) {
  return (
    <footer className="bg-foreground text-white relative overflow-hidden">
      {/* Colorful top border */}
      <div className="flex h-2">
        <div className="flex-1 bg-[#ffe135]" />
        <div className="flex-1 bg-[#00c8c8]" />
        <div className="flex-1 bg-[#ff7b54]" />
        <div className="flex-1 bg-[#7ed957]" />
      </div>

      {/* Newsletter Section */}
      <div className="border-b border-white/10 bg-gradient-to-r from-[#00c8c8]/10 to-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-2xl font-black">お得な情報をお届け</h3>
              <p className="text-white/70 mt-1">
                新商品やキャンペーン情報をいち早くお届けします
              </p>
            </div>
            <Button
              asChild
              className="bg-[#ffe135] hover:bg-[#ffe135]/90 text-foreground h-14 px-8 rounded-xl font-bold text-lg shadow-lg"
            >
              <Link href="/products">
                商品を見る
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-lg overflow-hidden">
              <img src="/logo.png" alt="FAST OEM logo" className="w-full h-full object-contain" />
            </div>
              <div>
                <span className="font-black text-2xl block leading-none">
                  FAST OEM
                </span>
                <span className="text-xs text-[#00c8c8] font-bold leading-none">
                  オリジナルグッズ製作
                </span>
              </div>
            </div>
            <p className="text-white/70 text-sm leading-relaxed">
              高品質なオリジナルグッズを簡単・スピーディーに作成。
              小ロットから大量発注まで対応いたします。
            </p>
            {/* Decorative dots */}
            <div className="flex gap-2 mt-6">
              <div className="w-3 h-3 rounded-full bg-[#ffe135]" />
              <div className="w-3 h-3 rounded-full bg-[#00c8c8]" />
              <div className="w-3 h-3 rounded-full bg-[#ff7b54]" />
              <div className="w-3 h-3 rounded-full bg-[#7ed957]" />
            </div>
          </div>

          {/* Products */}
          <div>
            <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
              <span className="w-2 h-6 bg-[#00c8c8] rounded-full" />
              商品カテゴリ
            </h3>
            <nav className="flex flex-col gap-3">
              {products.map((product) => (
                <Link
                  key={product.slug}
                  href={`/products/${product.slug}`}
                  className="text-white/70 hover:text-[#ffe135] transition-colors text-sm"
                >
                  {product.name}
                </Link>
              ))}
            </nav>
          </div>

          {/* Support */}
          <div>
            <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
              <span className="w-2 h-6 bg-[#ff7b54] rounded-full" />
              サポート
            </h3>
            <nav className="flex flex-col gap-3">
              <Link
                href="/#how-it-works"
                className="text-white/70 hover:text-[#ffe135] transition-colors text-sm"
              >
                ご利用方法
              </Link>
              <Link
                href="/faq"
                className="text-white/70 hover:text-[#ffe135] transition-colors text-sm"
              >
                よくある質問
              </Link>
              <Link
                href="/contact"
                className="text-white/70 hover:text-[#ffe135] transition-colors text-sm"
              >
                お問い合わせ
              </Link>
              <Link
                href="/shipping"
                className="text-white/70 hover:text-[#ffe135] transition-colors text-sm"
              >
                配送について
              </Link>
            </nav>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
              <span className="w-2 h-6 bg-[#7ed957] rounded-full" />
              お問い合わせ
            </h3>
            <div className="flex flex-col gap-4">
              <a
                href="mailto:contact@soara-mu.com"
                className="flex items-center gap-3 text-white/70 hover:text-[#ffe135] transition-colors text-sm"
              >
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                  <Mail className="h-5 w-5" />
                </div>
                contact@soara-mu.com
              </a>
              <a
                href="https://soara-mu.jp/privacy-policy/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 text-white/70 hover:text-[#ffe135] transition-colors text-sm"
              >
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                  <Shield className="h-5 w-5" />
                </div>
                プライバシーポリシー
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-white/50">
              &copy; {new Date().getFullYear()} FAST OEM. All rights reserved.
            </p>
            <div className="flex flex-wrap justify-center gap-6">
              <Link
                href="/terms"
                className="text-sm text-white/50 hover:text-[#ffe135] transition-colors"
              >
                利用規約
              </Link>
              <a
                href="https://soara-mu.jp/privacy-policy/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-white/50 hover:text-[#ffe135] transition-colors"
              >
                プライバシーポリシー
              </a>
              <Link
                href="/tokushoho"
                className="text-sm text-white/50 hover:text-[#ffe135] transition-colors"
              >
                特定商取引法に基づく表記
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
