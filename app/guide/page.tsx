import { Metadata } from 'next'
import Link from 'next/link'
import { BookOpen, ArrowRight, HelpCircle, Palette, Upload, CheckCircle, Truck } from 'lucide-react'

const BASE_URL = 'https://fast-oem.soara-mu.jp'

export const metadata: Metadata = {
  title: 'オリジナルグッズの作り方ガイド | グッズ製作・制作の完全マニュアル',
  description:
    'オリジナルグッズの作り方を徹底解説。アクリルキーホルダー、缶バッジ、ピンバッジ、ラバーキーホルダーの製作方法、デザインのコツ、費用相場、納期まで。初めてのグッズ制作でも安心の完全ガイド。',
  keywords: [
    'グッズ 作り方', 'グッズ製作', 'グッズ制作', 'オリジナルグッズ 作りたい',
    'オリジナルグッズ 作成', 'グッズ 作る', 'OEM グッズ',
    'アクリルキーホルダー 作り方', '缶バッジ 作り方', 'ピンバッジ 作り方',
    '同人グッズ 作り方', '推しグッズ 自作', 'ノベルティ 制作',
    'グッズ製作 費用', 'グッズ製作 相場', 'グッズ 小ロット',
  ],
  alternates: { canonical: `${BASE_URL}/guide` },
  openGraph: {
    title: 'オリジナルグッズの作り方ガイド | FAST OEM',
    description: 'グッズ製作の完全ガイド。デザインのコツから発注方法まで徹底解説。',
    url: `${BASE_URL}/guide`,
  },
}

const products = [
  {
    name: 'アクリルキーホルダー',
    slug: 'acrylic-keychain',
    description: '透明感のあるアクリル素材にフルカラー印刷。推しグッズ・同人グッズの定番アイテム。軽くて丈夫、両面印刷にも対応しています。',
    color: 'border-[#ffe135]',
    bg: 'bg-[#ffe135]/10',
  },
  {
    name: '缶バッジ',
    slug: 'can-badge',
    description: '鮮やかなフルカラー印刷が映える缶バッジ。イベント・ノベルティ・コレクションに最適。安全ピンタイプで簡単に装着できます。',
    color: 'border-[#ff7b54]',
    bg: 'bg-[#ff7b54]/10',
  },
  {
    name: 'ピンバッジ',
    slug: 'pin-badge',
    description: '金属の質感が高級感を演出するピンバッジ。企業ノベルティやブランドグッズに人気。エナメル仕上げで美しい発色を実現します。',
    color: 'border-[#00c8c8]',
    bg: 'bg-[#00c8c8]/10',
  },
  {
    name: 'ラバーキーホルダー',
    slug: 'rubber-keychain',
    description: '柔らかいPVC素材で立体的なデザインが可能。耐久性に優れ、色褪せしにくいのが特徴。キャラクターグッズやマスコットに最適です。',
    color: 'border-[#7ed957]',
    bg: 'bg-[#7ed957]/10',
  },
]

const pricingData = [
  {
    name: 'アクリルキーホルダー',
    ranges: [
      { qty: '10個〜', price: '¥350〜500/個' },
      { qty: '100個〜', price: '¥200〜350/個' },
      { qty: '1,000個〜', price: '¥100〜200/個' },
    ],
  },
  {
    name: '缶バッジ',
    ranges: [
      { qty: '10個〜', price: '¥200〜400/個' },
      { qty: '100個〜', price: '¥100〜250/個' },
      { qty: '1,000個〜', price: '¥50〜150/個' },
    ],
  },
  {
    name: 'ピンバッジ',
    ranges: [
      { qty: '50個〜', price: '¥500〜800/個' },
      { qty: '100個〜', price: '¥350〜600/個' },
      { qty: '1,000個〜', price: '¥200〜400/個' },
    ],
  },
  {
    name: 'ラバーキーホルダー',
    ranges: [
      { qty: '50個〜', price: '¥400〜700/個' },
      { qty: '100個〜', price: '¥300〜500/個' },
      { qty: '1,000個〜', price: '¥150〜300/個' },
    ],
  },
]

const faqItems = [
  {
    q: 'グッズ製作にはどのくらいの期間がかかりますか？',
    a: '商品や数量によって異なりますが、通常14〜30営業日程度です。特急オプション（約10営業日）もご用意しておりますので、お急ぎの場合もご相談ください。',
  },
  {
    q: 'デザインの知識がなくても注文できますか？',
    a: 'はい、PNG・JPGなどの画像ファイルがあればご注文いただけます。専門的なデザインソフトは不要です。アップロード後にプレビューで仕上がりを確認できます。',
  },
  {
    q: '小ロット（少量）でも注文できますか？',
    a: 'もちろんです。アクリルキーホルダー・缶バッジは10個から、ピンバッジ・ラバーキーホルダーは50個からご注文いただけます。個人の方から法人の方まで幅広くご利用いただいています。',
  },
  {
    q: 'サンプル（試作品）は作れますか？',
    a: '現在サンプル製作には対応しておりませんが、ご注文前にオンラインプレビューで仕上がりイメージをご確認いただけます。万が一品質に問題がある場合は再製作で対応いたします。',
  },
  {
    q: '支払方法は何がありますか？',
    a: 'クレジットカード（VISA・Mastercard・American Express・JCB）に対応しています。Stripe社の安全な決済システムを使用しており、安心してお支払いいただけます。',
  },
]

const howToJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'HowTo',
  name: 'オリジナルグッズの作り方',
  description: 'FAST OEMでオリジナルグッズを製作する手順を解説します。デザインの準備から注文、お届けまでの流れをご紹介。',
  step: [
    {
      '@type': 'HowToStep',
      position: 1,
      name: 'デザインを作成する',
      text: 'グッズに印刷するデザイン画像を用意します。PNG・JPG・SVG・AI・PSD形式に対応。印刷品質確保のため300dpi以上を推奨します。',
    },
    {
      '@type': 'HowToStep',
      position: 2,
      name: 'デザインをアップロードする',
      text: '商品ページでデザイン画像をドラッグ＆ドロップでアップロードします。プレビューで仕上がりイメージを確認できます。',
    },
    {
      '@type': 'HowToStep',
      position: 3,
      name: '注文・決済する',
      text: 'サイズ・数量・オプションを選択し、クレジットカードで安全にお支払い。会員登録なしでもご注文いただけます。',
    },
    {
      '@type': 'HowToStep',
      position: 4,
      name: '商品を受け取る',
      text: '製造完了後、指定住所へ配送します。通常2週間〜1ヶ月程度でお届けします。',
    },
  ],
}

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqItems.map((item) => ({
    '@type': 'Question',
    name: item.q,
    acceptedAnswer: {
      '@type': 'Answer',
      text: item.a,
    },
  })),
}

const breadcrumbJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'トップ', item: BASE_URL },
    { '@type': 'ListItem', position: 2, name: 'グッズ製作ガイド', item: `${BASE_URL}/guide` },
  ],
}

const stepsData = [
  {
    icon: Palette,
    title: 'デザイン作成',
    description: 'グッズに印刷するデザイン画像を用意します。PNG・JPG・SVGなど主要な画像形式に対応。解像度は300dpi以上を推奨します。',
    color: 'bg-[#00c8c8]',
  },
  {
    icon: Upload,
    title: 'アップロード',
    description: '商品ページでデザイン画像をドラッグ＆ドロップでアップロード。プレビューで仕上がりイメージを確認できます。',
    color: 'bg-[#ffe135]',
  },
  {
    icon: CheckCircle,
    title: '注文・決済',
    description: 'サイズ・数量・オプションを選択し、クレジットカードで安全にお支払い。会員登録なしでもご注文いただけます。',
    color: 'bg-[#ff7b54]',
  },
  {
    icon: Truck,
    title: 'お届け',
    description: '製造完了後、指定住所へ配送します。通常2週間〜1ヶ月程度でお届け。特急オプションもご用意しています。',
    color: 'bg-[#7ed957]',
  },
]

export default function GuidePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify([howToJsonLd, faqJsonLd, breadcrumbJsonLd]) }}
      />

      <div className="py-12 md:py-16 bg-background min-h-screen">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-8" aria-label="パンくずリスト">
            <Link href="/" className="hover:text-foreground transition-colors">トップ</Link>
            <span>/</span>
            <span className="text-foreground font-medium">グッズ製作ガイド</span>
          </nav>

          {/* Header */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#00c8c8]/10 rounded-full text-[#00c8c8] text-sm font-bold mb-4">
              <BookOpen className="h-4 w-4" />
              GUIDE
            </div>
            <h1 className="text-3xl md:text-5xl font-black text-foreground">
              オリジナルグッズの作り方 完全ガイド
            </h1>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              初めてのグッズ製作でも安心。デザインのコツから費用の目安、発注方法まで徹底解説します。
            </p>
          </div>

          {/* Section 1: グッズ製作とは？ */}
          <section className="mb-16">
            <div className="bg-muted/30 rounded-2xl p-8 md:p-10">
              <h2 className="text-2xl md:text-3xl font-black text-foreground mb-6">グッズ製作とは？</h2>
              <div className="text-foreground/80 leading-relaxed space-y-4">
                <p>
                  グッズ製作（OEM製作）とは、オリジナルのデザインを使って、アクリルキーホルダーや缶バッジ、ピンバッジなどのオリジナル商品を作ることです。
                  同人イベントでの頒布物、企業のノベルティ、アーティストやVTuberのファングッズ、推し活グッズなど、さまざまな用途で利用されています。
                </p>
                <p>
                  FAST OEMでは、デザイン画像をアップロードするだけで簡単にオリジナルグッズを発注できます。
                  小ロット10個から対応しているため、個人クリエイターの方でも気軽にグッズ制作を始められます。
                  提携工場で高品質な製造を行い、通常2週間〜1ヶ月程度でお届けします。
                </p>
              </div>
            </div>
          </section>

          {/* Section 2: グッズの種類と特徴 */}
          <section className="mb-16">
            <h2 className="text-2xl md:text-3xl font-black text-foreground mb-8 text-center">グッズの種類と特徴</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {products.map((product) => (
                <Link
                  key={product.slug}
                  href={`/products/${product.slug}`}
                  className={`block bg-white rounded-2xl p-6 border-2 ${product.color} hover:shadow-lg transition-all hover:-translate-y-1`}
                >
                  <h3 className="text-xl font-bold text-foreground mb-3">{product.name}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">{product.description}</p>
                  <span className="inline-flex items-center text-sm font-bold text-[#00c8c8]">
                    詳しく見る <ArrowRight className="ml-1 h-4 w-4" />
                  </span>
                </Link>
              ))}
            </div>
          </section>

          {/* Section 3: グッズ製作の流れ */}
          <section className="mb-16">
            <h2 className="text-2xl md:text-3xl font-black text-foreground mb-8 text-center">グッズ製作の流れ</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {stepsData.map((step, index) => (
                <div
                  key={step.title}
                  className="relative bg-white rounded-2xl p-6 text-center border-2 border-foreground/5 shadow-sm"
                >
                  <div className={`absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full ${step.color} text-white font-bold text-sm flex items-center justify-center shadow-md border-2 border-white`}>
                    {index + 1}
                  </div>
                  <div className={`w-16 h-16 rounded-2xl ${step.color}/20 flex items-center justify-center mx-auto mb-4 mt-2`}>
                    <step.icon className={`h-8 w-8 ${step.color.replace('bg-', 'text-')}`} />
                  </div>
                  <h3 className="font-bold text-foreground text-lg mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Section 4: 費用の目安 */}
          <section className="mb-16">
            <h2 className="text-2xl md:text-3xl font-black text-foreground mb-8 text-center">費用の目安</h2>
            <div className="bg-white rounded-2xl border-2 border-foreground/5 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="text-left px-6 py-4 font-bold text-foreground">商品</th>
                      <th className="text-center px-4 py-4 font-bold text-foreground">少量</th>
                      <th className="text-center px-4 py-4 font-bold text-foreground">中量</th>
                      <th className="text-center px-4 py-4 font-bold text-foreground">大量</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pricingData.map((item, index) => (
                      <tr key={item.name} className={index % 2 === 0 ? 'bg-white' : 'bg-muted/20'}>
                        <td className="px-6 py-4 font-medium text-foreground whitespace-nowrap">{item.name}</td>
                        {item.ranges.map((range) => (
                          <td key={range.qty} className="text-center px-4 py-4 text-muted-foreground">
                            <span className="block text-xs text-muted-foreground/70">{range.qty}</span>
                            <span className="font-bold text-foreground">{range.price}</span>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-6 py-4 bg-muted/30 text-xs text-muted-foreground">
                ※ 上記は目安の価格です。サイズ・オプション・為替レートにより変動します。正確な価格は各商品ページでご確認ください。
              </div>
            </div>
          </section>

          {/* Section 5: デザインのコツ */}
          <section className="mb-16">
            <h2 className="text-2xl md:text-3xl font-black text-foreground mb-8 text-center">デザインのコツ</h2>
            <div className="space-y-6">
              <div className="bg-muted/30 rounded-2xl p-6 md:p-8">
                <h3 className="text-lg font-bold text-foreground mb-3">推奨解像度</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  印刷品質を確保するため、<strong className="text-foreground">300dpi以上</strong>の解像度を推奨します。
                  解像度が低い画像は仕上がりがぼやけてしまう場合があります。
                  Web用の画像（72dpi）をそのまま使用すると粗くなるため、印刷用にサイズを大きめに作成してください。
                </p>
              </div>
              <div className="bg-muted/30 rounded-2xl p-6 md:p-8">
                <h3 className="text-lg font-bold text-foreground mb-3">対応ファイル形式</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  <strong className="text-foreground">PNG・JPG・SVG・AI・PSD</strong>などの主要形式に対応しています。
                  透過背景を活かしたい場合はPNG形式がおすすめです。
                  アクリルキーホルダーなど型抜き商品の場合、背景を透過にしておくと仕上がりがきれいになります。
                </p>
              </div>
              <div className="bg-muted/30 rounded-2xl p-6 md:p-8">
                <h3 className="text-lg font-bold text-foreground mb-3">カットライン・デザイン領域</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  アクリルキーホルダーなどの型抜き商品では、デザインの外周から<strong className="text-foreground">2〜3mm程度の余白</strong>を確保してください。
                  端ギリギリにデザインがあると、製造時の微小なズレで切れてしまうことがあります。
                  また、文字や重要な要素はできるだけ中央寄りに配置することをおすすめします。
                </p>
              </div>
              <div className="bg-muted/30 rounded-2xl p-6 md:p-8">
                <h3 className="text-lg font-bold text-foreground mb-3">色についての注意</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  モニターと実際の印刷物では発色が異なる場合があります。特に<strong className="text-foreground">蛍光色や極端に明るい色</strong>は再現が難しいことがあります。
                  RGBカラーで入稿いただけますが、印刷時にCMYKに変換されるため、若干色味が変わる可能性があります。
                </p>
              </div>
            </div>
          </section>

          {/* Section 6: よくある質問 */}
          <section className="mb-16">
            <h2 className="text-2xl md:text-3xl font-black text-foreground mb-8 text-center">よくある質問</h2>
            <div className="space-y-4">
              {faqItems.map((item) => (
                <div key={item.q} className="bg-white rounded-2xl p-6 border-2 border-foreground/5 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#00c8c8]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <HelpCircle className="h-4 w-4 text-[#00c8c8]" />
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground mb-2">{item.q}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{item.a}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* CTA */}
          <section className="text-center">
            <div className="bg-gradient-to-br from-[#00c8c8]/10 to-[#ffe135]/10 rounded-2xl p-10 md:p-14 border-2 border-[#00c8c8]/20">
              <h2 className="text-2xl md:text-3xl font-black text-foreground mb-4">
                今すぐグッズを作る
              </h2>
              <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
                商品を選んでデザインをアップロードするだけ。会員登録なしでもご注文いただけます。
              </p>
              <Link
                href="/products"
                className="inline-flex items-center gap-2 bg-[#ff7b54] hover:bg-[#ff6b3d] text-white h-14 px-10 text-lg font-bold rounded-full shadow-lg shadow-[#ff7b54]/20 transition-all hover:shadow-xl hover:-translate-y-1"
              >
                商品を選んで作成開始
                <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
          </section>
        </div>
      </div>
    </>
  )
}
