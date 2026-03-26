'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ShoppingCart, Check, ChevronRight, ChevronDown, Star, Shield, Truck, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ImageUploader } from '@/components/image-uploader'
import { MultiViewUploader } from '@/components/multi-view-uploader'
import { type DesignImageEntry } from '@/lib/cart'
import { ProductPreview } from '@/components/product-preview'
import { useCart } from '@/components/cart-provider'
import {
  type Product,
  type ProductOption,
  calculateUnitPrice,
  calculateTotalPrice,
  calculateMoldFee,
  calculateShippingModifier,
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
    if (!modifier) return ''
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

  // Determine whether a hierarchical option should be visible
  const isOptionVisible = (opt: ProductOption, opts: Record<string, string> = selectedOptions): boolean => {
    if (!opt.parentId) return true // top-level always visible
    const parentValue = opts[opt.parentId]
    if (!parentValue) return false // parent not selected
    if (!opt.showWhen || opt.showWhen.length === 0) return true // no condition — show when parent selected
    return opt.showWhen.includes(parentValue)
  }

  // Recursively collect descendant option ids
  const getDescendantIds = (parentId: string): string[] => {
    const children = product.options.filter((o) => o.parentId === parentId)
    const ids: string[] = []
    for (const child of children) {
      ids.push(child.id)
      ids.push(...getDescendantIds(child.id))
    }
    return ids
  }

  // Return options in hierarchical display order: parent → children → grandchildren
  const getOrderedOptions = () => {
    const result: ProductOption[] = []
    const topLevel = product.options.filter((o) => !o.parentId)
    for (const parent of topLevel) {
      result.push(parent)
      const children = product.options.filter((o) => o.parentId === parent.id)
      for (const child of children) {
        result.push(child)
        const grandchildren = product.options.filter((o) => o.parentId === child.id)
        result.push(...grandchildren)
      }
    }
    return result
  }

  const handleOptionChange = (optionId: string, valueId: string) => {
    setSelectedOptions((prev) => {
      const next = { ...prev, [optionId]: valueId }
      // Clear child options that are no longer visible
      product.options.forEach((opt) => {
        if (opt.parentId === optionId) {
          if (opt.showWhen && opt.showWhen.length > 0 && !opt.showWhen.includes(valueId)) {
            delete next[opt.id]
            // Also clear grandchildren
            getDescendantIds(opt.id).forEach((id) => delete next[id])
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
    }

    // Check that all visible required options have been selected
    const missingRequired = product.options.filter((opt) => {
      if (opt.required === false) return false  // explicitly optional
      if (!isOptionVisible(opt)) return false   // hidden options are ignored
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
      designFileName: is3d ? designImages[0]?.fileName ?? null : designFileName,
      moldFee: moldFee > 0 ? moldFee : undefined,
      moldOrderId: moldReuseValid && moldOrderId ? moldOrderId : undefined,
      expressDelivery: expressDelivery || undefined,
      expressDeliveryFee: expressDelivery && (product.expressDeliveryFee ?? 0) > 0 ? product.expressDeliveryFee : undefined,
      deliveryPdfUrl: is3d ? designImages[0]?.deliveryPdfUrl ?? null : deliveryPdfUrl,
      ...(is3d ? { designImages } : {}),
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
  const expressFeeCost = expressDelivery && (product.expressDeliveryFee ?? 0) > 0 ? (product.expressDeliveryFee ?? 0) : 0
  const shippingExtra = calculateShippingModifier(product, selectedOptions)
  const totalPrice = totalPriceItems + moldFee + expressFeeCost + shippingExtra
  const baseTier = product.priceTiers[0]
  const discountPercent = baseTier.unitPrice > unitPrice
    ? Math.round((1 - unitPrice / baseTier.unitPrice) * 100)
    : 0

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
          {/* Column 1: Product Type & Shape */}
          <div className="lg:col-span-2 space-y-6">
            {product.options.filter(o => (o.id === 'shape' || o.id === 'type') && isOptionVisible(o)).map((option) => (
              <div key={option.id} className={option.parentId ? 'border-l-2 border-primary/30 pl-4 ml-2' : ''}>
                <h3 className="font-semibold text-foreground mb-3">
                  {option.name}
                  {option.required !== false ? (
                    <span className="text-red-500 ml-1">*</span>
                  ) : (
                    <span className="text-xs text-muted-foreground ml-2">（任意）</span>
                  )}
                </h3>
                {product.id === 'plastic-bag' && option.id === 'shape' && (
                  <p className="text-xs text-muted-foreground mb-2">ビニール袋は袋型のみ対応しています</p>
                )}
                <div className="space-y-1">
                  {(product.id === 'plastic-bag' && option.id === 'shape'
                    ? option.values.filter(v => v.id === 'plastic-bag')
                    : option.values
                  ).map((value) => {
                    const priceLabel = formatPriceModifier(value.priceModifier)
                    return (
                      <button
                        key={value.id}
                        onClick={() => handleOptionChange(option.id, value.id)}
                        className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-lg text-left text-sm transition-all ${selectedOptions[option.id] === value.id
                          ? 'bg-primary/10 text-primary font-medium border border-primary/30'
                          : 'hover:bg-muted text-foreground border border-transparent'
                          }`}
                      >
                        {value.imageUrl && (
                          <Image
                            src={value.imageUrl}
                            alt={value.label}
                            width={36}
                            height={36}
                            className="rounded-md object-cover shrink-0 mt-0.5"
                          />
                        )}
                        <div className={`flex items-center gap-3 flex-1 min-w-0 ${!value.imageUrl ? '' : ''}`}>
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${selectedOptions[option.id] === value.id
                            ? 'border-primary bg-primary'
                            : 'border-border'
                            }`}>
                            {selectedOptions[option.id] === value.id && (
                              <Check className="w-3 h-3 text-primary-foreground" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="truncate">{value.label}</span>
                              {priceLabel && (
                                <span className="text-xs font-semibold text-green-600 shrink-0">{priceLabel}</span>
                              )}
                            </div>
                            {value.description && (
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{value.description}</p>
                            )}
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}

            {/* Dropdown Options */}
            {product.options.filter(o => o.type === 'dropdown' && isOptionVisible(o)).map((option) => (
              <div key={option.id} className={option.parentId ? 'border-l-2 border-primary/30 pl-4 ml-2' : ''}>
                <h3 className="font-semibold text-foreground mb-3">
                  {option.name}
                  {option.required !== false ? (
                    <span className="text-red-500 ml-1">*</span>
                  ) : (
                    <span className="text-xs text-muted-foreground ml-2">（任意）</span>
                  )}
                </h3>
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

            {/* Checkbox Options */}
            {product.options.filter(o => o.type === 'checkbox' && isOptionVisible(o)).map((option) => (
              <div key={option.id} className={option.parentId ? 'border-l-2 border-primary/30 pl-4 ml-2' : ''}>
                <h3 className="font-semibold text-foreground mb-3">
                  {option.name}
                  {option.required !== false ? (
                    <span className="text-red-500 ml-1">*</span>
                  ) : (
                    <span className="text-xs text-muted-foreground ml-2">（任意）</span>
                  )}
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {option.values.map((v) => {
                    const checked = (selectedOptions[option.id] || '').split(',').includes(v.id)
                    return (
                      <label
                        key={v.id}
                        className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition ${
                          checked
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/30'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => handleCheckboxToggle(option.id, v.id)}
                          className="rounded"
                        />
                        <span className="text-sm">{v.label}</span>
                        {v.priceModifier && (
                          <span className="text-xs text-muted-foreground ml-auto">
                            {formatPriceModifier(v.priceModifier)}
                          </span>
                        )}
                      </label>
                    )
                  })}
                </div>
              </div>
            ))}

            {/* Number Options */}
            {product.options.filter(o => o.type === 'number' && isOptionVisible(o)).map((option) => (
              <div key={option.id} className={option.parentId ? 'border-l-2 border-primary/30 pl-4 ml-2' : ''}>
                <h3 className="font-semibold text-foreground mb-3">
                  {option.name}
                  {option.required !== false ? (
                    <span className="text-red-500 ml-1">*</span>
                  ) : (
                    <span className="text-xs text-muted-foreground ml-2">（任意）</span>
                  )}
                </h3>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={option.numberMin}
                    max={option.numberMax}
                    value={selectedOptions[option.id] || ''}
                    onChange={(e) => handleOptionChange(option.id, e.target.value)}
                    className="w-32 px-3 py-2 border border-border rounded-lg text-sm"
                    placeholder={`${option.numberMin ?? 0}〜${option.numberMax ?? ''}`}
                  />
                  {option.numberUnit && (
                    <span className="text-sm text-muted-foreground">{option.numberUnit}</span>
                  )}
                  {option.pricePerUnit && option.pricePerUnit > 0 && (
                    <span className="text-xs text-muted-foreground">
                      （1{option.numberUnit || '単位'}あたり {formatPrice(option.pricePerUnit)} 加算）
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Column 2: Material */}
          <div className="lg:col-span-3">
            {product.options.filter(o => (o.id === 'material' || (o.type === 'grid' && o.id !== 'material')) && isOptionVisible(o)).map((option) => (
              <div key={option.id} className={option.parentId ? 'border-l-2 border-primary/30 pl-4 ml-2' : ''}>
                <h3 className="font-semibold text-foreground mb-3">
                  {option.name}
                  {option.required !== false ? (
                    <span className="text-red-500 ml-1">*</span>
                  ) : (
                    <span className="text-xs text-muted-foreground ml-2">（任意）</span>
                  )}
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {option.values.map((value) => {
                    const priceLabel = formatPriceModifier(value.priceModifier)
                    return (
                      <button
                        key={value.id}
                        onClick={() => handleOptionChange(option.id, value.id)}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-all relative ${selectedOptions[option.id] === value.id
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
                          {value.previewColor ? (
                            <div className="w-10 h-10 rounded-lg border border-border shadow-inner" style={{ backgroundColor: value.previewColor }} />
                          ) : value.imageUrl ? (
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
                        {value.description && (
                          <span className="text-[10px] text-muted-foreground text-center leading-tight line-clamp-2">
                            {value.description}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Column 3: Size */}
          <div className="lg:col-span-3">
            {product.options.filter(o => o.id === 'size' && isOptionVisible(o)).map((option) => (
              <div key={option.id} className={option.parentId ? 'border-l-2 border-primary/30 pl-4 ml-2' : ''}>
                <h3 className="font-semibold text-foreground mb-3">
                  {option.name}
                  {option.required !== false ? (
                    <span className="text-red-500 ml-1">*</span>
                  ) : (
                    <span className="text-xs text-muted-foreground ml-2">（任意）</span>
                  )}
                </h3>
                <div className="bg-card rounded-lg border border-border overflow-hidden">
                  <div className="max-h-[400px] overflow-y-auto">
                    {option.values.map((value, index) => {
                      const priceLabel = formatPriceModifier(value.priceModifier)
                      return (
                        <button
                          key={value.id}
                          onClick={() => handleOptionChange(option.id, value.id)}
                          className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-all text-left ${selectedOptions[option.id] === value.id
                            ? 'bg-primary/10 text-primary font-semibold'
                            : 'hover:bg-muted text-foreground'
                            } ${index !== option.values.length - 1 ? 'border-b border-border' : ''}`}
                        >
                          {value.imageUrl && (
                            <Image
                              src={value.imageUrl}
                              alt={value.label}
                              width={32}
                              height={32}
                              className="rounded object-cover shrink-0"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <span>{value.label}</span>
                            {value.description && (
                              <p className="text-[10px] text-muted-foreground mt-0.5 font-normal line-clamp-1">{value.description}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
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
              { step: 2, label: 'デザインをアップロード', done: is3d ? designImages.length > 0 : !!designImage },
              { step: 3, label: '「納品データを確定」を押す', done: is3d ? allRequiredDone : !!deliveryPdfUrl },
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
                デザインをアップロード
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
            </CardContent>
          </Card>

          {/* Preview */}
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold text-foreground text-lg mb-4">プレビュー</h3>
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
            </CardContent>
          </Card>
        </div>

        {/* Repeat Order / Mold Fee Exemption Section */}
        {moldInfo.requiresMold && (
          <>
            {/* Prominent repeat order CTA banner */}
            {!moldReuseValid && (
              <div className="mb-4 rounded-xl border-2 border-[#00c8c8] bg-[#00c8c8]/5 px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1">
                  <p className="font-bold text-[#007a7a] text-sm">
                    🔁 リピート注文の方（型代免除）はこちら
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    前回のご注文番号を入力すると、型代 {formatPrice(moldInfo.moldFee)} が免除されます。
                  </p>
                </div>
                <button
                  onClick={() => {
                    const el = document.getElementById('mold-reuse-section')
                    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                    el?.querySelector('input')?.focus()
                  }}
                  className="shrink-0 px-4 py-2 rounded-lg bg-[#00c8c8] text-white text-sm font-bold hover:bg-[#00b0b0] transition-colors"
                >
                  注文番号を入力する ↓
                </button>
              </div>
            )}

            <Card id="mold-reuse-section" className="mb-8 border-2 border-[#ffe135]/30 bg-gradient-to-r from-[#ffe135]/5 to-transparent">
              <CardContent className="p-6">
                <div className="flex items-start gap-3 mb-4">
                  <Info className="w-5 h-5 text-[#ff7b54] flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-foreground text-lg mb-2">
                      型代について（初回のみ {formatPrice(moldInfo.moldFee)}）
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      この商品は型が必要です。過去に同じ商品をご注文いただいている場合、注文番号を入力すると型代が免除されます（型は1年間保管しています）。
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <input
                    type="text"
                    value={moldOrderId}
                    onChange={(e) => setMoldOrderId(e.target.value)}
                    placeholder="過去の注文番号（例：FO-ABC123-XYZ456）"
                    className="w-full px-4 py-2.5 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    disabled={checkingMold}
                  />
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="email"
                      value={moldEmail}
                      onChange={(e) => setMoldEmail(e.target.value)}
                      placeholder="ご注文時のメールアドレス"
                      className="flex-1 px-4 py-2.5 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      disabled={checkingMold}
                    />
                    <Button
                      onClick={handleMoldCheck}
                      disabled={!moldOrderId.trim() || !moldEmail.trim() || checkingMold}
                      className="sm:w-auto bg-[#00c8c8] hover:bg-[#00b0b0] text-white"
                    >
                      {checkingMold ? '確認中...' : '型の再利用を確認'}
                    </Button>
                  </div>
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
          </>
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
              {(product.expressDeliveryFee ?? 0) > 0 && (
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
                  <span className="text-xs text-muted-foreground">約10日以内（目安）</span>
                  <span className="text-sm font-bold text-orange-600">+{formatPrice(product.expressDeliveryFee ?? 0)}</span>
                </button>
              )}
            </div>
            {expressDelivery && (
              <p className="text-xs text-orange-700 bg-orange-50 border border-orange-200 rounded-lg p-2 mt-3">
                特急納期は工場の生産状況により対応できない場合があります。ご注文後に担当者よりご連絡いたします。
              </p>
            )}
          </CardContent>
        </Card>

        {/* Price Summary & Actions */}
        <Card className="lg:sticky lg:bottom-4 shadow-2xl border-2">
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
                {expressFeeCost > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground">⚡ 特急料金</p>
                    <p className="text-lg font-semibold text-orange-500">{formatPrice(expressFeeCost)}</p>
                  </div>
                )}
                {shippingExtra > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground">送料加算（オプション）</p>
                    <p className="text-lg font-semibold text-foreground">+{formatPrice(shippingExtra)}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground">合計金額 <span className="text-xs font-semibold text-green-600">（税込）</span></p>
                  <div className="flex flex-col gap-1">
                    {(moldFee > 0 || expressFeeCost > 0) && (
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
                  <span>2週間〜1ヶ月</span>
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
                {isAdded ? (
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
                  <Button
                    size="lg"
                    variant="outline"
                    className="flex-1 lg:flex-none h-12 px-6 rounded-xl"
                    onClick={handleAddToCart}
                    disabled={is3d ? designImages.length === 0 : !designImage}
                  >
                    <ShoppingCart className="h-5 w-5 mr-2" />
                    カートに追加
                  </Button>
                )}
                <Button
                  size="lg"
                  className="flex-1 lg:flex-none h-12 px-8 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25"
                  onClick={handleBuyNow}
                  disabled={(is3d ? designImages.length === 0 : !designImage) || isAdded}
                >
                  今すぐ購入
                </Button>
              </div>
            </div>

            {(is3d ? designImages.length === 0 : !designImage) && (
              <p className="text-sm text-muted-foreground text-center mt-4 py-2 px-4 bg-muted rounded-lg">
                デザイン画像をアップロードすると購入できます
              </p>
            )}
          </CardContent>
        </Card>

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
