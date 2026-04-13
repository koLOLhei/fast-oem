import { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, CheckCircle, Building2, Award, Truck, FileText } from 'lucide-react'
import { Breadcrumb, breadcrumbJsonLd } from '@/components/breadcrumb'
import { getProductsFromDb } from '@/lib/products-db'
import { ProductCard } from '@/components/product-card'

const BASE_URL = 'https://fast-oem.soara-mu.jp'

export const metadata: Metadata = {
  title: '企業ノベルティ製作・販促グッズ作成 | OEM小ロット対応・FAST OEM',
  description:
    '企業ノベルティ・販促グッズの製作ならFAST OEM。アクリルキーホルダー・缶バッジ・ピンバッジをオリジナルデザインで小ロット製作。展示会・イベント・キャンペーン向け。領収書・インボイス対応。',
  openGraph: {
    title: '企業ノベルティ製作 | FAST OEM',
    description: '企業ノベルティ・販促グッズの製作。小ロット対応・領収書発行可。展示会・キャンペーンに。',
    url: `${BASE_URL}/use-cases/novelty`,
    images: [{ url: '/opengraph-image.png', width: 1200, height: 630 }],
  },
  alternates: { canonical: `${BASE_URL}/use-cases/novelty` },
}

const benefits = [
  { icon: Building2, title: '法人対応', description: '領収書PDF・インボイス制度対応の適格請求書を注文ページからダウンロード可能。' },
  { icon: Award, title: '高品質な仕上がり', description: '企業のブランドイメージを損なわない高品質な印刷・製造。提携工場で品質管理を徹底。' },
  { icon: Truck, title: '柔軟な納期対応', description: '通常約1ヶ月、特急約2週間。展示会・イベントの日程に合わせてスケジュール調整可能。' },
  { icon: FileText, title: 'かんたん発注', description: 'デザインデータをアップロードするだけ。面倒な見積もりや打ち合わせは不要です。' },
]

const useCases = [
  '展示会・カンファレンスの来場者特典',
  'キャンペーン・プロモーションの景品',
  '社員向け記念品・周年グッズ',
  '店舗のオリジナルグッズ販売',
  '株主優待・顧客向けプレゼント',
  '新商品発売記念ノベルティ',
]

export default async function NoveltyPage() {
  const products = await getProductsFromDb()
  const recommended = products.filter(p =>
    ['pin-badge', 'acrylic-keychain', 'can-badge'].includes(p.slug)
  )
  const allRecommended = recommended.length > 0 ? recommended : products.slice(0, 3)

  const bcJsonLd = breadcrumbJsonLd([{ name: '用途別', href: '/use-cases/novelty' }, { name: '企業ノベルティ製作' }])

  const serviceJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: '企業ノベルティ・販促グッズ製作サービス',
    description: '企業向けオリジナルノベルティ・販促グッズのOEM製作。アクリルキーホルダー・缶バッジ・ピンバッジを小ロットから。',
    provider: { '@type': 'Organization', name: 'FAST OEM', url: BASE_URL },
    areaServed: { '@type': 'Country', name: 'Japan' },
    serviceType: '企業ノベルティOEM製作',
    url: `${BASE_URL}/use-cases/novelty`,
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify([bcJsonLd, serviceJsonLd]) }}
      />
      <div className="bg-background min-h-screen">
        {/* Hero */}
        <section className="bg-gradient-to-br from-[#1e3a5f]/5 via-[#00c8c8]/5 to-[#ffe135]/5 py-16 md:py-24">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <Breadcrumb items={[{ name: '企業ノベルティ製作' }]} />
            <div className="text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#1e3a5f]/10 rounded-full text-[#1e3a5f] text-sm font-bold mb-6">
                <Building2 className="h-4 w-4" />
                法人・企業担当者向け
              </div>
              <h1 className="text-3xl md:text-5xl font-black text-foreground leading-tight">
                企業ノベルティ・販促グッズ製作
                <span className="block text-[#00c8c8] mt-2">小ロット対応・領収書発行可</span>
              </h1>
              <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                展示会・キャンペーン・社内イベント向けのオリジナルノベルティを簡単に製作。
                デザインデータをアップロードするだけで、高品質なグッズが完成します。
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/products"
                  className="inline-flex items-center justify-center gap-2 bg-[#00c8c8] hover:bg-[#00b0b0] text-white h-14 px-10 text-lg font-bold rounded-full shadow-lg transition-all hover:-translate-y-1"
                >
                  商品を選んで作成開始
                  <ArrowRight className="h-5 w-5" />
                </Link>
                <Link
                  href="/contact"
                  className="inline-flex items-center justify-center gap-2 border-2 border-foreground/20 text-foreground h-14 px-8 text-base font-bold rounded-full hover:bg-muted transition-colors"
                >
                  お問い合わせ
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section className="py-16 bg-white">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl md:text-3xl font-black text-center mb-12">企業のノベルティ製作にFAST OEMが選ばれる理由</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {benefits.map((b) => (
                <div key={b.title} className="flex items-start gap-4 p-6 bg-muted/30 rounded-2xl">
                  <div className="w-12 h-12 rounded-xl bg-[#00c8c8]/10 flex items-center justify-center shrink-0">
                    <b.icon className="h-6 w-6 text-[#00c8c8]" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground text-lg">{b.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{b.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Use cases */}
        <section className="py-16 bg-muted/20">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl md:text-3xl font-black text-center mb-8">こんなシーンで活用されています</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-3xl mx-auto">
              {useCases.map((uc) => (
                <div key={uc} className="flex items-center gap-3 p-4 bg-white rounded-xl border border-border">
                  <CheckCircle className="h-5 w-5 text-[#7ed957] shrink-0" />
                  <span className="text-sm font-medium text-foreground">{uc}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Recommended products */}
        <section className="py-16 bg-white">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl md:text-3xl font-black text-center mb-4">ノベルティにおすすめの商品</h2>
            <p className="text-center text-muted-foreground mb-10">企業ロゴ入りグッズとして人気の商品をご紹介します</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-4xl mx-auto">
              {allRecommended.map((product, i) => (
                <ProductCard key={product.id} product={product} index={i} />
              ))}
            </div>
            <div className="text-center mt-10">
              <Link
                href="/products"
                className="inline-flex items-center gap-2 text-[#00c8c8] font-bold text-lg hover:text-[#00b0b0] transition-colors"
              >
                すべての商品を見る <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </section>

        {/* SEO content */}
        <section className="py-16 bg-muted/20">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold mb-6">企業ノベルティ・販促グッズ製作について</h2>
            <div className="text-sm text-muted-foreground space-y-4 leading-relaxed">
              <p>
                企業ノベルティとは、企業がプロモーションやブランディングの一環として製作するオリジナルグッズのことです。
                展示会やカンファレンスの来場者への配布、キャンペーンの景品、社内イベントの記念品など、さまざまなシーンで活用されています。
              </p>
              <p>
                FAST OEMでは、アクリルキーホルダー・缶バッジ・ピンバッジ・ラバーキーホルダーなどのノベルティを、小ロットから製作できます。
                企業ロゴやキャラクターをフルカラーで印刷し、ブランドイメージを効果的にアピールできます。
              </p>
              <p>
                インボイス制度に対応した適格請求書（領収書PDF）を注文ページからダウンロードいただけるため、経理処理もスムーズです。
                大口のご注文や特別なご要望がある場合は、<Link href="/contact" className="text-[#00c8c8] font-bold hover:underline">お問い合わせ</Link>ください。
              </p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 bg-[#00c8c8]">
          <div className="max-w-3xl mx-auto px-4 text-center">
            <h2 className="text-2xl md:text-4xl font-black text-white mb-4">ノベルティ製作を始めましょう</h2>
            <p className="text-white/80 mb-8">デザインデータをアップロードするだけ。見積もり不要で簡単に発注できます。</p>
            <Link
              href="/products"
              className="inline-flex items-center gap-2 bg-white text-[#00c8c8] h-14 px-10 text-lg font-black rounded-full shadow-2xl hover:scale-105 transition-all"
            >
              今すぐ作成する <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </section>
      </div>
    </>
  )
}
