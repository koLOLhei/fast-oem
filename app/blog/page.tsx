import { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Calendar, Clock, BookOpen } from 'lucide-react'
import { Breadcrumb, breadcrumbJsonLd } from '@/components/breadcrumb'
import { articles, categoryColors } from '@/lib/blog-articles'
import { JsonLd } from '@/components/json-ld'

const BASE_URL = 'https://fast-oem.soara-mu.jp'

export const metadata: Metadata = {
  title: 'コラム・お役立ち情報 | グッズ製作の知識・ノウハウ',
  description:
    'オリジナルグッズ製作に役立つ情報をお届け。アクリルキーホルダー・缶バッジの作り方、デザインのコツ、同人グッズ・ノベルティの活用術など。FAST OEM公式コラム。',
  openGraph: {
    title: 'コラム・お役立ち情報 | FAST OEM',
    description: 'グッズ製作に役立つ情報をお届け。作り方のコツからデザインのノウハウまで。',
    url: `${BASE_URL}/blog`,
  },
  alternates: { canonical: `${BASE_URL}/blog` },
}

export default function BlogPage() {
  const bcJsonLd = breadcrumbJsonLd([{ name: 'コラム' }])

  const blogJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: 'FAST OEM コラム・お役立ち情報',
    description: 'オリジナルグッズ製作に役立つ情報をお届け',
    url: `${BASE_URL}/blog`,
    publisher: { '@type': 'Organization', name: 'FAST OEM', url: BASE_URL },
    blogPost: articles.map((a) => ({
      '@type': 'BlogPosting',
      headline: a.title,
      description: a.excerpt,
      datePublished: a.date,
      url: `${BASE_URL}/blog/${a.slug}`,
      author: { '@type': 'Organization', name: 'FAST OEM' },
    })),
  }

  return (
    <>
      <JsonLd data={[bcJsonLd, blogJsonLd]} />
      <div className="py-12 md:py-16 bg-background min-h-screen">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <Breadcrumb items={[{ name: 'コラム' }]} />

          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#1e73be]/10 rounded-full text-[#1e73be] text-sm font-bold mb-4">
              <BookOpen className="h-4 w-4" />
              COLUMN
            </div>
            <h1 className="text-3xl md:text-5xl font-black text-foreground">
              コラム・お役立ち情報
            </h1>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              グッズ製作に役立つ知識やノウハウをお届けします。
              <br className="hidden sm:block" />
              初めての方も経験者の方もぜひご覧ください。
            </p>
          </div>

          {/* Articles */}
          <div className="space-y-6">
            {articles.map((article) => (
              <Link
                key={article.slug}
                href={`/blog/${article.slug}`}
                className="group block bg-card border border-border rounded-2xl p-6 md:p-8 hover:shadow-lg hover:border-primary/30 transition-all"
              >
                <article className="flex flex-col md:flex-row md:items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
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
                    <h2 className="text-lg md:text-xl font-bold text-foreground group-hover:text-primary transition-colors leading-snug">
                      {article.title}
                    </h2>
                    <p className="text-sm text-muted-foreground mt-2 leading-relaxed line-clamp-2">
                      {article.excerpt}
                    </p>
                  </div>
                  <div className="shrink-0 self-end md:self-center">
                    <span className="inline-flex items-center gap-1 text-sm font-bold text-primary">
                      続きを読む <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </span>
                  </div>
                </article>
              </Link>
            ))}
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
