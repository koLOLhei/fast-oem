import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Package } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { type Product, formatPrice } from '@/lib/products'

interface ProductCardProps {
  product: Product
  index?: number
}

export function ProductCard({ product }: ProductCardProps) {
  const lastTier = product.priceTiers.length > 0 ? product.priceTiers[product.priceTiers.length - 1] : null
  const lowestPrice = lastTier?.unitPrice
  const lowestQuantity = lastTier?.minQuantity

  return (
    <Link href={`/products/${product.slug}`} className="block group">
      <Card className="overflow-hidden h-full rounded-2xl border-border bg-card shadow-card transition-all duration-300 group-hover:shadow-float group-hover:-translate-y-1.5 group-hover:border-primary/30 p-0">
        <div className="aspect-[4/3] relative overflow-hidden bg-muted">
          {product.imageUrl ? (
            <Image
              src={product.imageUrl}
              alt={`${product.name} - OEM製作・オリジナルグッズ | FAST OEM`}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="h-14 w-14 text-muted-foreground/30" />
            </div>
          )}
          {product.features[0] && (
            <span className="absolute top-3 left-3 bg-background/90 backdrop-blur text-primary text-xs font-bold px-3 py-1.5 rounded-full shadow-card ring-1 ring-border">
              {product.features[0]}
            </span>
          )}
        </div>

        <CardContent className="p-5">
          <h3 className="font-bold text-lg text-foreground tracking-tight group-hover:text-primary transition-colors">
            {product.name}
          </h3>
          <p className="text-sm text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">
            {product.shortDescription}
          </p>

          {lowestPrice != null && (
            <div className="mt-4 pt-4 border-t border-border">
              <div className="flex items-baseline gap-1.5">
                <span className="text-xs text-muted-foreground font-medium">1個</span>
                <span className="text-2xl font-extrabold text-foreground tracking-tight">
                  {formatPrice(lowestPrice)}
                </span>
                <span className="text-sm text-muted-foreground font-medium">〜</span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {lowestQuantity}個以上のご注文時（税込）
              </p>
            </div>
          )}

          <div className="flex flex-wrap gap-1.5 mt-4">
            {product.features.slice(1, 4).map((feature) => (
              <span key={feature} className="px-2.5 py-1 bg-secondary text-secondary-foreground text-xs rounded-md font-medium">
                {feature}
              </span>
            ))}
          </div>

          <Button className="w-full mt-5 h-11 rounded-lg bg-primary hover:bg-brand-blue-dark text-primary-foreground font-bold transition-colors">
            この商品を作成
            <ArrowRight className="ml-1.5 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Button>
        </CardContent>
      </Card>
    </Link>
  )
}
