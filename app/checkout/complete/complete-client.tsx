'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CheckCircle, Package, Mail, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { type CartItem } from '@/lib/cart'
import { type ShippingAddress } from '@/lib/order'
import { formatPrice } from '@/lib/products'

interface CompletedOrder {
  orderId: string
  items: CartItem[]
  shippingAddress: ShippingAddress
  totalPrice: number
}

export function CompleteClient() {
  const [order, setOrder] = useState<CompletedOrder | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const savedOrder = sessionStorage.getItem('completed-order')
    if (savedOrder) {
      try {
        setOrder(JSON.parse(savedOrder))
      } catch {
        console.error('Failed to parse order data')
      }
    }
    setIsLoading(false)
  }, [])

  // Calculate totals
  const itemsTotal = order?.items.reduce((sum, item) => sum + item.totalPrice, 0) || 0
  const moldTotal = order?.items.reduce((sum, item) => sum + (item.moldFee || 0), 0) || 0

  if (isLoading) {
    return (
      <div className="py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/4 mx-auto"></div>
            <div className="h-64 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="py-8 md:py-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Progress Steps - Complete */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
              1
            </div>
            <span className="ml-2 text-sm font-medium text-foreground">お届け先</span>
          </div>
          <div className="w-16 h-0.5 bg-primary mx-4"></div>
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
              2
            </div>
            <span className="ml-2 text-sm font-medium text-foreground">お支払い</span>
          </div>
          <div className="w-16 h-0.5 bg-primary mx-4"></div>
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-accent text-accent-foreground flex items-center justify-center font-semibold">
              3
            </div>
            <span className="ml-2 text-sm font-medium text-foreground">完了</span>
          </div>
        </div>

        {/* Success Message */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="h-10 w-10 text-accent" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            ご注文ありがとうございます
          </h1>
          <p className="text-muted-foreground">
            ご注文を受け付けました。確認メールをお送りしましたのでご確認ください。
          </p>
        </div>

        {order && (
          <>
            {/* Order Number */}
            <Card className="mb-6">
              <CardContent className="p-6 text-center">
                <p className="text-sm text-muted-foreground mb-1">注文番号</p>
                <p className="text-2xl font-bold text-foreground font-mono">
                  {order.orderId}
                </p>
              </CardContent>
            </Card>

            {/* Order Details */}
            <Card className="mb-6">
              <CardContent className="p-6">
                <h2 className="font-semibold text-lg text-foreground mb-4">
                  ご注文内容
                </h2>

                <div className="space-y-4">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex gap-4 pb-4 border-b border-border last:border-0 last:pb-0">
                      <div className="w-16 h-16 bg-secondary rounded overflow-hidden flex-shrink-0">
                        {item.designImage && (
                          <img
                            src={item.designImage}
                            alt="デザイン"
                            className="w-full h-full object-contain"
                          />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-foreground">
                          {item.productName}
                        </p>
                        {item.options.length > 0 && (
                          <p className="text-sm text-muted-foreground">
                            {item.options.map((o) => `${o.name}: ${o.value}`).join(' / ')}
                          </p>
                        )}
                        <p className="text-sm text-muted-foreground">
                          {item.quantity}個 × {formatPrice(item.unitPrice)}
                        </p>
                        {item.moldFee && item.moldFee > 0 && (
                          <p className="text-xs text-[#ff7b54] font-medium mt-1">
                            + 型代 {formatPrice(item.moldFee)} (初回のみ)
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-foreground">
                          {formatPrice(item.totalPrice)}
                        </p>
                        {item.moldFee && item.moldFee > 0 && (
                          <p className="text-xs text-muted-foreground">
                            型代込
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 pt-4 border-t border-border space-y-2">
                  {moldTotal > 0 && (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">商品代</span>
                        <span className="text-foreground">{formatPrice(itemsTotal)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">型代（初回のみ）</span>
                        <span className="text-foreground">{formatPrice(moldTotal)}</span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between items-center pt-2 border-t border-border">
                    <span className="font-semibold text-foreground">合計</span>
                    <span className="text-2xl font-bold text-accent">
                      {formatPrice(order.totalPrice)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Shipping Info */}
            <Card className="mb-6">
              <CardContent className="p-6">
                <h2 className="font-semibold text-lg text-foreground mb-4">
                  お届け先
                </h2>
                <div className="text-muted-foreground space-y-1">
                  <p className="text-foreground font-medium">
                    {order.shippingAddress.lastName} {order.shippingAddress.firstName} 様
                  </p>
                  <p>〒{order.shippingAddress.postalCode}</p>
                  <p>
                    {order.shippingAddress.prefecture}
                    {order.shippingAddress.city}
                    {order.shippingAddress.address1}
                  </p>
                  {order.shippingAddress.address2 && (
                    <p>{order.shippingAddress.address2}</p>
                  )}
                  <p>TEL: {order.shippingAddress.phone}</p>
                  <p>Email: {order.shippingAddress.email}</p>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Next Steps */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <h2 className="font-semibold text-lg text-foreground mb-4">
              今後の流れ
            </h2>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Mail className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">確認メール送信</p>
                  <p className="text-sm text-muted-foreground">
                    ご登録のメールアドレスに注文確認メールをお送りしました
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Package className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">製造・発送</p>
                  <p className="text-sm text-muted-foreground">
                    5〜10営業日以内に製造・発送いたします。発送時に追跡番号をお知らせします
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild variant="outline">
            <Link href="/">トップページへ</Link>
          </Button>
          <Button asChild className="bg-accent hover:bg-accent/90 text-accent-foreground">
            <Link href="/products">
              続けて買い物する
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
