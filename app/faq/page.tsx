import { Metadata } from 'next'
import Link from 'next/link'
import { ChevronDown, Package, ArrowRight } from 'lucide-react'
import { Breadcrumb, breadcrumbJsonLd as bcJsonLdFn } from '@/components/breadcrumb'

const BASE_URL = 'https://fast-oem.soara-mu.jp'

export const metadata: Metadata = {
  title: 'よくある質問（FAQ） | OEMグッズ製作・アクリルキーホルダー・缶バッジ',
  description:
    'FAST OEMのよくある質問。最低注文数・納期・デザインデータ形式・支払方法・返品ポリシー・型代など、OEMグッズ製作に関する疑問をまとめています。',
  openGraph: {
    title: 'よくある質問（FAQ） | FAST OEM',
    description: 'OEMグッズ製作に関するよくある質問。注文・納期・データ形式・支払など全方位で解説。',
    url: `${BASE_URL}/faq`,
    images: [{ url: '/opengraph-image.png', width: 1200, height: 630 }],
  },
  alternates: { canonical: `${BASE_URL}/faq` },
}

const faqCategories = [
  {
    category: '注文・ロットについて',
    faqs: [
      {
        q: '最低注文数はいくつですか？',
        a: '商品によって異なります。アクリルキーホルダー・ピンバッジ・ラバーキーホルダーは50個〜、缶バッジは100個〜からご注文いただけます。小ロットから大量発注まで対応しております。',
      },
      {
        q: '注文数の上限はありますか？',
        a: '商品ごとに上限数量を設定しておりますが、上限を超える大口注文をご希望の場合はお問い合わせください。別途お見積もりをご案内いたします。',
      },
      {
        q: '複数の商品をまとめて注文できますか？',
        a: 'はい、カート機能を使って複数商品をまとめてご注文いただけます。アクリルキーホルダーと缶バッジを同時注文するなど、組み合わせは自由です。商品ごとに別々の工場から発送される場合があります。',
      },
      {
        q: '法人・企業からの注文は可能ですか？',
        a: 'もちろん可能です。ノベルティ・販促グッズとして多くの法人様にご利用いただいております。専用の領収書PDFを注文ページからダウンロードいただけます。',
      },
    ],
  },
  {
    category: '納期・配送について',
    faqs: [
      {
        q: '標準的な納期はどのくらいですか？',
        a: '全商品、ご入金確認後約1ヶ月が目安です（土日祝除く）。特急オプションを選択すると約2週間に短縮できます。工場の混雑状況によって変動する場合があります。',
      },
      {
        q: '特急・短納期対応はできますか？',
        a: 'はい、全商品に特急オプション（約2週間）をご用意しております。商品詳細ページで「特急配送」を選択すると送料が2倍になります。工場の空き状況により対応できない場合もありますので、お急ぎの場合はお早めにご注文ください。',
      },
      {
        q: '送料はいくらですか？',
        a: '送料はカート内の全商品の合計数量に応じて決まります。300個まで¥5,000、500個まで¥8,000、1,000個まで¥11,000など、数量に応じた料金体系です。特急配送を選択した場合は送料が2倍になります。詳しくは配送ページをご覧ください。海外への配送は現在対応しておりません。',
      },
      {
        q: '配送状況を確認できますか？',
        a: '注文完了後にお送りするメール内の専用URLから、工場への発注状況・製造状況・発送状況をいつでもご確認いただけます。ログイン不要・24時間アクセス可能です。発送完了時には追跡番号もお知らせします。',
      },
      {
        q: '複数商品を注文した場合、まとめて届きますか？',
        a: '商品を複数注文した場合、担当工場が異なるため別々に発送されることがあります。それぞれ追跡番号をお知らせしますので、個別に配送状況をご確認いただけます。',
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
        a: 'はい、ご注文フォーム内のデザインエディターで画像の位置・拡大縮小・回転を自由に調整できます。商品の型枠に合わせてプレビューを確認しながら配置を決められます。',
      },
      {
        q: 'キャラクターやロゴを使用しても問題ないですか？',
        a: 'お客様がデザインの著作権・使用権を保有している場合に限りご利用いただけます。第三者の著作物を無断使用することは著作権法に抵触する可能性があります。同人グッズ等の場合は各権利者のガイドラインをご確認の上ご注文ください。',
      },
      {
        q: 'データ入稿後に変更できますか？',
        a: '製造開始前であれば変更可能な場合がございます。製造開始後の変更はお受けできません。ご注文前にプレビューをしっかりご確認ください。変更希望の場合はお早めにお問い合わせください。',
      },
    ],
  },
  {
    category: '型代・オプションについて',
    faqs: [
      {
        q: '型代とは何ですか？',
        a: 'ラバーキーホルダー・ピンバッジなど、専用の金型が必要な商品を初めて製造する際にかかる金型製作費です。同じ形状・サイズでの2回目以降の注文では型を再利用できるため型代は不要です。',
      },
      {
        q: '型代は2回目以降も必要ですか？',
        a: '同じ形状・サイズで再注文する場合、型の再利用が可能です。注文時に前回の注文番号を入力することで型代が免除されます。型は初回注文日から1年間保管しており、1年以内の再注文であれば型代不要です。形状やサイズを変更する場合は新たに型代が発生します。',
      },
      {
        q: 'アクリルキーホルダーの型抜き（ダイカット）とは？',
        a: 'デザインの輪郭に合わせてアクリルを切り抜く加工です。通常の四角形・円形だけでなく、ハート型・星型・キャラクターのシルエットなど自由な形状で製作できます。型抜き形状は選択オプションの一つとしてご指定いただけます。',
      },
      {
        q: '特急オプションと型代は同時に選べますか？',
        a: 'はい、同時に選択可能です。初回注文で型代あり・特急オプションを選んだ場合、型代＋特急料金＋商品代金の合計がご請求金額となります。',
      },
    ],
  },
  {
    category: '支払い・領収書について',
    faqs: [
      {
        q: '支払方法は何が使えますか？',
        a: 'クレジットカード（VISA・Mastercard・American Express・JCB）に対応しています。Stripe社の安全な決済システムを使用しており、カード情報はFAST OEMのサーバーに保存されません。',
      },
      {
        q: '領収書・インボイスはもらえますか？',
        a: '注文完了後にお送りするメール内の専用URLから、領収書PDFをいつでもダウンロードいただけます。インボイス制度（適格請求書）に対応した形式で発行しています。',
      },
      {
        q: '注文後に住所を変更できますか？',
        a: '製造開始前であれば変更できる場合がございます。お早めにお問い合わせください。発送後の住所変更は配送業者への直接ご連絡が必要です。',
      },
    ],
  },
  {
    category: 'キャンセル・返品について',
    faqs: [
      {
        q: 'キャンセル・返金はできますか？',
        a: '受注製造品のため、お客様都合によるキャンセル・返金は決済完了後はお受けできません。在庫不足・データ不備など弊社都合によるキャンセルの場合は全額返金いたします。ご注文前にしっかりとプレビューをご確認ください。',
      },
      {
        q: '商品に不良があった場合は？',
        a: '製品の品質・数量に明らかな問題があった場合は、再製作または返金にて対応いたします。商品到着後7日以内に不良箇所の写真とともにメールでご連絡ください。',
      },
      {
        q: '一部の商品だけ不良があった場合は？',
        a: '不良品の数量分のみ再製作または部分返金にて対応いたします。到着後7日以内にご連絡いただき、不良品の写真をお送りください。',
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
  const bcJsonLd = bcJsonLdFn([{ name: 'よくある質問' }])
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify([jsonLd, bcJsonLd]) }}
      />
      <div className="py-12 md:py-16 bg-background min-h-screen">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Breadcrumb items={[{ name: 'よくある質問' }]} />

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
