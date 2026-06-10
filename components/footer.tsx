import Link from 'next/link'
import Image from 'next/image'
import { Mail, ArrowRight, Shield, Lock, CreditCard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getProductsFromDb } from '@/lib/products-db'

const footerLink = 'text-white/65 hover:text-white transition-colors text-sm'

export async function Footer() {
  const allProducts = await getProductsFromDb()
  const products = allProducts.map((p) => ({ slug: p.slug, name: p.name }))
  return (
    <footer className="bg-brand-ink text-white">
      {/* CTA strip */}
      <div className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">オリジナルグッズの製作を始める</h2>
              <p className="text-white/60 mt-1.5 text-sm">小ロット50個から大量発注まで、OEMでスピーディーに。</p>
            </div>
            <Button
              asChild
              className="bg-accent hover:bg-brand-amber-dark text-accent-foreground h-12 px-7 rounded-lg font-bold shadow-lg"
            >
              <Link href="/products">
                商品を見る
                <ArrowRight className="ml-1.5 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Main */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2.5 mb-5">
              <span className="w-11 h-11 bg-white rounded-xl flex items-center justify-center overflow-hidden">
                <Image src="/logo.png" alt="FAST OEM logo" width={44} height={44} className="w-full h-full object-contain" />
              </span>
              <span>
                <span className="font-extrabold text-xl block leading-none tracking-tight">FAST OEM</span>
                <span className="text-[11px] text-white/55 font-semibold leading-none">オリジナルグッズ製作</span>
              </span>
            </div>
            <p className="text-white/60 text-sm leading-relaxed">
              アクリルキーホルダー・缶バッジ・ピンバッジ等のOEM製作。小ロット・短納期に対応します。
            </p>
            <a
              href="https://soara-mu.jp"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-white/60 hover:text-white text-xs mt-4 transition-colors"
            >
              運営: 株式会社SOARA
              <ArrowRight className="h-3 w-3" />
            </a>
          </div>

          {/* Products */}
          <div>
            <h3 className="font-bold text-sm mb-5 text-white/90 flex items-center gap-2">
              <span className="w-1.5 h-4 bg-primary rounded-full" />
              商品カテゴリ
            </h3>
            <nav className="flex flex-col gap-3">
              {products.map((product) => (
                <Link key={product.slug} href={`/products/${product.slug}`} className={footerLink}>
                  {product.name}
                </Link>
              ))}
            </nav>
          </div>

          {/* Use Cases */}
          <div>
            <h3 className="font-bold text-sm mb-5 text-white/90 flex items-center gap-2">
              <span className="w-1.5 h-4 bg-accent rounded-full" />
              用途・情報
            </h3>
            <nav className="flex flex-col gap-3">
              <Link href="/use-cases/doujin" className={footerLink}>同人グッズ製作</Link>
              <Link href="/use-cases/novelty" className={footerLink}>企業ノベルティ製作</Link>
              <Link href="/use-cases/oshikatsu" className={footerLink}>推し活グッズ製作</Link>
              <Link href="/cases" className={footerLink}>製作事例</Link>
              <Link href="/blog" className={footerLink}>コラム</Link>
              <Link href="/guide" className={footerLink}>製作ガイド</Link>
              <Link href="/faq" className={footerLink}>よくある質問</Link>
              <Link href="/shipping" className={footerLink}>配送について</Link>
              <Link href="/about" className={footerLink}>会社概要</Link>
              <Link href="/mypage" className={footerLink} rel="nofollow">マイページ</Link>
            </nav>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-bold text-sm mb-5 text-white/90 flex items-center gap-2">
              <span className="w-1.5 h-4 bg-primary rounded-full" />
              お問い合わせ
            </h3>
            <div className="flex flex-col gap-4">
              <Link href="/contact" className="flex items-center gap-3 text-white/65 hover:text-white transition-colors text-sm">
                <span className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                  <Mail className="h-4 w-4" />
                </span>
                お問い合わせページ
              </Link>
              <a href="mailto:contact@soara-mu.com" className="text-white/55 hover:text-white transition-colors text-sm ml-12">
                contact@soara-mu.com
              </a>
              <Link href="/privacy" className="flex items-center gap-3 text-white/65 hover:text-white transition-colors text-sm">
                <span className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                  <Shield className="h-4 w-4" />
                </span>
                プライバシーポリシー
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Trust badges */}
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-5">
            <div className="flex items-center gap-2 text-white/60">
              <Lock className="h-4 w-4" />
              <span className="text-xs font-medium">SSL暗号化通信</span>
            </div>
            <div className="flex items-center gap-2">
              {['VISA', 'Mastercard', 'AMEX', 'JCB'].map((b) => (
                <span key={b} className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-white/8 text-white/60 text-xs font-bold">
                  <CreditCard className="h-3.5 w-3.5" />
                  {b}
                </span>
              ))}
            </div>
            <div className="flex items-center gap-2 text-white/60">
              <Shield className="h-4 w-4" />
              <span className="text-xs font-medium">Stripe安全決済</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom */}
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-white/60">
              &copy; {new Date().getFullYear()} FAST OEM. All rights reserved.
            </p>
            <div className="flex flex-wrap justify-center gap-6">
              <Link href="/terms" className="text-sm text-white/60 hover:text-white transition-colors">利用規約</Link>
              <Link href="/privacy" className="text-sm text-white/60 hover:text-white transition-colors">プライバシーポリシー</Link>
              <Link href="/tokushoho" className="text-sm text-white/60 hover:text-white transition-colors">特定商取引法に基づく表記</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
