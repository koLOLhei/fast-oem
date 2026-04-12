import { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Users, Building2, Heart, Star, Quote } from 'lucide-react'
import { Breadcrumb, breadcrumbJsonLd } from '@/components/breadcrumb'

const BASE_URL = 'https://fast-oem.soara-mu.jp'

export const metadata: Metadata = {
  title: '製作事例・お客様の声 | オリジナルグッズ製作実績',
  description:
    'FAST OEMのグッズ製作事例とお客様の声をご紹介。同人サークル・企業ノベルティ・推し活グッズなど、さまざまな用途でご利用いただいた製作実績。アクリルキーホルダー・缶バッジ・ピンバッジの事例多数。',
  keywords: [
    'グッズ製作 事例', 'グッズ製作 実績', 'OEM製作 事例',
    'アクリルキーホルダー 事例', '缶バッジ 製作事例', 'ピンバッジ 実績',
    '同人グッズ 事例', 'ノベルティ 事例', '推し活グッズ 事例',
    'グッズ製作 口コミ', 'グッズ製作 評判',
  ],
  openGraph: {
    title: '製作事例・お客様の声 | FAST OEM',
    description: 'グッズ製作の事例とお客様の声。同人・ノベルティ・推し活の製作実績をご紹介。',
    url: `${BASE_URL}/cases`,
  },
  alternates: { canonical: `${BASE_URL}/cases` },
}

const cases = [
  {
    icon: Users,
    category: '同人サークル',
    color: 'bg-[#ff7b54]/10 text-[#ff7b54]',
    borderColor: 'border-[#ff7b54]/30',
    title: 'コミケ頒布用アクリルキーホルダー',
    product: 'アクリルキーホルダー',
    quantity: '50個',
    description: '同人サークルの新刊に合わせたオリジナルキャラクターのアクリルキーホルダーを製作。両面フルカラー印刷で、キャラクターの前面・背面をそれぞれデザイン。',
    feedback: '小ロットでも注文できるのが助かりました。発色がとても良く、イベントで「すごくきれい！」と好評でした。次回のイベントでもリピートする予定です。',
    person: '同人サークル主催者 A様',
  },
  {
    icon: Building2,
    category: '企業ノベルティ',
    color: 'bg-[#00c8c8]/10 text-[#00c8c8]',
    borderColor: 'border-[#00c8c8]/30',
    title: '展示会配布用ピンバッジ',
    product: 'ピンバッジ',
    quantity: '200個',
    description: 'IT企業の展示会ブースで配布するノベルティとして、企業ロゴ入りピンバッジを製作。エナメル仕上げでブランドカラーを忠実に再現。',
    feedback: '領収書もすぐダウンロードできて経理処理がスムーズでした。ピンバッジの質感が良く、お客様に「これ売ってないの？」と聞かれるほど好評。名刺交換のきっかけにもなりました。',
    person: 'IT企業 マーケティング担当 B様',
  },
  {
    icon: Heart,
    category: '推し活グッズ',
    color: 'bg-pink-100 text-pink-600',
    borderColor: 'border-pink-200',
    title: 'ライブ応援用缶バッジセット',
    product: '缶バッジ',
    quantity: '100個',
    description: '推しアイドルのライブに向けて、自作イラストで缶バッジを製作。メンバーカラーに合わせた5種類のデザインを各20個ずつ作成。',
    feedback: 'ファン仲間と分け合うのにちょうどいい数で助かります。痛バッグにつけてライブに持っていったら、周りのファンにも「どこで作ったの？」と聞かれました！',
    person: '推し活ファン C様',
  },
  {
    icon: Users,
    category: '同人サークル',
    color: 'bg-[#ff7b54]/10 text-[#ff7b54]',
    borderColor: 'border-[#ff7b54]/30',
    title: 'オンリーイベント向けラバーキーホルダー',
    product: 'ラバーキーホルダー',
    quantity: '100個',
    description: 'キャラクターの立体感を活かしたラバーキーホルダーを製作。ぷにぷにした触感が特徴的で、バッグチャームとしても使えるデザインに。',
    feedback: '立体的なデザインが表現できるのが決め手でした。思った以上に柔らかくて手触りが良く、イベント当日は早々に完売。再注文時は型代が不要だったのでコスト面でも助かりました。',
    person: '同人サークル D様',
  },
  {
    icon: Building2,
    category: '企業ノベルティ',
    color: 'bg-[#00c8c8]/10 text-[#00c8c8]',
    borderColor: 'border-[#00c8c8]/30',
    title: '店舗キャンペーン用アクリルキーホルダー',
    product: 'アクリルキーホルダー',
    quantity: '500個',
    description: '飲食店のキャンペーンで配布するマスコットキャラクターのアクリルキーホルダーを製作。店舗のブランドカラーを活かしたポップなデザイン。',
    feedback: '500個の大口注文でも対応していただけました。単価も想像以上にリーズナブルで、キャンペーンの予算内に収まりました。お客様の反応がとても良く、来店促進にも効果がありました。',
    person: '飲食チェーン 企画担当 E様',
  },
]

export default function CasesPage() {
  const bcJsonLd = breadcrumbJsonLd([{ name: '製作事例' }])

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(bcJsonLd) }}
      />
      <div className="py-12 md:py-16 bg-background min-h-screen">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <Breadcrumb items={[{ name: '製作事例' }]} />

          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#ffe135]/20 rounded-full text-[#b8a000] text-sm font-bold mb-4">
              <Star className="h-4 w-4" />
              CASES
            </div>
            <h1 className="text-3xl md:text-5xl font-black text-foreground">
              製作事例・お客様の声
            </h1>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              同人サークル・企業・個人のお客様から、さまざまな用途でご利用いただいています。
            </p>
          </div>

          {/* Cases */}
          <div className="space-y-8">
            {cases.map((c, i) => (
              <article
                key={i}
                className={`bg-card border-2 ${c.borderColor} rounded-2xl overflow-hidden`}
              >
                <div className="p-6 md:p-8">
                  {/* Category & Meta */}
                  <div className="flex flex-wrap items-center gap-3 mb-4">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full ${c.color}`}>
                      <c.icon className="h-3.5 w-3.5" />
                      {c.category}
                    </span>
                    <span className="text-xs text-muted-foreground">商品: {c.product}</span>
                    <span className="text-xs text-muted-foreground">数量: {c.quantity}</span>
                  </div>

                  <h2 className="text-xl font-bold text-foreground mb-3">{c.title}</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-5">{c.description}</p>

                  {/* Feedback */}
                  <div className="bg-muted/30 rounded-xl p-5">
                    <div className="flex items-start gap-3">
                      <Quote className="h-5 w-5 text-[#ffe135] shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm text-foreground/80 leading-relaxed italic">{c.feedback}</p>
                        <p className="text-xs text-muted-foreground mt-3 font-medium">--- {c.person}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {/* CTA */}
          <div className="mt-16 text-center">
            <div className="inline-block p-8 bg-gradient-to-br from-[#ff7b54]/5 to-[#00c8c8]/5 rounded-3xl border border-primary/20">
              <h3 className="text-xl font-bold text-foreground mb-2">あなたもオリジナルグッズを作りませんか？</h3>
              <p className="text-muted-foreground text-sm mb-6">
                商品を選んでデザインをアップロードするだけ。小ロット50個〜対応。
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  href="/products"
                  className="inline-flex items-center justify-center gap-2 bg-[#ff7b54] hover:bg-[#ff6b3d] text-white h-11 px-6 rounded-xl font-bold transition-colors"
                >
                  商品を選んで作成開始 <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/contact"
                  className="inline-flex items-center justify-center h-11 px-6 rounded-xl border border-border hover:bg-muted transition-colors font-medium text-foreground"
                >
                  お問い合わせ
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
