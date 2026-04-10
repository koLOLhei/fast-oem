import { Metadata } from 'next'
import Link from 'next/link'
import { Mail, Clock, MessageCircle, ArrowRight, HelpCircle, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Breadcrumb, breadcrumbJsonLd as bcJsonLdFn } from '@/components/breadcrumb'

const BASE_URL = 'https://fast-oem.soara-mu.jp'

export const metadata: Metadata = {
  title: 'お問い合わせ | OEMグッズ製作のご相談・お見積もり',
  description:
    'FAST OEMへのお問い合わせ。注文・デザインデータ・納期・返品など、OEMグッズ製作に関するご不明な点はメールにてお気軽にお問い合わせください。平日10:00〜18:00対応。',
  keywords: ['OEM お問い合わせ', 'グッズ製作 相談', 'グッズ製作 見積もり', 'OEM 問い合わせ'],
  alternates: { canonical: `${BASE_URL}/contact` },
}

const topics = [
  { icon: Package, label: '注文・見積もりについて', example: '数量・料金の確認、大口見積もりのご依頼' },
  { icon: MessageCircle, label: 'デザインデータについて', example: 'ファイル形式・解像度・入稿方法のご相談' },
  { icon: Clock, label: '納期・配送について', example: '特急対応のご相談、配送先の変更' },
  { icon: HelpCircle, label: 'その他のお問い合わせ', example: '商品の品質不良、ご注文後の変更など' },
]

export default function ContactPage() {
  const bcJsonLd = bcJsonLdFn([{ name: 'お問い合わせ' }])
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(bcJsonLd) }}
      />
    <div className="py-12 md:py-16 bg-background min-h-screen">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <Breadcrumb items={[{ name: 'お問い合わせ' }]} />

        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#00c8c8]/10 rounded-full text-[#00c8c8] text-sm font-bold mb-4">
            <Mail className="h-4 w-4" />
            CONTACT
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-foreground">お問い合わせ</h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-xl mx-auto">
            ご不明な点・ご要望はメールにてお気軽にどうぞ。<br className="hidden sm:block" />
            担当者より順次ご返信いたします。
          </p>
        </div>

        {/* Main contact card */}
        <div className="bg-gradient-to-br from-[#00c8c8] to-[#0099a0] rounded-3xl p-8 md:p-10 text-white shadow-xl mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Mail className="h-6 w-6" />
            <span className="text-sm font-bold opacity-80">メールアドレス</span>
          </div>
          <a
            href="mailto:contact@soara-mu.com"
            className="text-2xl md:text-3xl font-black hover:underline break-all"
          >
            contact@soara-mu.com
          </a>

          <div className="mt-6 pt-6 border-t border-white/20 grid sm:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 mt-0.5 opacity-70 shrink-0" />
              <div>
                <p className="font-bold text-sm">受付時間</p>
                <p className="text-sm opacity-80">平日 10:00〜18:00</p>
                <p className="text-xs opacity-60">土日祝・年末年始を除く</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MessageCircle className="h-5 w-5 mt-0.5 opacity-70 shrink-0" />
              <div>
                <p className="font-bold text-sm">返信目安</p>
                <p className="text-sm opacity-80">2〜3営業日以内</p>
                <p className="text-xs opacity-60">お急ぎの場合はその旨をご記載ください</p>
              </div>
            </div>
          </div>

          <a
            href="mailto:contact@soara-mu.com"
            className="mt-6 inline-flex items-center gap-2 bg-white text-[#00c8c8] font-bold px-6 py-3 rounded-xl hover:bg-white/90 transition-colors shadow"
          >
            <Mail className="h-4 w-4" />
            メールを送る
          </a>
        </div>

        {/* お問い合わせ内容の例 */}
        <div className="bg-card border border-border rounded-2xl p-6 mb-8">
          <h2 className="font-bold text-lg text-foreground mb-4">よくあるお問い合わせ内容</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {topics.map((t) => (
              <div key={t.label} className="flex items-start gap-3 p-3 rounded-xl bg-muted/50">
                <div className="w-8 h-8 rounded-lg bg-[#00c8c8]/10 flex items-center justify-center shrink-0">
                  <t.icon className="h-4 w-4 text-[#00c8c8]" />
                </div>
                <div>
                  <p className="font-medium text-sm text-foreground">{t.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{t.example}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* お問い合わせ時に記載いただくと便利な情報 */}
        <div className="bg-[#ffe135]/10 border border-[#ffe135]/30 rounded-2xl p-6 mb-8">
          <h2 className="font-bold text-foreground mb-3">
            ✉️ メール送信時にご記載いただくと、よりスムーズにご対応できます
          </h2>
          <ul className="text-sm text-foreground/80 space-y-1.5 list-disc list-inside">
            <li>注文番号（お持ちの場合）</li>
            <li>ご希望の商品名・数量</li>
            <li>お急ぎの場合は希望納期</li>
            <li>デザインに関する場合はファイル形式・サイズ等</li>
          </ul>
        </div>

        {/* FAQ誘導 */}
        <div className="text-center">
          <p className="text-muted-foreground text-sm mb-4">
            よくある質問はこちらで解決できる場合があります
          </p>
          <Button asChild variant="outline" className="rounded-xl h-11">
            <Link href="/faq">
              よくある質問（FAQ）を見る
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
    </>
  )
}
