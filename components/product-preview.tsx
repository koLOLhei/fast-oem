'use client'

import Image from 'next/image'
import { Eye, CheckCircle } from 'lucide-react'
import { type Product } from '@/lib/products'

interface ProductPreviewProps {
  product: Product
  designImage: string | null
  selectedOptions: Record<string, string>
  isCanvasComposite?: boolean
}

// SVGクリップパスを形状IDに基づいて生成
function getShapeClipPath(shapeId: string): string {
  switch (shapeId) {
    case 'circle':
      return 'circle(50% at 50% 50%)'
    case 'square':
      return 'inset(0)'
    case 'rounded':
      return 'inset(0 round 16px)'
    case 'heart':
      return 'path("M 50 30 C 50 10, 0 0, 0 30 C 0 55, 50 75, 50 100 C 50 75, 100 55, 100 30 C 100 0, 50 10, 50 30 Z")'
    case 'star':
      return 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)'
    case 'oval':
      return 'ellipse(50% 35% at 50% 50%)'
    case 'shield':
      return 'polygon(50% 0%, 100% 15%, 100% 60%, 50% 100%, 0% 60%, 0% 15%)'
    case 'die-cut':
    default:
      // 型抜きは元画像の形状をそのまま使用（透明部分を維持）
      return 'none'
  }
}

// 形状に対応するSVGマスク
function ShapeMask({ shapeId, children }: { shapeId: string; children: React.ReactNode }) {
  const clipPath = getShapeClipPath(shapeId)

  if (clipPath === 'none') {
    // 型抜きの場合はそのまま表示
    return <>{children}</>
  }

  return (
    <div
      style={{
        clipPath,
        WebkitClipPath: clipPath,
      }}
      className="w-full h-full"
    >
      {children}
    </div>
  )
}



// 形状名を取得
function getShapeName(shapeId: string): string {
  const names: Record<string, string> = {
    'die-cut': '型抜き',
    'circle': '円形',
    'square': '四角形',
    'rounded': '角丸',
    'heart': 'ハート型',
    'star': '星型',
    'oval': '楕円形',
    'shield': 'シールド型',
  }
  return names[shapeId] || shapeId
}

export function ProductPreview({
  product,
  designImage,
  selectedOptions,
  isCanvasComposite = false,
}: ProductPreviewProps) {
  const selectedShape = selectedOptions['shape'] || 'die-cut'

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Eye className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-foreground text-lg">仕上がりイメージ</h3>
      </div>

      <div className="aspect-square relative bg-gradient-to-br from-secondary to-muted rounded-2xl overflow-hidden shadow-inner">
        {designImage ? (
          <div className="relative w-full h-full flex items-center justify-center p-8">
            {/* User design with shape mask */}
            <div className="relative w-3/4 h-3/4 flex items-center justify-center">
              {isCanvasComposite ? (
                <div className="w-full h-full relative">
                  <img
                    src={designImage}
                    alt="あなたのデザイン"
                    className="w-full h-full object-contain drop-shadow-xl"
                  />
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

              {/* キーホルダーの穴（該当商品のみ） */}
              {(product.category === 'keychain' || product.id.includes('keychain')) && (
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-muted-foreground/30 border-2 border-muted-foreground/50 shadow-inner" />
              )}
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
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-8 relative">
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              className="object-contain opacity-20"
            />
            <div className="relative z-10 text-center">
              <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mx-auto mb-3">
                <Eye className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                画像をアップロードすると
                <br />
                プレビューが表示されます
              </p>
              <p className="text-xs text-primary mt-2 font-medium">
                選択中の形状: {getShapeName(selectedShape)}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Selected Options Summary */}
      {Object.keys(selectedOptions).length > 0 && (
        <div className="bg-secondary/50 rounded-xl p-4">
          <h4 className="text-sm font-semibold text-foreground mb-3">
            選択中のオプション
          </h4>
          <dl className="grid grid-cols-2 gap-2">
            {Object.entries(selectedOptions).map(([key, value]) => {
              const option = product.options.find((o) => o.id === key)
              const optionValue = option?.values.find((v) => v.id === value)
              return (
                <div
                  key={key}
                  className="flex justify-between items-center text-sm bg-background px-3 py-2 rounded-lg"
                >
                  <dt className="text-muted-foreground text-xs">{option?.name || key}</dt>
                  <dd className="font-medium text-foreground text-xs">
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
