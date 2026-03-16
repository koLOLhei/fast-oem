'use client'

import { Check } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import {
  type Product,
  formatPrice,
  calculateUnitPrice,
  calculateTotalPrice,
} from '@/lib/products'

interface PriceCalculatorProps {
  product: Product
  quantity: number
}

export function PriceCalculator({ product, quantity }: PriceCalculatorProps) {
  const unitPrice = calculateUnitPrice(product, quantity)
  const totalPrice = calculateTotalPrice(product, quantity)

  const currentTier = product.priceTiers.find(
    (t) => quantity >= t.minQuantity && quantity <= t.maxQuantity
  )

  const currentTierIndex = product.priceTiers.findIndex(
    (t) => quantity >= t.minQuantity && quantity <= t.maxQuantity
  )
  const nextTier =
    currentTierIndex >= 0 && currentTierIndex < product.priceTiers.length - 1
      ? product.priceTiers[currentTierIndex + 1]
      : null

  // Calculate discount percentage from base price
  const basePrice = product.priceTiers[0].unitPrice
  const discountPercent =
    currentTier && basePrice > unitPrice
      ? Math.round(((basePrice - unitPrice) / basePrice) * 100)
      : 0

  return (
    <div className="space-y-4">
      {/* Current Price Card */}
      <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="p-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">単価</p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-foreground">
                  {formatPrice(unitPrice)}
                </span>
                <span className="text-sm text-muted-foreground">/個</span>
              </div>
              {discountPercent > 0 && (
                <span className="inline-block mt-2 px-2 py-1 bg-primary text-primary-foreground text-xs font-bold rounded">
                  {discountPercent}% OFF
                </span>
              )}
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground mb-1">合計金額</p>
              <p className="text-4xl font-bold text-primary">
                {formatPrice(totalPrice)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">税込</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Next Tier Hint */}
      {nextTier && (
        <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-primary/10 to-transparent border border-primary/20 rounded-xl">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
            <span className="text-primary font-bold text-sm">!</span>
          </div>
          <p className="text-sm text-foreground">
            あと
            <span className="font-bold text-primary mx-1">
              {nextTier.minQuantity - quantity}個
            </span>
            追加で単価
            <span className="font-bold text-primary ml-1">
              {formatPrice(nextTier.unitPrice)}
            </span>
            に！
          </p>
        </div>
      )}

      {/* Price Tiers Grid */}
      <div>
        <h4 className="text-sm font-semibold text-foreground mb-3">
          数量別価格表
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {product.priceTiers.map((tier, index) => {
            const isCurrentTier = currentTier?.minQuantity === tier.minQuantity
            const tierDiscount =
              index > 0
                ? Math.round(
                    ((basePrice - tier.unitPrice) / basePrice) * 100
                  )
                : 0

            return (
              <div
                key={tier.minQuantity}
                className={`relative p-4 rounded-xl border-2 transition-all ${
                  isCurrentTier
                    ? 'border-primary bg-primary/5 shadow-md shadow-primary/10'
                    : 'border-border bg-card hover:border-primary/30'
                }`}
              >
                {isCurrentTier && (
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                    <span className="px-2 py-0.5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center gap-1">
                      <Check className="h-3 w-3" />
                      現在
                    </span>
                  </div>
                )}
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">
                    {tier.minQuantity}〜{tier.maxQuantity}個
                  </p>
                  <p
                    className={`text-lg font-bold ${
                      isCurrentTier ? 'text-primary' : 'text-foreground'
                    }`}
                  >
                    {formatPrice(tier.unitPrice)}
                  </p>
                  {tierDiscount > 0 && (
                    <span
                      className={`text-xs ${
                        isCurrentTier ? 'text-primary' : 'text-muted-foreground'
                      }`}
                    >
                      {tierDiscount}% OFF
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
