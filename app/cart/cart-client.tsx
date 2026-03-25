'use client'

import Link from 'next/link'
import { Trash2, ArrowRight, ShoppingBag, Shield, Truck, Plus, Minus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useCart } from '@/components/cart-provider'
import { formatPrice, getProductById } from '@/lib/products'

export function CartClient() {
  const { cart, updateItemQuantity, removeItem, isLoading } = useCart()

  // Calculate totals
  const itemsTotal = cart.items.reduce((sum, item) => sum + item.totalPrice, 0)
  const moldTotal = cart.items.reduce((sum, item) => sum + (item.moldFee || 0), 0)

  if (isLoading) {
    return (
      <div className="py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse space-y-6">
            <div className="h-10 bg-muted rounded-xl w-1/4"></div>
            <div className="h-40 bg-muted rounded-2xl"></div>
            <div className="h-40 bg-muted rounded-2xl"></div>
          </div>
        </div>
      </div>
    )
  }

  if (cart.items.length === 0) {
    return (
      <div className="py-20 md:py-28">
        <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="w-24 h-24 rounded-3xl bg-muted flex items-center justify-center mx-auto mb-8">
            <ShoppingBag className="h-12 w-12 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-3">
            カートは空です
          </h1>
          <p className="text-muted-foreground mb-8 leading-relaxed">
            まずは商品を選んで、あなただけのオリジナルグッズを作成しましょう
          </p>
          <Button
            asChild
            className="h-12 px-6 rounded-xl bg-primary hover:bg-primary/90"
          >
            <Link href="/products">
              商品を探す
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="py-10 md:py-14 bg-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground">
            ショッピングカート
          </h1>
          <p className="text-muted-foreground mt-2">
            {cart.items.length}件の商品
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {cart.items.map((item) => {
              const product = getProductById(item.productId)

              return (
                <Card key={item.id} className="overflow-hidden">
                  <CardContent className="p-0">
                    <div className="flex flex-col sm:flex-row">
                      {/* Design Preview */}
                      <div className="w-full sm:w-36 h-36 bg-gradient-to-br from-secondary to-muted flex-shrink-0">
                        {item.designImage && (item.designImage.startsWith('http') || item.designImage.startsWith('blob:') || item.designImage.startsWith('data:')) ? (
                          <img
                            src={item.designImage}
                            alt="デザイン"
                            className="w-full h-full object-contain p-3"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                          />
                        ) : item.designFileName ? (
                          <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground text-xs gap-1 p-3 text-center">
                            <span className="text-2xl">🖼</span>
                            <span className="truncate w-full text-center">{item.designFileName}</span>
                          </div>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                            No Image
                          </div>
                        )}
                      </div>

                      {/* Item Details */}
                      <div className="flex-1 p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <h3 className="font-bold text-lg text-foreground">
                              {item.productName}
                            </h3>
                            {item.options.length > 0 && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {item.options
                                  .map((o) => `${o.name}: ${o.value}`)
                                  .join(' / ')}
                              </p>
                            )}
                            {item.designFileName && (
                              <p className="text-xs text-muted-foreground mt-2 truncate">
                                ファイル: {item.designFileName}
                              </p>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl h-10 w-10"
                            onClick={() => removeItem(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">削除</span>
                          </Button>
                        </div>

                        <div className="mt-5 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                          {/* Quantity Controls */}
                          {product && (
                            <div className="flex items-center gap-3">
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-9 w-9 rounded-lg"
                                onClick={() =>
                                  updateItemQuantity(
                                    item.id,
                                    Math.max(product.minQuantity, item.quantity - 10)
                                  )
                                }
                                disabled={item.quantity <= product.minQuantity}
                              >
                                <Minus className="h-4 w-4" />
                              </Button>
                              <span className="w-16 text-center font-semibold">
                                {item.quantity}個
                              </span>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-9 w-9 rounded-lg"
                                onClick={() =>
                                  updateItemQuantity(
                                    item.id,
                                    Math.min(product.maxQuantity, item.quantity + 10)
                                  )
                                }
                                disabled={item.quantity >= product.maxQuantity}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">
                              {formatPrice(item.unitPrice)} x {item.quantity}個
                            </p>
                            {item.moldFee && item.moldFee > 0 && (
                              <p className="text-xs text-[#ff7b54] font-medium mt-1">
                                + 型代 {formatPrice(item.moldFee)}
                                {item.moldOrderId && ' (再利用)'}
                              </p>
                            )}
                            <p className="text-xl font-bold text-foreground">
                              {formatPrice(item.totalPrice + (item.moldFee || 0))}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24 border-2">
              <CardContent className="p-6">
                <h2 className="font-bold text-xl text-foreground mb-6">
                  注文内容
                </h2>

                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">商品合計</span>
                    <span className="text-foreground font-medium">
                      {formatPrice(itemsTotal)}
                    </span>
                  </div>
                  {moldTotal > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">型代（初回のみ）</span>
                      <span className="text-foreground font-medium">
                        {formatPrice(moldTotal)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">送料</span>
                    <span className="text-primary font-medium">無料</span>
                  </div>
                  <div className="h-px bg-border" />
                  <div className="flex justify-between items-baseline">
                    <span className="font-bold text-lg text-foreground">
                      合計 (税込)
                    </span>
                    <span className="text-3xl font-bold text-primary">
                      {formatPrice(cart.totalPrice)}
                    </span>
                  </div>
                </div>

                <Button
                  asChild
                  className="w-full mt-8 h-14 rounded-xl text-base bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25"
                  size="lg"
                >
                  <Link href="/checkout">
                    注文手続きへ進む
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>

                <Button
                  asChild
                  variant="outline"
                  className="w-full mt-3 h-11 rounded-xl"
                >
                  <Link href="/products">買い物を続ける</Link>
                </Button>

                {/* Trust Badges */}
                <div className="mt-8 pt-6 border-t border-border">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Shield className="h-4 w-4 text-primary" />
                      <span>安心決済</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Truck className="h-4 w-4 text-primary" />
                      <span>送料無料</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
