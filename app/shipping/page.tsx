import { Metadata } from 'next'
import Link from 'next/link'
import { Truck, Clock, MapPin, Package, Zap, Search, ArrowRight } from 'lucide-react'
import { Breadcrumb, breadcrumbJsonLd as bcJsonLdFn } from '@/components/breadcrumb'

const BASE_URL = 'https://fast-oem.soara-mu.jp'

export const metadata: Metadata = {
  title: '配送・納期について | OEMグッズの送料・特急対応',
  description:
    'FAST OEMの配送・納期について。標準納期約1ヶ月・特急約2週間対応。送料は注文数量に応じた料金体系。ヤマト運輸・佐川急便にて発送。',
  openGraph: {
    title: '配送・納期について | FAST OEM',
    description: 'OEMグッズの配送・納期情報。標準約1ヶ月・特急約2週間。数量ベースの送料体系。',
    url: `${BASE_URL}/shipping`,
    images: [{ url: '/opengraph-image.png', width: 1200, height: 630 }],
  },
  alternates: { canonical: `${BASE_URL}/shipping` },
}

const deliveryProducts = [
  { name: 'アクリルキーホルダー', standard: '約1ヶ月', express: '約2週間', expressAvailable: true },
  { name: '缶バッジ', standard: '約1ヶ月', express: '約2週間', expressAvailable: true },
  { name: 'ピンバッジ', standard: '約1ヶ月', express: '約2週間', expressAvailable: true },
  { name: 'ラバーキーホルダー', standard: '約1ヶ月', express: '約2週間', expressAvailable: true },
]

const shippingTiers = [
  { range: '1〜300個', fee: '¥5,000' },
  { range: '301〜500個', fee: '¥8,000' },
  { range: '501〜1,000個', fee: '¥11,000' },
  { range: '1,001〜2,000個', fee: '¥16,000' },
  { range: '2,001〜3,000個', fee: '¥18,000' },
  { range: '3,001〜4,000個', fee: '¥20,000' },
  { range: '4,001個〜', fee: '¥20,000＋1,000個ごとに¥2,000' },
]

export default function ShippingPage() {
  const bcJsonLd = bcJsonLdFn([{ name: '配送について' }])
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(bcJsonLd) }}
      />
    <div className="py-12 md:py-16 bg-background min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <Breadcrumb items={[{ name: '配送について' }]} />

        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#7ed957]/10 rounded-full text-[#7ed957] text-sm font-bold mb-4">
            <Truck className="h-4 w-4" />
            SHIPPING
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-foreground">配送について</h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            受注製造品のため、ご入金確認後に製造・発送いたします。<br className="hidden sm:block" />
            商品・数量・オプションによって納期が異なります。
          </p>
        </div>

        {/* 納期セクション */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
            <span className="w-1.5 h-6 bg-[#00c8c8] rounded-full" />
            商品別 納期の目安
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            ※ 納期はご入金確認後〜発送日までの営業日数です。土日祝・年末年始・工場休業日は含みません。<br />
            ※ 工場の混雑状況により変動する場合があります。
          </p>
          <div className="overflow-x-auto rounded-2xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left px-5 py-3 font-bold text-foreground">商品</th>
                  <th className="px-5 py-3 font-bold text-foreground text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <Clock className="h-4 w-4 text-[#00c8c8]" />
                      標準納期
                    </div>
                  </th>
                  <th className="px-5 py-3 font-bold text-foreground text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <Zap className="h-4 w-4 text-[#ff7b54]" />
                      特急納期
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {deliveryProducts.map((p) => (
                  <tr key={p.name} className="hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-4 font-medium text-foreground">{p.name}</td>
                    <td className="px-5 py-4 text-center text-muted-foreground">{p.standard}</td>
                    <td className="px-5 py-4 text-center">
                      {p.expressAvailable ? (
                        <span className="inline-flex items-center gap-1 text-[#ff7b54] font-medium">
                          <Zap className="h-3.5 w-3.5" />
                          {p.express}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">非対応</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 特急オプション説明 */}
          <div className="mt-4 flex items-start gap-3 p-4 bg-[#ff7b54]/5 border border-[#ff7b54]/20 rounded-xl">
            <Zap className="h-5 w-5 text-[#ff7b54] shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-bold text-foreground">特急オプションについて</p>
              <p className="text-muted-foreground mt-1">
                商品詳細ページで「特急配送」を選択すると、<strong className="text-foreground">送料が2倍</strong>になります。
                デザインデータの確認・修正期間を含むため、ご入稿は迅速にお願いします。
                特急オプションの可否は工場の空き状況により変動する場合があります。
              </p>
            </div>
          </div>
        </section>

        {/* 送料セクション */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
            <span className="w-1.5 h-6 bg-[#ffe135] rounded-full" />
            送料（数量ベース）
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            送料はカート内の全商品の合計数量に応じて決まります。
          </p>
          <div className="overflow-x-auto rounded-2xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left px-5 py-3 font-bold text-foreground">注文数量</th>
                  <th className="px-5 py-3 font-bold text-foreground text-right">送料（税込）</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {shippingTiers.map((t) => (
                  <tr key={t.range} className="hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3 font-medium text-foreground">{t.range}</td>
                    <td className="px-5 py-3 text-right font-bold text-foreground">{t.fee}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-start gap-3 p-4 bg-[#ff7b54]/5 border border-[#ff7b54]/20 rounded-xl">
            <Zap className="h-5 w-5 text-[#ff7b54] shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-bold text-foreground">特急便の送料</p>
              <p className="text-muted-foreground mt-1">
                特急配送を選択した場合、送料は上記の<strong className="text-foreground">2倍</strong>になります。
              </p>
            </div>
          </div>

          <p className="text-xs text-muted-foreground mt-3">
            ※ 海外への配送は現在対応しておりません。
          </p>
        </section>

        {/* 配送業者・方法 */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
            <span className="w-1.5 h-6 bg-[#ff7b54] rounded-full" />
            配送業者・方法
          </h2>
          <div className="p-5 bg-card border border-border rounded-2xl">
            <div className="flex items-start gap-3">
              <Truck className="h-5 w-5 text-[#ff7b54] shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-bold text-foreground mb-1">ヤマト運輸・佐川急便（工場による）</p>
                <p className="text-muted-foreground leading-relaxed">
                  配送業者は工場・商品によって異なります。発送完了時にお送りするメールに追跡番号を記載しています。
                  追跡番号を使って各配送業者のウェブサイトから配送状況をご確認いただけます。
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 注文状況の確認 */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
            <span className="w-1.5 h-6 bg-[#a78bfa] rounded-full" />
            注文状況の確認方法
          </h2>
          <div className="space-y-3">
            <div className="flex items-start gap-4 p-4 bg-card border border-border rounded-xl">
              <div className="w-8 h-8 rounded-full bg-[#a78bfa]/10 text-[#a78bfa] font-black text-sm flex items-center justify-center shrink-0">1</div>
              <div className="text-sm">
                <p className="font-bold text-foreground">注文確認メールを確認</p>
                <p className="text-muted-foreground">ご注文完了後、ご登録のメールアドレスに注文確認メールをお送りします。</p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-4 bg-card border border-border rounded-xl">
              <div className="w-8 h-8 rounded-full bg-[#a78bfa]/10 text-[#a78bfa] font-black text-sm flex items-center justify-center shrink-0">2</div>
              <div className="text-sm">
                <p className="font-bold text-foreground">専用URLから注文状況を確認</p>
                <p className="text-muted-foreground">
                  メール内の「注文状況を確認する」リンクから、製造・発送状況をいつでも確認できます。
                  ログイン不要・24時間アクセス可能です。
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-4 bg-card border border-border rounded-xl">
              <div className="w-8 h-8 rounded-full bg-[#a78bfa]/10 text-[#a78bfa] font-black text-sm flex items-center justify-center shrink-0">3</div>
              <div className="text-sm">
                <p className="font-bold text-foreground">発送時に追跡番号をお知らせ</p>
                <p className="text-muted-foreground">
                  商品が発送されると、追跡番号をメールでお知らせします。
                  複数商品のご注文の場合、工場ごとに個別発送・個別通知となります。
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-start gap-3 p-4 bg-[#ffe135]/10 border border-[#ffe135]/30 rounded-xl">
            <Search className="h-5 w-5 text-foreground/60 shrink-0 mt-0.5" />
            <p className="text-sm text-foreground/80">
              <span className="font-bold">URLを紛失した場合：</span>
              ご注文完了メールを再確認いただくか、注文番号とメールアドレスを添えて
              <a href="mailto:contact@soara-mu.com" className="text-[#00c8c8] font-bold hover:underline ml-1">contact@soara-mu.com</a>
              までお問い合わせください。
            </p>
          </div>
        </section>

        {/* 受け取り・不在時 */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
            <span className="w-1.5 h-6 bg-[#00c8c8] rounded-full" />
            受け取りについて
          </h2>
          <div className="p-5 bg-card border border-border rounded-2xl text-sm text-muted-foreground leading-relaxed space-y-2">
            <p>不在の場合は各配送業者の不在票に従って再配達をご手配ください。</p>
            <p>お届け先の変更は発送前までにお申し出ください。発送後の変更は配送業者への直接ご連絡が必要です。</p>
            <p>商品到着後は、速やかに数量・品質をご確認ください。<strong className="text-foreground">品質不良・数量不足は到着後7日以内にご連絡ください。</strong></p>
          </div>
        </section>

        {/* CTA */}
        <div className="mt-12 text-center">
          <div className="inline-block p-8 bg-gradient-to-br from-[#00c8c8]/5 to-[#00c8c8]/10 rounded-3xl border border-[#00c8c8]/20">
            <Package className="h-10 w-10 text-[#00c8c8] mx-auto mb-4" />
            <h3 className="text-xl font-bold text-foreground mb-2">ご不明な点はお気軽に</h3>
            <p className="text-muted-foreground text-sm mb-6">
              納期・配送に関するご質問はお問い合わせください
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/contact"
                className="inline-flex items-center justify-center h-11 px-6 rounded-xl bg-[#00c8c8] hover:bg-[#00c8c8]/90 text-white font-bold transition-colors"
              >
                お問い合わせ
              </Link>
              <Link
                href="/faq"
                className="inline-flex items-center justify-center h-11 px-6 rounded-xl border border-border hover:bg-muted transition-colors font-medium text-foreground"
              >
                よくある質問
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
