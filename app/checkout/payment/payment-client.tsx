'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  EmbeddedCheckout,
  EmbeddedCheckoutProvider,
} from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import { ArrowLeft, ShoppingBag, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useCart } from '@/components/cart-provider'
import { startCheckoutSession } from '@/app/actions/stripe'
import { type ShippingAddress } from '@/lib/order'
import { formatPrice } from '@/lib/products'
import { calculateShippingByQuantity, calculateExpressShipping } from '@/lib/shipping'
import { calculateTotalQuantity } from '@/lib/cart'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

export function PaymentClient() {
  const router = useRouter()
  const { cart, clearCart, isLoading: cartLoading } = useCart()
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress | null>(null)
  const [shippingFeeFromSession, setShippingFeeFromSession] = useState(0)
  const [orderId, setOrderId] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [paymentCompleted, setPaymentCompleted] = useState(false)

  useEffect(() => {
    // Load shipping address from sessionStorage
    try {
      const savedAddress = sessionStorage.getItem('shipping-address')
      const savedFee = sessionStorage.getItem('shipping-fee')
      if (savedAddress) {
        try {
          setShippingAddress(JSON.parse(savedAddress))
          setShippingFeeFromSession(savedFee ? parseInt(savedFee, 10) : 0)
        } catch {
          setError('配送先情報の読み込みに失敗しました')
        }
      } else {
        // No shipping address, redirect to checkout
        router.push('/checkout')
      }
    } catch {
      // sessionStorage unavailable (e.g. private browsing)
      router.push('/checkout')
    }
    setIsLoading(false)
  }, [router])

  // カートから送料をライブ再計算（sessionStorage のステール化を防止）
  const totalQuantity = calculateTotalQuantity(cart.items)
  const baseShippingFee = calculateShippingByQuantity(totalQuantity)
  const hasExpress = cart.items.some((item) => item.expressDelivery)
  const liveShippingFee = hasExpress ? calculateExpressShipping(baseShippingFee) : baseShippingFee
  // カートに商品がある場合はライブ計算を優先、空の場合はsessionStorageのフォールバック
  const shippingFee = cart.items.length > 0 ? liveShippingFee : shippingFeeFromSession

  const fetchClientSecret = useCallback(async () => {
    if (!shippingAddress || cart.items.length === 0) {
      throw new Error('Missing required data')
    }

    const result = await startCheckoutSession({
      items: cart.items,
      shippingAddress,
      totalPrice: cart.totalPrice + shippingFee,
      shippingFee,
    })

    if (!result.clientSecret) throw new Error('決済セッションの初期化に失敗しました。再度お試しください。')
    setOrderId(result.orderId)
    setSessionId(result.sessionId)
    return result.clientSecret
  }, [cart, shippingAddress, shippingFee])

  const handleComplete = useCallback(async () => {
    if (!shippingAddress || !orderId) return

    setPaymentCompleted(true)

    // Store order data for the complete page
    // Notifications are sent by the Stripe webhook — no duplicate calls here
    try {
      sessionStorage.setItem(
        'completed-order',
        JSON.stringify({
          orderId,
          sessionId,
          items: cart.items,
          shippingAddress,
          shippingFee,
          totalPrice: cart.totalPrice + shippingFee,
        })
      )
    } catch {
      // Private browsing or quota exceeded — complete page will show a minimal
      // confirmation. The order is already paid, so this is cosmetic only.
    }

    clearCart()
    try {
      sessionStorage.removeItem('shipping-address')
      sessionStorage.removeItem('shipping-fee')
    } catch {
      // Safe to ignore — cleanup only
    }
    router.push('/checkout/complete')
  }, [cart, shippingAddress, orderId, sessionId, clearCart, router])

  if (isLoading || cartLoading) {
    return (
      <div className="py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/4"></div>
            <div className="h-96 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !shippingAddress) {
    return (
      <div className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="w-24 h-24 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="h-12 w-12 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            エラーが発生しました
          </h1>
          <p className="text-muted-foreground mb-8">
            {error || '配送先情報が見つかりません'}
          </p>
          <Button asChild>
            <Link href="/checkout">注文手続きに戻る</Link>
          </Button>
        </div>
      </div>
    )
  }

  if (cart.items.length === 0 && !paymentCompleted) {
    return (
      <div className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
            <ShoppingBag className="h-12 w-12 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            カートが空です
          </h1>
          <p className="text-muted-foreground mb-8">
            商品を追加してから決済を行ってください
          </p>
          <Button asChild>
            <Link href="/products">商品を探す</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="py-8 md:py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Link */}
        <Link
          href="/checkout"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          お届け先入力に戻る
        </Link>

        <h1 className="text-3xl font-bold text-foreground mb-8">お支払い</h1>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8 overflow-x-auto">
          <div className="flex items-center shrink-0">
            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-sm">
              1
            </div>
            <span className="ml-2 text-sm font-medium text-foreground whitespace-nowrap">お届け先</span>
          </div>
          <div className="w-8 sm:w-16 h-0.5 bg-primary mx-2 sm:mx-4 shrink-0"></div>
          <div className="flex items-center shrink-0">
            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-sm">
              2
            </div>
            <span className="ml-2 text-sm font-medium text-foreground whitespace-nowrap">お支払い</span>
          </div>
          <div className="w-8 sm:w-16 h-0.5 bg-border mx-2 sm:mx-4 shrink-0"></div>
          <div className="flex items-center shrink-0">
            <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center font-semibold text-sm">
              3
            </div>
            <span className="ml-2 text-sm text-muted-foreground whitespace-nowrap">完了</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Stripe Checkout */}
          <div className="lg:col-span-2">
            <Card>
              <CardContent className="p-6">
                {/*
                  EmbeddedCheckoutProvider captures `fetchClientSecret` only on
                  first mount. If the cart is edited in another tab, the
                  already-mounted provider keeps the original snapshot.
                  Force-remount on cart/shipping/fee changes so the Stripe
                  session always reflects the current order.
                */}
                <EmbeddedCheckoutProvider
                  key={`${cart.items.length}-${cart.totalPrice}-${shippingFee}-${shippingAddress?.postalCode ?? ''}`}
                  stripe={stripePromise}
                  options={{
                    fetchClientSecret,
                    onComplete: handleComplete,
                  }}
                >
                  <EmbeddedCheckout />
                </EmbeddedCheckoutProvider>
              </CardContent>
            </Card>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <CardContent className="p-6">
                <h2 className="font-semibold text-lg text-foreground mb-4">
                  注文内容
                </h2>

                <div className="space-y-4 mb-4">
                  {cart.items.map((item) => (
                    <div key={item.id} className="flex gap-3">
                      <div className="w-12 h-12 bg-secondary rounded overflow-hidden flex-shrink-0">
                        {item.designPreviewDataUrl ? (
                          <img
                            src={item.designPreviewDataUrl}
                            alt="デザイン"
                            className="w-full h-full object-contain"
                          />
                        ) : item.designFileName ? (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs p-1 text-center">
                            <span className="truncate">{item.designFileName}</span>
                          </div>
                        ) : null}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {item.productName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {item.quantity}個
                        </p>
                      </div>
                      <p className="text-sm font-medium text-foreground">
                        {formatPrice(item.totalPrice + (item.moldFee || 0) + (item.expressDeliveryFee || 0) + (item.shippingModifier || 0))}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="border-t border-border pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">小計</span>
                    <span>{formatPrice(cart.totalPrice)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {hasExpress ? '送料（特急便 ×2）' : '送料'}
                    </span>
                    <span className="text-foreground font-medium">
                      {shippingFee > 0 ? formatPrice(shippingFee) : '計算中...'}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-border">
                    <span className="font-semibold text-foreground">合計</span>
                    <span className="text-xl font-bold text-accent">
                      {formatPrice(cart.totalPrice + shippingFee)}
                    </span>
                  </div>
                </div>

                {/* Non-refundable notice */}
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-xs font-semibold text-amber-800 mb-1">⚠ 返金・キャンセルについて</p>
                  <p className="text-xs text-amber-700 leading-relaxed">
                    本サービスはOEM受注製造のため、<strong>決済完了後のキャンセル・返金はお受けできません</strong>。
                    ご注文内容・デザインデータをご確認のうえ、お支払いへお進みください。
                  </p>
                </div>

                {/* Shipping Address Summary */}
                <div className="mt-6 pt-4 border-t border-border">
                  <h3 className="text-sm font-medium text-foreground mb-2">
                    お届け先
                  </h3>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>
                      {shippingAddress.lastName} {shippingAddress.firstName} 様
                    </p>
                    <p>〒{shippingAddress.postalCode}</p>
                    <p>
                      {shippingAddress.prefecture}
                      {shippingAddress.city}
                      {shippingAddress.address1}
                    </p>
                    {shippingAddress.address2 && <p>{shippingAddress.address2}</p>}
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
