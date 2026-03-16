'use client'

import { useCallback, useState } from 'react'
import { Upload, X, ImageIcon, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'

interface ImageUploaderProps {
  onImageSelect: (imageData: string | null, fileName: string | null) => void
  currentImage: string | null
  currentFileName: string | null
  selectedShape?: string
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
      return 'path("M 50 90 C 20 60, 0 30, 50 10 C 100 30, 80 60, 50 90 Z")'
    case 'star':
      return 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)'
    case 'oval':
      return 'ellipse(50% 35% at 50% 50%)'
    case 'shield':
      return 'polygon(50% 0%, 100% 15%, 100% 60%, 50% 100%, 0% 60%, 0% 15%)'
    case 'die-cut':
    default:
      return 'none'
  }
}

export function ImageUploader({
  onImageSelect,
  currentImage,
  currentFileName,
  selectedShape = 'die-cut',
}: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFile = useCallback(
    async (file: File) => {
      setError(null)
      setIsUploading(true)

      const validTypes = [
        'image/png',
        'image/jpeg',
        'image/jpg',
        'image/svg+xml',
        'image/webp',
      ]
      if (!validTypes.includes(file.type)) {
        setError('PNG、JPG、SVG、WebP形式の画像をアップロードしてください')
        setIsUploading(false)
        return
      }

      if (file.size > 10 * 1024 * 1024) {
        setError('ファイルサイズは10MB以下にしてください')
        setIsUploading(false)
        return
      }

      try {
        const fileExt = file.name.split('.').pop()
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`
        const filePath = `uploads/${fileName}`

        const { error: uploadError, data } = await supabase.storage
          .from('designs')
          .upload(filePath, file, { upsert: false })

        if (uploadError) {
          throw uploadError
        }

        const { data: { publicUrl } } = supabase.storage
          .from('designs')
          .getPublicUrl(filePath)

        onImageSelect(publicUrl, file.name)
      } catch (err: any) {
        console.error('Error uploading image:', err)
        setError('画像のアップロードに失敗しました。もう一度お試しください。')
      } finally {
        setIsUploading(false)
      }
    },
    [onImageSelect]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setIsDragging(false)

      const file = e.dataTransfer.files[0]
      if (file) {
        handleFile(file)
      }
    },
    [handleFile]
  )

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        handleFile(file)
      }
    },
    [handleFile]
  )

  const handleRemove = useCallback(() => {
    onImageSelect(null, null)
    setError(null)
  }, [onImageSelect])

  const clipPath = getShapeClipPath(selectedShape)
  const isDieCut = selectedShape === 'die-cut'

  if (currentImage) {
    return (
      <div className="space-y-4">
        <div className="relative aspect-square max-w-xs mx-auto bg-[repeating-conic-gradient(#e5e5e5_0%_25%,#fff_0%_50%)] bg-[length:20px_20px] rounded-2xl overflow-hidden shadow-lg">
          {/* 形状プレビュー */}
          <div className="absolute inset-0 flex items-center justify-center p-4">
            {clipPath !== 'none' ? (
              <div
                style={{
                  clipPath,
                  WebkitClipPath: clipPath,
                }}
                className="w-full h-full"
              >
                <img
                  src={currentImage}
                  alt="アップロードした画像"
                  className="w-full h-full object-contain"
                />
              </div>
            ) : (
              <img
                src={currentImage}
                alt="アップロードした画像"
                className="w-full h-full object-contain"
              />
            )}
          </div>
          <Button
            variant="destructive"
            size="icon"
            className="absolute top-3 right-3 h-8 w-8 rounded-full shadow-lg"
            onClick={handleRemove}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">画像を削除</span>
          </Button>
          {/* Shape badge */}
          <div className="absolute bottom-3 left-3 px-2 py-1 bg-background/90 text-foreground text-xs font-medium rounded-full shadow border">
            {getShapeName(selectedShape)}
          </div>
        </div>
        <div className="flex items-center justify-center gap-2 text-sm text-primary">
          <CheckCircle className="h-4 w-4" />
          <span className="font-medium truncate max-w-[200px]">
            {currentFileName}
          </span>
        </div>

        {/* 型抜き用の注意事項 */}
        {isDieCut && (
          <div className="flex items-start gap-2 p-3 bg-accent/10 border border-accent/30 rounded-xl">
            <AlertTriangle className="h-4 w-4 text-accent flex-shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              <strong className="text-foreground">型抜き</strong>を選択中です。
              画像の透明部分がそのままカットラインになります。
              背景透過のPNG画像を推奨します。
            </p>
          </div>
        )}

        <label className="block">
          <input
            type="file"
            className="sr-only"
            accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
            onChange={handleFileInput}
          />
          <Button variant="outline" asChild className="w-full h-11 rounded-xl">
            <span>別の画像を選択</span>
          </Button>
        </label>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div
        className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${isDragging
            ? 'border-primary bg-primary/5 scale-[1.02]'
            : 'border-border hover:border-primary/50 hover:bg-secondary/50'
          }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <label className="cursor-pointer block">
          <input
            type="file"
            className="sr-only"
            accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
            onChange={handleFileInput}
          />
          <div className="flex flex-col items-center gap-4">
            <div
              className={`w-20 h-20 rounded-2xl flex items-center justify-center transition-colors ${isDragging ? 'bg-primary/20' : 'bg-secondary'
                }`}
            >
              <ImageIcon
                className={`h-10 w-10 transition-colors ${isDragging ? 'text-primary' : 'text-muted-foreground'
                  }`}
              />
            </div>
            <div>
              <p className="font-semibold text-foreground text-lg">
                デザイン画像をアップロード
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                ドラッグ&ドロップまたはクリックして選択
              </p>
            </div>
            <Button
              variant="default"
              className="mt-2 h-11 px-6 rounded-xl bg-primary hover:bg-primary/90"
              disabled={isUploading}
              asChild
            >
              <span>
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    アップロード中...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    ファイルを選択
                  </>
                )}
              </span>
            </Button>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>対応形式: PNG, JPG, SVG, WebP（最大10MB）</p>
              <p className="text-primary font-medium">
                選択中の形状: {getShapeName(selectedShape)}
              </p>
            </div>
          </div>
        </label>
      </div>

      {/* 型抜き用の注意事項 */}
      {isDieCut && (
        <div className="flex items-start gap-2 p-3 bg-accent/10 border border-accent/30 rounded-xl">
          <AlertTriangle className="h-4 w-4 text-accent flex-shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            <strong className="text-foreground">型抜き</strong>を選択中です。
            画像の透明部分がそのままカットラインになります。
            <strong className="text-foreground">背景透過のPNG画像</strong>を推奨します。
          </p>
        </div>
      )}

      {error && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl">
          <p className="text-sm text-destructive text-center">{error}</p>
        </div>
      )}
    </div>
  )
}
