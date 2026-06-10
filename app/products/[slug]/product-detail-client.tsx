'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Check, ChevronRight, Truck, Info } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { ImageUploader } from '@/components/image-uploader'
import { MultiViewUploader } from '@/components/multi-view-uploader'
import { type DesignImageEntry, type CartItem } from '@/lib/cart'
import { calculateShippingByQuantity, calculateExpressShipping } from '@/lib/shipping'
import { calculateTotalQuantity } from '@/lib/cart'
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
  findCheaperTierSuggestion,
} from '@/lib/products'
import { OptionSelector, isOptionVisible, getDescendantIds } from './option-selector'
import { PriceSummary } from './price-summary'
import { MoldReuseSection } from './mold-reuse-section'

interface ProductDetailClientProps {
  product: Product
}

export function ProductDetailClient({ product }: ProductDetailClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { cart, addItem, replaceItem, isLoading: cartLoading } = useCart()
  // When editing an existing cart item, the cart page sends ?editCartId=<id>.
  // We pre-fill form state from the matching CartItem and switch the submit
  // button to "update" mode so saving replaces the same cart line.
  const editCartId = searchParams?.get('editCartId') || null
  // Only treat this as an edit when:
  //   (1) editCartId is in the URL
  //   (2) a cart item with that id exists (not cleared / cross-session)
  //   (3) the cart item's productId matches the current page's product id
  // Otherwise, silently ignore editCartId (avoids "edit link to different
  // product pre-fills with wrong product's options" and the "2-item duplicate
  // after localStorage clear" bug).
  const rawEditingItem = editCartId ? cart.items.find((i) => i.id === editCartId) : null
  const editingItem = rawEditingItem && rawEditingItem.productId === product.id ? rawEditingItem : null
  const editing = !!editingItem
  // If the URL carries an editCartId that no longer matches, strip it so
  // the user can cleanly add a new item or navigate away without ghost state.
  useEffect(() => {
    if (editCartId && !editingItem && !cartLoading) {
      router.replace(`/products/${product.slug}`, { scroll: false })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editCartId, editingItem, cartLoading])

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
  const [expressDelivery, setExpressDeliveryRaw] = useState(false)
  // Guard: a product with expressDeliveryFee=0 cannot accept express. Clamp to false
  // so any stale state from editing or drafts can't trigger a double-shipping charge.
  const productAllowsExpress = (product.expressDeliveryFee ?? 0) > 0
  const setExpressDelivery = useCallback((v: boolean) => {
    setExpressDeliveryRaw(productAllowsExpress ? v : false)
  }, [productAllowsExpress])
  useEffect(() => {
    if (!productAllowsExpress && expressDelivery) setExpressDeliveryRaw(false)
  }, [productAllowsExpress, expressDelivery])
  const [draftRestored, setDraftRestored] = useState(false)
  const [moldOrderId, setMoldOrderId] = useState('')
  const [moldEmail, setMoldEmail] = useState('')
  const [moldReuseValid, setMoldReuseValid] = useState<boolean | null>(null)
  const [moldReuseMessage, setMoldReuseMessage] = useState('')
  const [checkingMold, setCheckingMold] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [backDesignImage, setBackDesignImage] = useState<string | null>(null)
  const [backDesignFileName, setBackDesignFileName] = useState<string | null>(null)
  const [backDeliveryPdfUrl, setBackDeliveryPdfUrl] = useState<string | null>(null)
  const [backPreviewImage, setBackPreviewImage] = useState<string | null>(null)
  const [designImages, setDesignImages] = useState<DesignImageEntry[]>([])
  const [allRequiredDone, setAllRequiredDone] = useState(false)
  const [viewPreviews, setViewPreviews] = useState<Record<string, string>>({})
  // Grade A-E from background complexity analysis, shown as a visible banner.
  const [detectedComplexity, setDetectedComplexity] = useState<string | null>(null)
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
    // When editing from cart, don't restore the draft — use the cart item.
    if (editingItem) return
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
  }, [product.id, editingItem])

  // Preload the cart item into form state (runs once when arriving with ?editCartId=).
  const editHydratedRef = useRef(false)
  useEffect(() => {
    if (!editingItem || editHydratedRef.current) return
    editHydratedRef.current = true
    setQuantity(editingItem.quantity)
    setExpressDelivery(!!editingItem.expressDelivery)
    const opts: Record<string, string> = {}
    for (const o of editingItem.options ?? []) {
      // CartItem stores { id, name, value }. Map label→id for list options.
      const productOpt = product.options.find((po) => po.id === o.id)
      if (!productOpt) continue
      const match = productOpt.values.find((v) => v.id === o.value || v.label === o.value)
      opts[o.id] = match ? match.id : o.value
    }
    setSelectedOptions((prev) => ({ ...prev, ...opts }))
    if (editingItem.designImage) setDesignImage(editingItem.designImage)
    if (editingItem.designFileName) setDesignFileName(editingItem.designFileName)
    if (editingItem.deliveryPdfUrl) setDeliveryPdfUrl(editingItem.deliveryPdfUrl)
    if (editingItem.moldOrderId) setMoldOrderId(editingItem.moldOrderId)
  }, [editingItem, product.options])

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
      if (modifier.value < 0) return formatPrice(modifier.value)
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
    if (!imageData) {
      setPreviewImage(null)
      setDetectedComplexity(null)
    }
  }

  const handleBackImageSelect = (imageData: string | null, fileName: string | null, pdfUrl?: string | null) => {
    setBackDesignImage(imageData)
    setBackDesignFileName(fileName)
    setBackDeliveryPdfUrl(pdfUrl ?? null)
    if (!imageData) setBackPreviewImage(null)
  }

  // Determine if this product needs a second (back) design upload
  // Back design upload needed when:
  //  (a) double-sided printing with different back design, OR
  //  (b) back_print=within_frame (rear side has its own image inside the front frame)
  const needsBackDesign =
    (selectedOptions['double_sided'] === 'double' && selectedOptions['second_design'] === 'different') ||
    selectedOptions['back_print'] === 'within_frame'

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
    // Empty input: ignore (keep previous quantity)
    if (value === '') {
      setValidationError(null)
      return
    }
    const num = parseInt(value, 10)
    if (isNaN(num)) {
      setValidationError('数量は数字で入力してください')
      return
    }
    if (num < product.minQuantity) {
      setValidationError(`最低注文数は${product.minQuantity}個です`)
      // Don't commit — keep quantity at previous value so price reflects actual cart qty.
      return
    }
    if (num > product.maxQuantity) {
      setValidationError(`最大注文数は${product.maxQuantity}個です`)
      return
    }
    setValidationError(null)
    setQuantity(num)
  }

  const handleAddToCart = (): boolean => {
    setValidationError(null)
    if (complexityBlock) {
      setValidationError(complexityBlock)
      return false
    }
    if (is3d) {
      if (designImages.length === 0) {
        setValidationError('デザイン画像をアップロードしてください')
        return false
      }
      if (!allRequiredDone) {
        setValidationError('必須の面すべてで「納品データを確定（PDF生成）」を完了してください')
        return false
      }
    } else {
      if (!designImage) {
        setValidationError('デザイン画像をアップロードしてください')
        return false
      }
      if (!deliveryPdfUrl) {
        setValidationError('「納品データを確定（PDF生成）」ボタンを押してから追加してください')
        return false
      }
      if (needsBackDesign) {
        if (!backDesignImage) {
          setValidationError('裏面のデザイン画像をアップロードしてください')
          return false
        }
        if (!backDeliveryPdfUrl) {
          setValidationError('裏面の「納品データを確定（PDF生成）」ボタンを押してから追加してください')
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
      setValidationError(`以下の必須項目を選択してください: ${missingRequired.map((o) => o.name).join('、')}`)
      return false
    }

    // Back-print conditional validation: if back_print=text, back_text must be filled
    if (selectedOptions['back_print'] === 'text') {
      const backText = (selectedOptions['back_text'] || '').trim()
      if (!backText) {
        setValidationError('裏面テキストを入力してください（テキスト印刷を選択中）')
        return false
      }
    }

    const options = Object.entries(selectedOptions)
      .filter(([id, valueId]) => {
        const option = product.options.find((o) => o.id === id)
        if (!option) return false // unknown option — drop it entirely
        if (!isOptionVisible(option, selectedOptions)) return false // stale child option
        if (valueId === undefined || valueId === null || valueId === '') return false
        return true
      })
      .map(([id, valueId]) => {
        const option = product.options.find((o) => o.id === id)!
        // checkbox/multiSelect: comma-separated IDs → comma-separated labels
        if (option.type === 'checkbox' || option.multiSelect) {
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
        const value = option.values.find((v) => v.id === valueId)
        return {
          id,
          name: option.name || id,
          value: value?.label || valueId,
        }
      })

    // Express delivery fee: only charge if product actually offers it (>0).
    // Otherwise the user may have toggled it but the server will zero it out,
    // producing a mismatch between cart total and Stripe charge.
    const productExpressFee = product.expressDeliveryFee ?? 0
    const effectiveExpressFee = expressDelivery && productExpressFee > 0 ? productExpressFee : 0

    const payload = {
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
      expressDelivery: effectiveExpressFee > 0 ? true : undefined,
      expressDeliveryFee: effectiveExpressFee > 0 ? effectiveExpressFee : undefined,
      deliveryPdfUrl: is3d ? designImages[0]?.deliveryPdfUrl ?? null : deliveryPdfUrl,
      ...(is3d ? { designImages } : {}),
      ...(needsBackDesign ? {
        backDesignImage,
        backDesignPreviewDataUrl: backPreviewImage,
        backDesignFileName,
        backDeliveryPdfUrl,
      } : {}),
      shippingModifier: shippingExtra > 0 ? shippingExtra : undefined,
    }

    if (editing && editCartId) {
      // Replace the existing cart line with the edited payload and go back to cart.
      replaceItem(editCartId, payload as Omit<CartItem, 'id'>)
      router.push('/cart')
      return true
    }

    addItem(payload)

    setIsAdded(true)
    clearTimeout(isAddedTimerRef.current)
    isAddedTimerRef.current = setTimeout(() => setIsAdded(false), 2000)
    return true
  }

  const handleBuyNow = () => {
    const added = handleAddToCart()
    if (added && !editing) router.push('/cart')
  }

  const unitPrice = calculateUnitPrice(product, quantity, selectedOptions)
  const totalPriceItems = calculateTotalPrice(product, quantity, selectedOptions)
  const moldInfo = calculateMoldFee(product, selectedOptions, quantity)
  const moldFee = moldInfo.requiresMold && moldReuseValid !== true ? moldInfo.moldFee : 0
  const shippingExtra = calculateShippingModifier(product, selectedOptions)
  const totalPrice = totalPriceItems + moldFee + shippingExtra
  // Preview the shipping fee on the product page so users see the real total
  // BEFORE adding to cart. Shipping is tiered by total cart quantity (not this
  // item alone), so simulate "adding/replacing this item into the cart" when
  // computing the preview — otherwise the number shown differs from what
  // appears on the cart page after adding.
  const otherItemsQty = cart.items
    .filter((it) => !editing || it.id !== editCartId)
    .reduce((sum, it) => sum + it.quantity, 0)
  const projectedTotalQty = otherItemsQty + quantity
  const baseShippingPreview = calculateShippingByQuantity(projectedTotalQty)
  // Any existing cart item with express marks the whole shipment express.
  const anyExpressInCart = cart.items.some((it) => !!it.expressDelivery && (!editing || it.id !== editCartId))
  const effectiveExpressForShipping = expressDelivery || anyExpressInCart
  const shippingPreview = effectiveExpressForShipping
    ? calculateExpressShipping(baseShippingPreview)
    : baseShippingPreview
  // priceTiers may be empty for DB-only products with a size-price override;
  // guard against undefined to prevent runtime crash on render.
  const baseTier = product.priceTiers[0]
  const discountPercent = baseTier && baseTier.unitPrice > unitPrice
    ? Math.round((1 - unitPrice / baseTier.unitPrice) * 100)
    : 0
  const complexityBlock = checkComplexityRestriction(product, selectedOptions)

  // When bulk-discount tiers make a larger quantity actually cheaper than the
  // current selection, show a nudge so users don't overpay for a smaller lot.
  const cheaperSuggestion = findCheaperTierSuggestion(product, quantity, selectedOptions)

  // Determine the effective shape to pass to the canvas.
  // - Products that expose a 'shape' option (acrylic/rubber/pin): use that value.
  // - Products without a 'shape' option:
  //   - 缶バッジ is round by spec → force 'round'
  //   - Everything else defaults to 'die-cut'
  const hasShapeOption = product.options.some((o) => o.id === 'shape')
  const effectiveShape = hasShapeOption
    ? (selectedOptions['shape'] || 'die-cut')
    : (product.slug === 'can-badge' ? 'round' : 'die-cut')

  // Aspect ratio: only rectangular shapes can be non-square. Parse the selected
  // aspect_ratio option (format: 'W:H' e.g. '1:1', '4:3', '3:4', '16:9', '9:16').
  const isRectShape = effectiveShape === 'square' || effectiveShape === 'rect' ||
    effectiveShape === 'rectangle' || effectiveShape === 'rounded' ||
    effectiveShape === 'rounded-rect' || effectiveShape === 'rounded-square'
  const aspectValue = selectedOptions['aspect_ratio'] || '1:1'
  const parsedAspect = (() => {
    if (!isRectShape) return 1
    const [wStr, hStr] = aspectValue.split(':')
    const w = Number(wStr)
    const h = Number(hStr)
    if (!isFinite(w) || !isFinite(h) || w <= 0 || h <= 0) return 1
    return w / h
  })()

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
    <div className="pt-6 md:pt-10 pb-28 lg:pb-10 bg-background min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Draft Restored Toast */}
        {draftRestored && !editing && (
          <div className="fixed top-4 right-4 z-50 bg-primary text-primary-foreground text-sm px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-in slide-in-from-top-2">
            <Check className="h-4 w-4" />
            前回の設定を復元しました
          </div>
        )}

        {/* Editing-from-cart banner */}
        {editing && (
          <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="flex-1 text-sm">
              <p className="text-blue-900 font-medium">カート内アイテムを編集中</p>
              <p className="text-blue-800 text-xs mt-1">
                オプション・数量・デザインを変更したら「更新してカートへ戻る」で保存できます。
              </p>
            </div>
            <button
              type="button"
              onClick={() => router.push('/cart')}
              className="text-xs text-blue-700 underline hover:text-blue-900"
            >
              キャンセル
            </button>
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
                      placeholder="個数を指定"
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
                  selectedShape={effectiveShape}
                  onPreviewChange={handlePreviewChange}
                  onViewPreviewChange={handleViewPreviewChange}
                />
              ) : (
                <ImageUploader
                  onImageSelect={handleImageSelect}
                  currentImage={designImage}
                  currentFileName={designFileName}
                  selectedShape={effectiveShape}
                  aspect={parsedAspect}
                  onPreviewChange={handlePreviewChange}
                  onComplexityDetected={(grade) => {
                    // Surface the grade to the user so complex designs trigger
                    // a visible warning rather than silently grading in background.
                    setDetectedComplexity(grade)
                    // Also auto-set a matching complexity option if the product has one
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
                    selectedShape={effectiveShape}
                    aspect={parsedAspect}
                    onPreviewChange={handleBackPreviewChange}
                  />
                </div>
              )}
              {/* Complexity grade warning — triggered by analyzeComplexity() */}
              {detectedComplexity && (detectedComplexity === 'D' || detectedComplexity === 'E') && (
                <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 flex items-start gap-3">
                  <Info className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-900">
                    <p className="font-medium">デザインの複雑度: グレード{detectedComplexity}</p>
                    <p className="mt-1 text-xs">
                      細部が非常に細かいデザインです。型抜きでは輪郭が再現できない場合や、印刷でつぶれる可能性があります。
                      小サイズでの製造は推奨しません。不安な場合は
                      <a href="/contact" className="underline hover:text-amber-700"> お問い合わせ </a>
                      からご相談ください。
                    </p>
                  </div>
                </div>
              )}
              {/* Hollow/die-cut compatibility hint — only when die-cut shape selected */}
              {effectiveShape === 'die-cut' && (
                <div className="mt-3 text-xs text-muted-foreground px-3 py-2 rounded-lg bg-muted/40">
                  ※ 型抜きを選択中です。中身が空洞のデザイン（ドーナツ状・枠のみ）は製造できません。
                  アップロード時に自動チェックが走ります。
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

        {/* Delivery Speed Selection — hide entirely when product doesn't offer express. */}
        {(product.expressDeliveryFee ?? 0) > 0 && (
          <Card className="mb-4 border-2 border-border">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <Truck className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-foreground">納期を選択</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="radiogroup" aria-label="納期の選択">
                {/* Standard */}
                <button
                  role="radio"
                  aria-checked={!expressDelivery}
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
                  <span className="text-xs text-muted-foreground">15〜30営業日</span>
                  <span className="text-sm font-bold text-green-600">追加料金なし</span>
                </button>

                {/* Express */}
                <button
                  role="radio"
                  aria-checked={expressDelivery}
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
                  <span className="text-xs text-muted-foreground">12営業日以内（目安2〜3週間）</span>
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
        )}

        {/* Cheaper-tier nudge — only shows when buying MORE is actually cheaper */}
        {cheaperSuggestion && (
          <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 flex items-start gap-3">
            <Info className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1 text-sm">
              <p className="text-amber-900 font-medium">
                {cheaperSuggestion.suggestedQuantity}個にすると合計が
                <span className="font-bold"> {formatPrice(cheaperSuggestion.newTotal)} </span>
                で、現在より <span className="font-bold text-amber-700">{formatPrice(cheaperSuggestion.saving)}安く</span> なります
              </p>
              <button
                type="button"
                onClick={() => {
                  setQuantity(cheaperSuggestion.suggestedQuantity)
                  setCustomQuantity('')
                }}
                className="mt-1 text-xs text-amber-700 underline hover:text-amber-900"
              >
                {cheaperSuggestion.suggestedQuantity}個に変更する
              </button>
            </div>
          </div>
        )}

        {/* Price Summary & Actions */}
        <PriceSummary
          quantity={quantity}
          unitPrice={unitPrice}
          totalPrice={totalPrice}
          totalPriceItems={totalPriceItems}
          moldFee={moldFee}
          shippingExtra={shippingExtra}
          shippingFee={shippingPreview}
          hasExpress={expressDelivery}
          editing={editing}
          discountPercent={discountPercent}
          complexityBlock={complexityBlock}
          designImage={designImage}
          designImagesCount={designImages.length}
          deliveryPdfUrl={deliveryPdfUrl}
          is3d={!!is3d}
          allRequiredDone={allRequiredDone}
          isAdded={isAdded}
          validationError={validationError}
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
