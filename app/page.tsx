import type { Metadata } from 'next'
import Image from 'next/image'
import {
  ArrowDown,
  ArrowRight,
  Award,
  Building2,
  CalendarRange,
  Check,
  CircleCheck,
  CircleX,
  Clock,
  Factory,
  Gamepad2,
  Gift,
  Handshake,
  Layers,
  Mail,
  Megaphone,
  Package,
  PackageX,
  Plus,
  RefreshCcw,
  Repeat,
  Sparkles,
  Store,
  TrendingUp,
  Truck,
  Warehouse,
} from 'lucide-react'
import { JsonLd } from '@/components/json-ld'
import { CostDiagram } from '@/components/lp/cost-diagram'
import { MobileCta } from '@/components/lp/mobile-cta'
import { Phrase } from '@/components/lp/phrase'
import { PlanCard } from '@/components/lp/plan-card'
import { QuoteForm } from '@/components/lp/quote-form'
import { SectionHeading } from '@/components/lp/section-heading'
import { btnAccent, btnPrimary, container } from '@/components/lp/styles'
import {
  BUSINESS_HOURS,
  COMPANY,
  CONTACT_EMAIL,
  FAQS,
  PRODUCTS,
  REPLY_LEAD_TIME,
  SITE_LAST_UPDATED,
  SITE_NAME,
  SITE_TAGLINE,
  SITE_URL,
} from '@/lib/site'

const TITLE = `定期発注でオリジナルグッズを格安OEM製作｜${SITE_NAME}`
const DESCRIPTION =
  'くり返し発注があるオリジナルグッズに限定し、年間の発注見込みをもとにした定期発注価格でOEM製作。アクリルキーホルダー・缶バッジ・ピンバッジ・ラバーキーホルダーに対応し、型代は初回のみ。ガチャ景品や継続ノベルティのコストを下げたい方へ。見積もり無料。'
const SHARE_TITLE = 'くり返し作るオリジナルグッズを、定期発注でぐっと安く｜FAST OEM'
const SHARE_DESCRIPTION =
  '定期的に発注がある商品に限定したオリジナルグッズOEM。年間の発注見込みで単価を設計し、型代は初回のみ。見積もり無料。'

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'ja_JP',
    url: '/',
    siteName: SITE_NAME,
    title: SHARE_TITLE,
    description: SHARE_DESCRIPTION,
  },
  twitter: {
    card: 'summary_large_image',
    title: SHARE_TITLE,
    description: SHARE_DESCRIPTION,
    images: ['/opengraph-image.jpg'],
  },
}

/* ── コンテンツ ─────────────────────────────────────────────── */

const HERO_POINTS = [
  '年間の発注見込みをもとに単価を設計',
  '型代・版代は初回のみ。2回目からは同じ仕様で再生産',
  '発注スケジュールに合わせた計画生産で、欠品を防ぐ',
]

// PCでは「大1枚＋小2枚」のタイル配置（重なりなし）。ピンバッジはスマホの4枚並びでだけ表示
const HERO_TILE: Record<string, { className: string; sizes: string }> = {
  'acrylic-keychain': { className: 'lg:col-span-2 lg:row-span-2', sizes: '(min-width: 1024px) 320px, 25vw' },
  'can-badge': { className: '', sizes: '(min-width: 1024px) 160px, 25vw' },
  'pin-badge': { className: 'lg:hidden', sizes: '25vw' },
  'rubber-keychain': { className: '', sizes: '(min-width: 1024px) 160px, 25vw' },
}

const FACTS = [
  { icon: Package, label: '対応グッズ', value: 'アクリル・缶バッジ・ピンバッジ・ラバー' },
  { icon: Layers, label: '型代', value: '初回のみ（継続中は型を保管）' },
  { icon: Truck, label: '納品', value: '日本全国へお届け' },
  { icon: Building2, label: '運営', value: '株式会社SOARA（東京・横浜）' },
]

const PAINS = [
  {
    icon: RefreshCcw,
    title: '発注のたびに、見積もり・入稿・校正をやり直している',
    body: '同じ商品なのに、毎回ゼロからやり取りが発生していませんか。',
  },
  {
    icon: TrendingUp,
    title: '数量が少ない回は、単価が割高になる',
    body: '1回ごとの数量で単価が決まるため、数量が少ない月ほど高くつきます。',
  },
  {
    icon: PackageX,
    title: '追加発注が間に合わず、欠品してしまった',
    body: '景品や販売在庫の補充が遅れると、そのまま売上の機会損失につながります。',
  },
  {
    icon: Warehouse,
    title: '単価を下げるために、在庫を抱えすぎている',
    body: 'まとめて発注すれば安くなる代わりに、保管場所と在庫リスクが増えていきます。',
  },
]

const REASONS = [
  {
    icon: CalendarRange,
    title: '年間の見込み数量で、単価を決める',
    body: '1回ごとの数量ではなく、年間を通した発注の見込みをもとに単価を設計します。1回あたりは少なめでも、まとまった数量として扱えます。',
  },
  {
    icon: Factory,
    title: '工場の生産計画に組み込める',
    body: '発注の時期と数量が前もってわかるので、工場は生産枠を計画的に確保できます。急ぎの割増や段取り替えのムダが減り、その分を単価に反映します。',
  },
  {
    icon: Layers,
    title: '型・版・仕様は「使い回し」',
    body: '金型や印刷データ、仕様書は初回に確定すれば、2回目以降はそのまま再生産。毎回の初期費用や校正のやり取りがかかりません。',
  },
  {
    icon: Handshake,
    title: '工場と直接、材料もまとめて',
    body: '提携工場と直接やり取りして、中間コストを抑えます。継続する数量を前提に、材料もまとめて手配できます。',
  },
]

const COMPARE_ROWS = [
  { label: '単価の決まり方', spot: '1回ごとの数量で決まる', recurring: '年間の発注見込みで設計' },
  { label: '型代・版代', spot: '仕様の変更や型の保管切れで、再び発生することも', recurring: '初回のみ。継続中は型を保管' },
  { label: '見積もり・入稿', spot: '毎回やり取りが必要', recurring: '2回目からは数量と納期の連絡だけ' },
  { label: '納期', spot: '工場の空き状況しだい', recurring: 'スケジュールに合わせて計画生産' },
  { label: '品質', spot: '回ごとに差が出ることも', recurring: '同じ仕様書・同じ工場で安定' },
  { label: '在庫', spot: '安くするには、まとめて大量に', recurring: '必要な分を、必要な時期に' },
]

const USE_CASES = [
  {
    icon: Gift,
    title: 'ガチャガチャ（カプセルトイ）の景品',
    body: '補充のたびに同じ商品を発注するなら、定期発注の効果がもっとも大きい用途です。',
  },
  {
    icon: Gamepad2,
    title: 'クレーンゲーム・アミューズメント景品',
    body: '景品の入れ替えサイクルに合わせて、計画的に生産・納品します。',
  },
  {
    icon: Store,
    title: '店頭・ECで売れ続ける定番グッズ',
    body: 'ご当地グッズや観光土産、ショップのオリジナル商品の再生産に。',
  },
  {
    icon: Megaphone,
    title: '継続して配るノベルティ・販促品',
    body: '来店特典や入会特典、定期キャンペーンなど、毎月使う販促品に。',
  },
  {
    icon: Sparkles,
    title: 'キャラクター・IPグッズの定番品',
    body: 'シリーズの定番アイテムを、同じ品質で作り続けたいときに。',
  },
  {
    icon: Award,
    title: '社章・記念品',
    body: '入社・周年・表彰など、毎年決まった時期に必要になるピンバッジに。',
  },
]

const CONDITIONS_OK = [
  '同じ商品（同一仕様）を、継続して発注いただけること（目安：年に複数回）',
  '初回に仕様（サイズ・素材・形状）を確定し、2回目以降は同じ仕様で生産すること',
  '発注の頻度と、1回あたりの数量の見込みを共有いただけること',
]

const CONDITIONS_NG = [
  { text: '単発・1回限りのご注文' },
  { text: 'Webサイトからの直接注文（カート・決済）', note: '現在、受付を停止しています' },
]

const FLOW = [
  { title: 'お問い合わせ', body: 'フォームから、作りたいグッズと発注の頻度・数量の見込みをお知らせください。' },
  { title: 'ヒアリング・お見積もり', body: '仕様と発注スケジュールを確認し、定期発注の単価をご提案します。' },
  { title: '仕様の確定・サンプル確認', body: '仕様書を作成し、必要に応じてサンプルで仕上がりを確認します。' },
  { title: '初回の生産・納品', body: '確定した仕様で生産し、ご指定の場所へ納品します。' },
  { title: '定期生産', body: '以降はスケジュールに沿って同じ仕様で生産。数量の増減もご相談いただけます。' },
]

const QUOTE_TIPS = [
  '現在の仕入れ単価（比較のため）',
  '既存品の写真や仕様（サイズ・素材など）',
  '初回の希望納期と、その後の発注予定',
]

const COMPANY_ROWS: [string, React.ReactNode][] = [
  ['会社名', COMPANY.name],
  ['サービス名', SITE_NAME],
  ['設立', COMPANY.founded],
  ['拠点', COMPANY.locations],
  [
    '事業内容',
    <ul key="business" className="space-y-1">
      {COMPANY.business.map((b) => (
        <li key={b}>
          <Phrase>{b}</Phrase>
        </li>
      ))}
    </ul>,
  ],
  [
    'お問い合わせ',
    <a key="mail" href={`mailto:${CONTACT_EMAIL}`} className="text-primary underline underline-offset-4">
      {CONTACT_EMAIL}
    </a>,
  ],
  ['受付時間', <Phrase key="hours">{BUSINESS_HOURS}</Phrase>],
  [
    'コーポレートサイト',
    <a key="corp" href={COMPANY.url} target="_blank" rel="noopener" className="text-primary underline underline-offset-4">
      {COMPANY.url.replace('https://', '')}
    </a>,
  ],
]

/* ── 構造化データ ───────────────────────────────────────────── */

// 運営会社はコーポレートサイト（soara-mu.jp）と同じ実体として記述し、FAST OEM はそのブランドとして扱う。
// 会社名・URL・ロゴをコーポレートサイトの構造化データと揃えることで、別会社と誤認されないようにする。
const ORG_ID = `${COMPANY.url}/#organization`
const BRAND_ID = `${SITE_URL}/#brand`
const SERVICE_ID = `${SITE_URL}/#service`

const jsonLd = [
  {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': ORG_ID,
    name: COMPANY.name,
    url: COMPANY.url,
    logo: COMPANY.logo,
    email: CONTACT_EMAIL,
    foundingDate: COMPANY.foundingDate,
    contactPoint: {
      '@type': 'ContactPoint',
      name: `${SITE_NAME} お見積もり窓口`,
      contactType: 'sales',
      email: CONTACT_EMAIL,
      availableLanguage: 'ja',
      areaServed: 'JP',
      hoursAvailable: {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        opens: '10:00',
        closes: '18:00',
      },
    },
    brand: { '@id': BRAND_ID },
  },
  {
    '@context': 'https://schema.org',
    '@type': 'Brand',
    '@id': BRAND_ID,
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/icon.png`,
    slogan: SITE_TAGLINE,
  },
  {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    url: SITE_URL,
    name: SITE_NAME,
    inLanguage: 'ja',
    publisher: { '@id': ORG_ID },
  },
  {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${SITE_URL}/#webpage`,
    url: SITE_URL,
    name: TITLE,
    description: DESCRIPTION,
    inLanguage: 'ja',
    isPartOf: { '@id': `${SITE_URL}/#website` },
    about: { '@id': SERVICE_ID },
    primaryImageOfPage: { '@type': 'ImageObject', url: `${SITE_URL}/opengraph-image.jpg`, width: 1200, height: 630 },
    dateModified: SITE_LAST_UPDATED,
  },
  {
    '@context': 'https://schema.org',
    '@type': 'Service',
    '@id': SERVICE_ID,
    name: 'FAST OEM 定期発注プラン',
    serviceType: 'オリジナルグッズのOEM製作（定期発注）',
    description:
      '定期的に発注があるオリジナルグッズに限定し、年間の発注見込みをもとに単価を設計するOEM製作サービス。型代は初回のみ。',
    provider: { '@id': ORG_ID },
    brand: { '@id': BRAND_ID },
    areaServed: { '@type': 'Country', name: 'JP' },
    audience: {
      '@type': 'BusinessAudience',
      audienceType: '同じオリジナルグッズを継続して発注する法人・個人事業主',
    },
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: '定期発注に対応しているグッズ',
      itemListElement: PRODUCTS.map((p) => ({
        '@type': 'Offer',
        itemOffered: {
          '@type': 'Service',
          name: `${p.name}のOEM製作（定期発注）`,
          description: p.description,
          image: `${SITE_URL}${p.image}`,
        },
      })),
    },
  },
  {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': `${SITE_URL}/#faq`,
    mainEntity: FAQS.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  },
]

/* ── ページ ────────────────────────────────────────────────── */

export default function HomePage() {
  return (
    <>
      <JsonLd data={jsonLd} />

      {/* ── Hero ───────────────────────────────────────────── */}
      <section
        id="hero"
        aria-labelledby="hero-title"
        className="relative overflow-hidden border-b border-border bg-gradient-to-b from-secondary via-background to-background"
      >
        <div
          className="pointer-events-none absolute inset-0 bg-dotgrid opacity-60 [mask-image:linear-gradient(to_bottom,black_30%,transparent)]"
          aria-hidden="true"
        />
        <div className={`${container} relative grid gap-12 py-12 sm:py-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-14 lg:py-20`}>
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-1.5 text-xs font-bold text-primary shadow-card ring-1 ring-primary/15">
              <Repeat className="h-3.5 w-3.5" aria-hidden="true" />
              定期発注専用のオリジナルグッズOEM
            </p>

            <h1 id="hero-title" className="mt-6 font-black tracking-tight text-foreground">
              <span className="block text-lg leading-snug sm:text-2xl lg:text-[1.65rem]">
                <Phrase>くり返し作るオリジナルグッズを、</Phrase>
              </span>
              <span className="mt-1 block text-[2.7rem] leading-[1.22] sm:text-6xl lg:text-[4.2rem]">
                定期発注で
                <br />
                <span className="marker">ぐっと安く。</span>
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-base leading-[1.9] text-muted-foreground sm:text-lg">
              FAST OEM は、定期的に発注がある商品だけを承るオリジナルグッズのOEMサービスです。発注の時期と数量が見込めるぶん工場の生産計画に組み込めるので、単発の発注よりも単価を下げてお作りできます。
            </p>

            <ul className="mt-6 space-y-2.5">
              {HERO_POINTS.map((point) => (
                <li key={point} className="flex items-start gap-2.5 text-[15px] font-bold leading-relaxed text-foreground">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-white">
                    <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" />
                  </span>
                  <Phrase>{point}</Phrase>
                </li>
              ))}
            </ul>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
              <a href="#contact" className={`${btnPrimary} h-14`}>
                無料で見積もりを依頼する
                <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </a>
              <a
                href="#reasons"
                className="inline-flex h-14 items-center justify-center gap-1.5 rounded-xl px-5 text-base font-bold text-foreground/80 transition-colors hover:bg-white hover:text-primary"
              >
                安くなる理由を見る
                <ArrowDown className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              いまの仕入れ単価と比べてみてください。比べやすい形でお見積もりします。
            </p>
          </div>

          <div className="relative mx-auto w-full max-w-md lg:max-w-none">
            {/* 写真とカードは重ねない。スマホは写真4枚を横並び、PCは大1枚＋小2枚のタイル。その下にカード */}
            <div className="grid grid-cols-4 gap-2 sm:gap-3 lg:grid-cols-3 lg:gap-3">
              {PRODUCTS.map((p, i) => (
                <div
                  key={p.slug}
                  className={`relative aspect-square overflow-hidden rounded-xl bg-muted shadow-card ring-1 ring-border lg:rounded-2xl ${HERO_TILE[p.slug]?.className ?? ''}`}
                >
                  <Image
                    src={p.image}
                    alt={p.alt}
                    fill
                    sizes={HERO_TILE[p.slug]?.sizes ?? '25vw'}
                    loading={i === 0 ? 'eager' : 'lazy'}
                    fetchPriority={i === 0 ? 'high' : undefined}
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
            <PlanCard className="mt-4 lg:mt-3" />
          </div>
        </div>
      </section>

      {/* ── 概要 ──────────────────────────────────────────── */}
      <section aria-label="サービスの概要" className="border-b border-border bg-background">
        <ul className={`${container} grid grid-cols-1 gap-5 py-8 min-[480px]:grid-cols-2 xl:flex xl:justify-between`}>
          {FACTS.map((f) => (
            <li key={f.label} className="flex items-center gap-3.5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
                <f.icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <p>
                <span className="block text-xs font-bold text-muted-foreground">{f.label}</span>
                <span className="mt-0.5 block text-sm font-bold leading-snug text-foreground">
                  <Phrase>{f.value}</Phrase>
                </span>
              </p>
            </li>
          ))}
        </ul>
      </section>

      {/* ── 課題 ──────────────────────────────────────────── */}
      <section aria-labelledby="problem-title" className="py-20 sm:py-24">
        <div className={container}>
          <SectionHeading
            id="problem-title"
            eyebrow="PROBLEM"
            title="同じグッズを、毎回「単発」で発注していませんか？"
          />
          <ul className="mx-auto mt-12 grid max-w-5xl gap-4 md:grid-cols-2">
            {PAINS.map((p) => (
              <li key={p.title} className="flex items-start gap-4 rounded-2xl bg-card p-6 shadow-card ring-1 ring-border">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
                  <p.icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <h3 className="font-bold leading-snug text-foreground">
                    <Phrase>{p.title}</Phrase>
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {p.body}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-12 flex flex-col items-center text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white shadow-brand">
              <ArrowDown className="h-6 w-6" aria-hidden="true" />
            </span>
            <p className="mt-5 text-xl font-black leading-relaxed tracking-tight text-foreground sm:text-3xl">
              <Phrase>くり返し発注する商品なら、</Phrase>
              <wbr />
              <span className="text-primary">
                <Phrase>定期発注</Phrase>
              </span>
              <Phrase>にまとめて解決。</Phrase>
            </p>
          </div>
        </div>
      </section>

      {/* ── 安くなる理由 ─────────────────────────────────────── */}
      <section id="reasons" aria-labelledby="reasons-title" className="border-y border-border bg-muted py-20 sm:py-24">
        <div className={container}>
          <SectionHeading
            id="reasons-title"
            eyebrow="REASONS"
            title="定期発注だと安くなる、4つの理由"
            lead="値引きではなく、「つくり方」を変えることで単価を下げます。"
          />
          <ol className="mt-12 grid gap-5 md:grid-cols-2">
            {REASONS.map((r, i) => (
              <li key={r.title} className="relative rounded-2xl bg-card p-6 shadow-card ring-1 ring-border sm:p-8">
                <div className="flex items-center justify-between">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-white shadow-brand">
                    <r.icon className="h-6 w-6" aria-hidden="true" />
                  </span>
                  <span
                    aria-hidden="true"
                    data-num={String(i + 1).padStart(2, '0')}
                    className="text-4xl font-black tabular-nums leading-none text-border after:content-[attr(data-num)]"
                  />
                </div>
                <h3 className="mt-5 text-lg font-black leading-snug tracking-tight text-foreground sm:text-xl">
                  <Phrase>{r.title}</Phrase>
                </h3>
                <p className="mt-2.5 text-[15px] leading-[1.85] text-muted-foreground">
                  {r.body}
                </p>
              </li>
            ))}
          </ol>
          <div className="mt-10">
            <CostDiagram />
          </div>
        </div>
      </section>

      {/* ── 比較 ──────────────────────────────────────────── */}
      <section id="compare" aria-labelledby="compare-title" className="py-20 sm:py-24">
        <div className={container}>
          <SectionHeading
            id="compare-title"
            eyebrow="COMPARE"
            title="単発の発注と、定期発注の違い"
          />
          {/* スマホでは各行を「見出し（全幅）＋ 2列」に組み替える */}
          <div className="mx-auto mt-12 max-w-4xl overflow-hidden rounded-2xl shadow-card ring-1 ring-border">
            <table className="w-full border-collapse bg-card text-left text-[13px] max-sm:block sm:table-fixed sm:text-[15px]">
              <caption className="sr-only">単発で発注する場合と、FAST OEMの定期発注の比較</caption>
              <colgroup className="max-sm:hidden">
                <col className="w-[24%]" />
                <col />
                <col />
              </colgroup>
              <thead className="max-sm:block">
                <tr className="max-sm:grid max-sm:grid-cols-2">
                  <td className="bg-muted max-sm:hidden" />
                  <th scope="col" className="bg-muted px-3 py-3.5 text-center font-bold text-muted-foreground sm:px-5 sm:py-4">
                    単発で発注
                  </th>
                  <th scope="col" className="bg-primary px-3 py-3.5 text-center font-bold text-primary-foreground sm:px-5 sm:py-4">
                    定期発注<span className="text-[11px] font-semibold sm:text-xs">（FAST OEM）</span>
                  </th>
                </tr>
              </thead>
              <tbody className="max-sm:block">
                {COMPARE_ROWS.map((row) => (
                  <tr key={row.label} className="border-t border-border max-sm:grid max-sm:grid-cols-2">
                    <th
                      scope="row"
                      className="bg-muted/60 px-3 py-4 align-top font-bold text-foreground max-sm:col-span-2 max-sm:py-2 sm:px-5"
                    >
                      <Phrase>{row.label}</Phrase>
                    </th>
                    <td className="px-3 py-4 align-top leading-relaxed text-muted-foreground sm:px-5">
                      <Phrase>{row.spot}</Phrase>
                    </td>
                    <td className="bg-secondary/60 px-3 py-4 align-top font-bold leading-relaxed text-secondary-foreground sm:px-5">
                      <span className="flex items-start gap-1.5">
                        <CircleCheck className="mt-0.5 hidden h-4 w-4 shrink-0 text-primary sm:block" aria-hidden="true" />
                        <Phrase>{row.recurring}</Phrase>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────── */}
      <section aria-label="お見積もりのご案内" className="relative overflow-hidden bg-brand-gradient py-14 text-white sm:py-16">
        <div className="pointer-events-none absolute inset-0 bg-dotgrid opacity-15" aria-hidden="true" />
        <div className={`${container} relative flex flex-col items-start gap-7 md:flex-row md:items-center md:justify-between`}>
          <div>
            <p className="text-[1.4rem] font-black leading-snug tracking-tight sm:text-3xl">
              <Phrase>いまの単価と、定期発注の単価を比べてみませんか。</Phrase>
            </p>
            <p className="mt-3 text-sm leading-relaxed text-white/80 sm:text-base">
              現在の仕入れ単価をお知らせいただければ、比較しやすい形でお見積もりします。見積もりは無料です。
            </p>
          </div>
          <a href="#contact" className={`${btnAccent} h-14 shrink-0`}>
            無料で見積もりを依頼する
            <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </a>
        </div>
      </section>

      {/* ── 対応グッズ ─────────────────────────────────────── */}
      <section id="products" aria-labelledby="products-title" className="py-20 sm:py-24">
        <div className={container}>
          <SectionHeading
            id="products-title"
            eyebrow="PRODUCTS"
            title="定期発注に対応しているグッズ"
            lead="どれも、同じ仕様でくり返し生産しやすいグッズです。"
          />
          <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {PRODUCTS.map((p) => (
              <li key={p.slug} className="flex flex-col overflow-hidden rounded-2xl bg-card shadow-card ring-1 ring-border">
                <div className="relative aspect-[4/3] bg-muted">
                  <Image
                    src={p.image}
                    alt={p.alt}
                    fill
                    sizes="(min-width: 1024px) 270px, (min-width: 640px) 45vw, 92vw"
                    className="object-cover"
                  />
                  <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-bold text-primary shadow-card">
                    {p.tag}
                  </span>
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <h3 className="text-lg font-black tracking-tight text-foreground">{p.name}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {p.description}
                  </p>
                  <ul className="mt-4 space-y-1.5 border-t border-border pt-4 text-[13px] text-foreground/80">
                    {p.specs.map((s) => (
                      <li key={s} className="flex items-start gap-1.5">
                        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" strokeWidth={3} aria-hidden="true" />
                        <Phrase>{s}</Phrase>
                      </li>
                    ))}
                  </ul>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-8 text-center text-sm text-muted-foreground">
            <Phrase>上記以外のグッズも、継続した発注が見込める場合はご相談ください。</Phrase>
          </p>
        </div>
      </section>

      {/* ── 向いている用途 ──────────────────────────────────── */}
      <section id="use-cases" aria-labelledby="use-cases-title" className="border-y border-border bg-muted py-20 sm:py-24">
        <div className={container}>
          <SectionHeading
            id="use-cases-title"
            eyebrow="USE CASES"
            title="定期発注が向いているグッズ・用途"
          />
          <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {USE_CASES.map((u) => (
              <li key={u.title} className="rounded-2xl bg-card p-6 shadow-card ring-1 ring-border">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-amber-soft text-[#8a5a00]">
                  <u.icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 className="mt-4 font-black leading-snug tracking-tight text-foreground">
                  <Phrase>{u.title}</Phrase>
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {u.body}
                </p>
              </li>
            ))}
          </ul>
          <div className="mx-auto mt-8 flex max-w-4xl items-start gap-4 rounded-2xl border border-primary/20 bg-secondary p-5 sm:p-6">
            <Building2 className="mt-0.5 h-6 w-6 shrink-0 text-primary" aria-hidden="true" />
            <p className="text-sm leading-relaxed text-secondary-foreground sm:text-[15px]">
              運営会社の株式会社SOARAは、ガチャガチャ・クレーンゲームの設置事業も行っています。景品の補充や入れ替えのサイクルをふまえて、発注スケジュールをご提案します。
            </p>
          </div>
        </div>
      </section>

      {/* ── ご利用の条件 ─────────────────────────────────────── */}
      <section id="conditions" aria-labelledby="conditions-title" className="py-20 sm:py-24">
        <div className={container}>
          <SectionHeading
            id="conditions-title"
            eyebrow="CONDITIONS"
            title="ご利用の条件"
            lead="継続して発注いただける商品に限定することで、この価格を実現しています。"
          />
          <div className="mx-auto mt-12 grid max-w-5xl gap-5 md:grid-cols-[1.25fr_1fr]">
            <div className="rounded-2xl border-2 border-primary bg-card p-6 shadow-card sm:p-8">
              <h3 className="flex items-center gap-2 text-lg font-black text-primary">
                <CircleCheck className="h-6 w-6" aria-hidden="true" />
                対象となるご依頼
              </h3>
              <ul className="mt-5 space-y-4">
                {CONDITIONS_OK.map((c) => (
                  <li key={c} className="flex items-start gap-3 text-[15px] font-semibold leading-relaxed text-foreground">
                    <Check className="mt-1 h-4 w-4 shrink-0 text-primary" strokeWidth={3} aria-hidden="true" />
                    <Phrase>{c}</Phrase>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl bg-muted p-6 ring-1 ring-border sm:p-8">
              <h3 className="flex items-center gap-2 text-lg font-black text-muted-foreground">
                <CircleX className="h-6 w-6" aria-hidden="true" />
                お受けしていないご依頼
              </h3>
              <ul className="mt-5 space-y-4">
                {CONDITIONS_NG.map((c) => (
                  <li key={c.text} className="flex items-start gap-3 text-[15px] font-semibold leading-relaxed text-foreground/80">
                    <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground" aria-hidden="true" />
                    <span>
                      <Phrase>{c.text}</Phrase>
                      {c.note && <span className="mt-0.5 block text-xs font-medium text-muted-foreground">※ {c.note}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <p className="mx-auto mt-6 max-w-5xl text-center text-sm leading-relaxed text-muted-foreground">
            <Phrase>頻度や数量の基準は、商品や仕様によって異なります。対象になるか迷う場合も、まずはお気軽にご相談ください。</Phrase>
          </p>
        </div>
      </section>

      {/* ── ご依頼の流れ ─────────────────────────────────────── */}
      <section id="flow" aria-labelledby="flow-title" className="border-t border-border bg-secondary/50 py-20 sm:py-24">
        <div className={container}>
          <SectionHeading id="flow-title" eyebrow="FLOW" title="ご依頼の流れ" />
          <ol className="relative mt-12 grid gap-4 lg:grid-cols-5 lg:gap-3">
            {FLOW.map((step, i) => (
              <li key={step.title} className="relative flex gap-4 rounded-2xl bg-card p-5 shadow-card ring-1 ring-border lg:flex-col lg:gap-0">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-base font-black text-white shadow-brand tabular-nums">
                  {i + 1}
                </span>
                <div className="lg:mt-4">
                  <h3 className="font-black leading-snug tracking-tight text-foreground">
                    <Phrase>{step.title}</Phrase>
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {step.body}
                  </p>
                </div>
                {i === FLOW.length - 1 && (
                  <span className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-brand-amber-soft px-2 py-0.5 text-[11px] font-bold text-[#7a4f00]">
                    <Repeat className="h-3 w-3" aria-hidden="true" />
                    くり返し
                  </span>
                )}
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────── */}
      <section id="faq" aria-labelledby="faq-title" className="border-t border-border py-20 sm:py-24">
        <div className={container}>
          <SectionHeading id="faq-title" eyebrow="FAQ" title="よくある質問" />
          <div className="mx-auto mt-12 max-w-3xl space-y-3">
            {FAQS.map((f) => (
              <details key={f.question} className="faq group rounded-2xl bg-card shadow-card ring-1 ring-border">
                <summary className="flex cursor-pointer items-start gap-3 p-5 sm:p-6">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-black text-white">
                    Q
                  </span>
                  <h3 className="flex-1 font-bold leading-relaxed text-foreground">
                    <Phrase>{f.question}</Phrase>
                  </h3>
                  <Plus
                    className="mt-1 h-5 w-5 shrink-0 text-primary transition-transform group-open:rotate-45 motion-reduce:transition-none"
                    aria-hidden="true"
                  />
                </summary>
                <div className="flex gap-3 px-5 pb-5 sm:px-6 sm:pb-6">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-amber-soft text-xs font-black text-[#7a4f00]">
                    A
                  </span>
                  <p className="flex-1 text-[15px] leading-[1.85] text-muted-foreground">
                    {f.answer}
                  </p>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── お見積もり依頼 ─────────────────────────────────────── */}
      <section id="contact" aria-labelledby="contact-title" className="relative overflow-hidden bg-brand-blue-deep py-20 text-white sm:py-24">
        <div className="pointer-events-none absolute inset-0 bg-dotgrid opacity-15" aria-hidden="true" />
        <div className={`${container} relative grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-14`}>
          <div className="lg:sticky lg:top-24 lg:self-start">
            <p className="flex items-center gap-3 text-xs font-bold tracking-[0.2em] text-white/70">
              CONTACT
              <span className="rounded-full bg-accent px-2.5 py-1 text-[11px] font-black tracking-normal text-accent-foreground">
                見積もり無料
              </span>
            </p>
            <h2 id="contact-title" className="mt-3 text-[1.7rem] font-black leading-[1.4] tracking-tight sm:text-4xl">
              <Phrase>定期発注のお見積もり依頼</Phrase>
            </h2>
            <p className="mt-5 text-base leading-[1.9] text-white/85">
              作りたいグッズと、発注の頻度・数量の見込みを教えてください。{REPLY_LEAD_TIME}に担当者からご連絡します。
            </p>

            <div className="mt-8 rounded-2xl bg-white/10 p-5 ring-1 ring-white/15 sm:p-6">
              <p className="font-bold">
                <Phrase>お見積もりが早く・正確になる情報</Phrase>
              </p>
              <ul className="mt-3 space-y-2">
                {QUOTE_TIPS.map((t) => (
                  <li key={t} className="flex items-start gap-2.5 text-sm leading-relaxed text-white/85">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" strokeWidth={3} aria-hidden="true" />
                    <Phrase>{t}</Phrase>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-xs leading-relaxed text-white/65">
                写真や資料は、送信後に届く確認メールへの返信でお送りください。
              </p>
            </div>

            <dl className="mt-8 space-y-4 text-sm">
              <div>
                <dt className="flex items-center gap-2 text-white/75">
                  <Mail className="h-4 w-4 shrink-0" aria-hidden="true" />
                  メールでのお問い合わせ
                </dt>
                <dd className="mt-1 pl-6 font-bold">
                  <a
                    href={`mailto:${CONTACT_EMAIL}`}
                    className="inline-block py-0.5 underline decoration-white/40 underline-offset-4 hover:decoration-white"
                  >
                    {CONTACT_EMAIL}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="flex items-center gap-2 text-white/75">
                  <Clock className="h-4 w-4 shrink-0" aria-hidden="true" />
                  受付時間
                </dt>
                <dd className="mt-1 pl-6 font-bold">
                  <Phrase>{BUSINESS_HOURS}</Phrase>
                </dd>
              </div>
            </dl>
          </div>

          <div className="text-foreground">
            <QuoteForm />
          </div>
        </div>
      </section>

      {/* ── 運営会社 ──────────────────────────────────────── */}
      <section id="company" aria-labelledby="company-title" className="py-20 sm:py-24">
        <div className={container}>
          <SectionHeading id="company-title" eyebrow="COMPANY" title="運営会社" />
          <dl className="mx-auto mt-12 max-w-3xl divide-y divide-border overflow-hidden rounded-2xl bg-card text-sm shadow-card ring-1 ring-border sm:text-[15px]">
            {COMPANY_ROWS.map(([label, value]) => (
              <div key={label} className="grid sm:grid-cols-[11rem_1fr]">
                <dt className="px-5 pt-4 font-bold text-foreground sm:bg-muted/60 sm:py-4">{label}</dt>
                <dd className="px-5 pt-1 pb-4 leading-relaxed text-muted-foreground sm:py-4">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ── 個人情報の取り扱い ─────────────────────────────────── */}
      <section id="privacy" aria-labelledby="privacy-title" className="border-t border-border bg-muted py-14">
        <div className={`${container} max-w-3xl`}>
          <h2 id="privacy-title" className="text-lg font-black text-foreground">
            個人情報の取り扱いについて
          </h2>
          <div className="mt-4 space-y-3 text-[13px] leading-[1.9] text-muted-foreground">
            <p>
              {COMPANY.name}（以下「当社」）は、本サイトのお見積もり依頼フォームで取得する個人情報を、個人情報の保護に関する法律その他の関係法令にしたがい、次のとおり取り扱います。
            </p>
            <ol className="list-decimal space-y-2 pl-5">
              <li>
                <strong className="text-foreground">取得する情報：</strong>
                会社名・屋号、お名前、メールアドレス、電話番号、ご相談内容など、フォームに
                <span className="whitespace-nowrap">入力いただいた情報</span>
              </li>
              <li>
                <strong className="text-foreground">利用目的：</strong>
                お見積もり・お問い合わせへの回答、ご依頼に関するご連絡、お取引の検討と実施のため
              </li>
              <li>
                <strong className="text-foreground">第三者提供：</strong>
                法令に基づく場合などを除き、ご本人の同意なく第三者に提供しません。
              </li>
              <li>
                <strong className="text-foreground">業務の委託：</strong>
                メール送信（Resend）、Webサイトの運用（Vercel）、社内連絡（Slack）などの外部サービスを利用しており、その範囲で情報を取り扱う場合があります。これらには米国の事業者が含まれます。
              </li>
              <li>
                <strong className="text-foreground">安全管理：</strong>
                通信はSSL/TLSで暗号化し、情報にアクセスできる担当者を限定しています。
              </li>
              <li>
                <strong className="text-foreground">アクセス解析：</strong>
                利用状況を把握するため、Google アナリティクス（Cookieを使用）と Vercel Web Analytics を利用しています。
              </li>
              <li>
                <strong className="text-foreground">開示・訂正・削除などのご請求、お問い合わせ窓口：</strong>
                <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary underline underline-offset-4">
                  {CONTACT_EMAIL}
                </a>
                （{COMPANY.name}）。当社の住所・代表者の氏名など法令で定める事項は、ご請求に応じて遅滞なくお知らせします。
              </li>
            </ol>
          </div>
        </div>
      </section>

      <MobileCta />
    </>
  )
}
