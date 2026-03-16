'use client'

import { useState } from 'react'
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

export function CheckoutClient() {
  const router = useRouter()
  const { cart, isLoading } = useCart()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const [formData, setFormData] = useState<ShippingAddress>({
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
  })

  const handleChange = (field: keyof ShippingAddress, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
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
    if (!/^[\d-]+$/.test(formData.phone))
      newErrors.phone = '正しい電話番号を入力してください'
    if (!formData.email.trim()) newErrors.email = 'メールアドレスを入力してください'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
      newErrors.email = '正しいメールアドレスを入力してください'

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setIsSubmitting(true)

    // Store shipping data in sessionStorage for use in payment page
    sessionStorage.setItem('shipping-address', JSON.stringify(formData))

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
                    <Input
                      id="postalCode"
                      value={formData.postalCode}
                      onChange={(e) => handleChange('postalCode', e.target.value)}
                      placeholder="123-4567"
                      className={`max-w-xs ${errors.postalCode ? 'border-destructive' : ''}`}
                    />
                    {errors.postalCode && (
                      <p className="text-xs text-destructive">{errors.postalCode}</p>
                    )}
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

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
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
                        {item.designImage && (
                          <img
                            src={item.designImage}
                            alt="デザイン"
                            className="w-full h-full object-contain"
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {item.productName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {item.quantity}個
                        </p>
                        <p className="text-sm font-medium text-foreground">
                          {formatPrice(item.totalPrice)}
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
                    <span className="text-muted-foreground">送料</span>
                    <span className="text-foreground">無料</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-border">
                    <span className="font-semibold text-foreground">合計</span>
                    <span className="text-xl font-bold text-accent">
                      {formatPrice(cart.totalPrice)}
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
