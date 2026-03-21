import { Metadata } from 'next'
import Link from 'next/link'
import { ChevronDown, Package, ArrowRight } from 'lucide-react'

const BASE_URL = 'https://fast-oem.soara-mu.jp'

export const metadata: Metadata = {
  title: 'よくある質問（FAQ） | OEMグッズ製作・アクリルキーホルダー・缶バッジ',
  description:
    'FAST OEMのよくある質問。最低注文数・納期・デザインデータ形式・支払方法・返品ポリシー・型代など、OEMグッズ製作に関する疑問をまとめています。',
  keywords: [
    'OEM FAQ', 'グッズ製作 よくある質問', 'アクリルキーホルダー 注文方法',
    '缶バッジ 納期', 'OEM 最低ロット', 'グッズ製作 デザインデータ',
    '型代とは', 'OEM 支払方法', 'グッズ製作 返品',
  ],
  openGraph: {
    title: 'よくある質問（FAQ） | FAST OEM',
    description: 'OEMグッズ製作に関するよくある質問。注文・納期・データ形式・支払など全方位で解説。',
    url: `${BASE_URL}/faq`,
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
  alternates: { canonical: `${BASE_URL}/faq` },
}

const faqCategories = [
  {
    category: '注文・ロットについて',
    faqs: [
      {
        q: '最低注文数はいくつですか？',
        a: '商品によって異なりますが、アクリルキーホルダー・缶バッジ・ピンバッジは10個〜、ラバーキーホルダーは30個〜、ビニール袋は50個〜からご注文いただけます。小ロットから大量注文まで対応しております。',
      },
      {
        q: '注文数の上限はありますか？',
        a: '特に上限は設けておりません。大量注文の場合は別途お見積もりをご案内できる場合がございますので、お気軽にお問い合わせください。',
      },
      {
        q: '複数の商品をまとめて注文できますか？',
        a: 'はい、カート機能を使って複数商品をまとめてご注文いただけます。アクリルキーホルダーと缶バッジを同時注文するなど、組み合わせは自由です。',
      },
      {
        q: '法人・企業からの注文は可能ですか？',
        a: 'もちろん可能です。ノベルティ・販促グッズとして多くの法人様にご利用いただいております。請求書払いご希望の場合はお問い合わせください。',
      },
    ],
  },
  {
    category: '納期・配送について',
    faqs: [
      {
        q: '標準的な納期はどのくらいですか？',
        a: '商品・数量により異なりますが、通常は入金確認後14日〜30日程度です。工場の混雑状況によって変動する場合がございます。',
      },
      {
        q: '特急・短納期対応はできますか？',
        a: 'はい、特急オプション（10日程度）をご用意しております。別途特急料金が発生しますが、急ぎのご注文にも対応可能です。商品詳細ページでオプション選択が可能です。',
      },
      {
        q: '配送方法・送料は？',
        a: '日本国内への配送は送料無料です。配送業者は佐川急便・ヤマト運輸などを利用しております。海外配送は現在対応しておりません。',
      },
      {
        q: '配送状況を確認できますか？',
        a: 'ご注文後に発行される専用URLから、工場への発注状況・発送状況をいつでもご確認いただけます。ログイン不要でアクセスできます。',
      },
    ],
  },
  {
    category: 'デザインデータについて',
    faqs: [
      {
        q: '対応しているデザインファイルの形式は？',
        a: 'PNG・JPG・SVG・AI・PSD など主要な形式に対応しています。印刷品質確保のため、できるだけ解像度300dpi以上のデータをご用意ください。入稿後にプレビューで配置確認が可能です。',
      },
      {
        q: 'デザインの配置を自分で調整できますか？',
        a: 'はい、ご注文フォーム内のデザインエディターで画像の位置・拡大縮小・回転を自由に調整できます。型枠に合わせてプレビューを確認しながら配置を決められます。',
      },
      {
        q: 'キャラクターやロゴを使用しても問題ないですか？',
        a: 'お客様がデザインの著作権・使用権を保有している場合に限りご利用いただけます。第三者の著作物を無断使用することは著作権法に抵触する可能性があります。同人グッズ等の場合はガイドラインをご確認の上ご注文ください。',
      },
      {
        q: 'データ入稿後に変更できますか？',
        a: '製造開始前であれば変更可能な場合がございます。製造開始後の変更はお受けできませんので、ご注文前にしっかりとプレビューをご確認ください。',
      },
    ],
  },
  {
    category: '型代・オプションについて',
    faqs: [
      {
        q: '型代とは何ですか？',
        a: 'ラバーキーホルダーなど、シリコン・ゴム素材の商品を製造するには金型が必要です。初回注文時にのみ型代（金型製作費）がかかります。2回目以降の同じ形状での注文は型代不要です。',
      },
      {
        q: '型代は2回目以降も必要ですか？',
        a: '同じ形状で再注文する場合、型の再利用が可能です。前回の注文IDを入力することで型代が免除されます。型は初回注文から1年間保管しており、1年以内の再注文であれば型代不要です。なお、形状やサイズを変更する場合は新たに型代が発生します。',
      },
      {
        q: 'アクリルキーホルダーの型抜き（ダイカット）とは？',
        a: 'デザインの輪郭に合わせてアクリルを切り抜く加工です。通常の四角形・円形の他、ハート型・星型・独自形状など自由なシルエットで製作できます。ダイカット形状は一般的に別途費用がかかります。',
      },
    ],
  },
  {
    category: '支払い・キャンセルについて',
    faqs: [
      {
        q: '支払方法は何が使えますか？',
        a: 'クレジットカード（VISA・Mastercard・American Express・JCB）に対応しています。Stripe社の安全な決済システムを使用しております。',
      },
      {
        q: 'キャンセル・返金はできますか？',
        a: 'オリジナル商品のため、原則としてキャンセル・返金はお受けしておりません。製造前の段階でのキャンセルは、状況によりご相談可能ですのでお早めにお問い合わせください。商品の品質不良があった場合は責任をもって対応いたします。',
      },
      {
        q: '領収書・インボイスはもらえますか？',
        a: 'はい、注文完了後に発行された専用URLから領収書PDFをダウンロードいただけます。インボイス対応の領収書も発行可能ですので、必要な場合はお問い合わせください。',
      },
      {
        q: '商品に不良があった場合は？',
        a: '製品の品質・数量に明らかな問題があった場合は、再製作または返金にて対応いたします。商品到着後7日以内に写真とともにご連絡ください。',
      },
    ],
  },
]

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqCategories.flatMap((cat) =>
    cat.faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.a,
      },
    }))
  ),
}

export default function FaqPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="py-12 md:py-16 bg-background min-h-screen">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-8" aria-label="パンくずリスト">
            <Link href="/" className="hover:text-foreground transition-colors">トップ</Link>
            <span>/</span>
            <span className="text-foreground font-medium">よくある質問</span>
          </nav>

          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-primary text-sm font-medium mb-4">
              <Package className="h-4 w-4" />
              FAQ
            </div>
            <h1 className="text-3xl md:text-5xl font-bold text-foreground">
              よくある質問
            </h1>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              OEMグッズ製作に関するよくある疑問をまとめました。<br className="hidden sm:block" />
              解決しない場合はお気軽にお問い合わせください。
            </p>
          </div>

          {/* FAQ Categories */}
          <div className="space-y-10">
            {faqCategories.map((cat) => (
              <section key={cat.category}>
                <h2 className="text-xl font-bold text-foreground mb-4 pb-2 border-b-2 border-primary/20">
                  {cat.category}
                </h2>
                <div className="space-y-3">
                  {cat.faqs.map((faq, i) => (
                    <details
                      key={i}
                      className="group rounded-xl border border-border bg-card overflow-hidden"
                    >
                      <summary className="flex items-center justify-between gap-4 cursor-pointer px-6 py-4 font-medium text-foreground hover:bg-muted/50 transition-colors list-none">
                        <span className="flex items-start gap-3">
                          <span className="shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center mt-0.5">
                            Q
                          </span>
                          {faq.q}
                        </span>
                        <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0 transition-transform group-open:rotate-180" />
                      </summary>
                      <div className="px-6 pb-5 pt-1">
                        <div className="flex items-start gap-3">
                          <span className="shrink-0 w-6 h-6 rounded-full bg-accent/20 text-accent-foreground text-xs font-bold flex items-center justify-center mt-0.5">
                            A
                          </span>
                          <p className="text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
                        </div>
                      </div>
                    </details>
                  ))}
                </div>
              </section>
            ))}
          </div>

          {/* Bottom CTA */}
          <div className="mt-16 text-center">
            <div className="inline-block p-8 bg-gradient-to-br from-primary/5 to-primary/10 rounded-3xl border border-primary/20">
              <h3 className="text-xl font-bold text-foreground mb-2">
                解決しない場合はご連絡ください
              </h3>
              <p className="text-muted-foreground mb-6">
                FAQで解決しない疑問は、お気軽にお問い合わせください。
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <a
                  href="mailto:contact@soara-mu.com"
                  className="inline-flex items-center justify-center h-11 px-6 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-medium transition-colors"
                >
                  メールで問い合わせる
                </a>
                <Link
                  href="/products"
                  className="inline-flex items-center justify-center h-11 px-6 rounded-xl border border-border hover:bg-muted transition-colors font-medium text-foreground"
                >
                  商品一覧を見る
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
