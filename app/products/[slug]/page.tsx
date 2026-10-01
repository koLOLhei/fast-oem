import type { Metadata } from 'next'
import { permanentRedirect } from 'next/navigation'
import { ArrowDown, ArrowRight, Check, ChevronRight, CircleX, Repeat } from 'lucide-react'
import { JsonLd } from '@/components/json-ld'
import { ContactSection } from '@/components/lp/contact-section'
import { FaqList } from '@/components/lp/faq-list'
import { MobileCta } from '@/components/lp/mobile-cta'
import { Phrase } from '@/components/lp/phrase'
import { ProductVisual } from '@/components/lp/product-visual'
import { SectionHeading } from '@/components/lp/section-heading'
import { btnPrimary, container } from '@/components/lp/styles'
import { PRODUCT_PAGES, type Block } from '@/lib/product-pages'
import {
  BRAND_ID,
  COMPANY,
  ORG_ID,
  PRODUCTS,
  SITE_LAST_UPDATED,
  SITE_NAME,
  SITE_URL,
  WEBSITE_ID,
  findProduct,
  productPath,
} from '@/lib/site'

type Props = { params: Promise<{ slug: string }> }

export function generateStaticParams() {
  return PRODUCTS.filter((p) => PRODUCT_PAGES[p.slug]).map((p) => ({ slug: p.slug }))
}

function load(slug: string) {
  const product = findProduct(slug)
  const content = PRODUCT_PAGES[slug]
  return product && content ? { product, content } : null
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const found = load(slug)
  if (!found) return {}
  const { product, content } = found
  const url = productPath(slug)
  const shareTitle = `${content.title}｜${SITE_NAME}`
  // 写真がある商品は写真を、無い商品はサイト共通のOG画像を使う
  const image = product.image
    ? { url: product.image, width: 1024, height: 1024, alt: product.alt ?? product.name }
    : { url: '/opengraph-image.jpg', width: 1200, height: 630, alt: `${SITE_NAME}｜${content.title}` }

  return {
    title: content.title,
    description: content.description,
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      locale: 'ja_JP',
      url,
      siteName: SITE_NAME,
      title: shareTitle,
      description: content.description,
      images: [image],
    },
    twitter: {
      card: product.image ? 'summary' : 'summary_large_image',
      title: shareTitle,
      description: content.description,
      images: [image.url],
    },
  }
}

/** どの商品にも共通する「定期発注で安くなる理由」。くわしい説明はトップページにある */
const COMMON_SAVINGS: Block[] = [
  {
    title: '年間の見込み数量で単価を決める',
    body: '1回ごとの数量ではなく、年間の発注見込みをもとに単価を設計します。',
  },
  {
    title: '工場の生産計画に組み込める',
    body: '発注の時期と数量が前もってわかるので、急ぎの割増や段取り替えのムダが減ります。',
  },
  {
    title: '工場と直接、材料もまとめて',
    body: '提携工場と直接やり取りし、継続する数量を前提に材料もまとめて手配します。',
  },
]

export default async function ProductPage({ params }: Props) {
  const { slug } = await params
  const found = load(slug)
  // 旧ECサイトにあって今は無い商品のURLは、商品一覧へ寄せる
  if (!found) permanentRedirect('/#products')
  const { product, content } = found

  const url = `${SITE_URL}${productPath(slug)}`
  const others = PRODUCTS.filter((p) => p.slug !== slug && PRODUCT_PAGES[p.slug])
  const savings = [...COMMON_SAVINGS, content.savingsNote]

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      '@id': ORG_ID,
      name: COMPANY.name,
      url: COMPANY.url,
      logo: COMPANY.logo,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      '@id': `${url}#breadcrumb`,
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'ホーム', item: SITE_URL },
        { '@type': 'ListItem', position: 2, name: '対応グッズ', item: `${SITE_URL}/#products` },
        { '@type': 'ListItem', position: 3, name: product.name, item: url },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      '@id': `${url}#webpage`,
      url,
      name: `${content.title}｜${SITE_NAME}`,
      description: content.description,
      inLanguage: 'ja',
      isPartOf: { '@id': WEBSITE_ID },
      breadcrumb: { '@id': `${url}#breadcrumb` },
      about: { '@id': `${url}#service` },
      dateModified: SITE_LAST_UPDATED,
      ...(product.image ? { primaryImageOfPage: { '@type': 'ImageObject', url: `${SITE_URL}${product.image}` } } : {}),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Service',
      '@id': `${url}#service`,
      name: `${product.name}のOEM製作（定期発注）`,
      ...(product.alternateNames ? { alternateName: product.alternateNames } : {}),
      serviceType: `${product.name}のOEM製作`,
      description: content.description,
      url,
      ...(product.image ? { image: `${SITE_URL}${product.image}` } : {}),
      provider: { '@id': ORG_ID },
      brand: { '@id': BRAND_ID },
      areaServed: { '@type': 'Country', name: 'JP' },
      audience: {
        '@type': 'BusinessAudience',
        audienceType: '同じオリジナルグッズを継続して発注する法人・個人事業主',
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      '@id': `${url}#faq`,
      mainEntity: content.faqs.map((f) => ({
        '@type': 'Question',
        name: f.question,
        acceptedAnswer: { '@type': 'Answer', text: f.answer },
      })),
    },
  ]

  return (
    <>
      <JsonLd data={jsonLd} />

      {/* ── 冒頭 ───────────────────────────────────────────── */}
      <section
        id="hero"
        aria-labelledby="product-title"
        className="relative overflow-hidden border-b border-border bg-gradient-to-b from-secondary via-background to-background"
      >
        <div
          className="pointer-events-none absolute inset-0 bg-dotgrid opacity-60 [mask-image:linear-gradient(to_bottom,black_30%,transparent)]"
          aria-hidden="true"
        />
        <div className={`${container} relative py-8 sm:py-12 lg:py-14`}>
          <nav aria-label="パンくずリスト">
            <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[13px] text-muted-foreground">
              <li>
                <a href="/" className="inline-block py-1 underline-offset-4 hover:text-primary hover:underline">
                  ホーム
                </a>
              </li>
              <li className="flex items-center gap-x-1.5">
                <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <a href="/#products" className="inline-block py-1 underline-offset-4 hover:text-primary hover:underline">
                  対応グッズ
                </a>
              </li>
              <li className="flex items-center gap-x-1.5 font-semibold text-foreground" aria-current="page">
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                {product.name}
              </li>
            </ol>
          </nav>

          <div className="mt-6 grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:gap-14">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-1.5 text-xs font-bold text-primary shadow-card ring-1 ring-primary/15">
                <Repeat className="h-3.5 w-3.5" aria-hidden="true" />
                定期発注専用のオリジナルグッズOEM
              </p>

              <h1
                id="product-title"
                className="mt-5 text-[1.75rem] font-black leading-[1.35] tracking-tight text-foreground sm:text-4xl sm:leading-[1.3] lg:text-[2.5rem]"
              >
                <Phrase>{content.heading}</Phrase>
              </h1>

              <p className="mt-5 max-w-xl text-base leading-[1.9] text-muted-foreground sm:text-lg">{content.lead}</p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <a href="#contact" className={`${btnPrimary} h-14`}>
                  無料で見積もりを依頼する
                  <ArrowRight className="h-5 w-5" aria-hidden="true" />
                </a>
                <a
                  href="#about"
                  className="inline-flex h-14 items-center justify-center gap-1.5 rounded-xl px-5 text-base font-bold text-foreground/80 transition-colors hover:bg-white hover:text-primary"
                >
                  {product.name}について
                  <ArrowDown className="h-4 w-4" aria-hidden="true" />
                </a>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                同じ商品をくり返し発注する方向けのサービスです。単発のご注文はお受けしていません。
              </p>
            </div>

            <div className="mx-auto w-full max-w-sm lg:max-w-none">
              <div
                className={`relative overflow-hidden rounded-2xl bg-muted shadow-float ring-1 ring-border ${
                  product.image ? 'aspect-square' : 'aspect-[16/10] lg:aspect-square'
                }`}
              >
                <ProductVisual product={product} sizes="(min-width: 1024px) 440px, (min-width: 640px) 384px, 92vw" priority />
                <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-bold text-primary shadow-card">
                  {product.tag}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 〇〇とは ──────────────────────────────────────── */}
      <section id="about" aria-labelledby="about-title" className="py-16 sm:py-20">
        <div className={container}>
          <SectionHeading id="about-title" eyebrow="ABOUT" title={content.about.title} />
          <div className="mx-auto mt-10 max-w-3xl space-y-5 text-base leading-[1.95] text-foreground/85 sm:text-[17px]">
            {content.about.paragraphs.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>

          {content.seeAlso && (
            <ul className="mx-auto mt-6 max-w-3xl space-y-2">
              {content.seeAlso.map((l) => (
                <li key={l.slug}>
                  <a
                    href={productPath(l.slug)}
                    className="inline-flex items-start gap-1.5 py-1 text-sm font-bold text-primary underline underline-offset-4"
                  >
                    <ArrowRight className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    <Phrase>{l.text}</Phrase>
                  </a>
                </li>
              ))}
            </ul>
          )}

          {product.alternateNames && (
            <div className="mx-auto mt-8 max-w-3xl rounded-2xl bg-secondary p-5 sm:p-6">
              <p className="text-sm font-bold text-secondary-foreground">
                <Phrase>{`${product.name}の、ほかの呼び方`}</Phrase>
              </p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {product.alternateNames.map((n) => (
                  <li key={n} className="rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-foreground ring-1 ring-primary/15">
                    {n}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <ul className="mx-auto mt-10 grid max-w-5xl gap-4 md:grid-cols-3">
            {content.features.map((f) => (
              <li key={f.title} className="rounded-2xl bg-card p-6 shadow-card ring-1 ring-border">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-white">
                  <Check className="h-5 w-5" strokeWidth={3} aria-hidden="true" />
                </span>
                <h3 className="mt-4 font-black leading-snug tracking-tight text-foreground">
                  <Phrase>{f.title}</Phrase>
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── 近い種類（個別ページが無いものをまとめて案内） ─────────── */}
      {content.related && (
        <section id="related" aria-labelledby="related-title" className="border-t border-border py-16 sm:py-20">
          <div className={container}>
            <SectionHeading id="related-title" eyebrow="MORE" title={content.related.title} lead={content.related.lead} />
            <dl className="mx-auto mt-10 grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {content.related.items.map((r) => (
                <div key={r.title} className="rounded-2xl bg-card p-5 shadow-card ring-1 ring-border sm:p-6">
                  <dt className="font-black leading-snug tracking-tight text-foreground">{r.title}</dt>
                  <dd className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{r.body}</dd>
                </div>
              ))}
            </dl>
            <p className="mx-auto mt-8 max-w-3xl text-center text-sm leading-relaxed text-foreground/85">
              <Phrase>{content.related.note}</Phrase>
            </p>
          </div>
        </section>
      )}

      {/* ── デザインで気をつけること ─────────────────────────── */}
      <section id="tips" aria-labelledby="tips-title" className="border-y border-border bg-muted py-16 sm:py-20">
        <div className={container}>
          <SectionHeading
            id="tips-title"
            eyebrow="DESIGN TIPS"
            title={`${product.name}のデザインで気をつけること`}
            lead={content.tips.lead}
          />
          <ol className="mx-auto mt-10 grid max-w-5xl gap-4 md:grid-cols-3">
            {content.tips.items.map((t, i) => (
              <li key={t.title} className="rounded-2xl bg-card p-6 shadow-card ring-1 ring-border">
                <span className="text-xs font-black tracking-[0.14em] text-primary" aria-hidden="true">
                  POINT {i + 1}
                </span>
                <h3 className="mt-2 font-black leading-snug tracking-tight text-foreground">
                  <Phrase>{t.title}</Phrase>
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── 向いている用途 ──────────────────────────────────── */}
      <section id="uses" aria-labelledby="uses-title" className="py-16 sm:py-20">
        <div className={container}>
          <SectionHeading id="uses-title" eyebrow="USE CASES" title={`${product.name}の定期発注が向いている用途`} />
          <ul className="mx-auto mt-10 grid max-w-5xl gap-4 sm:grid-cols-2">
            {content.uses.map((u) => (
              <li key={u.title} className="rounded-2xl bg-card p-6 shadow-card ring-1 ring-border">
                <h3 className="font-black leading-snug tracking-tight text-foreground">
                  <Phrase>{u.title}</Phrase>
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{u.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── 定期発注で安くなる理由 ───────────────────────────── */}
      <section id="savings" aria-labelledby="savings-title" className="border-y border-border bg-secondary/50 py-16 sm:py-20">
        <div className={container}>
          <SectionHeading
            id="savings-title"
            eyebrow="WHY RECURRING"
            title="定期発注にすると、なぜ安くなるのか"
            lead="発注の時期と数量が見込めるぶん、単発の発注よりも単価を下げてお作りできます。"
          />
          <ul className="mx-auto mt-10 grid max-w-5xl gap-4 sm:grid-cols-2">
            {savings.map((s) => (
              <li key={s.title} className="flex items-start gap-3.5 rounded-2xl bg-card p-5 shadow-card ring-1 ring-border sm:p-6">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-white">
                  <Check className="h-4 w-4" strokeWidth={3} aria-hidden="true" />
                </span>
                <div>
                  <h3 className="font-black leading-snug tracking-tight text-foreground">
                    <Phrase>{s.title}</Phrase>
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
                </div>
              </li>
            ))}
          </ul>

          <div className="mx-auto mt-6 flex max-w-5xl items-start gap-3.5 rounded-2xl border border-border bg-card p-5 sm:p-6">
            <CircleX className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm leading-relaxed text-foreground/85">
              単発・1回限りのご注文と、Webサイトからの直接注文（カート・決済）はお受けしていません。同じ仕様でくり返し発注いただける商品が対象です。
            </p>
          </div>

          <p className="mt-8 flex flex-col items-center justify-center gap-x-6 gap-y-2 text-sm font-bold sm:flex-row">
            <a href="/#reasons" className="inline-flex items-center gap-1 py-1 text-primary underline underline-offset-4">
              安くなる理由をくわしく見る
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
            <a href="/#conditions" className="inline-flex items-center gap-1 py-1 text-primary underline underline-offset-4">
              ご利用の条件を見る
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
          </p>
        </div>
      </section>

      {/* ── よくある質問 ─────────────────────────────────────── */}
      <section id="faq" aria-labelledby="faq-title" className="py-16 sm:py-20">
        <div className={container}>
          <SectionHeading id="faq-title" eyebrow="FAQ" title={`${product.name}のよくある質問`} />
          <FaqList faqs={content.faqs} />
          <p className="mt-8 text-center text-sm">
            <a href="/#faq" className="inline-flex items-center gap-1 py-1 font-bold text-primary underline underline-offset-4">
              定期発注についてのよくある質問を見る
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
          </p>
        </div>
      </section>

      {/* ── お見積もり依頼 ─────────────────────────────────────── */}
      <ContactSection
        title={`${product.name}のお見積もり依頼`}
        tips={content.quoteInfo}
        defaultGoods={[product.slug]}
        source={productPath(slug)}
        privacyHref="/#privacy"
      />

      {/* ── ほかの対応グッズ ─────────────────────────────────── */}
      <section aria-labelledby="others-title" className="py-16 sm:py-20">
        <div className={container}>
          <SectionHeading id="others-title" eyebrow="PRODUCTS" title="ほかの対応グッズ" />
          <ul className="mx-auto mt-10 grid max-w-5xl grid-cols-2 gap-4 lg:grid-cols-4">
            {others.map((p) => (
              <li
                key={p.slug}
                className="relative flex flex-col overflow-hidden rounded-2xl bg-card shadow-card ring-1 ring-border transition-shadow hover:shadow-float"
              >
                <div className="relative aspect-[4/3] bg-muted">
                  <ProductVisual product={p} sizes="(min-width: 1024px) 240px, 46vw" decorative />
                </div>
                <div className="flex flex-1 items-center justify-between gap-2 p-4">
                  <a
                    href={productPath(p.slug)}
                    className="text-sm font-black leading-snug tracking-tight text-foreground after:absolute after:inset-0 sm:text-base"
                  >
                    <Phrase>{p.name}</Phrase>
                  </a>
                  <ArrowRight className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <MobileCta />
    </>
  )
}
