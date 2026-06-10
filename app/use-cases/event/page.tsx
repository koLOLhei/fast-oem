import { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, CheckCircle, Calendar, Sparkles, Megaphone, Clock, Upload, Palette, Package, Truck, Users } from 'lucide-react'
import { Breadcrumb, breadcrumbJsonLd } from '@/components/breadcrumb'
import { getProductsFromDb } from '@/lib/products-db'
import { ProductCard } from '@/components/product-card'
import { JsonLd } from '@/components/json-ld'

const BASE_URL = 'https://fast-oem.soara-mu.jp'

export const metadata: Metadata = {
  title: 'イベント配布物・ファンミーティング・周年祭グッズ製作 | オリジナルOEM',
  description:
    'イベント配布物・ファンミーティング・周年祭・協賛グッズの製作ならFAST OEM。来場者プレゼント用のアクリルキーホルダー・缶バッジ・ピンバッジを小ロット50個（缶バッジは100個）から作成。スポンサーロゴ入り対応・短納期で各種イベントに最適。',
  keywords: [
    'イベント 配布物 オリジナル',
    'ファンミーティング グッズ 制作',
    '周年祭 ノベルティ',
    'イベント 記念グッズ オーダー',
    'イベント 缶バッジ',
    'ファンミ グッズ 製作',
    '協賛 ノベルティ',
    '来場者 プレゼント オリジナル',
    'スポンサー グッズ',
    'イベント 配布 オリジナル制作',
    '周年記念 グッズ',
    'イベント 小ロット ノベルティ',
  ],
  openGraph: {
    title: 'イベント配布物・ファンミーティング・周年祭グッズ製作 | FAST OEM',
    description:
      'イベント配布物・ファンミ・周年祭・協賛ノベルティをオリジナル製作。小ロット50個〜（缶バッジは100個〜）対応。',
    url: `${BASE_URL}/use-cases/event`,
    images: [{ url: '/opengraph-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'イベント配布物・ファンミ・周年祭グッズ製作 | FAST OEM',
    description: 'イベント・ファンミ・周年祭の配布物をオーダーメイドで。',
    images: ['/opengraph-image.png'],
  },
  alternates: { canonical: `${BASE_URL}/use-cases/event` },
}

const benefits = [
  { icon: Package, title: '小ロット50個〜OK（缶バッジは100個〜）', description: '想定来場者数に合わせて柔軟に製作。在庫を抱えるリスクなく必要量だけ作れます。' },
  { icon: Sparkles, title: 'ロゴ・スポンサー名入れ自由', description: 'イベントロゴ・主催団体名・協賛企業ロゴなど、自由なデザインで世界観を統一できます。' },
  { icon: Clock, title: 'イベント当日に間に合う短納期', description: '通常15〜30営業日、特急なら12営業日以内で納品。タイトな準備スケジュールにも対応。' },
  { icon: Megaphone, title: 'イベントの記憶に残る高品質', description: 'フルカラー印刷で発色鮮やか。来場者がSNSで写真投稿したくなる仕上がり。' },
]

const scenes = [
  {
    title: 'ファンミーティング・特典グッズ',
    description: 'アーティスト・声優・タレントのファンミやイベントの来場者特典に。限定感あふれるオリジナルグッズで参加者を喜ばせます。',
  },
  {
    title: '周年祭・アニバーサリー',
    description: '会社・店舗・ブランドの周年記念イベント。ロゴと年数を入れた特別仕様の記念グッズを来場者全員に配布できます。',
  },
  {
    title: '協賛イベント・スポンサーグッズ',
    description: 'スポーツ大会・地域イベントへの協賛として配布するノベルティ。スポンサー名入りで認知拡大にも効果的。',
  },
  {
    title: 'カンファレンス・セミナー',
    description: '業界カンファレンス・勉強会・カンファレンス参加者へのウェルカムグッズや登壇者ギフトにも最適です。',
  },
]

const steps = [
  { icon: Package, title: '1. 商品を選ぶ', description: 'アクリルキーホルダー・缶バッジ・ピンバッジからイベントに合う商品を選択。' },
  { icon: Upload, title: '2. デザインを入稿', description: 'イベントロゴ・スポンサーロゴなどのデータをアップロード。デザインソフト不要。' },
  { icon: Palette, title: '3. プレビューで確認', description: 'ブラウザ上で仕上がりをプレビュー。納得いくまで調整可能です。' },
  { icon: Truck, title: '4. 決済して納品を待つ', description: 'クレジット決済後、最短12営業日で会場や事務所へお届けします。' },
]

const faqs = [
  {
    q: '想定来場者数100人程度のイベントで配布する分は作れますか？',
    a: 'はい、小ロット50個（缶バッジは100個〜）から製作可能です。アクリルキーホルダー・ピンバッジ・ラバーキーホルダーは50個から、缶バッジは100個から承っています。来場者数に合わせて適切な数量をご注文いただけます。',
  },
  {
    q: 'イベントロゴや協賛企業ロゴを複数並べたデザインは可能ですか？',
    a: 'はい、デザインデータの中で自由にレイアウトいただけます。主催ロゴ・協賛ロゴ・スポンサー名・開催日などを組み合わせたデザインも問題なく製作できます。',
  },
  {
    q: 'イベント当日に間に合いますか？',
    a: '通常納期は15〜30営業日、特急オプションで12営業日以内に納品可能です。イベント開催日から逆算して、余裕を持って2ヶ月前のご注文をおすすめします。お急ぎの場合はお問い合わせください。',
  },
  {
    q: 'ファンミの限定特典として希少性のあるグッズを作りたいです',
    a: '小ロットでの製作が可能なため、「○○限定100個」のような限定グッズの製作にも最適です。シリアルナンバーをデザインに入れることもできます。希少性の高いグッズはファンの満足度を大きく高めます。',
  },
  {
    q: '会場へ直接納品してもらえますか？',
    a: 'はい、配送先はご自由にご指定いただけます。イベント会場・ホテル・ご担当者様の事務所など、ご希望の場所へお届けします。配送タイミングのご相談も承ります。',
  },
  {
    q: '法人・団体での発注は領収書が出ますか？',
    a: 'はい、注文ページから領収書PDF・インボイス制度対応の適格請求書をダウンロードいただけます。社内・団体の経理処理にもスムーズにご対応いただけます。',
  },
  {
    q: '個包装やイベント用パッケージにできますか？',
    a: '商品単位での個包装はオプションでご相談可能です。配布のしやすさを考慮したパッケージ仕様がある場合は、ご注文前に「お問い合わせ」よりご相談ください。',
  },
]

export default async function EventPage() {
  const products = await getProductsFromDb()
  const recommended = products.filter(p =>
    ['acrylic-keychain', 'can-badge', 'pin-badge', 'rubber-keychain'].includes(p.slug)
  )
  const allRecommended = recommended.length > 0 ? recommended : products.slice(0, 4)

  const bcJsonLd = breadcrumbJsonLd(
    [{ name: '用途別ガイド', href: '/use-cases' }, { name: 'イベント配布物・ファンミ・周年祭グッズ製作' }],
    '/use-cases/event',
  )

  const serviceJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: 'イベント配布物・ファンミーティング・周年祭グッズ製作サービス',
    description:
      'イベント・ファンミーティング・周年祭・協賛向けオリジナルノベルティのOEM製作。アクリルキーホルダー・缶バッジ・ピンバッジを小ロット50個（缶バッジは100個）から。',
    provider: { '@type': 'Organization', name: 'FAST OEM', url: BASE_URL },
    areaServed: { '@type': 'Country', name: 'Japan' },
    serviceType: 'イベントノベルティOEM製作',
    url: `${BASE_URL}/use-cases/event`,
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  }

  return (
    <>
      <JsonLd data={[bcJsonLd, serviceJsonLd, faqJsonLd]} />
      <div className="bg-background min-h-screen">
        {/* Hero */}
        <section className="bg-gradient-to-br from-violet-50 via-indigo-50/50 to-blue-50 py-16 md:py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <Breadcrumb items={[{ name: '用途別ガイド', href: '/use-cases' }, { name: 'イベント配布物・ファンミ・周年祭グッズ製作' }]} />
            <div className="text-center max-w-5xl mx-auto">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-violet-100 rounded-full text-violet-700 text-sm font-bold mb-6">
                <Calendar className="h-4 w-4" />
                イベント主催者・運営担当者の方へ
              </div>
              <h1 className="text-3xl md:text-5xl font-black text-foreground leading-tight">
                イベント配布物・ファンミ・周年祭グッズ製作
                <span className="block text-violet-600 mt-2">小ロット対応・短納期・ロゴ入れ自由</span>
              </h1>
              <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                ファンミーティング・周年祭・カンファレンス・協賛イベント──
                どんなイベントにも合う、来場者の心に残るオリジナルグッズを簡単に製作できます。
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/products"
                  className="inline-flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 text-white h-14 px-10 text-lg font-bold rounded-full shadow-lg transition-all hover:-translate-y-1"
                >
                  今すぐ商品を選ぶ
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
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl md:text-3xl font-black text-center mb-12">なぜイベントグッズの製作にFAST OEMが選ばれるのか</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-5xl mx-auto">
              {benefits.map((b) => (
                <div key={b.title} className="flex items-start gap-4 p-6 bg-violet-50/40 rounded-2xl">
                  <div className="w-12 h-12 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
                    <b.icon className="h-6 w-6 text-violet-600" />
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

        {/* Scenes */}
        <section className="py-16 bg-muted/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl md:text-3xl font-black text-center mb-4">こんなイベントで活躍します</h2>
            <p className="text-center text-muted-foreground mb-10">来場者の記憶に残る、世界観あるオリジナルグッズを</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
              {scenes.map((s) => (
                <div key={s.title} className="bg-card p-6 rounded-2xl border-2 border-violet-100 hover:border-violet-300 transition-colors">
                  <div className="w-12 h-12 rounded-full bg-violet-100 flex items-center justify-center mb-4">
                    <Users className="h-6 w-6 text-violet-600" />
                  </div>
                  <h3 className="font-bold text-foreground text-lg mb-2">{s.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{s.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Recommended products */}
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl md:text-3xl font-black text-center mb-4">イベントグッズにおすすめの商品</h2>
            <p className="text-center text-muted-foreground mb-10">配布物・特典・記念品に人気の商品をご紹介します</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
              {allRecommended.map((product, i) => (
                <ProductCard key={product.id} product={product} index={i} />
              ))}
            </div>
            <div className="text-center mt-10">
              <Link
                href="/products"
                className="inline-flex items-center gap-2 text-violet-600 font-bold text-lg hover:text-violet-700 transition-colors"
              >
                すべての商品を見る <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </section>

        {/* Steps */}
        <section className="py-16 bg-muted/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl md:text-3xl font-black text-center mb-4">かんたん4ステップで完成</h2>
            <p className="text-center text-muted-foreground mb-10">注文から納品までの流れをご紹介します</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
              {steps.map((s) => (
                <div key={s.title} className="bg-card p-6 rounded-2xl border border-border text-center">
                  <div className="w-14 h-14 rounded-full bg-violet-100 flex items-center justify-center mx-auto mb-4">
                    <s.icon className="h-7 w-7 text-violet-600" />
                  </div>
                  <h3 className="font-bold text-foreground text-base mb-2">{s.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{s.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-16 bg-white">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl md:text-3xl font-black text-center mb-10">イベントグッズ製作のよくある質問</h2>
            <div className="space-y-4">
              {faqs.map((f, i) => (
                <details key={i} className="group bg-card border border-border rounded-2xl p-5 open:shadow-md transition-shadow">
                  <summary className="flex items-start gap-3 cursor-pointer list-none font-bold text-foreground">
                    <CheckCircle className="h-5 w-5 text-violet-500 shrink-0 mt-0.5" />
                    <span>{f.q}</span>
                  </summary>
                  <p className="mt-3 ml-8 text-sm text-muted-foreground leading-relaxed">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* SEO content */}
        <section className="py-16 bg-muted/20">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold mb-6">イベント配布物・ファンミーティング・周年祭グッズについて</h2>
            <div className="text-sm text-muted-foreground space-y-4 leading-relaxed">
              <p>
                イベントの来場者特典・配布物・記念グッズは、参加者の体験価値を大きく高め、
                イベント自体の印象を長く記憶に残すための重要な要素です。
                ファンミーティング・周年祭・協賛イベント・カンファレンスなど、
                どんなイベントでもオリジナルグッズが場の盛り上がりと特別感を演出します。
              </p>
              <p>
                FAST OEMでは、アクリルキーホルダー・缶バッジ・ピンバッジ・ラバーキーホルダーなどのイベントグッズを、
                小ロット50個（缶バッジは100個）から製作できます。
                来場者数に合わせて柔軟にロット設定でき、限定特典としての希少性も演出可能。
                イベントロゴ・スポンサーロゴ・開催日などを組み合わせた自由なデザインで、世界観を統一できます。
              </p>
              <p>
                デザインデータ（PNG・JPG・SVG等）をアップロードするだけで簡単に注文でき、通常15〜30営業日でお届けします。
                特急オプション（約2週間）もあるため、イベント直前の追加発注にも対応可能。
                ご不明な点は<Link href="/faq" className="text-violet-600 font-bold hover:underline">よくある質問</Link>をご覧いただくか、
                <Link href="/contact" className="text-violet-600 font-bold hover:underline">お問い合わせ</Link>ください。
              </p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 bg-gradient-to-r from-violet-600 to-indigo-600">
          <div className="max-w-3xl mx-auto px-4 text-center">
            <h2 className="text-2xl md:text-4xl font-black text-white mb-4">イベントの記憶に残る、特別なグッズを</h2>
            <p className="text-white/80 mb-8">来場者一人ひとりの心に残るオリジナルグッズで、イベントを盛り上げよう。</p>
            <Link
              href="/products"
              className="inline-flex items-center gap-2 bg-white text-violet-600 h-14 px-10 text-lg font-black rounded-full shadow-2xl hover:scale-105 transition-all"
            >
              今すぐ商品を選ぶ <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </section>
      </div>
    </>
  )
}
