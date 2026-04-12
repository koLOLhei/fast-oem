import { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, CheckCircle, Package, Users, Sparkles, Clock } from 'lucide-react'
import { Breadcrumb, breadcrumbJsonLd } from '@/components/breadcrumb'
import { getProductsFromDb } from '@/lib/products-db'
import { ProductCard } from '@/components/product-card'

const BASE_URL = 'https://fast-oem.soara-mu.jp'

export const metadata: Metadata = {
  title: '同人グッズ製作・同人グッズ作成 | 小ロット50個〜・コミケ・即売会対応',
  description:
    '同人グッズの製作ならFAST OEM。アクリルキーホルダー・缶バッジ・ピンバッジを小ロット50個から作成可能。コミケ・即売会・同人イベントの頒布物に最適。高品質・格安・短納期でお届け。',
  keywords: [
    '同人グッズ', '同人グッズ 製作', '同人グッズ 作成', '同人グッズ 作り方',
    '同人グッズ 小ロット', '同人グッズ 格安', '同人グッズ 印刷',
    'コミケ グッズ', 'コミケ 頒布物', '即売会 グッズ',
    'アクリルキーホルダー 同人', '缶バッジ 同人', '同人 オリジナルグッズ',
    '同人サークル グッズ', 'サークル頒布物 製作',
  ],
  openGraph: {
    title: '同人グッズ製作 | 小ロット50個〜・FAST OEM',
    description: '同人グッズの製作ならFAST OEM。アクリルキーホルダー・缶バッジを小ロット50個から。コミケ・即売会対応。',
    url: `${BASE_URL}/use-cases/doujin`,
    images: [{ url: '/opengraph-image.png', width: 1200, height: 630 }],
  },
  alternates: { canonical: `${BASE_URL}/use-cases/doujin` },
}

const benefits = [
  { icon: Package, title: '小ロット50個〜', description: '少量からでも高品質なグッズを製作。在庫リスクなく始められます。' },
  { icon: Clock, title: '短納期で即売会に間に合う', description: '通常2〜3週間、特急なら約10日で納品。イベント日程に合わせて対応。' },
  { icon: Sparkles, title: '高品質な仕上がり', description: 'フルカラー印刷で発色鮮やか。手に取ったファンに感動を届けます。' },
  { icon: Users, title: '個人クリエイター歓迎', description: '法人でなくてもOK。個人サークルの方にも多数ご利用いただいています。' },
]

const useCases = [
  'コミケ（コミックマーケット）での頒布物',
  'オンリーイベント・同人即売会のグッズ',
  'BOOTH・メロンブックスなどの通販グッズ',
  'ファンアート・オリジナルキャラクターグッズ',
  'サークルのノベルティ・おまけグッズ',
  'コスプレイヤーの名刺代わりグッズ',
]

export default async function DoujinPage() {
  const products = await getProductsFromDb()
  const recommended = products.filter(p =>
    ['acrylic-keychain', 'can-badge'].includes(p.slug)
  )
  const allRecommended = recommended.length > 0 ? recommended : products.slice(0, 2)

  const bcJsonLd = breadcrumbJsonLd([{ name: '用途別', href: '/use-cases/doujin' }, { name: '同人グッズ製作' }])

  const serviceJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: '同人グッズ製作サービス',
    description: '同人イベント向けオリジナルグッズのOEM製作。アクリルキーホルダー・缶バッジ・ピンバッジを小ロット50個から。',
    provider: { '@type': 'Organization', name: 'FAST OEM', url: BASE_URL },
    areaServed: { '@type': 'Country', name: 'Japan' },
    serviceType: 'OEMグッズ製作',
    url: `${BASE_URL}/use-cases/doujin`,
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify([bcJsonLd, serviceJsonLd]) }}
      />
      <div className="bg-background min-h-screen">
        {/* Hero */}
        <section className="bg-gradient-to-br from-[#ff7b54]/10 via-[#ffe135]/5 to-[#00c8c8]/10 py-16 md:py-24">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <Breadcrumb items={[{ name: '同人グッズ製作' }]} />
            <div className="text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#ff7b54]/10 rounded-full text-[#ff7b54] text-sm font-bold mb-6">
                <Sparkles className="h-4 w-4" />
                同人サークル・個人クリエイター向け
              </div>
              <h1 className="text-3xl md:text-5xl font-black text-foreground leading-tight">
                同人グッズ製作
                <span className="block text-[#ff7b54] mt-2">小ロット50個〜・格安・短納期</span>
              </h1>
              <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                コミケ・即売会・オンラインショップ向けの同人グッズを簡単に製作。
                デザインをアップロードするだけで、高品質なオリジナルグッズが完成します。
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/products"
                  className="inline-flex items-center justify-center gap-2 bg-[#ff7b54] hover:bg-[#ff6b3d] text-white h-14 px-10 text-lg font-bold rounded-full shadow-lg transition-all hover:-translate-y-1"
                >
                  商品を選んで作成開始
                  <ArrowRight className="h-5 w-5" />
                </Link>
                <Link
                  href="/guide"
                  className="inline-flex items-center justify-center gap-2 border-2 border-foreground/20 text-foreground h-14 px-8 text-base font-bold rounded-full hover:bg-muted transition-colors"
                >
                  グッズ製作ガイドを見る
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section className="py-16 bg-white">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl md:text-3xl font-black text-center mb-12">FAST OEMが同人グッズ製作に選ばれる理由</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {benefits.map((b) => (
                <div key={b.title} className="flex items-start gap-4 p-6 bg-muted/30 rounded-2xl">
                  <div className="w-12 h-12 rounded-xl bg-[#ff7b54]/10 flex items-center justify-center shrink-0">
                    <b.icon className="h-6 w-6 text-[#ff7b54]" />
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
            <h2 className="text-2xl md:text-3xl font-black text-center mb-8">こんな用途に</h2>
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
            <h2 className="text-2xl md:text-3xl font-black text-center mb-4">同人グッズにおすすめの商品</h2>
            <p className="text-center text-muted-foreground mb-10">即売会での頒布物に人気の商品をご紹介します</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 max-w-2xl mx-auto">
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
            <h2 className="text-2xl font-bold mb-6">同人グッズ製作について</h2>
            <div className="text-sm text-muted-foreground space-y-4 leading-relaxed">
              <p>
                同人グッズとは、個人やサークルがオリジナルのデザインで製作するグッズのことです。
                コミックマーケット（コミケ）をはじめとする同人即売会での頒布物として、またBOOTHやメロンブックスなどのオンラインショップでの販売商品として、多くのクリエイターに親しまれています。
              </p>
              <p>
                FAST OEMでは、アクリルキーホルダー・缶バッジ・ピンバッジ・ラバーキーホルダーなどの同人グッズを、小ロット50個から製作できます。
                デザインデータ（PNG・JPG・SVG等）をアップロードするだけで簡単に注文でき、通常2〜3週間でお届けします。
                特急オプション（約10日）もあるため、イベント直前でも間に合います。
              </p>
              <p>
                個人クリエイターの方でも安心してご利用いただけるよう、会員登録なしでの注文にも対応。
                お支払いはクレジットカード（VISA・Mastercard・AMEX・JCB）で安全に決済いただけます。
              </p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 bg-[#ff7b54]">
          <div className="max-w-3xl mx-auto px-4 text-center">
            <h2 className="text-2xl md:text-4xl font-black text-white mb-4">あなたの作品をグッズにしよう</h2>
            <p className="text-white/80 mb-8">デザインをアップロードするだけ。最短10日で届きます。</p>
            <Link
              href="/products"
              className="inline-flex items-center gap-2 bg-white text-[#ff7b54] h-14 px-10 text-lg font-black rounded-full shadow-2xl hover:scale-105 transition-all"
            >
              今すぐ作成する <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </section>
      </div>
    </>
  )
}
