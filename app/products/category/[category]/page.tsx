import { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Package, ArrowRight } from 'lucide-react'
import { ProductCard } from '@/components/product-card'
import { Breadcrumb, breadcrumbJsonLd } from '@/components/breadcrumb'
import { getProductsFromDb } from '@/lib/products-db'

const BASE_URL = 'https://fast-oem.soara-mu.jp'

const categoryConfig: Record<string, {
  name: string
  title: string
  description: string
  keywords: string[]
  heading: string
  seoText: string
}> = {
  keychain: {
    name: 'キーホルダー',
    title: 'キーホルダー製作・OEM | アクリルキーホルダー・ラバーキーホルダー',
    description: 'アクリルキーホルダー・ラバーキーホルダーのOEM製作。小ロット50個〜対応、高品質フルカラー印刷。同人グッズ・ノベルティ・推し活グッズに最適。格安・スピード納品。',
    keywords: [
      'キーホルダー 製作', 'キーホルダー 作成', 'キーホルダー OEM',
      'アクリルキーホルダー 製作', 'アクリルキーホルダー 作成', 'アクリルキーホルダー 小ロット',
      'ラバーキーホルダー 製作', 'ラバーキーホルダー 作成', 'ゴムキーホルダー 製作',
      'キーホルダー オリジナル', 'キーホルダー 格安', 'キーホルダー 同人',
      'アクリルキーホルダー 印刷', 'キーホルダー ノベルティ',
    ],
    heading: 'キーホルダー製作',
    seoText: 'FAST OEMでは、アクリルキーホルダー・ラバーキーホルダーなど各種キーホルダーをOEM製作しています。アクリルキーホルダーは透明感のある素材にフルカラー印刷が可能で、推しグッズや同人グッズの定番アイテムです。ラバーキーホルダーは柔らかいPVC素材で立体的なデザインが表現でき、キャラクターグッズやマスコットに最適です。いずれも小ロット対応で個人クリエイターから企業まで幅広くご利用いただけます。',
  },
  badge: {
    name: 'バッジ',
    title: 'バッジ製作・OEM | 缶バッジ・ピンバッジ・小ロット対応',
    description: '缶バッジ・ピンバッジのOEM製作。小ロット対応、高品質フルカラー印刷・エナメル仕上げ。同人イベント・企業ノベルティ・推し活に。格安・スピード納品。',
    keywords: [
      'バッジ 製作', 'バッジ 作成', 'バッジ OEM',
      '缶バッジ 製作', '缶バッジ 作成', '缶バッジ 小ロット', '缶バッジ 格安',
      'ピンバッジ 製作', 'ピンバッジ 作成', 'ピンバッジ オリジナル',
      '缶バッジ 同人', '缶バッジ ノベルティ', 'ピンバッジ 企業',
      'バッジ オリジナル', 'バッジ 印刷',
    ],
    heading: 'バッジ製作',
    seoText: 'FAST OEMでは、缶バッジ・ピンバッジのOEM製作を承っています。缶バッジはフルカラー印刷で鮮やかな発色が特徴。同人イベントでの頒布物やコレクションアイテムとして人気です。ピンバッジは金属の質感が高級感を演出し、企業ノベルティやブランドグッズに最適。エナメル仕上げで美しい発色を実現します。どちらも小ロットから対応しており、個人から法人まで幅広くご利用いただけます。',
  },
}

interface CategoryPageProps {
  params: Promise<{ category: string }>
}

export async function generateStaticParams() {
  return Object.keys(categoryConfig).map((category) => ({ category }))
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { category } = await params
  const config = categoryConfig[category]
  if (!config) return { title: 'カテゴリが見つかりません' }

  return {
    title: config.title,
    description: config.description,
    keywords: config.keywords,
    openGraph: {
      title: `${config.heading} | FAST OEM`,
      description: config.description,
      url: `${BASE_URL}/products/category/${category}`,
      images: [{ url: '/opengraph-image.png', width: 1200, height: 630 }],
    },
    alternates: { canonical: `${BASE_URL}/products/category/${category}` },
  }
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { category } = await params
  const config = categoryConfig[category]
  if (!config) notFound()

  const allProducts = await getProductsFromDb()
  const filteredProducts = allProducts.filter((p) => p.category === category)

  const bcJsonLd = breadcrumbJsonLd([
    { name: '商品一覧', href: '/products' },
    { name: config.name },
  ])

  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `FAST OEM ${config.heading}`,
    description: config.description,
    numberOfItems: filteredProducts.length,
    itemListElement: filteredProducts.map((product, index) => {
      const minPrice = product.priceTiers.length > 0
        ? Math.min(...product.priceTiers.map((t) => t.unitPrice))
        : undefined
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
              '@type': 'Offer',
              priceCurrency: 'JPY',
              price: minPrice,
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
          <Breadcrumb items={[{ name: '商品一覧', href: '/products' }, { name: config.name }]} />

          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-primary text-sm font-medium mb-4">
              <Package className="h-4 w-4" />
              {filteredProducts.length}種類の商品
            </div>
            <h1 className="text-3xl md:text-5xl font-bold text-foreground">
              {config.heading}
            </h1>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              {config.description.split('。')[0]}。
            </p>
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
                このカテゴリの商品は現在準備中です
              </p>
              <Link href="/products" className="inline-flex items-center gap-2 text-primary font-bold mt-4 hover:underline">
                すべての商品を見る <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          )}

          {/* SEO Content */}
          <article className="mt-16 bg-muted/30 rounded-2xl p-8 max-w-3xl mx-auto">
            <h2 className="text-xl font-bold mb-4">{config.heading}について</h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">{config.seoText}</p>
            <div className="flex flex-wrap gap-3">
              <Link href="/guide" className="text-sm text-primary font-bold hover:underline">グッズ製作ガイド</Link>
              <Link href="/faq" className="text-sm text-primary font-bold hover:underline">よくある質問</Link>
              <Link href="/products" className="text-sm text-primary font-bold hover:underline">全商品一覧</Link>
            </div>
          </article>

          {/* Other categories */}
          <div className="mt-12 text-center">
            <h3 className="text-lg font-bold text-foreground mb-4">他のカテゴリ</h3>
            <div className="flex flex-wrap justify-center gap-3">
              {Object.entries(categoryConfig)
                .filter(([key]) => key !== category)
                .map(([key, cfg]) => (
                  <Link
                    key={key}
                    href={`/products/category/${key}`}
                    className="inline-flex items-center px-5 py-3 rounded-xl text-sm font-medium bg-card text-foreground border border-border hover:border-primary/30 hover:bg-secondary/50 transition-all"
                  >
                    {cfg.name}
                  </Link>
                ))}
              <Link
                href="/products"
                className="inline-flex items-center px-5 py-3 rounded-xl text-sm font-medium bg-primary text-primary-foreground shadow-md"
              >
                すべて
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
