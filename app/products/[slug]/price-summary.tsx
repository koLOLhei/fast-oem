'use client'

import { useRouter } from 'next/navigation'
import { ShoppingCart, Check, Truck, Shield, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export interface PriceSummaryProps {
  quantity: number
  unitPrice: number
  totalPrice: number
  totalPriceItems: number
  moldFee: number
  shippingExtra: number
  /** Quantity-based shipping fee (incl. express multiplier). Optional so callers can omit. */
  shippingFee?: number
  /** Express delivery selected (affects shipping fee label). */
  hasExpress?: boolean
  discountPercent: number
  complexityBlock: string | null
  designImage: string | null
  designImagesCount: number
  deliveryPdfUrl: string | null
  is3d: boolean
  allRequiredDone: boolean
  isAdded: boolean
  /** True when we're editing an existing cart line (arrived via ?editCartId=). */
  editing?: boolean
  validationError?: string | null
  onAddToCart: () => boolean
  onBuyNow: () => void
  formatPrice: (n: number) => string
}

export function PriceSummary({
  quantity,
  unitPrice,
  totalPrice,
  totalPriceItems,
  moldFee,
  shippingExtra,
  shippingFee = 0,
  hasExpress = false,
  discountPercent,
  complexityBlock,
  designImage,
  designImagesCount,
  deliveryPdfUrl,
  is3d,
  allRequiredDone,
  isAdded,
  editing = false,
  validationError,
  onAddToCart,
  onBuyNow,
  formatPrice,
}: PriceSummaryProps) {
  const router = useRouter()

  const hasNoDesign = is3d ? designImagesCount === 0 : !designImage

  return (
    <>
      {complexityBlock && (
        <div className="rounded-xl border-2 border-red-300 bg-red-50 p-4 flex items-start gap-3">
          <span className="text-red-500 text-lg shrink-0">⚠️</span>
          <div>
            <p className="text-sm font-bold text-red-800">注文できない組み合わせです</p>
            <p className="text-xs text-red-700 mt-1">{complexityBlock}</p>
          </div>
        </div>
      )}

      <Card className="sticky bottom-0 lg:bottom-4 z-40 shadow-2xl border-2">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            {/* Price Summary */}
            <div className="flex flex-wrap items-center gap-6">
              <div>
                <p className="text-sm text-muted-foreground">数量</p>
                <p className="text-2xl font-bold text-foreground">
                  {quantity.toLocaleString()}個
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">単価</p>
                <p className="text-lg font-semibold text-foreground">
                  {formatPrice(unitPrice)}/個
                </p>
              </div>
              {moldFee > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground">
                    型代（初回のみ）
                  </p>
                  <p className="text-lg font-semibold text-[#ff7b54]">
                    {formatPrice(moldFee)}
                  </p>
                </div>
              )}
              {shippingExtra > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground">
                    送料加算（オプション）
                  </p>
                  <p className="text-lg font-semibold text-foreground">
                    +{formatPrice(shippingExtra)}
                  </p>
                </div>
              )}
              {shippingFee > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground">
                    送料{hasExpress ? '（特急便 ×2）' : '（数量別）'}
                  </p>
                  <p className="text-lg font-semibold text-foreground">
                    {formatPrice(shippingFee)}
                  </p>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">
                  合計金額{' '}
                  <span className="text-xs font-semibold text-green-600">
                    （税込・送料込）
                  </span>
                </p>
                <div className="flex flex-col gap-1">
                  {(moldFee > 0 || shippingFee > 0) && (
                    <p className="text-sm text-muted-foreground">
                      商品代: {formatPrice(totalPriceItems)}
                      {moldFee > 0 && ` + 型代${formatPrice(moldFee)}`}
                      {shippingFee > 0 && ` + 送料${formatPrice(shippingFee)}`}
                    </p>
                  )}
                  <div className="flex items-baseline gap-2">
                    <p className="text-3xl font-bold text-primary">
                      {formatPrice(totalPrice + shippingFee)}
                    </p>
                    {discountPercent > 0 && (
                      <span className="text-sm font-semibold text-green-600 bg-green-100 px-2 py-0.5 rounded">
                        -{discountPercent}%
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Trust Badges */}
            <div className="hidden md:flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-primary" />
                <span>15〜30営業日</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-primary" />
                <span>不良時再製作対応</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Star className="w-4 h-4 text-primary" />
                <span>小ロット対応</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              {editing ? (
                <>
                  <Button
                    size="lg"
                    variant="outline"
                    className="flex-1 lg:flex-none h-12 px-6 rounded-xl"
                    onClick={() => router.push('/cart')}
                  >
                    キャンセル
                  </Button>
                  <Button
                    size="lg"
                    className="flex-1 lg:flex-none h-12 px-8 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25"
                    onClick={onAddToCart}
                    disabled={hasNoDesign || !!complexityBlock}
                  >
                    <Check className="h-5 w-5 mr-2" />
                    更新してカートへ戻る
                  </Button>
                </>
              ) : isAdded ? (
                <Button
                  size="lg"
                  variant="default"
                  className="flex-1 lg:flex-none h-12 px-6 rounded-xl bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => router.push('/cart')}
                >
                  <Check className="h-5 w-5 mr-2" />
                  カートを見る →
                </Button>
              ) : (
                <>
                  <Button
                    size="lg"
                    variant="outline"
                    className="flex-1 lg:flex-none h-12 px-6 rounded-xl"
                    onClick={onAddToCart}
                    disabled={hasNoDesign || !!complexityBlock}
                  >
                    <ShoppingCart className="h-5 w-5 mr-2" />
                    カートに追加
                  </Button>
                  <Button
                    size="lg"
                    className="flex-1 lg:flex-none h-12 px-8 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25"
                    onClick={onBuyNow}
                    disabled={hasNoDesign || !!complexityBlock}
                  >
                    カートへ進む
                  </Button>
                </>
              )}
            </div>
          </div>

          {validationError && (
            <div className="mt-4 py-2 px-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 text-center">
              {validationError}
            </div>
          )}
          {!validationError && hasNoDesign && (
            <p className="text-sm text-muted-foreground text-center mt-4 py-2 px-4 bg-muted rounded-lg">
              デザイン画像をアップロードすると購入できます
            </p>
          )}
        </CardContent>
      </Card>
    </>
  )
}
