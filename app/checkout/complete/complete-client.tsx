'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CheckCircle, ExternalLink, Loader2, ArrowRight, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { type CartItem } from '@/lib/cart'
import { type ShippingAddress } from '@/lib/order'

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
    let cancelled = false
    let timerId: ReturnType<typeof setTimeout>

    let savedOrder: string | null = null
    try {
      savedOrder = sessionStorage.getItem('completed-order')
    } catch {
      // sessionStorage unavailable (e.g. some privacy settings) — show minimal page
    }
    if (savedOrder) {
      try {
        const parsed = JSON.parse(savedOrder) as CompletedOrder
        setOrder(parsed)

        if (parsed.sessionId) {
          setStatusUrlPending(true)
          let attempts = 0

          const poll = async () => {
            if (cancelled) return
            attempts++
            try {
              const res = await fetch(
                `/api/orders/status-link?session_id=${encodeURIComponent(parsed.sessionId!)}`
              )
              if (res.ok) {
                const data = await res.json()
                if (!cancelled) {
                  setStatusUrl(data.statusUrl)
                  setStatusUrlPending(false)
                }
                return
              }
            } catch {
              // network error — retry
            }
            if (!cancelled) {
              if (attempts < MAX_POLLS) {
                timerId = setTimeout(poll, POLL_INTERVAL_MS)
              } else {
                setStatusUrlPending(false)
              }
            }
          }

          timerId = setTimeout(poll, POLL_INTERVAL_MS)
        }
      } catch {
        console.error('Failed to parse order data')
      }
    }
    setIsLoading(false)

    return () => { cancelled = true; clearTimeout(timerId) }
  }, [])

  const hasMoldItems = (order?.items ?? []).some((item) => (item.moldFee ?? 0) > 0)

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
      <div className="max-w-lg mx-auto px-4 sm:px-6 lg:px-8">
        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">1</div>
            <span className="ml-2 text-sm font-medium text-foreground">お届け先</span>
          </div>
          <div className="w-16 h-0.5 bg-primary mx-4"></div>
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">2</div>
            <span className="ml-2 text-sm font-medium text-foreground">お支払い</span>
          </div>
          <div className="w-16 h-0.5 bg-primary mx-4"></div>
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-accent text-accent-foreground flex items-center justify-center font-semibold">3</div>
            <span className="ml-2 text-sm font-medium text-foreground">完了</span>
          </div>
        </div>

        {/* Success */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="h-10 w-10 text-accent" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">ご注文ありがとうございます</h1>
          <p className="text-muted-foreground text-sm">
            ご注文を承りました。確認メールをお送りしましたのでご確認ください。
          </p>
        </div>

        {/* Order Number */}
        {order && (
          <Card className="mb-6">
            <CardContent className="p-6 text-center">
              <p className="text-sm text-muted-foreground mb-1">発注番号</p>
              <p className="text-2xl font-bold text-foreground font-mono">{order.orderId}</p>
              <p className="text-xs text-muted-foreground mt-2">
                お問い合わせの際はこの番号をお伝えください
              </p>
            </CardContent>
          </Card>
        )}

        {/* Status URL */}
        <Card className="mb-6 border-[#1e73be]/40 bg-[#1e73be]/5">
          <CardContent className="p-6 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#1e73be]/20 flex items-center justify-center flex-shrink-0">
                <ExternalLink className="h-4 w-4 text-[#1e73be]" />
              </div>
              <div>
                <p className="font-semibold text-foreground text-sm">注文状況の確認URL</p>
                <p className="text-xs text-muted-foreground">
                  いつでも注文状況を確認できる専用ページです。<br />
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
                    className="flex-1 text-xs font-mono bg-white border border-[#1e73be]/30 rounded-lg px-3 py-2 text-foreground truncate"
                    onFocus={(e) => e.target.select()}
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(statusUrl).catch(() => {})
                      setCopiedUrl(true)
                      setTimeout(() => setCopiedUrl(false), 2000)
                    }}
                    className="shrink-0 px-3 py-2 text-xs font-medium bg-[#1e73be] hover:bg-[#1a66a8] text-white rounded-lg transition"
                  >
                    {copiedUrl ? '✓ コピー済み' : 'コピー'}
                  </button>
                </div>
                <Link
                  href={statusUrl}
                  className="inline-flex items-center gap-1 text-xs text-[#1e73be] hover:underline"
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

        {/* Mold re-use notice */}
        {hasMoldItems && (
          <Card className="mb-6 border-[#f5a623]/30 bg-[#f5a623]/5">
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-[#f5a623]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <RefreshCw className="h-4 w-4 text-[#9a6400]" />
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm mb-1">金型の再利用について</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    今回ご注文いただいた商品の金型は弊社で保管いたします。<br />
                    <strong className="text-foreground">初回ご注文から1年以内の再注文であれば、金型代は不要です。</strong><br />
                    同じ商品を追加発注される際はお気軽にご注文ください。
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

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
