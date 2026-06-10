import { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import {
  ArrowRight,
  Upload,
  SlidersHorizontal,
  CreditCard,
  Truck,
  Clock,
  ShieldCheck,
  Package,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ProductCard } from '@/components/product-card'
import { getProductsFromDb } from '@/lib/products-db'
import { JsonLd } from '@/components/json-ld'

const BASE_URL = 'https://fast-oem.soara-mu.jp'

export const metadata: Metadata = {
  title: 'オリジナルグッズOEM製作｜小ロット50個〜対応（缶バッジは100個〜） FAST OEM',
  description:
    'アクリルキーホルダー・缶バッジ・ピンバッジ・ラバーキーホルダーのOEM製作。小ロット50個〜対応（缶バッジは100個〜）、格安・スピード納品。同人グッズ・ノベルティ・推しグッズ製作はFAST OEMへ。',
  openGraph: {
    title: 'オリジナルグッズOEM製作｜小ロット50個〜 FAST OEM',
    description:
      'アクリルキーホルダー・缶バッジ・ピンバッジのOEM製作。小ロット対応・格安・スピード納品。同人グッズ・ノベルティなら FAST OEM。',
    url: BASE_URL,
    images: [{ url: '/opengraph-image.png', width: 1200, height: 630, alt: 'FAST OEM オリジナルグッズ製作' }],
  },
  alternates: { canonical: BASE_URL },
}

const steps = [
  { icon: Upload, title: 'データを入稿', description: 'デザイン画像をアップロードするだけ。' },
  { icon: SlidersHorizontal, title: '仕様を選択', description: 'サイズ・数量・オプションを指定。' },
  { icon: CreditCard, title: '注文・決済', description: 'クレジットカードで安全にお支払い。' },
  { icon: Truck, title: '製造・配送', description: '15〜30営業日で全国へお届け。' },
]

const features = [
  { icon: Clock, title: '短納期', description: '通常15〜30営業日。特急は約2週間。' },
  { icon: Package, title: '小ロット対応', description: '50個から発注可能（缶バッジは100個〜）。' },
  { icon: ShieldCheck, title: '品質保証', description: '提携工場による検品・不良時再製作。' },
  { icon: Zap, title: '簡単入稿', description: 'データをアップするだけで発注完了。' },
]

const useCases = [
  { href: '/use-cases/doujin', title: '同人グッズ製作', description: '即売会の頒布物に。小ロット50個〜で個人でも安心。' },
  { href: '/use-cases/novelty', title: '企業ノベルティ製作', description: '展示会・販促向け。領収書・インボイス対応。' },
  { href: '/use-cases/oshikatsu', title: '推し活グッズ製作', description: '写真・イラストでオリジナルの応援グッズを。' },
]

const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': ['Organization', 'LocalBusiness'],
  name: 'FAST OEM',
  legalName: '株式会社SOARA',
  url: BASE_URL,
  logo: `${BASE_URL}/logo.png`,
  image: `${BASE_URL}/opengraph-image.png`,
  description: 'アクリルキーホルダー・缶バッジ・ピンバッジ・ラバーキーホルダーのOEM製作。小ロット対応・格安・スピード納品。',
  foundingDate: '2024-10-30',
  founder: {
    '@type': 'Person',
    name: '小川 公平',
    jobTitle: '代表取締役',
    url: `${BASE_URL}/about`,
  },
  numberOfEmployees: {
    '@type': 'QuantitativeValue',
    value: 10,
  },
  email: 'contact@soara-mu.com',
  priceRange: '¥40〜¥490',
  currenciesAccepted: 'JPY',
  paymentAccepted: 'Credit Card',
  openingHours: 'Mo-Fr 10:00-18:00',
  knowsAbout: [
    'OEM製造',
    'アクリルキーホルダー製作',
    '缶バッジ製作',
    'ピンバッジ製作',
    'ラバーキーホルダー製作',
    'オリジナルグッズ企画',
  ],
  contactPoint: {
    '@type': 'ContactPoint',
    email: 'contact@soara-mu.com',
    contactType: 'customer service',
    availableLanguage: 'Japanese',
    areaServed: 'JP',
  },
  address: {
    '@type': 'PostalAddress',
    addressLocality: '横浜市',
    addressRegion: '神奈川県',
    postalCode: '221-0056',
    streetAddress: '神奈川区金港町5-14 クアドリフォリオ8階',
    addressCountry: 'JP',
  },
  geo: {
    '@type': 'GeoCoordinates',
    latitude: 35.4657,
    longitude: 139.6281,
  },
  areaServed: {
    '@type': 'Country',
    name: 'Japan',
  },
  sameAs: [
    'https://soara-mu.jp',
  ],
  parentOrganization: {
    '@type': 'Organization',
    name: '株式会社SOARA',
    url: 'https://soara-mu.jp',
  },
}

const siteNavigationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SiteNavigationElement',
  name: 'メインナビゲーション',
  hasPart: [
    { '@type': 'WebPage', name: '商品一覧', url: `${BASE_URL}/products` },
    { '@type': 'WebPage', name: 'グッズ製作ガイド', url: `${BASE_URL}/guide` },
    { '@type': 'WebPage', name: 'よくある質問', url: `${BASE_URL}/faq` },
    { '@type': 'WebPage', name: 'お問い合わせ', url: `${BASE_URL}/contact` },
    { '@type': 'WebPage', name: '配送について', url: `${BASE_URL}/shipping` },
    { '@type': 'WebPage', name: '用途別ガイド', url: `${BASE_URL}/use-cases` },
    { '@type': 'WebPage', name: '同人グッズ製作', url: `${BASE_URL}/use-cases/doujin` },
    { '@type': 'WebPage', name: '企業ノベルティ製作', url: `${BASE_URL}/use-cases/novelty` },
    { '@type': 'WebPage', name: '推し活グッズ製作', url: `${BASE_URL}/use-cases/oshikatsu` },
    { '@type': 'WebPage', name: '結婚式プチギフト製作', url: `${BASE_URL}/use-cases/wedding` },
    { '@type': 'WebPage', name: '記念品・誕生日・退職祝い・卒業記念品 製作', url: `${BASE_URL}/use-cases/anniversary` },
    { '@type': 'WebPage', name: 'イベント配布物・ファンミ・周年祭 グッズ製作', url: `${BASE_URL}/use-cases/event` },
    { '@type': 'WebPage', name: '製作事例', url: `${BASE_URL}/cases` },
    { '@type': 'WebPage', name: 'コラム', url: `${BASE_URL}/blog` },
    { '@type': 'WebPage', name: '会社概要', url: `${BASE_URL}/about` },
  ],
}

const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'FAST OEM',
  url: BASE_URL,
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: `${BASE_URL}/products?q={search_term_string}`,
    },
    'query-input': 'required name=search_term_string',
  },
}

const heroImages = [
  { src: '/images/acrylic-keychain.jpg', alt: 'アクリルキーホルダー OEM製作 - 透明アクリルにフルカラー印刷、小ロット対応', tag: '人気No.1', ratio: 'aspect-square', priority: true },
  { src: '/images/pin-badge.jpg', alt: 'ピンバッジ OEM製作 - 金属エナメル仕上げ、企業ノベルティに人気', ratio: 'aspect-[4/3]' },
  { src: '/images/can-badge.jpg', alt: '缶バッジ OEM製作 - フルカラー印刷、同人・推し活に最適', ratio: 'aspect-[4/3]' },
  { src: '/images/rubber-keychain.jpg', alt: 'ラバーキーホルダー OEM製作 - PVC素材で立体デザイン対応', tag: 'NEW', ratio: 'aspect-square' },
]

export default async function HomePage() {
  const products = await getProductsFromDb()
  return (
    <div className="bg-background">
      <JsonLd data={[organizationJsonLd, websiteJsonLd, siteNavigationJsonLd]} />

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-dotgrid opacity-60" aria-hidden="true" />
        <div className="absolute -top-24 -right-24 w-[32rem] h-[32rem] rounded-full bg-primary/5 blur-3xl" aria-hidden="true" />
        <div className="absolute -bottom-32 -left-20 w-[28rem] h-[28rem] rounded-full bg-accent/5 blur-3xl" aria-hidden="true" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div>
              <span className="eyebrow">
                <span className="w-6 h-px bg-primary" />
                OEM オリジナルグッズ製作
              </span>

              <h1 className="mt-5 text-4xl md:text-5xl lg:text-[3.25rem] font-extrabold text-foreground tracking-tight leading-[1.18]">
                オリジナルグッズ製作を、
                <br />
                <span className="text-gradient-brand">もっと速く、確実に。</span>
              </h1>

              <p className="mt-6 text-base md:text-lg text-muted-foreground max-w-xl leading-relaxed">
                アクリルキーホルダー・缶バッジ・ピンバッジ・ラバーキーホルダーを、
                小ロット50個から短納期で製作。データを入稿するだけで、すぐにご注文いただけます。
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button
                  asChild
                  size="lg"
                  className="bg-primary hover:bg-brand-blue-dark text-primary-foreground h-12 px-7 text-base font-bold rounded-xl shadow-brand transition-all hover:-translate-y-0.5"
                >
                  <Link href="/products">
                    商品を見て注文する
                    <ArrowRight className="ml-1.5 h-5 w-5" />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="h-12 px-6 text-base font-bold rounded-xl border-border hover:bg-secondary"
                >
                  <Link href="/guide">製作ガイドを見る</Link>
                </Button>
              </div>

              <dl className="mt-10 grid grid-cols-3 gap-4 max-w-md border-t border-border pt-6">
                <div>
                  <dt className="text-2xl font-extrabold text-foreground tracking-tight">50個〜</dt>
                  <dd className="text-xs text-muted-foreground mt-0.5">小ロット対応</dd>
                </div>
                <div>
                  <dt className="text-2xl font-extrabold text-foreground tracking-tight">最短2週</dt>
                  <dd className="text-xs text-muted-foreground mt-0.5">特急納期</dd>
                </div>
                <div>
                  <dt className="text-2xl font-extrabold text-foreground tracking-tight">全国</dt>
                  <dd className="text-xs text-muted-foreground mt-0.5">配送対応</dd>
                </div>
              </dl>
            </div>

            {/* Hero image grid */}
            <div className="relative hidden lg:block">
              <div className="absolute inset-0 bg-brand-gradient rounded-[2rem] rotate-2 opacity-10" aria-hidden="true" />
              <div className="relative grid grid-cols-2 gap-4">
                <div className="space-y-4">
                  {heroImages.slice(0, 2).map((img) => (
                    <div key={img.src} className={`relative ${img.ratio} rounded-2xl overflow-hidden shadow-float ring-1 ring-border bg-muted`}>
                      <Image
                        src={img.src}
                        alt={img.alt}
                        fill
                        priority={img.priority}
                        fetchPriority={img.priority ? 'high' : undefined}
                        loading={img.priority ? undefined : 'lazy'}
                        sizes="(max-width: 1024px) 0px, 25vw"
                        className="object-cover"
                      />
                      {img.tag && (
                        <span className="absolute bottom-2.5 left-2.5 bg-accent text-accent-foreground text-xs font-bold px-2.5 py-1 rounded-full shadow-card">
                          {img.tag}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
                <div className="space-y-4 pt-8">
                  {heroImages.slice(2, 4).map((img) => (
                    <div key={img.src} className={`relative ${img.ratio} rounded-2xl overflow-hidden shadow-float ring-1 ring-border bg-muted`}>
                      <Image
                        src={img.src}
                        alt={img.alt}
                        fill
                        loading="lazy"
                        sizes="(max-width: 1024px) 0px, 25vw"
                        className="object-cover"
                      />
                      {img.tag && (
                        <span className="absolute bottom-2.5 right-2.5 bg-primary text-primary-foreground text-xs font-bold px-2.5 py-1 rounded-full shadow-card">
                          {img.tag}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────── */}
      <section className="py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="sr-only">FAST OEM の特長</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map((feature) => (
              <div key={feature.title} className="flex items-start gap-4 p-5 rounded-2xl bg-card border border-border shadow-card">
                <span className="w-11 h-11 rounded-xl bg-secondary text-primary flex items-center justify-center flex-shrink-0">
                  <feature.icon className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="font-bold text-foreground">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Products ─────────────────────────────────────────── */}
      <section className="py-16 md:py-24 bg-secondary/40 border-y border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="eyebrow justify-center">商品ラインナップ</span>
            <h2 className="mt-3 text-3xl md:text-4xl font-extrabold text-foreground tracking-tight">
              選べる4種類のグッズ
            </h2>
            <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
              用途に合わせて、最適な素材・仕様をお選びいただけます。
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product, index) => (
              <ProductCard key={product.id} product={product} index={index} />
            ))}
          </div>

          <div className="mt-12 text-center">
            <Button
              asChild
              size="lg"
              className="bg-foreground hover:bg-foreground/90 text-background h-12 px-8 rounded-xl font-bold"
            >
              <Link href="/products">
                すべての商品を見る
                <ArrowRight className="ml-1.5 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────── */}
      <section id="how-it-works" className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="eyebrow justify-center">ご注文の流れ</span>
            <h2 className="mt-3 text-3xl md:text-4xl font-extrabold text-foreground tracking-tight">
              ご注文は4ステップ
            </h2>
            <p className="mt-3 text-muted-foreground">データ入稿から発注まで、オンラインで完結します。</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {steps.map((step, index) => (
              <div key={step.title} className="relative p-6 rounded-2xl bg-card border border-border shadow-card">
                <div className="flex items-center justify-between mb-4">
                  <span className="w-11 h-11 rounded-xl bg-secondary text-primary flex items-center justify-center">
                    <step.icon className="h-5 w-5" />
                  </span>
                  <span className="text-4xl font-extrabold text-border tabular-nums leading-none">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                </div>
                <h3 className="font-bold text-foreground text-lg tracking-tight">{step.title}</h3>
                <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Use cases ────────────────────────────────────────── */}
      <section className="py-16 md:py-24 bg-secondary/40 border-y border-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="eyebrow justify-center">用途から探す</span>
            <h2 className="mt-3 text-3xl md:text-4xl font-extrabold text-foreground tracking-tight">
              目的に合わせた製作プラン
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {useCases.map((uc) => (
              <Link
                key={uc.href}
                href={uc.href}
                className="group block p-7 bg-card rounded-2xl border border-border shadow-card hover:shadow-float hover:-translate-y-1 hover:border-primary/30 transition-all"
              >
                <h3 className="text-lg font-bold text-foreground tracking-tight group-hover:text-primary transition-colors">{uc.title}</h3>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{uc.description}</p>
                <span className="inline-flex items-center text-sm font-bold text-primary mt-4">
                  詳しく見る
                  <ArrowRight className="ml-1 h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────── */}
      <section className="py-16 md:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl bg-brand-gradient px-6 py-14 md:px-16 md:py-20 text-center shadow-brand">
            <div className="absolute inset-0 bg-dotgrid opacity-10" aria-hidden="true" />
            <div className="relative">
              <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight leading-tight">
                オリジナルグッズの製作を始めましょう
              </h2>
              <p className="mt-4 text-white/85 max-w-2xl mx-auto leading-relaxed">
                会員登録なしでもご注文いただけます。お好きな商品を選び、デザインを入稿してください。
              </p>
              <Button
                asChild
                size="lg"
                className="mt-9 bg-white hover:bg-white/90 text-primary h-12 px-9 text-base font-bold rounded-xl shadow-float"
              >
                <Link href="/products">
                  商品を選ぶ
                  <ArrowRight className="ml-1.5 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
