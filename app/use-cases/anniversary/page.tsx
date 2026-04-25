import { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, CheckCircle, Award, Sparkles, Gift, Clock, Upload, Palette, Package, Truck, Cake } from 'lucide-react'
import { Breadcrumb, breadcrumbJsonLd } from '@/components/breadcrumb'
import { getProductsFromDb } from '@/lib/products-db'
import { ProductCard } from '@/components/product-card'

const BASE_URL = 'https://fast-oem.soara-mu.jp'

export const metadata: Metadata = {
  title: '記念品・誕生日・退職祝い・卒業記念品のオーダーメイド製作 | 名入れOEM',
  description:
    '誕生日・記念日・退職祝い・卒業記念品のオリジナル製作ならFAST OEM。名入れアクリルキーホルダー・缶バッジ・ピンバッジを小ロット50個（缶バッジは100個）から作成。一生の思い出に残る、世界にひとつのオーダーメイド記念品を高品質・短納期でお届けします。',
  keywords: [
    '記念品 名入れ オーダー',
    '誕生日 グッズ オリジナル',
    '退職祝い ノベルティ',
    '卒業記念品 オーダーメイド',
    '記念品 オリジナル 制作',
    '名入れ プレゼント',
    '誕生日 プレゼント オーダーメイド',
    '退職記念品 名入れ',
    '卒業記念 グッズ',
    '記念品 缶バッジ',
    '記念品 アクリルキーホルダー',
    '記念品 小ロット',
  ],
  openGraph: {
    title: '記念品・誕生日・退職祝いのオーダーメイド製作 | FAST OEM',
    description:
      '誕生日・記念日・退職祝い・卒業記念品のオリジナル製作。名入れOEMで小ロット50個〜（缶バッジは100個〜）対応。',
    url: `${BASE_URL}/use-cases/anniversary`,
    images: [{ url: '/opengraph-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '記念品・誕生日・退職祝いのオーダーメイド製作 | FAST OEM',
    description: '誕生日・記念日・退職祝いの記念品をオーダーメイドで製作。',
    images: ['/opengraph-image.png'],
  },
  alternates: { canonical: `${BASE_URL}/use-cases/anniversary` },
}

const benefits = [
  { icon: Package, title: '小ロット50個〜OK（缶バッジは100個〜）', description: 'クラス・部署・チームなど、必要な数だけ作れます。少人数のお祝いにも最適。' },
  { icon: Sparkles, title: '名入れ・日付入りに対応', description: '名前・年月日・メッセージを自由にデザイン。世界に一つの記念品が完成します。' },
  { icon: Clock, title: 'お祝い当日に間に合う短納期', description: '通常15〜30営業日、特急なら12営業日以内で納品。送別会や記念日に合わせてスケジュール調整可能。' },
  { icon: Award, title: 'ずっと残る高品質な仕上がり', description: 'フルカラー印刷で発色鮮やか。長く手元に置いていただける、思い出に残るクオリティ。' },
]

const scenes = [
  {
    title: '誕生日・バースデーグッズ',
    description: '推しの誕生日、お子様や友人へのバースデーギフトに。お名前や似顔絵入りのキーホルダー・缶バッジが人気。',
  },
  {
    title: '退職祝い・送別記念品',
    description: '長年お世話になった方への退職記念。在籍年数や部署名を入れた特別な一品で感謝を伝えられます。',
  },
  {
    title: '卒業記念品・思い出グッズ',
    description: '卒業式・卒部・卒団のメモリアルグッズ。クラスや部活のロゴ、集合写真を入れて一生の宝物に。',
  },
  {
    title: '結婚記念日・周年祝い',
    description: '結婚記念日や創業記念日など、節目の年を祝う記念品。日付やメッセージを入れて特別感を演出。',
  },
]

const steps = [
  { icon: Package, title: '1. 商品を選ぶ', description: 'アクリルキーホルダー・缶バッジ・ピンバッジから記念品にぴったりの商品を選択。' },
  { icon: Upload, title: '2. デザインを入稿', description: '名前・日付・写真などのデータをアップロード。デザインソフト不要。' },
  { icon: Palette, title: '3. プレビューで確認', description: 'ブラウザ上で仕上がりをプレビュー。納得いくまで調整可能です。' },
  { icon: Truck, title: '4. 決済して納品を待つ', description: 'クレジット決済後、最短12営業日で指定先へお届けします。' },
]

const faqs = [
  {
    q: 'クラスの卒業記念品（30〜40個）でも作れますか？',
    a: 'はい、小ロット50個（缶バッジは100個〜）から製作可能です。アクリルキーホルダー・ピンバッジ・ラバーキーホルダーは50個から、缶バッジは100個からご注文を承っています。少人数のクラスや部活でも対応できます。',
  },
  {
    q: '退職される方のお名前や在籍年数を入れられますか？',
    a: 'はい、デザインデータに自由に文字を入れていただけます。お名前・在籍年数・「Thank you for ○○ years」などのメッセージを入れて、世界にひとつの退職記念品が作れます。',
  },
  {
    q: '送別会・記念日に間に合いますか？',
    a: '通常納期は15〜30営業日、特急オプションで12営業日以内に納品可能です。お祝いの日から逆算して、余裕を持って2ヶ月前のご注文をおすすめします。お急ぎの場合はお問い合わせください。',
  },
  {
    q: '集合写真や似顔絵を使ったデザインは可能ですか？',
    a: 'はい、PNG・JPG形式の写真・イラストデータをそのままご利用いただけます。卒業の集合写真、お子様の似顔絵、推しのイラストなどでオリジナル記念品が作れます。解像度300dpi以上を推奨します。',
  },
  {
    q: '一人ひとり違うデザインで作れますか？',
    a: '基本的には同一デザインでの製作となります。複数のデザインを混ぜて作りたい場合は、デザインごとに最低ロット（50個または100個）が必要となるため、事前にお問い合わせください。',
  },
  {
    q: '個包装や箱入れラッピングはできますか？',
    a: '商品単位での個包装はオプションでご相談可能です。ご要望のラッピング形態がある場合は、ご注文前に「お問い合わせ」よりご連絡ください。',
  },
  {
    q: '法人での記念品発注は領収書が出ますか？',
    a: 'はい、注文ページから領収書PDF・インボイス制度対応の適格請求書をダウンロードいただけます。社内の経理処理にもスムーズにご対応いただけます。',
  },
]

export default async function AnniversaryPage() {
  const products = await getProductsFromDb()
  const recommended = products.filter(p =>
    ['acrylic-keychain', 'can-badge', 'pin-badge', 'rubber-keychain'].includes(p.slug)
  )
  const allRecommended = recommended.length > 0 ? recommended : products.slice(0, 4)

  const bcJsonLd = breadcrumbJsonLd(
    [{ name: '用途別ガイド', href: '/use-cases' }, { name: '記念品・誕生日・退職祝い製作' }],
    '/use-cases/anniversary',
  )

  const serviceJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: '記念品・誕生日・退職祝い・卒業記念品 製作サービス',
    description:
      '誕生日・記念日・退職祝い・卒業記念品向けオリジナルグッズのOEM製作。名入れアクリルキーホルダー・缶バッジ・ピンバッジを小ロット50個（缶バッジは100個）から。',
    provider: { '@type': 'Organization', name: 'FAST OEM', url: BASE_URL },
    areaServed: { '@type': 'Country', name: 'Japan' },
    serviceType: '記念品OEM製作',
    url: `${BASE_URL}/use-cases/anniversary`,
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
        <section className="bg-gradient-to-br from-amber-50 via-yellow-50/50 to-orange-50 py-16 md:py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <Breadcrumb items={[{ name: '用途別ガイド', href: '/use-cases' }, { name: '記念品・誕生日・退職祝い製作' }]} />
            <div className="text-center max-w-5xl mx-auto">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-100 rounded-full text-amber-700 text-sm font-bold mb-6">
                <Award className="h-4 w-4" />
                大切な人へのお祝いギフトに
              </div>
              <h1 className="text-3xl md:text-5xl font-black text-foreground leading-tight">
                記念品・誕生日・退職祝い・卒業記念品の製作
                <span className="block text-amber-600 mt-2">名入れオーダーメイド・小ロット対応</span>
              </h1>
              <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                誕生日・記念日・送別会・卒業式──大切な節目を、世界にひとつの記念品でお祝いしませんか？
                名入れ・写真入りのオリジナルグッズが、思い出を形にして残します。
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/products"
                  className="inline-flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white h-14 px-10 text-lg font-bold rounded-full shadow-lg transition-all hover:-translate-y-1"
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
            <h2 className="text-2xl md:text-3xl font-black text-center mb-12">なぜ記念品の製作にFAST OEMが選ばれるのか</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-5xl mx-auto">
              {benefits.map((b) => (
                <div key={b.title} className="flex items-start gap-4 p-6 bg-amber-50/40 rounded-2xl">
                  <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                    <b.icon className="h-6 w-6 text-amber-600" />
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
            <p className="text-center text-muted-foreground mb-10">人生のさまざまな節目で、思い出に残るオリジナルグッズを</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
              {scenes.map((s) => (
                <div key={s.title} className="bg-card p-6 rounded-2xl border-2 border-amber-100 hover:border-amber-300 transition-colors">
                  <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mb-4">
                    <Cake className="h-6 w-6 text-amber-600" />
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
            <h2 className="text-2xl md:text-3xl font-black text-center mb-4">記念品におすすめの商品</h2>
            <p className="text-center text-muted-foreground mb-10">お祝い・記念のシーンに人気の商品をご紹介します</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
              {allRecommended.map((product, i) => (
                <ProductCard key={product.id} product={product} index={i} />
              ))}
            </div>
            <div className="text-center mt-10">
              <Link
                href="/products"
                className="inline-flex items-center gap-2 text-amber-600 font-bold text-lg hover:text-amber-700 transition-colors"
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
                  <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
                    <s.icon className="h-7 w-7 text-amber-600" />
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
            <h2 className="text-2xl md:text-3xl font-black text-center mb-10">記念品製作のよくある質問</h2>
            <div className="space-y-4">
              {faqs.map((f, i) => (
                <details key={i} className="group bg-card border border-border rounded-2xl p-5 open:shadow-md transition-shadow">
                  <summary className="flex items-start gap-3 cursor-pointer list-none font-bold text-foreground">
                    <CheckCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
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
            <h2 className="text-2xl font-bold mb-6">記念品・誕生日・退職祝い・卒業記念品について</h2>
            <div className="text-sm text-muted-foreground space-y-4 leading-relaxed">
              <p>
                記念品とは、人生の節目を祝い、特別な思い出を形に残すアイテムです。
                誕生日・記念日・退職祝い・卒業記念など、さまざまなシーンで贈られる名入れグッズは、
                受け取った方の手元に長く残り、何度も思い出してもらえる特別なプレゼントになります。
              </p>
              <p>
                FAST OEMでは、アクリルキーホルダー・缶バッジ・ピンバッジ・ラバーキーホルダーなどの記念品を、
                小ロット50個（缶バッジは100個）から製作できます。
                クラスの卒業記念品、部活・サークルの卒団グッズ、会社の退職祝い、推しの生誕祭グッズなど、
                必要な数だけ無駄なく作れるのが魅力です。
              </p>
              <p>
                デザインデータ（PNG・JPG・SVG等）をアップロードするだけで簡単に注文でき、通常15〜30営業日でお届けします。
                特急オプション（約2週間）もあるため、送別会・記念日直前でも対応可能。
                ご不明な点は<Link href="/faq" className="text-amber-600 font-bold hover:underline">よくある質問</Link>をご覧いただくか、
                <Link href="/contact" className="text-amber-600 font-bold hover:underline">お問い合わせ</Link>ください。
              </p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 bg-gradient-to-r from-amber-500 to-orange-500">
          <div className="max-w-3xl mx-auto px-4 text-center">
            <h2 className="text-2xl md:text-4xl font-black text-white mb-4">大切な節目を、思い出に残るカタチに</h2>
            <p className="text-white/80 mb-8">名入れデザインで、世界にひとつの記念品をお届けします。</p>
            <Link
              href="/products"
              className="inline-flex items-center gap-2 bg-white text-amber-600 h-14 px-10 text-lg font-black rounded-full shadow-2xl hover:scale-105 transition-all"
            >
              今すぐ商品を選ぶ <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </section>
      </div>
    </>
  )
}
