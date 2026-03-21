'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CheckCircle, Package, Mail, ArrowRight, ExternalLink, Loader2, Clock, Truck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { type CartItem } from '@/lib/cart'
import { type ShippingAddress } from '@/lib/order'
import { formatPrice } from '@/lib/products'

/** Japanese national holidays (YYYY-MM-DD) for 2026–2027. */
const JP_HOLIDAYS = new Set([
  // 2026
  '2026-01-01','2026-01-12','2026-02-11','2026-02-23','2026-03-20',
  '2026-04-29','2026-05-03','2026-05-04','2026-05-05',
  '2026-07-20','2026-08-11','2026-09-21','2026-09-23',
  '2026-10-12','2026-11-03','2026-11-23',
  // 2027
  '2027-01-01','2027-01-11','2027-02-11','2027-02-23','2027-03-21',
  '2027-04-29','2027-05-03','2027-05-04','2027-05-05',
  '2027-07-19','2027-08-11','2027-09-20','2027-09-23',
  '2027-10-11','2027-11-03','2027-11-23',
])

/** Skip weekends and Japanese national holidays when calculating delivery estimates. */
function addBusinessDays(date: Date, days: number): Date {
  const result = new Date(date)
  let added = 0
  while (added < days) {
    result.setDate(result.getDate() + 1)
    const dow = result.getDay()
    const ymd = result.toISOString().slice(0, 10)
    if (dow !== 0 && dow !== 6 && !JP_HOLIDAYS.has(ymd)) added++
  }
  return result
}

function formatDateJa(date: Date): string {
  return date.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' })
}

interface CompletedOrder {
  orderId: string
  sessionId?: string
  items: CartItem[]
  shippingAddress: ShippingAddress
  shippingFee?: number
  totalPrice: number
}

const MAX_POLLS = 8
const POLL_INTERVAL_MS = 3000

export function CompleteClient() {
  const [order, setOrder] = useState<CompletedOrder | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [statusUrl, setStatusUrl] = useState<string | null>(null)
  const [statusUrlPending, setStatusUrlPending] = useState(false)
  const [copiedUrl, setCopiedUrl] = useState(false)

  useEffect(() => {
    const savedOrder = sessionStorage.getItem('completed-order')
    if (savedOrder) {
      try {
        const parsed = JSON.parse(savedOrder) as CompletedOrder
        setOrder(parsed)

        // Poll for the secret status URL (webhook may still be processing)
        if (parsed.sessionId) {
          setStatusUrlPending(true)
          let attempts = 0

          const poll = async () => {
            attempts++
            try {
              const res = await fetch(
                `/api/orders/status-link?session_id=${encodeURIComponent(parsed.sessionId!)}`
              )
              if (res.ok) {
                const data = await res.json()
                setStatusUrl(data.statusUrl)
                setStatusUrlPending(false)
                return
              }
            } catch {
              // network error — retry
            }
            if (attempts < MAX_POLLS) {
              setTimeout(poll, POLL_INTERVAL_MS)
            } else {
              setStatusUrlPending(false)
            }
          }

          // Start first poll after 3 seconds (give webhook time to fire)
          setTimeout(poll, POLL_INTERVAL_MS)
        }
      } catch {
        console.error('Failed to parse order data')
      }
    }
    setIsLoading(false)
  }, [])

  // Calculate totals
  const itemsTotal = order?.items.reduce((sum, item) => sum + item.totalPrice, 0) || 0
  const moldTotal = order?.items.reduce((sum, item) => sum + (item.moldFee || 0), 0) || 0
  const expressTotal = order?.items.reduce((sum, item) => sum + (item.expressDeliveryFee || 0), 0) || 0
  const shippingFee = order?.shippingFee ?? 0

  // Delivery estimate: express = 12 business days, standard = 15 business days
  const hasExpress = (expressTotal ?? 0) > 0
  const deliveryBusinessDays = hasExpress ? 12 : 15
  const now = new Date()
  const estimatedShipDate = addBusinessDays(now, hasExpress ? 10 : 13)
  const estimatedDeliveryDate = addBusinessDays(now, deliveryBusinessDays)
  const manufacturingEndDate = addBusinessDays(now, hasExpress ? 9 : 12)

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

            {/* Secret Status URL */}
            <Card className="mb-6 border-[#00c8c8]/40 bg-[#00c8c8]/5">
              <CardContent className="p-6 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-[#00c8c8]/20 flex items-center justify-center flex-shrink-0">
                    <ExternalLink className="h-4 w-4 text-[#00c8c8]" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground text-sm">注文状況の確認URL</p>
                    <p className="text-xs text-muted-foreground">
                      注文状況をいつでも確認できる専用ページです。<br />
                      URLをメモするか、下のボタンでコピーして保存してください。<br />
                      <span className="text-primary font-medium">確認メールにも同じリンクが記載されています。</span>
                    </p>
                  </div>
                </div>

                {statusUrlPending ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    URLを生成中...
                  </div>
                ) : statusUrl ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        readOnly
                        value={statusUrl}
                        className="flex-1 text-xs font-mono bg-white border border-[#00c8c8]/30 rounded-lg px-3 py-2 text-foreground truncate"
                        onFocus={(e) => e.target.select()}
                      />
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(statusUrl).catch(() => {})
                          setCopiedUrl(true)
                          setTimeout(() => setCopiedUrl(false), 2000)
                        }}
                        className="shrink-0 px-3 py-2 text-xs font-medium bg-[#00c8c8] hover:bg-[#00b0b0] text-white rounded-lg transition"
                      >
                        {copiedUrl ? '✓ コピー済み' : 'コピー'}
                      </button>
                    </div>
                    <Link
                      href={statusUrl}
                      className="inline-flex items-center gap-1 text-xs text-[#00c8c8] hover:underline"
                    >
                      注文状況を今すぐ確認する
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    URLの取得に失敗しました。確認メールに記載のリンクをご確認ください。
                  </p>
                )}
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
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">商品代</span>
                    <span className="text-foreground">{formatPrice(itemsTotal)}</span>
                  </div>
                  {moldTotal > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">型代（初回のみ）</span>
                      <span className="text-foreground">{formatPrice(moldTotal)}</span>
                    </div>
                  )}
                  {expressTotal > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">⚡ 特急料金</span>
                      <span className="text-orange-600 font-medium">{formatPrice(expressTotal)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">送料</span>
                    {shippingFee > 0 ? (
                      <span className="text-orange-600 font-medium">{formatPrice(shippingFee)}</span>
                    ) : (
                      <span className="text-green-600 font-medium">無料</span>
                    )}
                  </div>
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
                  {order.shippingAddress.companyName && (
                    <p className="text-foreground font-medium">
                      {order.shippingAddress.companyName}
                      {order.shippingAddress.department && ` ${order.shippingAddress.department}`}
                    </p>
                  )}
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

        {/* Estimated Delivery Banner */}
        <div className="mb-6 rounded-xl border border-[#00c8c8]/40 bg-gradient-to-r from-[#00c8c8]/10 to-[#00c8c8]/5 p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-[#00c8c8]/20 flex items-center justify-center flex-shrink-0">
            <Truck className="h-6 w-6 text-[#00c8c8]" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-muted-foreground mb-0.5">お届け予定日</p>
            <p className="text-xl font-bold text-foreground">
              {formatDateJa(estimatedDeliveryDate)} 頃
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {hasExpress ? '⚡ 特急プランの場合（目安）' : '通常プラン（目安）'} ・ 土日祝を除く{deliveryBusinessDays}営業日
            </p>
          </div>
        </div>

        {/* Next Steps */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <h2 className="font-semibold text-lg text-foreground mb-5">
              今後の流れ
            </h2>
            <ol className="relative border-l border-border ml-4 space-y-0">
              {/* Step 1 */}
              <li className="mb-6 ml-6">
                <div className="absolute -left-3 w-6 h-6 rounded-full bg-accent flex items-center justify-center">
                  <Mail className="h-3 w-3 text-white" />
                </div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-foreground text-sm">注文確認メール送信</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      ご登録のメールアドレスに確認メールをお送りしました。
                    </p>
                    <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1 mt-1 inline-block">
                      ⚠ 届かない場合は迷惑メールフォルダをご確認ください
                    </p>
                  </div>
                  <span className="shrink-0 text-xs font-semibold text-accent bg-accent/10 px-2 py-0.5 rounded-full">完了</span>
                </div>
              </li>

              {/* Step 2 */}
              <li className="mb-6 ml-6">
                <div className="absolute -left-3 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                  <Package className="h-3 w-3 text-white" />
                </div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-foreground text-sm">製造開始</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      担当工場が製造を開始します。
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">本日〜1営業日</span>
                </div>
              </li>

              {/* Step 3 */}
              <li className="mb-6 ml-6">
                <div className="absolute -left-3 w-6 h-6 rounded-full bg-muted-foreground/30 flex items-center justify-center">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                </div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-foreground text-sm">製造完了</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      品質検査・梱包を行います。
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    {formatDateJa(manufacturingEndDate)} 頃
                  </span>
                </div>
              </li>

              {/* Step 4 */}
              <li className="mb-6 ml-6">
                <div className="absolute -left-3 w-6 h-6 rounded-full bg-muted-foreground/30 flex items-center justify-center">
                  <Truck className="h-3 w-3 text-muted-foreground" />
                </div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-foreground text-sm">発送・追跡番号のご連絡</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      発送完了時にメールで追跡番号をお知らせします。
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    {formatDateJa(estimatedShipDate)} 頃
                  </span>
                </div>
              </li>

              {/* Step 5 */}
              <li className="ml-6">
                <div className="absolute -left-3 w-6 h-6 rounded-full bg-muted-foreground/30 flex items-center justify-center">
                  <CheckCircle className="h-3 w-3 text-muted-foreground" />
                </div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-foreground text-sm">お届け</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      ご指定のお届け先にお届けします。
                    </p>
                  </div>
                  <span className="shrink-0 text-xs font-semibold text-[#00c8c8] bg-[#00c8c8]/10 px-2 py-0.5 rounded-full">
                    {formatDateJa(estimatedDeliveryDate)} 頃
                  </span>
                </div>
              </li>
            </ol>

            <p className="text-xs text-muted-foreground mt-5 pt-4 border-t border-border">
              ※ 上記はあくまで目安です。デザインの複雑さや繁忙期により変動する場合があります。<br />
              ご不明な点は <a href="mailto:contact@soara-mu.com" className="text-primary underline">contact@soara-mu.com</a> までお気軽にご連絡ください。
            </p>
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
