import { Metadata } from 'next'
import Link from 'next/link'
import { Package, Sparkles } from 'lucide-react'
import { ProductCard } from '@/components/product-card'
import { Breadcrumb, breadcrumbJsonLd } from '@/components/breadcrumb'
import { getProductsFromDb } from '@/lib/products-db'
import { type Product } from '@/lib/products'

const BASE_URL = 'https://fast-oem.soara-mu.jp'

export const metadata: Metadata = {
  title: 'OEMグッズ製作 商品一覧 | アクリルキーホルダー・缶バッジ・ピンバッジ',
  description:
    'アクリルキーホルダー・缶バッジ・ピンバッジ・ラバーキーホルダーのOEM製作。小ロット対応・格安・スピード納品。同人グッズ・ノベルティの製作に最適。',
  keywords: [
    'アクリルキーホルダー製作', '缶バッジ製作', 'ピンバッジ製作',
    'ラバーキーホルダー製作', 'OEMグッズ',
    'オリジナルグッズ一覧', '小ロット製作', '同人グッズ',
  ],
  openGraph: {
    title: 'OEMグッズ製作 商品一覧 | FAST OEM',
    description: 'アクリルキーホルダー・缶バッジ・ピンバッジ・ラバーキーホルダーのOEM製作。小ロット対応・格安・スピード納品。',
    url: `${BASE_URL}/products`,
    images: [{ url: '/opengraph-image.png', width: 1200, height: 630 }],
  },
  alternates: { canonical: `${BASE_URL}/products` },
}

const categories = [
  { id: 'all', name: 'すべて', icon: Sparkles },
  { id: 'keychain', name: 'キーホルダー', icon: Package },
  { id: 'badge', name: 'バッジ', icon: Package },
]

export const revalidate = 60

export default function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>
}) {
  return <ProductsContent searchParams={searchParams} />
}

async function ProductsContent({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>
}) {
  const params = await searchParams
  const selectedCategory = params.category || 'all'
  const allProducts = await getProductsFromDb()

  const filteredProducts =
    selectedCategory === 'all'
      ? allProducts
      : allProducts.filter((p) => p.category === selectedCategory)

  const bcJsonLd = breadcrumbJsonLd([{ name: '商品一覧' }])

  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'FAST OEM 商品一覧',
    description: 'アクリルキーホルダー・缶バッジ・ピンバッジ・ラバーキーホルダーのOEM製作商品一覧',
    numberOfItems: allProducts.length,
    itemListElement: allProducts.map((product: Product, index: number) => {
      const prices = product.priceTiers.map((t) => t.unitPrice)
      const minPrice = prices.length > 0 ? Math.min(...prices) : undefined
      const maxPrice = prices.length > 0 ? Math.max(...prices) : undefined
      return {
        '@type': 'ListItem',
        position: index + 1,
        item: {
          '@type': 'Product',
          name: product.name,
          url: `${BASE_URL}/products/${product.slug}`,
          image: product.imageUrl || undefined,
          description: product.shortDescription || product.description,
          brand: { '@type': 'Brand', name: 'FAST OEM' },
          ...(minPrice !== undefined && {
            offers: {
              '@type': 'AggregateOffer',
              priceCurrency: 'JPY',
              lowPrice: minPrice,
              highPrice: maxPrice,
              offerCount: product.priceTiers.length,
              availability: 'https://schema.org/InStock',
            },
          }),
        },
      }
    }),
  }

  return (
    <>
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify([bcJsonLd, itemListJsonLd]) }}
    />
    <div className="py-12 md:py-16 bg-background min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <Breadcrumb items={[{ name: '商品一覧' }]} />

        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-primary text-sm font-medium mb-4">
            <Package className="h-4 w-4" />
            {allProducts.length}種類の商品
          </div>
          <h1 className="text-3xl md:text-5xl font-bold text-foreground">
            商品ラインナップ
          </h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            高品質なオリジナルグッズを、お好みのデザインで作成できます。
            <br className="hidden sm:block" />
            小ロットから大量発注まで対応いたします。
          </p>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          {categories.map((category) => {
            const isSelected = selectedCategory === category.id
            return (
              <Link
                key={category.id}
                href={
                  category.id === 'all'
                    ? '/products'
                    : `/products/category/${category.id}`
                }
                className={`inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium transition-all ${
                  isSelected
                    ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25'
                    : 'bg-card text-foreground border border-border hover:border-primary/30 hover:bg-secondary/50'
                }`}
              >
                {category.name}
              </Link>
            )
          })}
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredProducts.map((product, index) => (
            <ProductCard key={product.id} product={product} index={index} />
          ))}
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
              <Package className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-lg text-muted-foreground">
              該当する商品がありません
            </p>
          </div>
        )}

        {/* SEO Content */}
        <div className="mt-16 bg-muted/30 rounded-2xl p-8 max-w-3xl mx-auto">
          <h2 className="text-xl font-bold mb-4">オリジナルグッズ製作について</h2>
          <div className="text-sm text-muted-foreground space-y-3 leading-relaxed">
            <p>FAST OEM では、アクリルキーホルダー、缶バッジ、ピンバッジ、ラバーキーホルダーなどのオリジナルグッズをOEM製作しています。高品質な仕上がりと短納期で、個人クリエイターから企業まで幅広くご利用いただいております。</p>
            <p>同人イベントやコミケでの頒布物、企業のノベルティ、推し活グッズなど、様々な用途にご利用いただけます。デザインデータをアップロードするだけで、簡単にオリジナルグッズを製作できます。</p>
            <p>小ロット50個から大量ロットまで対応。<Link href="/guide">グッズ製作ガイド</Link>で詳しい作り方をご確認いただけます。</p>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="mt-20 text-center">
          <div className="inline-block p-8 bg-gradient-to-br from-primary/5 to-primary/10 rounded-3xl border border-primary/20">
            <h3 className="text-xl font-bold text-foreground mb-2">
              お探しの商品が見つかりませんか？
            </h3>
            <p className="text-muted-foreground mb-4">
              お気軽にお問い合わせください。ご要望に合わせてご提案いたします。
            </p>
            <a
              href="/contact"
              className="inline-flex items-center justify-center h-11 px-6 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-medium transition-colors"
            >
              お問い合わせ
            </a>
          </div>
        </div>
      </div>
    </div>
    </>
  )
}
