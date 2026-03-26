'use client'

import Image from 'next/image'
import { Eye, CheckCircle } from 'lucide-react'
import { type Product, type PreviewOverlay } from '@/lib/products'

interface ProductPreviewProps {
  product: Product
  designImage: string | null
  selectedOptions: Record<string, string>
  isCanvasComposite?: boolean
  hasDesign?: boolean
  designImages?: { viewId: string; viewLabel: string; previewDataUrl?: string }[]
}

// ────────────────────────────────────────────
// Shape helpers
// ────────────────────────────────────────────
function getShapeClipPath(shapeId: string): string {
  switch (shapeId) {
    case 'circle': return 'circle(50% at 50% 50%)'
    case 'square': return 'inset(0)'
    case 'rounded': return 'inset(0 round 16px)'
    case 'heart': return 'path("M 50 30 C 50 10, 0 0, 0 30 C 0 55, 50 75, 50 100 C 50 75, 100 55, 100 30 C 100 0, 50 10, 50 30 Z")'
    case 'star': return 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)'
    case 'oval': return 'ellipse(50% 35% at 50% 50%)'
    case 'shield': return 'polygon(50% 0%, 100% 15%, 100% 60%, 50% 100%, 0% 60%, 0% 15%)'
    default: return 'none'
  }
}

function ShapeMask({ shapeId, children }: { shapeId: string; children: React.ReactNode }) {
  const clipPath = getShapeClipPath(shapeId)
  if (clipPath === 'none') return <>{children}</>
  return <div style={{ clipPath, WebkitClipPath: clipPath }} className="w-full h-full">{children}</div>
}

const SHAPE_NAMES: Record<string, string> = {
  'die-cut': '型抜き', circle: '円形', square: '四角形', rounded: '角丸',
  heart: 'ハート型', star: '星型', oval: '楕円形', shield: 'シールド型',
}

function getShapeName(shapeId: string): string {
  return SHAPE_NAMES[shapeId] || shapeId
}

// ────────────────────────────────────────────
// Collect preview overlays from selected options
// ────────────────────────────────────────────
function collectOverlays(product: Product, selectedOptions: Record<string, string>) {
  const overlays: { overlay: PreviewOverlay; color?: string }[] = []
  let texture: string | undefined
  let chainColor: string | undefined

  for (const [optionId, selectedValue] of Object.entries(selectedOptions)) {
    const option = product.options.find((o) => o.id === optionId)
    if (!option) continue

    // checkbox: multiple values
    if (option.type === 'checkbox' || option.multiSelect) {
      for (const id of selectedValue.split(',').filter(Boolean)) {
        const val = option.values.find((v) => v.id === id)
        if (val?.previewOverlay) overlays.push({ overlay: val.previewOverlay, color: val.previewColor })
        if (val?.previewTexture) texture = val.previewTexture
      }
      continue
    }

    const val = option.values.find((v) => v.id === selectedValue)
    if (!val) continue
    if (val.previewOverlay) overlays.push({ overlay: val.previewOverlay, color: val.previewColor })
    if (val.previewTexture) texture = val.previewTexture
    if (val.previewColor && optionId.includes('color')) chainColor = val.previewColor
  }

  return { overlays, texture, chainColor }
}

// ────────────────────────────────────────────
// Overlay image component
// ────────────────────────────────────────────
function OverlayImage({ overlay, tintColor }: { overlay: PreviewOverlay; tintColor?: string }) {
  const positionStyles: Record<string, React.CSSProperties> = {
    top: { top: `${overlay.offsetY ?? -10}%`, left: '50%', transform: `translateX(-50%) scale(${overlay.scale ?? 1})` },
    bottom: { bottom: `${-(overlay.offsetY ?? 5)}%`, left: '50%', transform: `translateX(-50%) scale(${overlay.scale ?? 1})` },
    left: { left: `${overlay.offsetX ?? 0}%`, top: '50%', transform: `translateY(-50%) scale(${overlay.scale ?? 1})` },
    right: { right: `${-(overlay.offsetX ?? 0)}%`, top: '50%', transform: `translateY(-50%) scale(${overlay.scale ?? 1})` },
    center: { top: '50%', left: '50%', transform: `translate(-50%, -50%) scale(${overlay.scale ?? 1})` },
    background: { inset: '0', transform: `scale(${overlay.scale ?? 1})` },
  }

  return (
    <img
      src={overlay.imageUrl}
      alt=""
      className="absolute pointer-events-none object-contain"
      style={{
        ...positionStyles[overlay.position] || positionStyles.top,
        zIndex: overlay.zIndex ?? 10,
        width: overlay.position === 'background' ? '100%' : '40%',
        height: overlay.position === 'background' ? '100%' : 'auto',
        filter: tintColor ? `drop-shadow(0 0 0 ${tintColor})` : undefined,
      }}
      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
    />
  )
}

// ────────────────────────────────────────────
// Chain/hook visual with color tint
// ────────────────────────────────────────────
function ChainVisual({ color }: { color?: string }) {
  const c = color || '#999'
  return (
    <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex flex-col items-center z-20">
      {/* Ring */}
      <div
        className="w-5 h-5 rounded-full border-[2.5px] shadow-sm"
        style={{ borderColor: c }}
      />
      {/* Short chain link */}
      <div className="w-[2px] h-2" style={{ backgroundColor: c }} />
    </div>
  )
}

// ────────────────────────────────────────────
// Main component
// ────────────────────────────────────────────
export function ProductPreview({
  product,
  designImage,
  selectedOptions,
  isCanvasComposite = false,
  hasDesign = false,
  designImages,
}: ProductPreviewProps) {
  const selectedShape = selectedOptions['shape'] || 'die-cut'
  const showDesign = !!designImage
  const showPending = !designImage && hasDesign

  // Collect visual overlays from selected options
  const { overlays, texture, chainColor } = collectOverlays(product, selectedOptions)
  const isKeychain = product.category === 'keychain' || product.id.includes('keychain')

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Eye className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-foreground text-lg">仕上がりイメージ</h3>
      </div>

      {designImages && designImages.length > 0 ? (
        /* ── 3D: grid view ── */
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {designImages.map((view) => (
              <div key={view.viewId} className="aspect-square relative bg-gradient-to-br from-secondary to-muted rounded-xl overflow-hidden">
                {/* Texture background for 3D */}
                {texture && (
                  <div
                    className="absolute inset-0 opacity-20 bg-cover bg-center"
                    style={{ backgroundImage: `url(${texture})` }}
                  />
                )}
                <div className="absolute top-2 left-2 px-2 py-0.5 bg-background/90 text-xs font-medium rounded-full border z-10">
                  {view.viewLabel}
                </div>
                {view.previewDataUrl ? (
                  <img src={view.previewDataUrl} alt={view.viewLabel} className="w-full h-full object-contain p-4 drop-shadow-lg relative z-[1]" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <p className="text-xs text-muted-foreground">未アップロード</p>
                  </div>
                )}
              </div>
            ))}
          </div>
          {/* Texture legend */}
          {texture && (
            <p className="text-xs text-muted-foreground text-center">素材テクスチャをプレビューに反映中</p>
          )}
        </div>
      ) : (

      /* ── 2D: single image view ── */
      <div className="aspect-square relative bg-gradient-to-br from-secondary to-muted rounded-2xl overflow-hidden shadow-inner">
        {showDesign ? (
          <div className="relative w-full h-full flex items-center justify-center p-8">
            <div className="relative w-3/4 h-3/4 flex items-center justify-center">
              {/* Option overlays (behind design if background, in front otherwise) */}
              {overlays.filter((o) => o.overlay.position === 'background').map((o, i) => (
                <OverlayImage key={`bg-${i}`} overlay={o.overlay} tintColor={o.color} />
              ))}

              {isCanvasComposite ? (
                <div className="w-full h-full relative">
                  <img src={designImage} alt="あなたのデザイン" className="w-full h-full object-contain drop-shadow-xl" />
                </div>
              ) : (
                <ShapeMask shapeId={selectedShape}>
                  <div className={`w-full h-full relative ${selectedShape === 'die-cut' ? '' : 'bg-white shadow-xl overflow-hidden'}`}>
                    <img
                      src={designImage}
                      alt="あなたのデザイン"
                      className={`w-full h-full object-contain ${selectedShape === 'die-cut' ? 'drop-shadow-xl' : ''}`}
                    />
                  </div>
                </ShapeMask>
              )}

              {/* Chain/hook visual for keychains */}
              {isKeychain && <ChainVisual color={chainColor} />}

              {/* Foreground overlays (accessories, decorations) */}
              {overlays.filter((o) => o.overlay.position !== 'background').map((o, i) => (
                <OverlayImage key={`fg-${i}`} overlay={o.overlay} tintColor={chainColor || o.color} />
              ))}
            </div>

            {/* Success indicator */}
            <div className="absolute bottom-4 right-4 flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-medium rounded-full shadow-lg">
              <CheckCircle className="h-3.5 w-3.5" />
              デザイン適用済み
            </div>

            {/* Shape indicator */}
            <div className="absolute bottom-4 left-4 px-3 py-1.5 bg-background/90 text-foreground text-xs font-medium rounded-full shadow-lg border">
              形状: {getShapeName(selectedShape)}
            </div>
          </div>
        ) : showPending ? (
          <div className="w-full h-full flex flex-col items-center justify-center p-8">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <CheckCircle className="h-6 w-6 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground text-center">プレビューを生成中...</p>
            <p className="text-xs text-primary mt-2 font-medium">選択中の形状: {getShapeName(selectedShape)}</p>
          </div>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-8 relative">
            <Image src={product.imageUrl} alt={product.name} fill className="object-contain opacity-20" />
            <div className="relative z-10 text-center">
              <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mx-auto mb-3">
                <Eye className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">画像をアップロードすると<br />プレビューが表示されます</p>
              <p className="text-xs text-primary mt-2 font-medium">選択中の形状: {getShapeName(selectedShape)}</p>
            </div>
          </div>
        )}
      </div>
      )}

      {/* Selected Options Summary */}
      {Object.keys(selectedOptions).length > 0 && (
        <div className="bg-secondary/50 rounded-xl p-4">
          <h4 className="text-sm font-semibold text-foreground mb-3">選択中のオプション</h4>
          <dl className="grid grid-cols-2 gap-2">
            {Object.entries(selectedOptions).map(([key, value]) => {
              const option = product.options.find((o) => o.id === key)
              if (!option) return null
              // checkbox: show multiple labels
              if (option.type === 'checkbox' || option.multiSelect) {
                const ids = value.split(',').filter(Boolean)
                const labels = ids.map((id) => option.values.find((v) => v.id === id)?.label || id).join(', ')
                return (
                  <div key={key} className="flex justify-between items-center text-sm bg-background px-3 py-2 rounded-lg col-span-2">
                    <dt className="text-muted-foreground text-xs">{option.name}</dt>
                    <dd className="font-medium text-foreground text-xs">{labels || 'なし'}</dd>
                  </div>
                )
              }
              const optionValue = option.values.find((v) => v.id === value)
              return (
                <div key={key} className="flex justify-between items-center text-sm bg-background px-3 py-2 rounded-lg">
                  <dt className="text-muted-foreground text-xs">{option.name}</dt>
                  <dd className="font-medium text-foreground text-xs flex items-center gap-1.5">
                    {/* Color swatch for color options */}
                    {optionValue?.previewColor && (
                      <span className="w-3 h-3 rounded-full border border-border inline-block" style={{ backgroundColor: optionValue.previewColor }} />
                    )}
                    {optionValue?.label || value}
                  </dd>
                </div>
              )
            })}
          </dl>
        </div>
      )}

      {/* 入稿データの注意事項 */}
      <div className="bg-accent/10 border border-accent/30 rounded-xl p-4">
        <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-accent text-accent-foreground flex items-center justify-center text-xs">!</span>
          入稿データについて
        </h4>
        {selectedShape === 'die-cut' ? (
          <p className="text-xs text-muted-foreground leading-relaxed">
            型抜きの場合、アップロードした画像の<strong className="text-foreground">透明部分がそのままカットライン</strong>になります。
            背景透過のPNG画像をご入稿ください。
          </p>
        ) : (
          <p className="text-xs text-muted-foreground leading-relaxed">
            <strong className="text-foreground">{getShapeName(selectedShape)}</strong>の形状でカットされます。
            デザインは形状内に収まるように配置してください。
          </p>
        )}
      </div>
    </div>
  )
}
