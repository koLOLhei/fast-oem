import { Metadata } from 'next'
import { Package, Sparkles } from 'lucide-react'
import { ProductCard } from '@/components/product-card'
import { PRODUCTS } from '@/lib/products'

export const metadata: Metadata = {
  title: '商品一覧',
  description:
    'アクリルキーホルダー、缶バッジ、ピンバッジ、ラバーキーホルダー、レジ袋など、オリジナルグッズの商品一覧。',
}

const categories = [
  { id: 'all', name: 'すべて', icon: Sparkles },
  { id: 'keychain', name: 'キーホルダー', icon: Package },
  { id: 'badge', name: 'バッジ', icon: Package },
  { id: 'packaging', name: 'パッケージ', icon: Package },
]

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

  const filteredProducts =
    selectedCategory === 'all'
      ? PRODUCTS
      : PRODUCTS.filter((p) => p.category === selectedCategory)

  return (
    <div className="py-12 md:py-16 bg-background min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-primary text-sm font-medium mb-4">
            <Package className="h-4 w-4" />
            {PRODUCTS.length}種類の商品
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
              <a
                key={category.id}
                href={
                  category.id === 'all'
                    ? '/products'
                    : `/products?category=${category.id}`
                }
                className={`inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium transition-all ${
                  isSelected
                    ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25'
                    : 'bg-card text-foreground border border-border hover:border-primary/30 hover:bg-secondary/50'
                }`}
              >
                {category.name}
              </a>
            )
          })}
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
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
  )
}
