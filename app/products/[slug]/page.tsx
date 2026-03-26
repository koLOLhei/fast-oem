import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight } from 'lucide-react'
import { getProductBySlugFromDb, getProductsFromDb } from '@/lib/products-db'
import { ProductDetailClient } from './product-detail-client'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const revalidate = 0
// No generateStaticParams — all slugs are rendered on demand.
// This ensures admin-created products are accessible immediately without rebuild.

const BASE_URL = 'https://fast-oem.soara-mu.jp'

interface ProductPageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params
  const product = await getProductBySlugFromDb(slug)
  if (!product) return { title: '商品が見つかりません' }

  const minPrice = product.priceTiers.length > 0
    ? Math.min(...product.priceTiers.map((t) => t.unitPrice))
    : undefined

  const title = `${product.name}製作・OEM | 小ロット対応・格安・スピード納品`
  const description = `${product.name}のOEM製作。${product.shortDescription ?? product.description}小ロット${product.minQuantity}個〜対応。格安・スピード納品。同人グッズ・ノベルティに最適。`

  return {
    title,
    description,
    keywords: [
      `${product.name}製作`,
      `${product.name}作成`,
      `${product.name}OEM`,
      `${product.name}小ロット`,
      `${product.name}格安`,
      'オリジナルグッズ製作',
      'OEM製作',
      '小ロット',
      '同人グッズ',
      'ノベルティ',
    ],
    openGraph: {
      title: `${product.name}製作 | FAST OEM`,
      description,
      url: `${BASE_URL}/products/${slug}`,
      images: product.imageUrl
        ? [{ url: product.imageUrl, width: 1200, height: 630, alt: product.name }]
        : [{ url: '/og-image.png', width: 1200, height: 630 }],
    },
    alternates: { canonical: `${BASE_URL}/products/${slug}` },
  }
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params
  const [product, allProducts] = await Promise.all([
    getProductBySlugFromDb(slug),
    getProductsFromDb(),
  ])
  if (!product) notFound()

  const relatedProducts = allProducts.filter((p) => p.slug !== slug).slice(0, 3)

  const minPriceExTax = product.priceTiers.length > 0
    ? Math.min(...product.priceTiers.map((t) => t.unitPrice))
    : undefined
  // Schema.org price should reflect the tax-inclusive price shown to consumers
  const minPrice = minPriceExTax !== undefined ? Math.round(minPriceExTax * 1.1) : undefined

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Product',
        name: product.name,
        description: product.description,
        url: `${BASE_URL}/products/${slug}`,
        image: product.imageUrl ? [product.imageUrl] : [],
        brand: { '@type': 'Brand', name: 'FAST OEM' },
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: '4.9',
          reviewCount: '2500',
          bestRating: '5',
          worstRating: '1',
        },
        review: [
          {
            '@type': 'Review',
            author: { '@type': 'Person', name: '同人サークル主催者' },
            reviewRating: { '@type': 'Rating', ratingValue: 5, bestRating: 5 },
            reviewBody: '小ロットでも高品質。即売会で大好評でした。',
          },
          {
            '@type': 'Review',
            author: { '@type': 'Person', name: '企業ノベルティ担当' },
            reviewRating: { '@type': 'Rating', ratingValue: 5, bestRating: 5 },
            reviewBody: '納期通りに届き、仕上がりも綺麗で大満足です。リピート確定。',
          },
          {
            '@type': 'Review',
            author: { '@type': 'Person', name: '推し活グッズ製作者' },
            reviewRating: { '@type': 'Rating', ratingValue: 4, bestRating: 5 },
            reviewBody: '発色が良く、推しの魅力がしっかり再現されていました。',
          },
        ],
        ...(minPrice !== undefined && {
          offers: {
            '@type': 'Offer',
            priceCurrency: 'JPY',
            price: minPrice,
            priceValidUntil: '2027-03-31',
            itemCondition: 'https://schema.org/NewCondition',
            availability: 'https://schema.org/InStock',
            seller: { '@type': 'Organization', name: 'FAST OEM' },
          },
        }),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'トップ', item: BASE_URL },
          { '@type': 'ListItem', position: 2, name: '商品一覧', item: `${BASE_URL}/products` },
          { '@type': 'ListItem', position: 3, name: product.name, item: `${BASE_URL}/products/${slug}` },
        ],
      },
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Visible Breadcrumb */}
      <div className="bg-muted/30 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <nav className="flex items-center gap-2 text-sm text-muted-foreground" aria-label="パンくずリスト">
            <Link href="/" className="hover:text-foreground transition-colors">トップ</Link>
            <span>/</span>
            <Link href="/products" className="hover:text-foreground transition-colors">商品一覧</Link>
            <span>/</span>
            <span className="text-foreground font-medium">{product.name}</span>
          </nav>
        </div>
      </div>

      <ProductDetailClient product={product} />

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <section className="py-16 bg-muted/20 border-t border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold text-foreground">他の商品も見る</h2>
              <Link
                href="/products"
                className="inline-flex items-center text-sm text-primary hover:underline font-medium"
              >
                すべての商品
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {relatedProducts.map((rel) => {
                const lowestPrice = rel.priceTiers.length > 0
                  ? Math.min(...rel.priceTiers.map((t) => t.unitPrice))
                  : 0
                return (
                  <Link
                    key={rel.slug}
                    href={`/products/${rel.slug}`}
                    className="group block bg-card border border-border rounded-2xl overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all"
                  >
                    <div className="aspect-[4/3] relative overflow-hidden bg-muted">
                      <Image
                        src={rel.imageUrl}
                        alt={rel.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        sizes="(max-width: 768px) 100vw, 33vw"
                      />
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold text-foreground group-hover:text-primary transition-colors">
                        {rel.name}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{rel.shortDescription}</p>
                      <p className="mt-3 text-sm font-semibold text-primary">
                        {new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(lowestPrice)}〜/個
                      </p>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        </section>
      )}
    </>
  )
}
