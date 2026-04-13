'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'
import { ArrowRight, Package } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { type Product, formatPrice } from '@/lib/products'

const cardColors = [
  { border: 'border-[#00c8c8]', bg: 'bg-[#00c8c8]', light: 'bg-[#00c8c8]/10' },
  { border: 'border-[#ffe135]', bg: 'bg-[#ffe135]', light: 'bg-[#ffe135]/20' },
  { border: 'border-[#ff7b54]', bg: 'bg-[#ff7b54]', light: 'bg-[#ff7b54]/10' },
  { border: 'border-[#7ed957]', bg: 'bg-[#7ed957]', light: 'bg-[#7ed957]/10' },
  { border: 'border-[#a78bfa]', bg: 'bg-[#a78bfa]', light: 'bg-[#a78bfa]/10' },
]

interface ProductCardProps {
  product: Product
  index?: number
}

export function ProductCard({ product, index = 0 }: ProductCardProps) {
  const lastTier = product.priceTiers.length > 0 ? product.priceTiers[product.priceTiers.length - 1] : null
  const lowestPrice = lastTier?.unitPrice
  const lowestQuantity = lastTier?.minQuantity
  const color = cardColors[index % cardColors.length]
  const [imgError, setImgError] = useState(false)

  return (
    <Link href={`/products/${product.slug}`} className="block group" itemScope itemType="https://schema.org/Product">
      <Card className={`overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-3 border-4 ${color.border} bg-white h-full rounded-3xl`}>
        <div className="aspect-[4/3] relative overflow-hidden">
          {!imgError && product.imageUrl ? (
            <Image
              src={product.imageUrl}
              alt={`${product.name} - OEM製作・オリジナルグッズ | FAST OEM`}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-110"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              onError={() => setImgError(true)}
              itemProp="image"
            />
          ) : (
            <div className={`w-full h-full ${color.light} flex items-center justify-center`}>
              <Package className="h-16 w-16 text-muted-foreground/40" />
            </div>
          )}
          {/* Colored badge */}
          <div className={`absolute top-4 left-4 ${color.bg} text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg`}>
            {product.features[0]}
          </div>
        </div>
        <CardContent className="p-6">
          <h3 className="font-black text-xl text-foreground group-hover:text-[#00c8c8] transition-colors" itemProp="name">
            {product.name}
          </h3>
          <p className="text-sm text-muted-foreground mt-2 line-clamp-2 leading-relaxed" itemProp="description">
            {product.shortDescription}
          </p>

          {/* Price Display */}
          {lowestPrice != null && (
            <div className={`mt-4 pt-4 border-t-2 border-dashed ${color.border}/30`} itemProp="offers" itemScope itemType="https://schema.org/AggregateOffer">
              <meta itemProp="priceCurrency" content="JPY" />
              <meta itemProp="lowPrice" content={String(lowestPrice)} />
              {product.priceTiers.length > 0 && (
                <meta itemProp="highPrice" content={String(product.priceTiers[0].unitPrice)} />
              )}
              <meta itemProp="offerCount" content={String(product.priceTiers.length)} />
              <meta itemProp="availability" content="https://schema.org/InStock" />
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-[#ff7b54]">
                  {formatPrice(lowestPrice)}
                </span>
                <span className="text-sm text-muted-foreground font-medium">〜/個</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {lowestQuantity}個以上の場合
              </p>
            </div>
          )}

          {/* Features Tags */}
          <div className="flex flex-wrap gap-2 mt-4">
            {product.features.slice(1, 4).map((feature) => (
              <span
                key={feature}
                className={`px-3 py-1.5 ${color.light} text-foreground text-xs rounded-full font-medium`}
              >
                {feature}
              </span>
            ))}
          </div>

          <meta itemProp="brand" content="FAST OEM" />

          {/* CTA */}
          <Button
            className={`w-full mt-5 h-12 rounded-xl ${color.bg} hover:opacity-90 text-white font-bold text-base transition-all shadow-lg`}
          >
            作成する
            <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
          </Button>
        </CardContent>
      </Card>
    </Link>
  )
}
