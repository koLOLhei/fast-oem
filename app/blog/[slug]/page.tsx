import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Calendar, Clock } from 'lucide-react'
import { Breadcrumb, breadcrumbJsonLd } from '@/components/breadcrumb'
import { articles, categoryColors, getArticleBySlug, AUTHORS } from '@/lib/blog-articles'
import { User } from 'lucide-react'

/** Render markdown-style [link](/url) as safe React <Link> nodes. */
function renderLinks(text: string): React.ReactNode {
  const parts = text.split(/\[([^\]]+)\]\(([^)]+)\)/g)
  if (parts.length === 1) return text
  const nodes: React.ReactNode[] = []
  for (let i = 0; i < parts.length; i += 3) {
    if (parts[i]) nodes.push(parts[i])
    if (i + 1 < parts.length) {
      nodes.push(
        <Link key={`link-${i}`} href={parts[i + 2]} className="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors">
          {parts[i + 1]}
        </Link>
      )
    }
  }
  return nodes
}

/** Render markdown-style **bold** text and [links](/url) as safe React nodes (no dangerouslySetInnerHTML). */
function renderBoldText(text: string): React.ReactNode {
  const parts = text.split(/\*\*(.*?)\*\*/g)
  if (parts.length === 1) return renderLinks(text)
  return parts.map((part, i) =>
    i % 2 === 1
      ? <strong key={i} className="text-foreground">{part}</strong>
      : part ? renderLinks(part) : null
  )
}

const BASE_URL = 'https://fast-oem.soara-mu.jp'

interface BlogPostPageProps {
  params: Promise<{ slug: string }>
}

export function generateStaticParams() {
  return articles.map((a) => ({ slug: a.slug }))
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params
  const article = getArticleBySlug(slug)
  if (!article) return { title: '記事が見つかりません' }

  return {
    title: article.title,
    description: article.excerpt,
    keywords: article.keywords,
    openGraph: {
      title: `${article.title} | FAST OEM コラム`,
      description: article.excerpt,
      url: `${BASE_URL}/blog/${slug}`,
      type: 'article',
      publishedTime: article.date,
      modifiedTime: article.lastUpdated || article.date,
      authors: ['FAST OEM'],
      section: article.category,
    },
    twitter: {
      card: 'summary_large_image',
      title: article.title,
      description: article.excerpt,
    },
    alternates: { canonical: `${BASE_URL}/blog/${slug}` },
  }
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params
  const article = getArticleBySlug(slug)
  if (!article) notFound()

  const currentIndex = articles.findIndex((a) => a.slug === slug)
  const prevArticle = currentIndex > 0 ? articles[currentIndex - 1] : null
  const nextArticle = currentIndex < articles.length - 1 ? articles[currentIndex + 1] : null

  const bcJsonLd = breadcrumbJsonLd([
    { name: 'コラム', href: '/blog' },
    { name: article.title },
  ])

  const author = AUTHORS[article.authorId]

  // Extract h2 headings for table of contents (AEO + UX boost)
  const tocItems = article.content
    .split('\n')
    .filter((line) => line.startsWith('## '))
    .map((line, idx) => {
      const text = line.replace('## ', '').replace(/\*\*/g, '').trim()
      const id = `toc-${idx}-${text.replace(/[^a-zA-Z0-9ぁ-んァ-ヶ一-龥]+/g, '-').slice(0, 30)}`
      return { id, text }
    })

  const wordCount = article.content.replace(/\s+/g, '').length

  const articleJsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: article.title,
    description: article.excerpt,
    datePublished: article.date,
    dateModified: article.lastUpdated || article.date,
    url: `${BASE_URL}/blog/${slug}`,
    image: `${BASE_URL}/opengraph-image.png`,
    wordCount,
    articleSection: article.category,
    inLanguage: 'ja',
    isAccessibleForFree: true,
    author: {
      '@type': 'Organization',
      name: 'FAST OEM',
      url: BASE_URL,
    },
    publisher: {
      '@type': 'Organization',
      name: 'FAST OEM',
      url: BASE_URL,
      logo: { '@type': 'ImageObject', url: `${BASE_URL}/logo.png`, width: 600, height: 60 },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': `${BASE_URL}/blog/${slug}` },
  }
  if (article.keywords && article.keywords.length > 0) {
    articleJsonLd.keywords = article.keywords.join(', ')
  }

  // FAQPage JSON-LD (AEO: People Also Ask / Featured Snippets)
  const faqJsonLd = article.faqItems && article.faqItems.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: article.faqItems.map((q) => ({
      '@type': 'Question',
      name: q.question,
      acceptedAnswer: { '@type': 'Answer', text: q.answer },
    })),
  } : null

  const allJsonLd = [bcJsonLd, articleJsonLd, ...(faqJsonLd ? [faqJsonLd] : [])]

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(allJsonLd) }}
      />
      <div className="py-12 md:py-16 bg-background min-h-screen">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <Breadcrumb items={[{ name: 'コラム', href: '/blog' }, { name: article.title }]} />

          {/* Article Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${categoryColors[article.category] || 'bg-muted text-muted-foreground'}`}>
                {article.category}
              </span>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                {article.date}
              </span>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {article.readTime}
              </span>
            </div>
            <h1 className="text-2xl md:text-4xl font-black text-foreground leading-tight">
              {article.title}
            </h1>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              {article.excerpt}
            </p>
          </div>

          {/* Author Byline */}
          <div className="flex items-center gap-4 mb-8 p-4 rounded-xl bg-muted/50 border border-border">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <User className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-foreground text-sm">{author.name}</p>
              <p className="text-xs text-muted-foreground">{author.role}</p>
            </div>
            {article.lastUpdated && article.lastUpdated !== article.date && (
              <div className="text-right">
                <p className="text-[10px] text-muted-foreground">最終更新</p>
                <p className="text-xs font-medium text-foreground">{article.lastUpdated}</p>
              </div>
            )}
          </div>

          {/* Table of Contents (h2 だけ抽出した目次) */}
          {tocItems.length >= 3 && (
            <nav aria-label="目次" className="mb-8 p-5 rounded-xl bg-muted/30 border border-border">
              <p className="text-sm font-bold text-foreground mb-3">📋 この記事の目次</p>
              <ol className="space-y-1.5 text-sm text-foreground/80 list-decimal list-inside">
                {tocItems.map((item) => (
                  <li key={item.id}>
                    <a href={`#${item.id}`} className="hover:text-primary transition-colors underline-offset-2 hover:underline">
                      {item.text}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          )}

          <hr className="border-border mb-8" />

          {/* Article Content */}
          <article className="prose prose-gray max-w-none prose-headings:font-bold prose-h2:text-xl prose-h2:mt-10 prose-h2:mb-4 prose-h3:text-lg prose-h3:mt-8 prose-h3:mb-3 prose-p:leading-relaxed prose-p:text-foreground/80 prose-li:text-foreground/80 prose-strong:text-foreground prose-table:text-sm">
            {(() => { let h2Counter = 0; return article.content.split('\n\n').map((block, i) => {
              if (block.startsWith('## ')) {
                const text = block.replace('## ', '').replace(/\*\*/g, '').trim()
                const tocId = `toc-${h2Counter}-${text.replace(/[^a-zA-Z0-9ぁ-んァ-ヶ一-龥]+/g, '-').slice(0, 30)}`
                h2Counter++
                return <h2 key={i} id={tocId} className="text-xl font-bold text-foreground mt-10 mb-4 scroll-mt-24">{renderBoldText(block.replace('## ', ''))}</h2>
              }
              if (block.startsWith('### ')) {
                return <h3 key={i} className="text-lg font-bold text-foreground mt-8 mb-3">{renderBoldText(block.replace('### ', ''))}</h3>
              }
              if (block.startsWith('| ')) {
                const rows = block.split('\n').filter((r) => !r.match(/^\|[\s-|]+\|$/))
                const headers = rows[0]?.split('|').filter(Boolean).map((c) => c.trim())
                const bodyRows = rows.slice(1)
                return (
                  <div key={i} className="overflow-x-auto my-6">
                    <table className="w-full text-sm border border-border rounded-xl overflow-hidden">
                      {headers && (
                        <thead>
                          <tr className="bg-muted/50">
                            {headers.map((h, j) => (
                              <th key={j} className="px-4 py-3 text-left font-bold text-foreground">{h.replace(/\*\*/g, '')}</th>
                            ))}
                          </tr>
                        </thead>
                      )}
                      <tbody className="divide-y divide-border">
                        {bodyRows.map((row, ri) => (
                          <tr key={ri} className="hover:bg-muted/30">
                            {row.split('|').filter(Boolean).map((cell, ci) => (
                              <td key={ci} className="px-4 py-3 text-foreground/80">{renderBoldText(cell.trim())}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              }
              if (block.startsWith('- ')) {
                const items = block.split('\n').filter((l) => l.startsWith('- '))
                return (
                  <ul key={i} className="list-disc list-inside space-y-2 my-4 text-foreground/80">
                    {items.map((item, j) => (
                      <li key={j}>{renderBoldText(item.replace('- ', ''))}</li>
                    ))}
                  </ul>
                )
              }
              if (block.match(/^\d+\. /)) {
                const items = block.split('\n').filter((l) => l.match(/^\d+\. /))
                return (
                  <ol key={i} className="list-decimal list-inside space-y-2 my-4 text-foreground/80">
                    {items.map((item, j) => (
                      <li key={j}>{renderBoldText(item.replace(/^\d+\. /, ''))}</li>
                    ))}
                  </ol>
                )
              }
              return (
                <p key={i} className="text-foreground/80 leading-relaxed my-4">{renderBoldText(block)}</p>
              )
            }) })()}
          </article>

          {/* FAQ Section (AEOブースト) */}
          {article.faqItems && article.faqItems.length > 0 && (
            <section className="mt-12 p-6 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200" aria-labelledby="article-faq-heading">
              <h2 id="article-faq-heading" className="text-xl font-bold text-foreground mb-4">❓ よくある質問</h2>
              <dl className="space-y-4">
                {article.faqItems.map((q, i) => (
                  <div key={i} className="bg-white rounded-xl p-4 border border-border">
                    <dt className="font-bold text-foreground mb-2 flex items-start gap-2">
                      <span className="text-primary shrink-0">Q.</span>
                      <span>{q.question}</span>
                    </dt>
                    <dd className="text-sm text-foreground/80 leading-relaxed pl-7">{renderBoldText(q.answer)}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          {/* Related Articles */}
          {(() => {
            const related = articles.filter((a) => a.slug !== slug && a.category === article.category).slice(0, 2)
            if (related.length === 0) return null
            return (
              <div className="mt-12 p-6 rounded-2xl bg-muted/20 border border-border">
                <h3 className="font-bold text-foreground mb-4">関連記事</h3>
                <div className="grid gap-3">
                  {related.map((r) => (
                    <Link key={r.slug} href={`/blog/${r.slug}`} className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors group">
                      <span className={`text-xs font-bold px-2 py-1 rounded-full shrink-0 ${categoryColors[r.category] || 'bg-muted text-muted-foreground'}`}>{r.category}</span>
                      <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors line-clamp-1">{r.title}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )
          })()}

          {/* Author Bio */}
          <div className="mt-12 p-6 rounded-2xl bg-muted/30 border border-border">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <User className="h-7 w-7 text-primary" />
              </div>
              <div>
                <p className="font-bold text-foreground">{author.name}</p>
                <p className="text-xs text-primary font-medium">{author.role}</p>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{author.bio}</p>
              </div>
            </div>
          </div>

          <hr className="border-border mt-8 mb-8" />

          {/* Prev / Next */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {prevArticle ? (
              <Link href={`/blog/${prevArticle.slug}`} className="group p-4 border border-border rounded-xl hover:border-primary/30 transition-all">
                <span className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                  <ArrowLeft className="h-3 w-3" /> 前の記事
                </span>
                <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2">{prevArticle.title}</span>
              </Link>
            ) : <div />}
            {nextArticle ? (
              <Link href={`/blog/${nextArticle.slug}`} className="group p-4 border border-border rounded-xl hover:border-primary/30 transition-all text-right">
                <span className="text-xs text-muted-foreground flex items-center gap-1 justify-end mb-1">
                  次の記事 <ArrowRight className="h-3 w-3" />
                </span>
                <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2">{nextArticle.title}</span>
              </Link>
            ) : <div />}
          </div>

          {/* CTA */}
          <div className="mt-12 text-center">
            <div className="inline-block p-8 bg-gradient-to-br from-primary/5 to-primary/10 rounded-3xl border border-primary/20">
              <h3 className="text-xl font-bold text-foreground mb-2">グッズ製作を始めませんか？</h3>
              <p className="text-muted-foreground text-sm mb-4">商品を選んでデザインをアップロードするだけ</p>
              <Link
                href="/products"
                className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground h-11 px-6 rounded-xl font-bold transition-colors"
              >
                商品一覧を見る <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
