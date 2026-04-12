'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, ShoppingBag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCart } from '@/components/cart-provider'
import { formatPrice } from '@/lib/products'
import { type ShippingAddress, PREFECTURES } from '@/lib/order'
import { calculateShippingByQuantity, calculateExpressShipping } from '@/lib/shipping'
import { calculateTotalQuantity } from '@/lib/cart'

interface CheckoutClientProps {
  /* shippingFees prop kept for signature compatibility but no longer used */
  shippingFees?: Record<string, number>
}

/** ひらがな → カタカナ変換（カナ入力欄で自動変換） */
function toKatakana(str: string): string {
  return str.replace(/[\u3041-\u3096]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) + 0x60)
  )
}

export function CheckoutClient({ shippingFees: _shippingFees }: CheckoutClientProps) {
  const router = useRouter()
  const { cart, isLoading } = useCart()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLookingUpAddress, setIsLookingUpAddress] = useState(false)
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [agreedToCancel, setAgreedToCancel] = useState(false)
  const [agreedToCopyright, setAgreedToCopyright] = useState(false)

  // ── Quantity-based shipping fee (computed from cart) ────────────────────────
  const totalQuantity = calculateTotalQuantity(cart.items)
  const baseShippingFee = calculateShippingByQuantity(totalQuantity)
  const hasExpress = cart.items.some((item) => item.expressDelivery)
  const shippingFee = hasExpress ? calculateExpressShipping(baseShippingFee) : baseShippingFee

  // Debounce timer ref for postal code lookup
  const postalCodeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const debouncedLookupPostalCode = useCallback((digits: string) => {
    if (postalCodeTimerRef.current) {
      clearTimeout(postalCodeTimerRef.current)
    }
    postalCodeTimerRef.current = setTimeout(() => {
      lookupPostalCode(digits)
      postalCodeTimerRef.current = null
    }, 300)
  }, [])

  const [formData, setFormData] = useState<ShippingAddress>({
    companyName: '',
    department: '',
    poNumber: '',
    lastName: '',
    firstName: '',
    lastNameKana: '',
    firstNameKana: '',
    postalCode: '',
    prefecture: '',
    city: '',
    address1: '',
    address2: '',
    phone: '',
    email: '',
    receiptAddressee: '',
  })

  const handleChange = (field: keyof ShippingAddress, value: string) => {
    // カナ入力欄はひらがなをカタカナに自動変換
    if (field === 'lastNameKana' || field === 'firstNameKana') {
      value = toKatakana(value)
    }
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
    if (field === 'postalCode') {
      const digits = value.replace(/-/g, '')
      if (digits.length === 7 && /^\d{7}$/.test(digits)) {
        debouncedLookupPostalCode(digits)
      } else if (postalCodeTimerRef.current) {
        // Cancel pending lookup if user changed input away from 7 digits
        clearTimeout(postalCodeTimerRef.current)
        postalCodeTimerRef.current = null
      }
    }
  }

  const lookupPostalCode = async (digits: string) => {
    setIsLookingUpAddress(true)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)
    try {
      const res = await fetch(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${digits}`, {
        signal: controller.signal,
      })
      const json = await res.json()
      if (json.results && json.results.length > 0) {
        const result = json.results[0]
        const prefecture = result.address1 ?? ''
        const city = `${result.address2 ?? ''}${result.address3 ?? ''}`
        setFormData((prev) => ({ ...prev, prefecture, city }))
        setErrors((prev) => {
          const next = { ...prev }
          delete next.prefecture
          delete next.city
          return next
        })
      }
    } catch {
      // 住所自動入力に失敗した場合は何もしない（タイムアウト含む）
    } finally {
      clearTimeout(timeoutId)
      setIsLookingUpAddress(false)
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.lastName.trim()) newErrors.lastName = '姓を入力してください'
    if (!formData.firstName.trim()) newErrors.firstName = '名を入力してください'
    if (!formData.lastNameKana.trim())
      newErrors.lastNameKana = 'セイを入力してください'
    if (!formData.firstNameKana.trim())
      newErrors.firstNameKana = 'メイを入力してください'
    if (!formData.postalCode.trim())
      newErrors.postalCode = '郵便番号を入力してください'
    if (!/^\d{3}-?\d{4}$/.test(formData.postalCode))
      newErrors.postalCode = '正しい郵便番号を入力してください'
    if (!formData.prefecture) newErrors.prefecture = '都道府県を選択してください'
    if (!formData.city.trim()) newErrors.city = '市区町村を入力してください'
    if (!formData.address1.trim())
      newErrors.address1 = '番地を入力してください'
    if (!formData.phone.trim()) newErrors.phone = '電話番号を入力してください'
    if (!/^[\d-]+$/.test(formData.phone) || formData.phone.replace(/-/g, '').length < 10)
      newErrors.phone = '正しい電話番号を入力してください（10桁以上の数字）'
    if (!formData.email.trim()) newErrors.email = 'メールアドレスを入力してください'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
      newErrors.email = '正しいメールアドレスを入力してください'

    if (!agreedToTerms) newErrors.agreedToTerms = '利用規約・プライバシーポリシーへの同意が必要です'
    if (!agreedToCancel) newErrors.agreedToCancel = 'キャンセル・返金不可についての確認が必要です'
    if (!agreedToCopyright) newErrors.agreedToCopyright = '著作権に関する確認が必要です'

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setIsSubmitting(true)

    // Store shipping data in sessionStorage for use in payment page
    try {
      sessionStorage.setItem('shipping-address', JSON.stringify(formData))
      sessionStorage.setItem('shipping-fee', String(shippingFee))
    } catch {
      // Private browsing or quota exceeded — data will be unavailable on payment
      // page, but the server action re-validates everything anyway.
    }

    router.push('/checkout/payment')
  }

  if (isLoading) {
    return (
      <div className="py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/4"></div>
            <div className="h-64 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (cart.items.length === 0) {
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
            商品を追加してから注文手続きを行ってください
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
          href="/cart"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          カートに戻る
        </Link>

        <h1 className="text-3xl font-bold text-foreground mb-8">注文手続き</h1>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
              1
            </div>
            <span className="ml-2 text-sm font-medium text-foreground">お届け先</span>
          </div>
          <div className="w-16 h-0.5 bg-border mx-4"></div>
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center font-semibold">
              2
            </div>
            <span className="ml-2 text-sm text-muted-foreground">お支払い</span>
          </div>
          <div className="w-16 h-0.5 bg-border mx-4"></div>
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center font-semibold">
              3
            </div>
            <span className="ml-2 text-sm text-muted-foreground">完了</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Shipping Form */}
          <div className="lg:col-span-2">
            <Card>
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold text-foreground mb-6">
                  お届け先情報
                </h2>

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Company (optional — for B2B) */}
                  <div className="space-y-4 pb-4 border-b border-border">
                    <p className="text-xs text-muted-foreground font-medium">法人でご利用の場合（任意）</p>
                    <div className="space-y-2">
                      <Label htmlFor="companyName">会社名</Label>
                      <Input
                        id="companyName"
                        value={formData.companyName ?? ''}
                        onChange={(e) => handleChange('companyName', e.target.value)}
                        placeholder="株式会社〇〇"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="department">部署名</Label>
                      <Input
                        id="department"
                        value={formData.department ?? ''}
                        onChange={(e) => handleChange('department', e.target.value)}
                        placeholder="総務部"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="poNumber">発注番号（PO番号）</Label>
                      <Input
                        id="poNumber"
                        value={formData.poNumber ?? ''}
                        onChange={(e) => handleChange('poNumber', e.target.value)}
                        placeholder="PO-2026-0001"
                      />
                      <p className="text-xs text-muted-foreground">領収書・請求書に印字されます</p>
                    </div>
                  </div>

                  {/* Name */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="lastName">
                        姓 <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="lastName"
                        value={formData.lastName}
                        onChange={(e) => handleChange('lastName', e.target.value)}
                        placeholder="山田"
                        className={errors.lastName ? 'border-destructive' : ''}
                      />
                      {errors.lastName && (
                        <p className="text-xs text-destructive">{errors.lastName}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="firstName">
                        名 <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="firstName"
                        value={formData.firstName}
                        onChange={(e) => handleChange('firstName', e.target.value)}
                        placeholder="太郎"
                        className={errors.firstName ? 'border-destructive' : ''}
                      />
                      {errors.firstName && (
                        <p className="text-xs text-destructive">{errors.firstName}</p>
                      )}
                    </div>
                  </div>

                  {/* Name Kana */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="lastNameKana">
                        セイ（カナ） <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="lastNameKana"
                        value={formData.lastNameKana}
                        onChange={(e) => handleChange('lastNameKana', e.target.value)}
                        placeholder="ヤマダ"
                        className={errors.lastNameKana ? 'border-destructive' : ''}
                      />
                      {errors.lastNameKana && (
                        <p className="text-xs text-destructive">{errors.lastNameKana}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="firstNameKana">
                        メイ（カナ） <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="firstNameKana"
                        value={formData.firstNameKana}
                        onChange={(e) => handleChange('firstNameKana', e.target.value)}
                        placeholder="タロウ"
                        className={errors.firstNameKana ? 'border-destructive' : ''}
                      />
                      {errors.firstNameKana && (
                        <p className="text-xs text-destructive">{errors.firstNameKana}</p>
                      )}
                    </div>
                  </div>

                  {/* Postal Code */}
                  <div className="space-y-2">
                    <Label htmlFor="postalCode">
                      郵便番号 <span className="text-destructive">*</span>
                    </Label>
                    <div className="flex items-center gap-2 max-w-xs">
                      <Input
                        id="postalCode"
                        value={formData.postalCode}
                        onChange={(e) => handleChange('postalCode', e.target.value)}
                        placeholder="123-4567"
                        className={errors.postalCode ? 'border-destructive' : ''}
                      />
                      {isLookingUpAddress && (
                        <span className="text-xs text-muted-foreground whitespace-nowrap">検索中...</span>
                      )}
                    </div>
                    {errors.postalCode && (
                      <p className="text-xs text-destructive">{errors.postalCode}</p>
                    )}
                    <p className="text-xs text-muted-foreground">7桁入力で住所を自動入力</p>
                  </div>

                  {/* Prefecture */}
                  <div className="space-y-2">
                    <Label htmlFor="prefecture">
                      都道府県 <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={formData.prefecture}
                      onValueChange={(value) => handleChange('prefecture', value)}
                    >
                      <SelectTrigger
                        id="prefecture"
                        className={`max-w-xs ${errors.prefecture ? 'border-destructive' : ''}`}
                      >
                        <SelectValue placeholder="選択してください" />
                      </SelectTrigger>
                      <SelectContent>
                        {PREFECTURES.map((pref) => (
                          <SelectItem key={pref} value={pref}>
                            {pref}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.prefecture && (
                      <p className="text-xs text-destructive">{errors.prefecture}</p>
                    )}
                  </div>

                  {/* City */}
                  <div className="space-y-2">
                    <Label htmlFor="city">
                      市区町村 <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => handleChange('city', e.target.value)}
                      placeholder="千代田区"
                      className={errors.city ? 'border-destructive' : ''}
                    />
                    {errors.city && (
                      <p className="text-xs text-destructive">{errors.city}</p>
                    )}
                  </div>

                  {/* Address */}
                  <div className="space-y-2">
                    <Label htmlFor="address1">
                      番地 <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="address1"
                      value={formData.address1}
                      onChange={(e) => handleChange('address1', e.target.value)}
                      placeholder="1-1-1"
                      className={errors.address1 ? 'border-destructive' : ''}
                    />
                    {errors.address1 && (
                      <p className="text-xs text-destructive">{errors.address1}</p>
                    )}
                  </div>

                  {/* Address 2 */}
                  <div className="space-y-2">
                    <Label htmlFor="address2">建物名・部屋番号（任意）</Label>
                    <Input
                      id="address2"
                      value={formData.address2}
                      onChange={(e) => handleChange('address2', e.target.value)}
                      placeholder="〇〇ビル 101号室"
                    />
                  </div>

                  {/* Phone */}
                  <div className="space-y-2">
                    <Label htmlFor="phone">
                      電話番号 <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleChange('phone', e.target.value)}
                      placeholder="090-1234-5678"
                      className={`max-w-xs ${errors.phone ? 'border-destructive' : ''}`}
                    />
                    {errors.phone && (
                      <p className="text-xs text-destructive">{errors.phone}</p>
                    )}
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <Label htmlFor="email">
                      メールアドレス <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                      placeholder="example@email.com"
                      className={errors.email ? 'border-destructive' : ''}
                    />
                    {errors.email && (
                      <p className="text-xs text-destructive">{errors.email}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      注文確認メールをお送りします
                    </p>
                  </div>

                  {/* Receipt addressee (optional) */}
                  <div className="space-y-2 pt-4 border-t border-border">
                    <p className="text-xs font-medium text-muted-foreground">領収書について（任意）</p>
                    <Label htmlFor="receiptAddressee">領収書の宛名</Label>
                    <Input
                      id="receiptAddressee"
                      value={formData.receiptAddressee ?? ''}
                      onChange={(e) => handleChange('receiptAddressee', e.target.value)}
                      placeholder="例：株式会社〇〇 or 山田太郎（空欄の場合はお名前で発行）"
                    />
                    <p className="text-xs text-muted-foreground">
                      空欄の場合、ご入力いただいたお名前で発行されます。注文状況ページから再発行も可能です。
                    </p>
                  </div>

                  {/* Consent checkboxes */}
                  <div className="pt-4 border-t border-border space-y-4">
                    <p className="text-xs font-semibold text-foreground">ご注文前に以下をご確認ください</p>

                    {/* Terms + Privacy */}
                    <div className="space-y-1">
                      <label className="flex items-start gap-3 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={agreedToTerms}
                          onChange={(e) => {
                            setAgreedToTerms(e.target.checked)
                            if (e.target.checked && errors.agreedToTerms) {
                              setErrors((prev) => { const n = { ...prev }; delete n.agreedToTerms; return n })
                            }
                          }}
                          className="mt-0.5 h-4 w-4 rounded border-border accent-primary flex-shrink-0"
                        />
                        <span className="text-sm text-foreground leading-relaxed">
                          <Link href="/terms" target="_blank" className="text-primary underline hover:text-primary/80 font-medium">
                            利用規約
                          </Link>
                          および
                          <Link href="/privacy" target="_blank" className="text-primary underline hover:text-primary/80 font-medium">
                            プライバシーポリシー
                          </Link>
                          を読み、内容に同意します
                          <span className="text-destructive ml-1">*</span>
                        </span>
                      </label>
                      {errors.agreedToTerms && (
                        <p className="text-xs text-destructive pl-7">{errors.agreedToTerms}</p>
                      )}
                    </div>

                    {/* Cancel policy */}
                    <div className="space-y-1">
                      <label className="flex items-start gap-3 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={agreedToCancel}
                          onChange={(e) => {
                            setAgreedToCancel(e.target.checked)
                            if (e.target.checked && errors.agreedToCancel) {
                              setErrors((prev) => { const n = { ...prev }; delete n.agreedToCancel; return n })
                            }
                          }}
                          className="mt-0.5 h-4 w-4 rounded border-border accent-primary flex-shrink-0"
                        />
                        <span className="text-sm text-foreground leading-relaxed">
                          本サービスはお客様デザインによる
                          <strong>受注製造品のため、決済完了後のキャンセル・返金はできない</strong>
                          ことを理解しました。また、在庫不足・データ不備等、弊社の都合により
                          <strong>ご注文をキャンセルさせていただく場合がある</strong>
                          ことも理解しました
                          <span className="text-destructive ml-1">*</span>
                        </span>
                      </label>
                      {errors.agreedToCancel && (
                        <p className="text-xs text-destructive pl-7">{errors.agreedToCancel}</p>
                      )}
                    </div>

                    {/* Copyright agreement */}
                    <div className="space-y-1">
                      <label className="flex items-start gap-3 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={agreedToCopyright}
                          onChange={(e) => {
                            setAgreedToCopyright(e.target.checked)
                            if (e.target.checked && errors.agreedToCopyright) {
                              setErrors((prev) => { const n = { ...prev }; delete n.agreedToCopyright; return n })
                            }
                          }}
                          className="mt-0.5 h-4 w-4 rounded border-border accent-primary flex-shrink-0"
                        />
                        <span className="text-sm text-foreground leading-relaxed">
                          アップロードするデザインは<strong>第三者の著作権・商標権・肖像権その他の権利を侵害していない</strong>ことを確認しました。
                          権利侵害が判明した場合、<strong>注文のキャンセルおよびキャンセル料が発生する</strong>ことを理解しました
                          <span className="text-destructive ml-1">*</span>
                        </span>
                      </label>
                      {errors.agreedToCopyright && (
                        <p className="text-xs text-destructive pl-7">{errors.agreedToCopyright}</p>
                      )}
                    </div>

                    <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3">
                      <p className="text-xs text-amber-800 leading-relaxed">
                        <strong>⚠ キャンセル・返金不可について</strong><br />
                        ご注文の商品はお客様のご指定デザイン・仕様による受注製造品です。
                        製造開始後のキャンセル・変更・返品はお受けできません。
                        ご注文内容・デザインデータを十分ご確認のうえ、お進みください。
                      </p>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full bg-accent hover:bg-accent/90 text-accent-foreground disabled:opacity-50"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? '処理中...' : 'お支払いへ進む'}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </form>
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
                      <div className="w-16 h-16 bg-secondary rounded overflow-hidden flex-shrink-0">
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
                        <p className="text-sm font-medium text-foreground">
                          {formatPrice(item.totalPrice + (item.moldFee || 0) + (item.expressDeliveryFee || 0) + (item.shippingModifier || 0))}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-border pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">小計</span>
                    <span className="text-foreground">
                      {formatPrice(cart.totalPrice)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      送料{hasExpress ? '（特急便）' : ''}
                    </span>
                    <span className="text-foreground font-medium">
                      {formatPrice(shippingFee)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    合計数量: {totalQuantity}個
                    {hasExpress && ' / 特急便: 送料×2'}
                  </p>
                  <div className="flex justify-between pt-2 border-t border-border">
                    <span className="font-semibold text-foreground">合計</span>
                    <span className="text-xl font-bold text-accent">
                      {formatPrice(cart.totalPrice + shippingFee)}
                    </span>
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
