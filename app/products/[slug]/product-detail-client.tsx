'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ShoppingCart, Check, ChevronRight, ChevronDown, Star, Shield, Truck, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ImageUploader } from '@/components/image-uploader'
import { ProductPreview } from '@/components/product-preview'
import { useCart } from '@/components/cart-provider'
import {
  type Product,
  calculateUnitPrice,
  calculateTotalPrice,
  formatPrice,
} from '@/lib/products'

interface ProductDetailClientProps {
  product: Product
}

export function ProductDetailClient({ product }: ProductDetailClientProps) {
  const router = useRouter()
  const { addItem } = useCart()

  const [quantity, setQuantity] = useState(product.minQuantity)
  const [designImage, setDesignImage] = useState<string | null>(null)
  const [designFileName, setDesignFileName] = useState<string | null>(null)
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {}
    product.options.forEach((option) => {
      if (option.values.length > 0) {
        initial[option.id] = option.values[0].id
      }
    })
    return initial
  })
  const [isAdded, setIsAdded] = useState(false)
  const [customQuantity, setCustomQuantity] = useState('')
  const [moldOrderId, setMoldOrderId] = useState('')
  const [moldReuseValid, setMoldReuseValid] = useState<boolean | null>(null)
  const [moldReuseMessage, setMoldReuseMessage] = useState('')
  const [checkingMold, setCheckingMold] = useState(false)

  // Helper function to format price modifier
  const formatPriceModifier = (modifier?: { type: 'add' | 'multiply'; value: number }) => {
    if (!modifier) return ''
    if (modifier.type === 'add') {
      return `+${formatPrice(modifier.value)}`
    } else if (modifier.type === 'multiply') {
      const percent = Math.round((modifier.value - 1) * 100)
      return percent > 0 ? `+${percent}%` : `${percent}%`
    }
    return ''
  }

  const handleImageSelect = (imageData: string | null, fileName: string | null) => {
    setDesignImage(imageData)
    setDesignFileName(fileName)
  }

  const handleOptionChange = (optionId: string, valueId: string) => {
    setSelectedOptions((prev) => ({
      ...prev,
      [optionId]: valueId,
    }))
  }

  const handleQuantitySelect = (qty: number) => {
    setQuantity(qty)
    setCustomQuantity('')
  }

  const handleCustomQuantityChange = (value: string) => {
    setCustomQuantity(value)
    const num = parseInt(value, 10)
    if (!isNaN(num) && num >= product.minQuantity && num <= product.maxQuantity) {
      setQuantity(num)
    }
  }

  const handleAddToCart = () => {
    if (!designImage) {
      alert('デザイン画像をアップロードしてください')
      return
    }

    const options = Object.entries(selectedOptions).map(([id, valueId]) => {
      const option = product.options.find((o) => o.id === id)
      const value = option?.values.find((v) => v.id === valueId)
      return {
        id,
        name: option?.name || id,
        value: value?.label || valueId,
      }
    })

    addItem({
      productId: product.id,
      productName: product.name,
      quantity,
      options,
      designImage,
      designFileName,
      moldFee: moldFee > 0 ? moldFee : undefined,
      moldOrderId: moldReuseValid && moldOrderId ? moldOrderId : undefined,
    })

    setIsAdded(true)
    setTimeout(() => setIsAdded(false), 2000)
  }

  const handleBuyNow = () => {
    handleAddToCart()
    router.push('/cart')
  }

  const unitPrice = calculateUnitPrice(product, quantity, selectedOptions)
  const totalPriceItems = calculateTotalPrice(product, quantity, selectedOptions)
  const moldFee = product.requiresMold && moldReuseValid !== true ? (product.moldFee ?? 0) : 0
  const totalPrice = totalPriceItems + moldFee
  const baseTier = product.priceTiers[0]
  const discountPercent = baseTier.unitPrice > unitPrice
    ? Math.round((1 - unitPrice / baseTier.unitPrice) * 100)
    : 0

  const handleMoldCheck = async () => {
    if (!moldOrderId.trim()) return
    setCheckingMold(true)
    setMoldReuseValid(null)
    try {
      const { checkMoldReuse } = await import('@/app/actions/mold')
      const result = await checkMoldReuse(moldOrderId, product.id)
      setMoldReuseValid(result.valid)
      setMoldReuseMessage(result.reason ?? '✅ 型の再利用が確認できました。型代は発生しません。')
    } finally {
      setCheckingMold(false)
    }
  }

  return (
    <div className="py-6 md:py-10 bg-background min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link href="/" className="hover:text-foreground transition-colors">
            ホーム
          </Link>
          <ChevronRight className="h-4 w-4" />
          <Link href="/products" className="hover:text-foreground transition-colors">
            商品一覧
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground font-medium">{product.name}</span>
        </nav>

        {/* Product Title */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
            {product.name}
          </h1>
          <p className="text-muted-foreground">{product.shortDescription}</p>
        </div>

        {/* Main Grid - StickerApp Style 4 Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
          {/* Column 1: Product Type & Shape */}
          <div className="lg:col-span-2 space-y-6">
            {product.options.filter(o => o.id === 'shape' || o.id === 'type').map((option) => (
              <div key={option.id}>
                <h3 className="font-semibold text-foreground mb-3">{option.name}</h3>
                <div className="space-y-1">
                  {option.values.map((value) => {
                    const priceLabel = formatPriceModifier(value.priceModifier)
                    return (
                      <button
                        key={value.id}
                        onClick={() => handleOptionChange(option.id, value.id)}
                        className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-left text-sm transition-all ${selectedOptions[option.id] === value.id
                          ? 'bg-primary/10 text-primary font-medium border border-primary/30'
                          : 'hover:bg-muted text-foreground border border-transparent'
                          }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${selectedOptions[option.id] === value.id
                            ? 'border-primary bg-primary'
                            : 'border-border'
                            }`}>
                            {selectedOptions[option.id] === value.id && (
                              <Check className="w-3 h-3 text-primary-foreground" />
                            )}
                          </div>
                          {value.label}
                        </div>
                        {priceLabel && (
                          <span className="text-xs font-semibold text-green-600">{priceLabel}</span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}

            {/* Dropdown Options */}
            {product.options.filter(o => o.type === 'dropdown').map((option) => (
              <div key={option.id}>
                <h3 className="font-semibold text-foreground mb-3">{option.name}</h3>
                <div className="relative">
                  <select
                    value={selectedOptions[option.id] || ''}
                    onChange={(e) => handleOptionChange(option.id, e.target.value)}
                    className="w-full appearance-none bg-card border border-border rounded-lg px-3 py-2.5 text-sm text-foreground pr-10 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  >
                    {option.values.map((value) => {
                      const priceLabel = formatPriceModifier(value.priceModifier)
                      return (
                        <option key={value.id} value={value.id}>
                          {value.label}{priceLabel ? ` ${priceLabel}` : ''}
                        </option>
                      )
                    })}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>
            ))}
          </div>

          {/* Column 2: Material */}
          <div className="lg:col-span-3">
            {product.options.filter(o => o.id === 'material' || (o.type === 'grid' && o.id !== 'material')).map((option) => (
              <div key={option.id}>
                <h3 className="font-semibold text-foreground mb-3">{option.name}</h3>
                <div className="grid grid-cols-3 gap-2">
                  {option.values.map((value) => {
                    const priceLabel = formatPriceModifier(value.priceModifier)
                    return (
                      <button
                        key={value.id}
                        onClick={() => handleOptionChange(option.id, value.id)}
                        className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all relative ${selectedOptions[option.id] === value.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-muted-foreground/30 bg-card'
                          }`}
                      >
                        {priceLabel && (
                          <span className="absolute top-1 right-1 text-[10px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded">
                            {priceLabel}
                          </span>
                        )}
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-muted to-secondary flex items-center justify-center overflow-hidden">
                          {value.imageUrl ? (
                            <Image
                              src={value.imageUrl}
                              alt={value.label}
                              width={48}
                              height={48}
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/40" />
                          )}
                        </div>
                        <span className="text-xs text-center font-medium leading-tight">
                          {value.label}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Column 3: Size */}
          <div className="lg:col-span-3">
            {product.options.filter(o => o.id === 'size').map((option) => (
              <div key={option.id}>
                <h3 className="font-semibold text-foreground mb-3">{option.name}</h3>
                <div className="bg-card rounded-lg border border-border overflow-hidden">
                  <div className="max-h-[400px] overflow-y-auto">
                    {option.values.map((value, index) => {
                      const priceLabel = formatPriceModifier(value.priceModifier)
                      return (
                        <button
                          key={value.id}
                          onClick={() => handleOptionChange(option.id, value.id)}
                          className={`w-full flex items-center justify-between px-4 py-3 text-sm transition-all ${selectedOptions[option.id] === value.id
                            ? 'bg-primary/10 text-primary font-semibold'
                            : 'hover:bg-muted text-foreground'
                            } ${index !== option.values.length - 1 ? 'border-b border-border' : ''}`}
                        >
                          <span>{value.label}</span>
                          <div className="flex items-center gap-2">
                            {priceLabel && (
                              <span className="text-xs font-semibold text-green-600">{priceLabel}</span>
                            )}
                            {selectedOptions[option.id] === value.id && (
                              <Check className="w-4 h-4" />
                            )}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Column 4: Quantity & Price */}
          <div className="lg:col-span-4">
            <h3 className="font-semibold text-foreground mb-3">数量</h3>
            <div className="bg-card rounded-lg border border-border overflow-hidden">
              <div className="max-h-[400px] overflow-y-auto">
                {product.priceTiers.map((tier, index) => {
                  const tierQty = tier.minQuantity
                  const tierTotal = tier.unitPrice * tierQty
                  const isSelected = quantity >= tier.minQuantity &&
                    (index === product.priceTiers.length - 1 || quantity < product.priceTiers[index + 1].minQuantity)

                  return (
                    <button
                      key={tier.minQuantity}
                      onClick={() => handleQuantitySelect(tier.minQuantity)}
                      className={`w-full grid grid-cols-3 items-center px-4 py-3 text-sm transition-all ${isSelected
                        ? 'bg-primary/10'
                        : 'hover:bg-muted'
                        } ${index !== product.priceTiers.length - 1 ? 'border-b border-border' : ''}`}
                    >
                      <span className={`text-left ${isSelected ? 'font-bold text-primary' : 'font-medium text-foreground'}`}>
                        {tier.minQuantity}個
                      </span>
                      <span className={`text-center ${isSelected ? 'font-bold text-primary' : 'text-foreground'}`}>
                        {formatPrice(tierTotal)}
                      </span>
                      <span className={`text-right text-xs ${tier.discountPercent ? 'text-green-600 font-semibold' : 'text-muted-foreground'}`}>
                        {tier.discountPercent ? `- ${tier.discountPercent}%` : ''}
                      </span>
                    </button>
                  )
                })}
                {/* Custom Quantity Input */}
                <div className="px-4 py-3 border-t border-border">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={customQuantity}
                      onChange={(e) => handleCustomQuantityChange(e.target.value)}
                      placeholder="枚数を指定"
                      min={product.minQuantity}
                      max={product.maxQuantity}
                      className="flex-1 px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                    <span className="text-sm text-muted-foreground">個</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {product.minQuantity}〜{product.maxQuantity.toLocaleString()}個
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Design Upload & Preview Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Design Upload */}
          <Card className="border-2 border-dashed border-border hover:border-primary/50 transition-colors">
            <CardContent className="p-6">
              <h3 className="font-semibold text-foreground text-lg mb-4 flex items-center gap-2">
                デザインをアップロード
                <Info className="w-4 h-4 text-muted-foreground" />
              </h3>
              <ImageUploader
                onImageSelect={handleImageSelect}
                currentImage={designImage}
                currentFileName={designFileName}
                selectedShape={selectedOptions['shape'] || 'die-cut'}
              />
            </CardContent>
          </Card>

          {/* Preview */}
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold text-foreground text-lg mb-4">プレビュー</h3>
              <ProductPreview
                product={product}
                designImage={designImage}
                selectedOptions={selectedOptions}
              />
            </CardContent>
          </Card>
        </div>

        {/* Mold Fee Exemption Section */}
        {product.requiresMold && (
          <Card className="mb-8 border-2 border-[#ffe135]/30 bg-gradient-to-r from-[#ffe135]/5 to-transparent">
            <CardContent className="p-6">
              <div className="flex items-start gap-3 mb-4">
                <Info className="w-5 h-5 text-[#ff7b54] flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-foreground text-lg mb-2">
                    型代について（初回のみ {formatPrice(product.moldFee || 0)}）
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    この商品は型が必要です。過去に同じ商品をご注文いただいている場合、注文番号を入力すると型代が免除されます。
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={moldOrderId}
                  onChange={(e) => setMoldOrderId(e.target.value)}
                  placeholder="過去の注文番号を入力（例：cs_test_...）"
                  className="flex-1 px-4 py-2.5 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  disabled={checkingMold}
                />
                <Button
                  onClick={handleMoldCheck}
                  disabled={!moldOrderId.trim() || checkingMold}
                  className="sm:w-auto bg-[#00c8c8] hover:bg-[#00b0b0] text-white"
                >
                  {checkingMold ? '確認中...' : '型の再利用を確認'}
                </Button>
              </div>

              {moldReuseMessage && (
                <div className={`mt-4 p-3 rounded-lg text-sm ${moldReuseValid
                    ? 'bg-green-50 text-green-800 border border-green-200'
                    : 'bg-red-50 text-red-800 border border-red-200'
                  }`}>
                  {moldReuseMessage}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Price Summary & Actions */}
        <Card className="sticky bottom-4 shadow-2xl border-2">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              {/* Price Summary */}
              <div className="flex flex-wrap items-center gap-6">
                <div>
                  <p className="text-sm text-muted-foreground">数量</p>
                  <p className="text-2xl font-bold text-foreground">{quantity.toLocaleString()}個</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">単価</p>
                  <p className="text-lg font-semibold text-foreground">{formatPrice(unitPrice)}/個</p>
                </div>
                {moldFee > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground">型代（初回のみ）</p>
                    <p className="text-lg font-semibold text-[#ff7b54]">{formatPrice(moldFee)}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground">合計金額</p>
                  <div className="flex flex-col gap-1">
                    {moldFee > 0 && (
                      <p className="text-sm text-muted-foreground">
                        商品代: {formatPrice(totalPriceItems)}
                      </p>
                    )}
                    <div className="flex items-baseline gap-2">
                      <p className="text-3xl font-bold text-primary">{formatPrice(totalPrice)}</p>
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
                  <span>最短5営業日</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-primary" />
                  <span>高品質保証</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Star className="w-4 h-4 text-primary" />
                  <span>満足度98%</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  size="lg"
                  variant="outline"
                  className="flex-1 lg:flex-none h-12 px-6 rounded-xl"
                  onClick={handleAddToCart}
                  disabled={!designImage}
                >
                  {isAdded ? (
                    <>
                      <Check className="h-5 w-5 mr-2" />
                      追加しました
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="h-5 w-5 mr-2" />
                      カートに追加
                    </>
                  )}
                </Button>
                <Button
                  size="lg"
                  className="flex-1 lg:flex-none h-12 px-8 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25"
                  onClick={handleBuyNow}
                  disabled={!designImage}
                >
                  今すぐ購入
                </Button>
              </div>
            </div>

            {!designImage && (
              <p className="text-sm text-muted-foreground text-center mt-4 py-2 px-4 bg-muted rounded-lg">
                デザイン画像をアップロードすると購入できます
              </p>
            )}
          </CardContent>
        </Card>

        {/* Features */}
        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
          {product.features.map((feature) => (
            <div
              key={feature}
              className="flex items-center gap-2 px-4 py-3 bg-card rounded-lg border border-border"
            >
              <Check className="w-4 h-4 text-primary flex-shrink-0" />
              <span className="text-sm text-foreground">{feature}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
