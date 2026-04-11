import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Calendar, Clock } from 'lucide-react'
import { Breadcrumb, breadcrumbJsonLd } from '@/components/breadcrumb'
import { articles, categoryColors, getArticleBySlug } from '@/lib/blog-articles'

/** Render markdown-style **bold** text as safe React nodes (no dangerouslySetInnerHTML). */
function renderBoldText(text: string): React.ReactNode {
  const parts = text.split(/\*\*(.*?)\*\*/g)
  if (parts.length === 1) return text
  return parts.map((part, i) =>
    i % 2 === 1
      ? <strong key={i} className="text-foreground">{part}</strong>
      : part || null
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
    openGraph: {
      title: `${article.title} | FAST OEM コラム`,
      description: article.excerpt,
      url: `${BASE_URL}/blog/${slug}`,
      type: 'article',
      publishedTime: article.date,
      authors: ['FAST OEM'],
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

  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: article.title,
    description: article.excerpt,
    datePublished: article.date,
    url: `${BASE_URL}/blog/${slug}`,
    author: { '@type': 'Organization', name: 'FAST OEM', url: BASE_URL },
    publisher: {
      '@type': 'Organization',
      name: 'FAST OEM',
      url: BASE_URL,
      logo: { '@type': 'ImageObject', url: `${BASE_URL}/logo.png` },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': `${BASE_URL}/blog/${slug}` },
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify([bcJsonLd, articleJsonLd]) }}
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

          <hr className="border-border mb-8" />

          {/* Article Content */}
          <div className="prose prose-gray max-w-none prose-headings:font-bold prose-h2:text-xl prose-h2:mt-10 prose-h2:mb-4 prose-h3:text-lg prose-h3:mt-8 prose-h3:mb-3 prose-p:leading-relaxed prose-p:text-foreground/80 prose-li:text-foreground/80 prose-strong:text-foreground prose-table:text-sm">
            {article.content.split('\n\n').map((block, i) => {
              if (block.startsWith('## ')) {
                return <h2 key={i} className="text-xl font-bold text-foreground mt-10 mb-4">{block.replace('## ', '')}</h2>
              }
              if (block.startsWith('### ')) {
                return <h3 key={i} className="text-lg font-bold text-foreground mt-8 mb-3">{block.replace('### ', '')}</h3>
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
                              <td key={ci} className="px-4 py-3 text-foreground/80">{cell.trim().replace(/\*\*/g, '')}</td>
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
            })}
          </div>

          <hr className="border-border mt-12 mb-8" />

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
