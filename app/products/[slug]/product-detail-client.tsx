'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Check, ChevronRight, Truck, Info } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { ImageUploader } from '@/components/image-uploader'
import { MultiViewUploader } from '@/components/multi-view-uploader'
import { type DesignImageEntry } from '@/lib/cart'
import { ProductPreview } from '@/components/product-preview'
import { useCart } from '@/components/cart-provider'
import {
  type Product,
  calculateUnitPrice,
  calculateTotalPrice,
  calculateMoldFee,
  calculateShippingModifier,
  formatPrice,
  checkComplexityRestriction,
} from '@/lib/products'
import { OptionSelector, isOptionVisible, getDescendantIds } from './option-selector'
import { PriceSummary } from './price-summary'
import { MoldReuseSection } from './mold-reuse-section'

interface ProductDetailClientProps {
  product: Product
}

export function ProductDetailClient({ product }: ProductDetailClientProps) {
  const router = useRouter()
  const { addItem } = useCart()

  const [quantity, setQuantity] = useState(product.minQuantity)
  const [designImage, setDesignImage] = useState<string | null>(null)
  const [designFileName, setDesignFileName] = useState<string | null>(null)
  const [deliveryPdfUrl, setDeliveryPdfUrl] = useState<string | null>(null)
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {}
    // First pass: set defaults for top-level options
    product.options.forEach((option) => {
      if (option.type === 'checkbox' || option.type === 'number') return
      if (option.parentId) return // skip child options initially
      if (option.values.length > 0) {
        initial[option.id] = option.values[0].id
      }
    })
    // Second pass: set defaults for child options whose parents are selected and showWhen matches
    product.options.forEach((option) => {
      if (option.type === 'checkbox' || option.type === 'number') return
      if (!option.parentId) return
      const parentValue = initial[option.parentId]
      if (!parentValue) return
      if (option.showWhen && option.showWhen.length > 0 && !option.showWhen.includes(parentValue)) return
      if (option.values.length > 0) {
        initial[option.id] = option.values[0].id
      }
    })
    return initial
  })
  const [isAdded, setIsAdded] = useState(false)
  const [customQuantity, setCustomQuantity] = useState('')
  const [expressDelivery, setExpressDelivery] = useState(false)
  const [draftRestored, setDraftRestored] = useState(false)
  const [moldOrderId, setMoldOrderId] = useState('')
  const [moldEmail, setMoldEmail] = useState('')
  const [moldReuseValid, setMoldReuseValid] = useState<boolean | null>(null)
  const [moldReuseMessage, setMoldReuseMessage] = useState('')
  const [checkingMold, setCheckingMold] = useState(false)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [backDesignImage, setBackDesignImage] = useState<string | null>(null)
  const [backDesignFileName, setBackDesignFileName] = useState<string | null>(null)
  const [backDeliveryPdfUrl, setBackDeliveryPdfUrl] = useState<string | null>(null)
  const [backPreviewImage, setBackPreviewImage] = useState<string | null>(null)
  const [designImages, setDesignImages] = useState<DesignImageEntry[]>([])
  const [allRequiredDone, setAllRequiredDone] = useState(false)
  const [viewPreviews, setViewPreviews] = useState<Record<string, string>>({})
  // Stable callback ref to avoid DesignCanvas useEffect re-triggering on every render
  const handlePreviewChange = useCallback((dataUrl: string) => {
    setPreviewImage(dataUrl)
  }, [])
  const handleViewPreviewChange = useCallback((viewId: string, dataUrl: string) => {
    setViewPreviews((prev) => ({ ...prev, [viewId]: dataUrl }))
  }, [])
  const handleBackPreviewChange = useCallback((dataUrl: string) => {
    setBackPreviewImage(dataUrl)
  }, [])
  const isAddedTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  const is3d = product.is3d && product.imageViews && product.imageViews.length > 0

  const handleMultiViewImagesChange = useCallback(
    (images: DesignImageEntry[], requiredDone: boolean) => {
      setDesignImages(images)
      setAllRequiredDone(requiredDone)
    },
    [],
  )

  // Restore draft from localStorage on mount
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    try {
      const saved = localStorage.getItem(`draft-design-${product.id}`)
      if (saved) {
        const data = JSON.parse(saved)
        if (data.quantity && data.quantity >= product.minQuantity && data.quantity <= product.maxQuantity) {
          setQuantity(data.quantity)
        }
        if (data.selectedOptions && typeof data.selectedOptions === 'object') {
          setSelectedOptions((prev) => ({ ...prev, ...data.selectedOptions }))
        }
        if (typeof data.expressDelivery === 'boolean') {
          setExpressDelivery(data.expressDelivery)
        }
        setDraftRestored(true)
        timer = setTimeout(() => setDraftRestored(false), 3000)
      }
    } catch {}
    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id])

  // Persist draft to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem(
        `draft-design-${product.id}`,
        JSON.stringify({ quantity, selectedOptions, expressDelivery })
      )
    } catch {}
  }, [quantity, selectedOptions, expressDelivery, product.id])

  // Helper function to format price modifier
  const formatPriceModifier = (modifier?: { type: 'add' | 'multiply'; value: number }) => {
    if (!modifier || product.fixedUnitPrice) return ''
    if (modifier.type === 'add') {
      return `+${formatPrice(modifier.value)}`
    } else if (modifier.type === 'multiply') {
      const percent = Math.round((modifier.value - 1) * 100)
      return percent > 0 ? `+${percent}%` : `${percent}%`
    }
    return ''
  }

  const handleImageSelect = (imageData: string | null, fileName: string | null, pdfUrl?: string | null) => {
    setDesignImage(imageData)
    setDesignFileName(fileName)
    setDeliveryPdfUrl(pdfUrl ?? null)
    if (!imageData) setPreviewImage(null)
  }

  const handleBackImageSelect = (imageData: string | null, fileName: string | null, pdfUrl?: string | null) => {
    setBackDesignImage(imageData)
    setBackDesignFileName(fileName)
    setBackDeliveryPdfUrl(pdfUrl ?? null)
    if (!imageData) setBackPreviewImage(null)
  }

  // Determine if this product needs a second (back) design upload
  const needsBackDesign = selectedOptions['double_sided'] === 'double' && selectedOptions['second_design'] === 'different'

  const handleOptionChange = (optionId: string, valueId: string) => {
    setSelectedOptions((prev) => {
      const next = { ...prev, [optionId]: valueId }
      // Clear child options that are no longer visible
      product.options.forEach((opt) => {
        if (opt.parentId === optionId) {
          if (opt.showWhen && opt.showWhen.length > 0 && !opt.showWhen.includes(valueId)) {
            delete next[opt.id]
            // Also clear grandchildren
            getDescendantIds(opt.id, product.options).forEach((id) => delete next[id])
          }
        }
      })
      return next
    })
  }

  const handleCheckboxToggle = (optionId: string, valueId: string) => {
    setSelectedOptions((prev) => {
      const current = (prev[optionId] || '').split(',').filter(Boolean)
      const idx = current.indexOf(valueId)
      if (idx >= 0) current.splice(idx, 1)
      else current.push(valueId)
      return { ...prev, [optionId]: current.join(',') }
    })
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

  const handleAddToCart = (): boolean => {
    if (complexityBlock) {
      alert(complexityBlock)
      return false
    }
    if (is3d) {
      if (designImages.length === 0) {
        alert('デザイン画像をアップロードしてください')
        return false
      }
      if (!allRequiredDone) {
        alert('必須の面すべてで「納品データを確定（PDF生成）」を完了してください')
        return false
      }
    } else {
      if (!designImage) {
        alert('デザイン画像をアップロードしてください')
        return false
      }
      if (!deliveryPdfUrl) {
        alert('「納品データを確定（PDF生成）」ボタンを押してから追加してください')
        return false
      }
      if (needsBackDesign) {
        if (!backDesignImage) {
          alert('裏面のデザイン画像をアップロードしてください')
          return false
        }
        if (!backDeliveryPdfUrl) {
          alert('裏面の「納品データを確定（PDF生成）」ボタンを押してから追加してください')
          return false
        }
      }
    }

    // Check that all visible required options have been selected
    const missingRequired = product.options.filter((opt) => {
      if (opt.required === false) return false  // explicitly optional
      if (!isOptionVisible(opt, selectedOptions)) return false   // hidden options are ignored
      if (opt.type === 'checkbox') return false // checkbox allows 0 selections
      if (opt.type === 'number') return false   // number allows 0
      const val = selectedOptions[opt.id]
      return !val || val === ''
    })

    if (missingRequired.length > 0) {
      alert(`以下の必須項目を選択してください:\n${missingRequired.map((o) => o.name).join('\n')}`)
      return false
    }

    const options = Object.entries(selectedOptions).map(([id, valueId]) => {
      const option = product.options.find((o) => o.id === id)
      // checkbox/multiSelect: comma-separated IDs → comma-separated labels
      if (option && (option.type === 'checkbox' || option.multiSelect)) {
        const ids = valueId.split(',').filter(Boolean)
        const labels = ids.map((vid) => {
          const val = option.values.find((v) => v.id === vid)
          return val?.label || vid
        })
        return {
          id,
          name: option.name || id,
          value: labels.join(','),
        }
      }
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
      unitPrice,
      totalPrice: totalPriceItems,
      options,
      designImage: is3d ? designImages[0]?.storagePath ?? null : designImage,
      designPreviewDataUrl: previewImage,
      designFileName: is3d ? designImages[0]?.fileName ?? null : designFileName,
      moldFee: moldFee > 0 ? moldFee : undefined,
      moldOrderId: moldReuseValid && moldOrderId ? moldOrderId : undefined,
      expressDelivery: expressDelivery || undefined,
      deliveryPdfUrl: is3d ? designImages[0]?.deliveryPdfUrl ?? null : deliveryPdfUrl,
      ...(is3d ? { designImages } : {}),
      ...(needsBackDesign ? {
        backDesignImage,
        backDesignPreviewDataUrl: backPreviewImage,
        backDesignFileName,
      } : {}),
      shippingModifier: shippingExtra > 0 ? shippingExtra : undefined,
    })

    setIsAdded(true)
    clearTimeout(isAddedTimerRef.current)
    isAddedTimerRef.current = setTimeout(() => setIsAdded(false), 2000)
    return true
  }

  const handleBuyNow = () => {
    const added = handleAddToCart()
    if (added) router.push('/cart')
  }

  const unitPrice = calculateUnitPrice(product, quantity, selectedOptions)
  const totalPriceItems = calculateTotalPrice(product, quantity, selectedOptions)
  const moldInfo = calculateMoldFee(product, selectedOptions, quantity)
  const moldFee = moldInfo.requiresMold && moldReuseValid !== true ? moldInfo.moldFee : 0
  const expressFeeCost = 0 // Express surcharge is now applied to shipping at checkout, not per-product
  const shippingExtra = calculateShippingModifier(product, selectedOptions)
  const totalPrice = totalPriceItems + moldFee + expressFeeCost + shippingExtra
  const baseTier = product.priceTiers[0]
  const discountPercent = baseTier.unitPrice > unitPrice
    ? Math.round((1 - unitPrice / baseTier.unitPrice) * 100)
    : 0
  const complexityBlock = checkComplexityRestriction(product, selectedOptions)

  const handleMoldCheck = async () => {
    if (!moldOrderId.trim() || !moldEmail.trim()) return
    setCheckingMold(true)
    setMoldReuseValid(null)
    try {
      const { checkMoldReuse } = await import('@/app/actions/mold')
      const result = await checkMoldReuse(moldOrderId, moldEmail, product.id)
      setMoldReuseValid(result.valid)

      if (result.valid) {
        // Auto-fill previous order's options
        if (result.previousOptions && result.previousOptions.length > 0) {
          const restored: Record<string, string> = {}
          for (const prev of result.previousOptions) {
            const opt = product.options.find((o) => o.id === prev.id)
            const val = opt?.values.find((v) => v.label === prev.value)
            if (val) restored[prev.id] = val.id
          }
          if (Object.keys(restored).length > 0) {
            setSelectedOptions((current) => ({ ...current, ...restored }))
            setMoldReuseMessage('✅ 型の再利用が確認できました。型代は発生しません。前回のオプション設定を自動で反映しました。')
            return
          }
        }
        setMoldReuseMessage('✅ 型の再利用が確認できました。型代は発生しません。')
      } else {
        setMoldReuseMessage(result.reason ?? '❌ 型の再利用を確認できませんでした。')
      }
    } finally {
      setCheckingMold(false)
    }
  }

  return (
    <div className="py-6 md:py-10 bg-background min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Draft Restored Toast */}
        {draftRestored && (
          <div className="fixed top-4 right-4 z-50 bg-primary text-primary-foreground text-sm px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-in slide-in-from-top-2">
            <Check className="h-4 w-4" />
            前回の設定を復元しました
          </div>
        )}

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
          {/* Columns 1-3: Options (shape/type, material/grid, size) */}
          <OptionSelector
            product={product}
            selectedOptions={selectedOptions}
            onOptionChange={handleOptionChange}
            onCheckboxToggle={handleCheckboxToggle}
            formatPriceModifier={formatPriceModifier}
          />

          {/* Column 4: Quantity & Price */}
          <div className="lg:col-span-4">
            <h3 className="font-semibold text-foreground mb-3">数量</h3>
            <div className="bg-card rounded-lg border border-border overflow-hidden">
              <div className="max-h-[400px] overflow-y-auto">
                {product.priceTiers.map((tier, index) => {
                  const isSelected = quantity >= tier.minQuantity &&
                    (index === product.priceTiers.length - 1 || quantity < product.priceTiers[index + 1].minQuantity)
                  // Apply current option modifiers so the grid reflects the real price
                  const effectiveUnitPrice = calculateUnitPrice(product, tier.minQuantity, selectedOptions)
                  const tierTotal = effectiveUnitPrice * tier.minQuantity
                  // Discount vs base tier price (option-adjusted)
                  const baseUnitPrice = calculateUnitPrice(product, product.priceTiers[0].minQuantity, selectedOptions)
                  const effectiveDiscount = baseUnitPrice > effectiveUnitPrice
                    ? Math.round((1 - effectiveUnitPrice / baseUnitPrice) * 100)
                    : 0

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
                      <span className={`text-right text-xs ${effectiveDiscount > 0 ? 'text-green-600 font-semibold' : 'text-muted-foreground'}`}>
                        {effectiveDiscount > 0 ? `- ${effectiveDiscount}%` : ''}
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

        {/* Step Guide */}
        <div className="mb-6 rounded-xl border border-primary/20 bg-primary/5 p-4">
          <p className="text-sm font-bold text-primary mb-3">ご注文の手順</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { step: 1, label: 'オプション・数量を選択', done: true },
              { step: 2, label: 'デザインをアップロード', done: is3d ? designImages.length > 0 : (needsBackDesign ? !!designImage && !!backDesignImage : !!designImage) },
              { step: 3, label: '「納品データを確定」を押す', done: is3d ? allRequiredDone : (needsBackDesign ? !!deliveryPdfUrl && !!backDeliveryPdfUrl : !!deliveryPdfUrl) },
              { step: 4, label: 'カートに追加して購入', done: false },
            ].map(({ step, label, done }) => (
              <div key={step} className={`flex items-start gap-3 rounded-lg p-3 text-xs transition-colors ${done ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-background text-muted-foreground border border-border'}`}>
                <span className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-[12px] font-bold ${done ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                  {step}
                </span>
                <span className="leading-tight font-medium">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Design Upload & Preview Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Design Upload */}
          <Card className="border-2 border-dashed border-border hover:border-primary/50 transition-colors">
            <CardContent className="p-6">
              <h3 className="font-semibold text-foreground text-lg mb-4 flex items-center gap-2">
                {needsBackDesign ? '表面デザインをアップロード' : 'デザインをアップロード'}
                <Info className="w-4 h-4 text-muted-foreground" />
              </h3>
              {is3d ? (
                <MultiViewUploader
                  imageViews={product.imageViews!}
                  onImagesChange={handleMultiViewImagesChange}
                  selectedShape={selectedOptions['shape'] || 'die-cut'}
                  onPreviewChange={handlePreviewChange}
                  onViewPreviewChange={handleViewPreviewChange}
                />
              ) : (
                <ImageUploader
                  onImageSelect={handleImageSelect}
                  currentImage={designImage}
                  currentFileName={designFileName}
                  selectedShape={selectedOptions['shape'] || 'die-cut'}
                  onPreviewChange={handlePreviewChange}
                  onComplexityDetected={(grade) => {
                    // Auto-set complexity option if the product has one
                    const complexityOpt = product.options.find((o) => o.id === 'complexity')
                    if (complexityOpt) {
                      const match = complexityOpt.values.find((v) => v.id === grade || v.id === grade.toLowerCase())
                      if (match) {
                        setSelectedOptions((prev) => ({ ...prev, complexity: match.id }))
                      }
                    }
                  }}
                />
              )}

              {/* Back design uploader for double-sided + different design */}
              {needsBackDesign && (
                <div className="mt-6 pt-6 border-t border-border">
                  <h3 className="font-semibold text-foreground text-lg mb-4 flex items-center gap-2">
                    裏面デザインをアップロード
                    <Info className="w-4 h-4 text-muted-foreground" />
                  </h3>
                  <ImageUploader
                    onImageSelect={handleBackImageSelect}
                    currentImage={backDesignImage}
                    currentFileName={backDesignFileName}
                    selectedShape={selectedOptions['shape'] || 'die-cut'}
                    onPreviewChange={handleBackPreviewChange}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Preview */}
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold text-foreground text-lg mb-4">プレビュー</h3>
              {needsBackDesign && backPreviewImage ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2 text-center">表面</p>
                    <ProductPreview
                      product={product}
                      designImage={previewImage}
                      selectedOptions={selectedOptions}
                      isCanvasComposite={!!previewImage}
                      hasDesign={!!designImage}
                    />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2 text-center">裏面</p>
                    <ProductPreview
                      product={product}
                      designImage={backPreviewImage}
                      selectedOptions={selectedOptions}
                      isCanvasComposite={!!backPreviewImage}
                      hasDesign={!!backDesignImage}
                    />
                  </div>
                </div>
              ) : (
                <ProductPreview
                  product={product}
                  designImage={previewImage}
                  selectedOptions={selectedOptions}
                  isCanvasComposite={!!previewImage}
                  hasDesign={!!designImage}
                  designImages={
                    is3d && product.imageViews
                      ? product.imageViews.map((v) => ({
                          viewId: v.id,
                          viewLabel: v.label,
                          previewDataUrl: viewPreviews[v.id],
                        }))
                      : undefined
                  }
                />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Repeat Order / Mold Fee Exemption Section */}
        {moldInfo.requiresMold && (
          <MoldReuseSection
            moldFee={moldInfo.moldFee}
            moldOrderId={moldOrderId}
            setMoldOrderId={setMoldOrderId}
            moldEmail={moldEmail}
            setMoldEmail={setMoldEmail}
            moldReuseValid={moldReuseValid}
            moldReuseMessage={moldReuseMessage}
            checkingMold={checkingMold}
            onCheck={handleMoldCheck}
            formatPrice={formatPrice}
          />
        )}

        {/* Delivery Speed Selection */}
        <Card className="mb-4 border-2 border-border">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <Truck className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-foreground">納期を選択</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Standard */}
              <button
                onClick={() => setExpressDelivery(false)}
                className={`flex flex-col gap-1 p-4 rounded-xl border-2 text-left transition-all ${
                  !expressDelivery
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-muted-foreground/40 bg-card'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm">通常納期</span>
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${!expressDelivery ? 'border-primary bg-primary' : 'border-border'}`}>
                    {!expressDelivery && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">2週間〜1ヶ月</span>
                <span className="text-sm font-bold text-green-600">追加料金なし</span>
              </button>

              {/* Express */}
              <button
                onClick={() => setExpressDelivery(true)}
                className={`flex flex-col gap-1 p-4 rounded-xl border-2 text-left transition-all ${
                  expressDelivery
                    ? 'border-orange-400 bg-orange-50'
                    : 'border-border hover:border-orange-300 bg-card'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm">⚡ 特急納期</span>
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${expressDelivery ? 'border-orange-500 bg-orange-500' : 'border-border'}`}>
                    {expressDelivery && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">約2週間（目安）</span>
                <span className="text-sm font-bold text-orange-600">送料 ×2</span>
              </button>
            </div>
            {expressDelivery && (
              <p className="text-xs text-orange-700 bg-orange-50 border border-orange-200 rounded-lg p-2 mt-3">
                特急納期は工場の生産状況により対応できない場合があります。ご注文後に担当者よりご連絡いたします。
              </p>
            )}
          </CardContent>
        </Card>

        {/* Price Summary & Actions */}
        <PriceSummary
          quantity={quantity}
          unitPrice={unitPrice}
          totalPrice={totalPrice}
          totalPriceItems={totalPriceItems}
          moldFee={moldFee}
          expressFeeCost={expressFeeCost}
          shippingExtra={shippingExtra}
          discountPercent={discountPercent}
          complexityBlock={complexityBlock}
          designImage={designImage}
          designImagesCount={designImages.length}
          deliveryPdfUrl={deliveryPdfUrl}
          is3d={!!is3d}
          allRequiredDone={allRequiredDone}
          isAdded={isAdded}
          onAddToCart={handleAddToCart}
          onBuyNow={handleBuyNow}
          formatPrice={formatPrice}
        />

        {/* Features */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
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
