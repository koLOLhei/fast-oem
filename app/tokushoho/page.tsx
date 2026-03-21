import { Metadata } from 'next'
import Link from 'next/link'

const BASE_URL = 'https://fast-oem.soara-mu.jp'

export const metadata: Metadata = {
  title: '特定商取引法に基づく表記 | FAST OEM',
  description: 'FAST OEMの特定商取引法に基づく表記。販売業者・運営責任者・所在地・連絡先・販売価格・支払方法・引渡時期・返品ポリシーなど。',
  alternates: { canonical: `${BASE_URL}/tokushoho` },
}

const items = [
  { label: '販売業者', value: '株式会社SOARA' },
  { label: '運営責任者', value: '小川 公平' },
  { label: '所在地', value: '〒221-0056 神奈川県横浜市神奈川区金港町５－１４ クアドリフォリオ８階' },
  { label: '電話番号', value: 'お問い合わせはメールにてお願いします（電話での対応は行っておりません）' },
  { label: 'メールアドレス', value: 'contact@soara-mu.com' },
  { label: 'ウェブサイト', value: BASE_URL },
  {
    label: '販売価格',
    value: '各商品ページに表示された価格（税込）。価格は数量・オプション・特急料金により変動します。',
  },
  {
    label: '商品代金以外の必要料金',
    value: '送料：通常地域は無料。離島・沖縄・一部遠隔地は別途送料が発生します（チェックアウト時に表示）。型代：ラバーキーホルダー・ピンバッジなど一部商品の初回注文時に発生します。',
  },
  {
    label: '支払方法',
    value: 'クレジットカード（VISA・Mastercard・American Express・JCB）。Stripe社の決済システムを使用しております。',
  },
  { label: '支払時期', value: 'ご注文時（クレジットカード即時決済）' },
  {
    label: '商品の引渡時期',
    value: 'ご入金確認後、60営業日以内（商品・数量・オプションにより異なります）。通常は14〜30営業日程度での発送を予定しておりますが、大量注文・複雑なデザイン・工場の混雑状況・輸送上のトラブル・天候・その他やむを得ない事情により前後する場合があります。特急オプション選択時も同様に、上記の事情により納期が変動する場合があります。納期に関する最新情報はご注文後にお送りするメール、または注文状況確認ページよりご確認ください。',
  },
  {
    label: '返品・キャンセルについて',
    value: '受注製造品のため、お客様都合によるキャンセル・返品・返金は決済完了後はお受けできません。商品の品質不良・数量不足など弊社に起因する問題が発生した場合は、商品到着後7日以内にご連絡いただければ再製作または返金にて対応いたします。',
  },
  {
    label: '動作環境',
    value: 'Google Chrome・Safari・Firefox・Edge の最新バージョンを推奨します。',
  },
]

const breadcrumbJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'トップ', item: 'https://fast-oem.soara-mu.jp' },
    { '@type': 'ListItem', position: 2, name: '特定商取引法に基づく表記', item: 'https://fast-oem.soara-mu.jp/tokushoho' },
  ],
}

export default function TokushohoPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
    <div className="py-12 md:py-16 bg-background min-h-screen">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-8" aria-label="パンくずリスト">
          <Link href="/" className="hover:text-foreground transition-colors">トップ</Link>
          <span>/</span>
          <span className="text-foreground font-medium">特定商取引法に基づく表記</span>
        </nav>

        <h1 className="text-2xl md:text-3xl font-black text-foreground mb-2">
          特定商取引法に基づく表記
        </h1>
        <p className="text-sm text-muted-foreground mb-10">
          特定商取引に関する法律第11条に基づき、以下の通り表示します。
        </p>

        <div className="border border-border rounded-2xl overflow-hidden">
          {items.map((item, i) => (
            <div
              key={item.label}
              className={`grid sm:grid-cols-[180px_1fr] gap-2 sm:gap-0 px-5 py-4 ${
                i !== items.length - 1 ? 'border-b border-border' : ''
              } ${i % 2 === 0 ? 'bg-muted/30' : 'bg-background'}`}
            >
              <dt className="text-sm font-bold text-foreground sm:pr-4 sm:border-r sm:border-border">
                {item.label}
              </dt>
              <dd className="text-sm text-muted-foreground leading-relaxed sm:pl-5">
                {item.value}
              </dd>
            </div>
          ))}
        </div>

        <p className="text-xs text-muted-foreground mt-8 text-center">
          ご不明な点は <a href="mailto:contact@soara-mu.com" className="text-[#00c8c8] hover:underline">contact@soara-mu.com</a> までお問い合わせください。
        </p>
      </div>
    </div>
    </>
  )
}
