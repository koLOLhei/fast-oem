import { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Building2, Users, Globe, Award, Shield, Clock } from 'lucide-react'
import { Breadcrumb, breadcrumbJsonLd } from '@/components/breadcrumb'
import { JsonLd } from '@/components/json-ld'

const BASE_URL = 'https://fast-oem.soara-mu.jp'

export const metadata: Metadata = {
  title: '会社概要・私たちについて',
  description:
    'FAST OEMを運営する株式会社SOARAの会社概要。代表メッセージ、事業内容、品質へのこだわり、沿革をご紹介します。',
  openGraph: {
    title: '会社概要 | FAST OEM',
    description:
      'FAST OEMを運営する株式会社SOARAの会社概要。代表メッセージ、事業内容、品質へのこだわりをご紹介します。',
    url: `${BASE_URL}/about`,
  },
  alternates: { canonical: `${BASE_URL}/about` },
}

/* ---------- structured data ---------- */
// Organization schema is defined on the homepage (app/page.tsx) only.
// About page only outputs breadcrumb to avoid duplicate entity confusion.

export default function AboutPage() {
  const bcJsonLd = breadcrumbJsonLd([{ name: '会社概要' }])

  return (
    <>
      <JsonLd data={bcJsonLd} />

      {/* Hero */}
      <section className="relative bg-gradient-to-br from-primary/5 via-background to-primary/10 py-20 md:py-28 overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Breadcrumb items={[{ name: '会社概要' }]} />
          <h1 className="mt-8 text-3xl md:text-5xl font-black text-foreground leading-tight">
            私たちについて
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            「作りたい」を、もっと手軽に。
            <br />
            FAST OEMは、クリエイター・企業・個人のものづくりを
            テクノロジーの力でサポートするグッズ製作プラットフォームです。
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="py-16 md:py-20 bg-background">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <span className="text-sm font-bold text-primary tracking-widest uppercase">Mission</span>
              <h2 className="mt-2 text-2xl md:text-3xl font-black text-foreground">
                ものづくりの敷居を下げる
              </h2>
              <p className="mt-6 text-muted-foreground leading-relaxed">
                従来のOEM製作は、最小ロット数百〜数千個、納期1〜2ヶ月、複雑な見積もり交渉が当たり前でした。
              </p>
              <p className="mt-4 text-muted-foreground leading-relaxed">
                FAST OEMは、Web完結型の注文システムと信頼できる工場ネットワークにより、
                <strong className="text-foreground">小ロット・短納期・明朗価格</strong>
                でのグッズ製作を実現しています。
              </p>
              <p className="mt-4 text-muted-foreground leading-relaxed">
                同人イベントで自分のグッズを販売したい個人クリエイターから、
                社員向けノベルティを検討する企業のマーケティング担当まで、
                あらゆる「作りたい」に応えます。
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: Clock, label: '最短約2週間', desc: 'スピード納品' },
                { icon: Users, label: '小ロット対応', desc: '50個から製作OK' },
                { icon: Globe, label: '全国配送', desc: '日本全国どこでも' },
                { icon: Shield, label: '品質保証', desc: '検品済みでお届け' },
              ].map(({ icon: Icon, label, desc }) => (
                <div key={label} className="p-6 rounded-2xl bg-muted/50 border border-border text-center">
                  <Icon className="h-8 w-8 mx-auto text-primary" />
                  <p className="mt-3 font-bold text-foreground text-sm">{label}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 代表メッセージ */}
      <section className="py-16 md:py-20 bg-muted/30 border-y border-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-[280px_1fr] gap-12 items-start">
            <div className="text-center md:text-left">
              <div className="w-48 h-48 mx-auto md:mx-0 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-border flex items-center justify-center">
                <Users className="h-20 w-20 text-primary/40" />
              </div>
              <p className="mt-4 font-black text-foreground text-lg">小川 公平</p>
              <p className="text-sm text-muted-foreground">代表取締役</p>
              <p className="text-xs text-muted-foreground mt-1">株式会社SOARA</p>
            </div>
            <div>
              <span className="text-sm font-bold text-primary tracking-widest uppercase">Message</span>
              <h2 className="mt-2 text-2xl md:text-3xl font-black text-foreground">代表メッセージ</h2>
              <div className="mt-6 space-y-4 text-muted-foreground leading-relaxed">
                <p>
                  私自身がイベントでオリジナルグッズを作りたいと思ったとき、
                  「ロットが大きすぎる」「見積もりに時間がかかる」「品質が分からない」
                  という壁に何度もぶつかりました。
                </p>
                <p>
                  その経験から、<strong className="text-foreground">誰でも気軽に、安心してグッズを作れるサービス</strong>を目指して
                  FAST OEMを立ち上げました。
                </p>
                <p>
                  品質管理を徹底した工場パートナーとの連携、
                  分かりやすい料金体系、Webで完結する注文フロー。
                  すべてはお客様の「作りたい」を最短距離で実現するために設計しています。
                </p>
                <p>
                  これからも、クリエイターや企業のものづくりを
                  もっと身近にする存在であり続けます。
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 品質へのこだわり */}
      <section className="py-16 md:py-20 bg-background">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-sm font-bold text-primary tracking-widest uppercase">Quality</span>
            <h2 className="mt-2 text-2xl md:text-3xl font-black text-foreground">品質へのこだわり</h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-8">
            {[
              {
                icon: Award,
                title: '厳選された工場パートナー',
                desc: '長年の実績を持つ工場と直接契約。品質基準を満たした工場のみと提携し、安定した品質をお約束します。',
              },
              {
                icon: Shield,
                title: '全数検品体制',
                desc: 'お届け前にすべての商品を検品。印刷ズレ、色むら、傷などがないか厳しくチェックし、合格品のみを出荷します。',
              },
              {
                icon: Building2,
                title: '万が一の品質保証',
                desc: '製造上の欠陥や注文内容との相違があった場合は、無償で再製作または返金対応いたします。到着後7日以内にご連絡ください。',
              },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="p-8 rounded-2xl border border-border bg-card hover:shadow-lg transition-shadow">
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6">
                  <Icon className="h-7 w-7 text-primary" />
                </div>
                <h3 className="font-bold text-foreground text-lg">{title}</h3>
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 会社情報テーブル */}
      <section className="py-16 md:py-20 bg-muted/30 border-t border-border">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-sm font-bold text-primary tracking-widest uppercase">Company</span>
            <h2 className="mt-2 text-2xl md:text-3xl font-black text-foreground">会社情報</h2>
          </div>
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-border">
                {[
                  ['会社名', '株式会社SOARA'],
                  ['サービス名', 'FAST OEM'],
                  ['代表取締役', '小川 公平'],
                  ['設立', '2024年10月'],
                  ['所在地', '〒221-0056 神奈川県横浜市神奈川区金港町5-14 クアドリフォリオ8階'],
                  ['メール', 'contact@soara-mu.com'],
                  ['事業内容', 'オリジナルグッズのOEM製作・販売プラットフォーム運営 / ガチャガチャ・クレーンゲーム・自販機の無料設置事業'],
                  ['主要取扱商品', 'アクリルキーホルダー / 缶バッジ / ピンバッジ / ラバーキーホルダー'],
                  ['決済方法', 'クレジットカード（VISA / Mastercard / AMEX / JCB）'],
                ].map(([label, value]) => (
                  <tr key={label}>
                    <th className="px-6 py-4 text-left font-bold text-foreground bg-muted/30 w-[160px] whitespace-nowrap">
                      {label}
                    </th>
                    <td className="px-6 py-4 text-muted-foreground">{value}</td>
                  </tr>
                ))}
                <tr>
                  <th className="px-6 py-4 text-left font-bold text-foreground bg-muted/30 w-[160px] whitespace-nowrap">
                    コーポレートサイト
                  </th>
                  <td className="px-6 py-4 text-muted-foreground">
                    <a href="https://soara-mu.jp" target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-primary/80">
                      https://soara-mu.jp
                    </a>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-20 bg-background">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl md:text-3xl font-black text-foreground">
            まずは商品を見てみませんか？
          </h2>
          <p className="mt-4 text-muted-foreground">
            デザインをアップロードするだけで、すぐにお見積もり。小ロット50個（缶バッジは100個）から製作できます。
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/products"
              className="inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground h-14 px-8 rounded-xl font-bold text-lg transition-colors"
            >
              商品一覧を見る
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center gap-2 border-2 border-border hover:border-primary/30 text-foreground h-14 px-8 rounded-xl font-bold text-lg transition-colors"
            >
              お問い合わせ
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
