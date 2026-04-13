import { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, CheckCircle, Heart, Palette, Package, Zap } from 'lucide-react'
import { Breadcrumb, breadcrumbJsonLd } from '@/components/breadcrumb'
import { getProductsFromDb } from '@/lib/products-db'
import { ProductCard } from '@/components/product-card'

const BASE_URL = 'https://fast-oem.soara-mu.jp'

export const metadata: Metadata = {
  title: '推し活グッズ製作・推しグッズ作成 | 小ロット対応・オリジナル推し活グッズ',
  description:
    '推し活グッズの製作ならFAST OEM。推しの写真やイラストでアクリルキーホルダー・缶バッジ・ピンバッジを作成。小ロット50個〜対応。ライブ・イベント・布教用に。高品質フルカラー印刷。',
  openGraph: {
    title: '推し活グッズ製作 | FAST OEM',
    description: '推し活グッズの製作ならFAST OEM。推しの写真やイラストでオリジナルグッズを作成。小ロット50個〜。',
    url: `${BASE_URL}/use-cases/oshikatsu`,
    images: [{ url: '/opengraph-image.png', width: 1200, height: 630 }],
  },
  alternates: { canonical: `${BASE_URL}/use-cases/oshikatsu` },
}

const benefits = [
  { icon: Heart, title: '推しへの愛をカタチに', description: '推しの写真やイラストを高品質フルカラーでグッズ化。発色鮮やかで推しの魅力を再現。' },
  { icon: Package, title: '小ロット50個〜OK', description: '友達と分け合うぶんだけ作れる。在庫を抱える心配なし。' },
  { icon: Palette, title: 'かんたんデザイン入稿', description: '画像をアップロードするだけ。デザインソフト不要で簡単に作成できます。' },
  { icon: Zap, title: '最短約2週間でお届け', description: 'ライブやイベントに間に合う特急オプション対応。通常でも約1ヶ月で届きます。' },
]

const useCases = [
  'ライブ・コンサートの応援グッズ',
  'アイドル・VTuberの推し活グッズ',
  '布教用・交換用のトレーディンググッズ',
  'アニメ・漫画の推しキャラグッズ',
  'ファン仲間へのプレゼント',
  '痛バッグ・推しバッグのデコレーション用',
]

export default async function OshikatsuPage() {
  const products = await getProductsFromDb()
  const recommended = products.filter(p =>
    ['acrylic-keychain', 'can-badge', 'rubber-keychain'].includes(p.slug)
  )
  const allRecommended = recommended.length > 0 ? recommended : products.slice(0, 3)

  const bcJsonLd = breadcrumbJsonLd([{ name: '用途別', href: '/use-cases/oshikatsu' }, { name: '推し活グッズ製作' }])

  const serviceJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: '推し活グッズ製作サービス',
    description: '推し活向けオリジナルグッズのOEM製作。アクリルキーホルダー・缶バッジ・ラバーキーホルダーを小ロット50個から。',
    provider: { '@type': 'Organization', name: 'FAST OEM', url: BASE_URL },
    areaServed: { '@type': 'Country', name: 'Japan' },
    serviceType: '推し活グッズOEM製作',
    url: `${BASE_URL}/use-cases/oshikatsu`,
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify([bcJsonLd, serviceJsonLd]) }}
      />
      <div className="bg-background min-h-screen">
        {/* Hero */}
        <section className="bg-gradient-to-br from-pink-50 via-purple-50/50 to-[#00c8c8]/5 py-16 md:py-24">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <Breadcrumb items={[{ name: '推し活グッズ製作' }]} />
            <div className="text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-pink-100 rounded-full text-pink-600 text-sm font-bold mb-6">
                <Heart className="h-4 w-4" />
                推し活を楽しむあなたへ
              </div>
              <h1 className="text-3xl md:text-5xl font-black text-foreground leading-tight">
                推し活グッズ製作
                <span className="block text-pink-500 mt-2">推しへの愛をカタチにしよう</span>
              </h1>
              <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                推しの写真やイラストを使って、世界にひとつだけのオリジナルグッズを作りませんか？
                アクリルキーホルダー・缶バッジ・ラバーキーホルダーが小ロット50個から作れます。
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/products"
                  className="inline-flex items-center justify-center gap-2 bg-pink-500 hover:bg-pink-600 text-white h-14 px-10 text-lg font-bold rounded-full shadow-lg transition-all hover:-translate-y-1"
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
            <h2 className="text-2xl md:text-3xl font-black text-center mb-12">FAST OEMが推し活グッズ製作に選ばれる理由</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {benefits.map((b) => (
                <div key={b.title} className="flex items-start gap-4 p-6 bg-pink-50/50 rounded-2xl">
                  <div className="w-12 h-12 rounded-xl bg-pink-100 flex items-center justify-center shrink-0">
                    <b.icon className="h-6 w-6 text-pink-500" />
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
            <h2 className="text-2xl md:text-3xl font-black text-center mb-8">こんな推し活に</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-3xl mx-auto">
              {useCases.map((uc) => (
                <div key={uc} className="flex items-center gap-3 p-4 bg-white rounded-xl border border-border">
                  <CheckCircle className="h-5 w-5 text-pink-400 shrink-0" />
                  <span className="text-sm font-medium text-foreground">{uc}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Recommended products */}
        <section className="py-16 bg-white">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl md:text-3xl font-black text-center mb-4">推し活グッズにおすすめの商品</h2>
            <p className="text-center text-muted-foreground mb-10">推しの魅力を最大限に引き出すグッズをご紹介します</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-4xl mx-auto">
              {allRecommended.map((product, i) => (
                <ProductCard key={product.id} product={product} index={i} />
              ))}
            </div>
            <div className="text-center mt-10">
              <Link
                href="/products"
                className="inline-flex items-center gap-2 text-pink-500 font-bold text-lg hover:text-pink-600 transition-colors"
              >
                すべての商品を見る <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </section>

        {/* SEO content */}
        <section className="py-16 bg-muted/20">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold mb-6">推し活グッズ製作について</h2>
            <div className="text-sm text-muted-foreground space-y-4 leading-relaxed">
              <p>
                推し活グッズとは、好きなアイドル・アーティスト・VTuber・アニメキャラクターなどの「推し」をモチーフにした、オリジナルのグッズのことです。
                ライブやイベントでの応援グッズ、痛バッグのデコレーション、ファン仲間への布教グッズなど、推し活を盛り上げるアイテムとして人気が高まっています。
              </p>
              <p>
                FAST OEMでは、推しの写真やイラストを使ったアクリルキーホルダー・缶バッジ・ラバーキーホルダーを、小ロット50個から製作できます。
                フルカラー印刷で発色が鮮やかなので、推しの魅力をしっかり再現できます。
                デザインデータ（PNG・JPG等）をアップロードするだけで簡単に注文でき、会員登録なしでもご利用いただけます。
              </p>
              <p>
                著作権はお客様自身が保有するデザインに限ります。
                二次創作の場合は、各権利者のガイドラインをご確認の上ご注文ください。
                ご不明な点は<Link href="/faq" className="text-pink-500 font-bold hover:underline">よくある質問</Link>をご覧いただくか、<Link href="/contact" className="text-pink-500 font-bold hover:underline">お問い合わせ</Link>ください。
              </p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 bg-gradient-to-r from-pink-500 to-purple-500">
          <div className="max-w-3xl mx-auto px-4 text-center">
            <h2 className="text-2xl md:text-4xl font-black text-white mb-4">推しをもっと近くに感じよう</h2>
            <p className="text-white/80 mb-8">画像をアップロードするだけ。あなただけの推し活グッズが完成します。</p>
            <Link
              href="/products"
              className="inline-flex items-center gap-2 bg-white text-pink-500 h-14 px-10 text-lg font-black rounded-full shadow-2xl hover:scale-105 transition-all"
            >
              今すぐ作成する <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </section>
      </div>
    </>
  )
}
