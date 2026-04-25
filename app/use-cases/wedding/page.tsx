import { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, CheckCircle, Heart, Sparkles, Gift, Clock, Upload, Palette, Package, Truck } from 'lucide-react'
import { Breadcrumb, breadcrumbJsonLd } from '@/components/breadcrumb'
import { getProductsFromDb } from '@/lib/products-db'
import { ProductCard } from '@/components/product-card'

const BASE_URL = 'https://fast-oem.soara-mu.jp'

export const metadata: Metadata = {
  title: '結婚式プチギフト・ウェディングノベルティ製作 | 名入れオーダーメイドOEM',
  description:
    '結婚式のプチギフト・ウェディングノベルティ・ウェルカムグッズの製作ならFAST OEM。新郎新婦のお名前や日付を入れたオリジナルアクリルキーホルダー・缶バッジ・ピンバッジを小ロット50個（缶バッジは100個）から作成可能。ゲストへの感謝を形にする高品質オーダーメイド。',
  keywords: [
    '結婚式 プチギフト 名入れ',
    'ウェディング ノベルティ オリジナル',
    '結婚式 引き出物 オーダーメイド',
    '結婚式 グッズ 制作',
    'ウェルカムグッズ 結婚式',
    '結婚式 記念品 オリジナル',
    'ウェディング 缶バッジ',
    'ブライダル ノベルティ',
    '結婚式 名入れ キーホルダー',
    '結婚式 オーダーメイド OEM',
    'ウェディング グッズ 小ロット',
    '結婚式 プチギフト オリジナル',
  ],
  openGraph: {
    title: '結婚式プチギフト・ウェディングノベルティ製作 | FAST OEM',
    description:
      '結婚式のプチギフト・ウェディングノベルティを名入れオーダーメイドで製作。小ロット50個〜（缶バッジは100個〜）対応。',
    url: `${BASE_URL}/use-cases/wedding`,
    images: [{ url: '/opengraph-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '結婚式プチギフト・ウェディングノベルティ製作 | FAST OEM',
    description: '結婚式のプチギフト・ウェディングノベルティをオーダーメイドで。小ロット対応。',
    images: ['/opengraph-image.png'],
  },
  alternates: { canonical: `${BASE_URL}/use-cases/wedding` },
}

const benefits = [
  { icon: Package, title: '小ロット50個〜OK（缶バッジは100個〜）', description: 'ゲストの人数に合わせて少量から製作可能。余らせず無駄なく作れます。' },
  { icon: Sparkles, title: '名入れ・日付入りに対応', description: '新郎新婦のお名前・挙式日・サンクスメッセージを自由にデザインに反映。世界に一つの記念品が完成します。' },
  { icon: Clock, title: '挙式日に間に合う短納期', description: '通常15〜30営業日、特急なら12営業日以内で納品。準備に追われる時期でも安心してお任せいただけます。' },
  { icon: Heart, title: 'ゲストの心に残る高品質', description: 'フルカラー印刷で発色鮮やか。手に取ったゲストに感動を届ける、長く愛される仕上がり。' },
]

const scenes = [
  {
    title: 'プチギフト',
    description: '披露宴のお見送り時にゲスト一人ひとりへ。お名前と日付入りの缶バッジ・キーホルダーが定番。',
  },
  {
    title: 'ウェルカムグッズ',
    description: 'ウェルカムスペースに飾るオリジナルアイテム。ふたりの似顔絵やイニシャルをアクリルグッズに。',
  },
  {
    title: '引き出物・サンクスギフト',
    description: '感謝の気持ちを込めた記念品として。フォーマルなピンバッジは年配の方にも喜ばれます。',
  },
  {
    title: '二次会・前撮り記念グッズ',
    description: '二次会の景品やゲーム賞品、前撮り写真を使った記念グッズとしても人気です。',
  },
]

const steps = [
  { icon: Package, title: '1. 商品を選ぶ', description: 'アクリルキーホルダー・缶バッジ・ピンバッジから用途に合うものを選択。' },
  { icon: Upload, title: '2. デザインを入稿', description: 'お名前・日付・写真などのデータをアップロード。デザインソフト不要。' },
  { icon: Palette, title: '3. プレビューで確認', description: 'ブラウザ上で仕上がりをプレビュー。納得いくまで調整可能です。' },
  { icon: Truck, title: '4. 決済して納品を待つ', description: 'クレジット決済後、最短12営業日で指定先へお届けします。' },
]

const faqs = [
  {
    q: '結婚式の招待人数（30〜80人程度）でも作れますか？',
    a: 'はい、小ロット50個（缶バッジは100個〜）から製作可能です。アクリルキーホルダー・ピンバッジ・ラバーキーホルダーは50個から、缶バッジは100個からのご注文を承っています。少人数の挙式でも対応できます。',
  },
  {
    q: '新郎新婦の名前や挙式日を入れられますか？',
    a: 'はい、デザインデータに自由に文字を入れていただけます。お名前・挙式日・「Thank you」などのメッセージをデザインに含めてアップロードしてください。テンプレートは特に決まっていないので、自由にレイアウトいただけます。',
  },
  {
    q: '結婚式当日に間に合いますか？',
    a: '通常納期は15〜30営業日、特急オプションで12営業日以内に納品可能です。挙式日から逆算して、余裕を持って2ヶ月前のご注文をおすすめします。お急ぎの場合はお問い合わせください。',
  },
  {
    q: 'ふたりの写真を使ったデザインは可能ですか？',
    a: 'はい、PNG・JPG形式の写真データをそのままご利用いただけます。前撮り写真や似顔絵イラストでオリジナルグッズが作れます。解像度300dpi以上を推奨します。',
  },
  {
    q: 'ラッピングや個包装はしてもらえますか？',
    a: '商品単位での個包装はオプションでご相談可能です。ご要望のラッピング形態がある場合は、ご注文前に「お問い合わせ」よりご連絡ください。',
  },
  {
    q: '少しだけ追加注文することは可能ですか？',
    a: '初回注文後の追加発注も可能です。ただし最低ロット（50個または100個）からとなりますので、念のため少し多めにご注文いただくことをおすすめします。',
  },
  {
    q: '領収書は発行できますか？',
    a: 'はい、注文ページから領収書PDFをダウンロードいただけます。インボイス制度に対応した適格請求書としてもご利用いただけます。',
  },
]

export default async function WeddingPage() {
  const products = await getProductsFromDb()
  const recommended = products.filter(p =>
    ['acrylic-keychain', 'can-badge', 'pin-badge', 'rubber-keychain'].includes(p.slug)
  )
  const allRecommended = recommended.length > 0 ? recommended : products.slice(0, 4)

  const bcJsonLd = breadcrumbJsonLd(
    [{ name: '用途別ガイド', href: '/use-cases' }, { name: '結婚式プチギフト製作' }],
    '/use-cases/wedding',
  )

  const serviceJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: '結婚式プチギフト・ウェディングノベルティ製作サービス',
    description:
      '結婚式向けオリジナルプチギフト・ウェディングノベルティのOEM製作。名入れアクリルキーホルダー・缶バッジ・ピンバッジを小ロット50個（缶バッジは100個）から。',
    provider: { '@type': 'Organization', name: 'FAST OEM', url: BASE_URL },
    areaServed: { '@type': 'Country', name: 'Japan' },
    serviceType: 'ウェディングノベルティOEM製作',
    url: `${BASE_URL}/use-cases/wedding`,
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify([bcJsonLd, serviceJsonLd, faqJsonLd]) }}
      />
      <div className="bg-background min-h-screen">
        {/* Hero */}
        <section className="bg-gradient-to-br from-rose-50 via-amber-50/50 to-pink-50 py-16 md:py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <Breadcrumb items={[{ name: '用途別ガイド', href: '/use-cases' }, { name: '結婚式プチギフト製作' }]} />
            <div className="text-center max-w-5xl mx-auto">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-rose-100 rounded-full text-rose-600 text-sm font-bold mb-6">
                <Heart className="h-4 w-4" />
                結婚式・ウェディングをご準備中の方へ
              </div>
              <h1 className="text-3xl md:text-5xl font-black text-foreground leading-tight">
                結婚式プチギフト・ウェディングノベルティ製作
                <span className="block text-rose-500 mt-2">名入れオーダーメイド・小ロット対応</span>
              </h1>
              <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                新郎新婦のお名前と挙式日を入れた、世界にひとつのプチギフトを。
                ゲストへの感謝の気持ちを、長く手元に残るオリジナルグッズで届けませんか？
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/products"
                  className="inline-flex items-center justify-center gap-2 bg-rose-500 hover:bg-rose-600 text-white h-14 px-10 text-lg font-bold rounded-full shadow-lg transition-all hover:-translate-y-1"
                >
                  今すぐ商品を選ぶ
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
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl md:text-3xl font-black text-center mb-12">なぜ結婚式グッズの製作にFAST OEMが選ばれるのか</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-5xl mx-auto">
              {benefits.map((b) => (
                <div key={b.title} className="flex items-start gap-4 p-6 bg-rose-50/40 rounded-2xl">
                  <div className="w-12 h-12 rounded-xl bg-rose-100 flex items-center justify-center shrink-0">
                    <b.icon className="h-6 w-6 text-rose-500" />
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
            <h2 className="text-2xl md:text-3xl font-black text-center mb-4">こんなシーンで活躍します</h2>
            <p className="text-center text-muted-foreground mb-10">結婚式のさまざまな場面でオリジナルグッズが活躍します</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
              {scenes.map((s) => (
                <div key={s.title} className="bg-card p-6 rounded-2xl border-2 border-rose-100 hover:border-rose-300 transition-colors">
                  <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center mb-4">
                    <Gift className="h-6 w-6 text-rose-500" />
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
            <h2 className="text-2xl md:text-3xl font-black text-center mb-4">結婚式におすすめの商品</h2>
            <p className="text-center text-muted-foreground mb-10">プチギフト・ウェルカムグッズに人気の商品をご紹介します</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
              {allRecommended.map((product, i) => (
                <ProductCard key={product.id} product={product} index={i} />
              ))}
            </div>
            <div className="text-center mt-10">
              <Link
                href="/products"
                className="inline-flex items-center gap-2 text-rose-500 font-bold text-lg hover:text-rose-600 transition-colors"
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
                  <div className="w-14 h-14 rounded-full bg-rose-100 flex items-center justify-center mx-auto mb-4">
                    <s.icon className="h-7 w-7 text-rose-500" />
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
            <h2 className="text-2xl md:text-3xl font-black text-center mb-10">結婚式グッズ製作のよくある質問</h2>
            <div className="space-y-4">
              {faqs.map((f, i) => (
                <details key={i} className="group bg-card border border-border rounded-2xl p-5 open:shadow-md transition-shadow">
                  <summary className="flex items-start gap-3 cursor-pointer list-none font-bold text-foreground">
                    <CheckCircle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
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
            <h2 className="text-2xl font-bold mb-6">結婚式プチギフト・ウェディングノベルティについて</h2>
            <div className="text-sm text-muted-foreground space-y-4 leading-relaxed">
              <p>
                結婚式のプチギフトやウェディングノベルティは、ふたりの大切な日を彩り、ゲストへの感謝の気持ちを伝えるアイテムです。
                新郎新婦のお名前や挙式日を入れた名入れグッズは、もらったゲストの記憶にも長く残る特別な記念品となります。
              </p>
              <p>
                FAST OEMでは、アクリルキーホルダー・缶バッジ・ピンバッジ・ラバーキーホルダーなどのウェディングノベルティを、
                小ロット50個（缶バッジは100個）から製作できます。
                招待人数が30〜80人程度の少人数婚から、大規模な披露宴まで、必要な数だけ無駄なく作れるのが魅力です。
              </p>
              <p>
                デザインデータ（PNG・JPG・SVG等）をアップロードするだけで簡単に注文でき、通常15〜30営業日でお届けします。
                特急オプション（約2週間）もあるため、挙式直前でも対応可能。
                ご不明な点は<Link href="/faq" className="text-rose-500 font-bold hover:underline">よくある質問</Link>をご覧いただくか、
                <Link href="/contact" className="text-rose-500 font-bold hover:underline">お問い合わせ</Link>ください。
              </p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 bg-gradient-to-r from-rose-500 to-pink-500">
          <div className="max-w-3xl mx-auto px-4 text-center">
            <h2 className="text-2xl md:text-4xl font-black text-white mb-4">大切な日を、忘れられない一日に</h2>
            <p className="text-white/80 mb-8">名入れデザインで、ゲストに感謝の気持ちを届けるオリジナルグッズを。</p>
            <Link
              href="/products"
              className="inline-flex items-center gap-2 bg-white text-rose-500 h-14 px-10 text-lg font-black rounded-full shadow-2xl hover:scale-105 transition-all"
            >
              今すぐ商品を選ぶ <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </section>
      </div>
    </>
  )
}
