'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Upload, X, ImageIcon, CheckCircle, AlertTriangle, Loader2, FileDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import DesignCanvas, { type DesignCanvasRef } from '@/components/design-canvas'

interface ImageUploaderProps {
  onImageSelect: (
    storagePath: string | null,
    fileName: string | null,
    deliveryPdfUrl?: string | null,
  ) => void
  currentImage: string | null
  currentFileName: string | null
  selectedShape?: string
  onPreviewChange?: (dataUrl: string) => void
  onComplexityDetected?: (grade: string) => void
}

export function ImageUploader({
  onImageSelect,
  currentImage,
  currentFileName,
  selectedShape = 'die-cut',
  onPreviewChange,
  onComplexityDetected,
}: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmed, setConfirmed] = useState(false)
  const canvasRef = useRef<DesignCanvasRef>(null)
  // Monotonic counter to discard stale upload results when the user picks a
  // new file before the previous upload resolves.
  const uploadGenerationRef = useRef(0)

  // Local blob URL for DesignCanvas preview — never leaves the browser.
  // The parent stores only the Supabase storage path.
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null)

  // Revoke blob URL on unmount only.
  // During the component lifetime, handleFile / handleRemove manage revocation.
  const localPreviewUrlRef = useRef(localPreviewUrl)
  localPreviewUrlRef.current = localPreviewUrl
  useEffect(() => {
    return () => {
      if (localPreviewUrlRef.current) URL.revokeObjectURL(localPreviewUrlRef.current)
    }
  }, [])

  const handleFile = useCallback(
    async (file: File) => {
      setError(null)
      setConfirmed(false)
      setIsUploading(true)

      // Bump generation; any async work from a prior upload that resolves after
      // this point will be discarded by the generation check below.
      uploadGenerationRef.current += 1
      const generation = uploadGenerationRef.current

      // NOTE: SVG is intentionally rejected. SVGs can contain scripts or
      // external refs that taint the canvas, which would silently break PNG
      // export and complexity analysis. Users should rasterize to PNG first.
      const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
      if (!validTypes.includes(file.type)) {
        setError('PNG、JPG、WebP形式の画像をアップロードしてください（SVGはPNGに書き出してからアップロードしてください）')
        setIsUploading(false)
        return
      }
      if (file.size > 10 * 1024 * 1024) {
        setError('ファイルサイズは10MB以下にしてください')
        setIsUploading(false)
        return
      }

      // Create local blob URL for instant preview (same-origin, no CORS issues)
      const oldUrl = localPreviewUrlRef.current
      if (oldUrl) URL.revokeObjectURL(oldUrl)
      const blobUrl = URL.createObjectURL(file)
      setLocalPreviewUrl(blobUrl)

      const isStale = () => generation !== uploadGenerationRef.current

      try {
        // Upload to Supabase Storage (private bucket)
        const fileExt = file.name.split('.').pop()
        const storageName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`
        const storagePath = `uploads/${storageName}`
        const { error: uploadError } = await supabase.storage
          .from('designs')
          .upload(storagePath, file, { upsert: false })
        if (uploadError) throw uploadError

        // Discard result if a newer upload has started.
        if (isStale()) {
          await supabase.storage.from('designs').remove([storagePath]).catch(() => {})
          URL.revokeObjectURL(blobUrl)
          return
        }

        // For die-cut shapes, check if the image has interior holes (hollow)
        if (selectedShape === 'die-cut') {
          const { detectHollow } = await import('@/lib/complexity-analyzer')
          const isHollow = await detectHollow(blobUrl)
          if (isStale()) {
            await supabase.storage.from('designs').remove([storagePath]).catch(() => {})
            URL.revokeObjectURL(blobUrl)
            return
          }
          if (isHollow) {
            setError('中身が空洞のデザインは型抜きで製造できません。空洞のない画像をアップロードしてください。')
            URL.revokeObjectURL(blobUrl)
            setLocalPreviewUrl(null)
            // Remove the uploaded file from storage
            await supabase.storage.from('designs').remove([storagePath])
            setIsUploading(false)
            return
          }
        }

        // Pass storage path (NOT public URL) to parent — server-side
        // code uses toSignedUrl() to generate short-lived download URLs.
        onImageSelect(storagePath, file.name, null)

        // Run complexity analysis in background (non-blocking)
        if (onComplexityDetected) {
          import('@/lib/complexity-analyzer').then(({ analyzeComplexity }) => {
            analyzeComplexity(blobUrl)
              .then((grade) => {
                // Don't deliver analysis result from a stale upload.
                if (isStale()) return
                onComplexityDetected(grade)
              })
              .catch(() => { /* analysis is best-effort */ })
          })
        }
      } catch (err: any) {
        console.error('[ImageUploader] handleFile failed:', err)
        if (!isStale()) {
          setError('画像のアップロードに失敗しました。もう一度お試しください。')
          // Clean up blob URL on failure
          URL.revokeObjectURL(blobUrl)
          setLocalPreviewUrl(null)
        } else {
          URL.revokeObjectURL(blobUrl)
        }
      } finally {
        if (!isStale()) setIsUploading(false)
      }
    },
    [onImageSelect, selectedShape, onComplexityDetected],
  )

  const handleConfirmLayout = useCallback(async () => {
    if (!canvasRef.current || !currentImage) return
    setIsExporting(true)
    setError(null)
    try {
      const ts = `${Date.now()}_${Math.random().toString(36).substring(2)}`

      // Export high-res PNG composite from canvas
      const pngBlob = await canvasRef.current.exportPNG()
      const pngPath = `delivery/${ts}_composite.png`
      const { error: pngUploadErr } = await supabase.storage
        .from('designs')
        .upload(pngPath, pngBlob, { contentType: 'image/png' })
      if (pngUploadErr) {
        console.error('[ImageUploader] PNG upload failed:', pngUploadErr)
        throw new Error(`PNGのアップロードに失敗しました: ${pngUploadErr.message}`)
      }

      // Update local preview to the composite image
      const oldUrl = localPreviewUrlRef.current
      if (oldUrl) URL.revokeObjectURL(oldUrl)
      const compositeBlobUrl = URL.createObjectURL(pngBlob)
      setLocalPreviewUrl(compositeBlobUrl)

      // Export PDF
      const pdfBlob = await canvasRef.current.exportPDF()
      const pdfPath = `delivery/${ts}_delivery.pdf`
      const { error: pdfUploadErr } = await supabase.storage
        .from('designs')
        .upload(pdfPath, pdfBlob, { contentType: 'application/pdf' })
      if (pdfUploadErr) {
        console.error('[ImageUploader] PDF upload failed:', pdfUploadErr)
        throw new Error(`PDFのアップロードに失敗しました: ${pdfUploadErr.message}`)
      }

      // Pass composite storage path + delivery PDF path to parent
      onImageSelect(pngPath, currentFileName, pdfPath)
      setConfirmed(true)
    } catch (err: any) {
      console.error('[ImageUploader] handleConfirmLayout failed:', err)
      const message = err?.message || '納品データの生成に失敗しました'
      setError(`${message}。もう一度お試しください。`)
    } finally {
      setIsExporting(false)
    }
  }, [currentImage, currentFileName, onImageSelect])

  const handleRemove = useCallback(async () => {
    const oldUrl = localPreviewUrlRef.current
    if (oldUrl) URL.revokeObjectURL(oldUrl)
    setLocalPreviewUrl(null)

    // Delete uploaded file from Supabase Storage to avoid orphans
    if (currentImage) {
      await supabase.storage.from('designs').remove([currentImage]).catch(() => {
        /* best-effort cleanup */
      })
    }

    onImageSelect(null, null, null)
    setError(null)
    setConfirmed(false)
  }, [onImageSelect, currentImage])

  // The image URL to feed into DesignCanvas — always a browser-loadable URL
  const canvasImageUrl = localPreviewUrl

  if (currentImage && canvasImageUrl) {
    return (
      <div className="space-y-4">
        <DesignCanvas ref={canvasRef} imageUrl={canvasImageUrl} shape={selectedShape} onCanvasChange={onPreviewChange} />

        {confirmed ? (
          <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl">
            <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-green-800">納品データを生成しました</p>
              <p className="text-xs text-green-600">配置を変更したい場合は調整後にもう一度確定してください</p>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800">
              画像の配置を調整したら <strong>「納品データを確定」</strong> を押してください。確定後にカートに追加できます。
            </p>
          </div>
        )}

        <div className="flex flex-col gap-2 max-w-[400px] mx-auto">
          <Button
            onClick={handleConfirmLayout}
            disabled={isExporting}
            className="h-11 rounded-xl w-full bg-green-600 hover:bg-green-700 text-white"
          >
            {isExporting
              ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />PDF生成中...</>
              : <><FileDown className="h-4 w-4 mr-2" />納品データを確定（PDF生成）</>
            }
          </Button>
          <div className="flex gap-2">
            <label className="flex-1">
              <input
                type="file" className="sr-only"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
              />
              <Button variant="outline" asChild className="w-full h-9 rounded-xl text-xs"><span>別の画像を選択</span></Button>
            </label>
            <Button
              variant="ghost" size="sm" onClick={handleRemove}
              className="h-9 rounded-xl text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <X className="h-3.5 w-3.5 mr-1" />削除
            </Button>
          </div>
        </div>

        {error && <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl"><p className="text-sm text-destructive text-center">{error}</p></div>}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div
        className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${
          isDragging ? 'border-primary bg-primary/5 scale-[1.02]' : 'border-border hover:border-primary/50 hover:bg-secondary/50'
        }`}
        onDrop={(e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
      >
        <label className="cursor-pointer block">
          <input
            type="file" className="sr-only"
            accept="image/png,image/jpeg,image/jpg,image/webp"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
          />
          <div className="flex flex-col items-center gap-4">
            <div className={`w-20 h-20 rounded-2xl flex items-center justify-center transition-colors ${isDragging ? 'bg-primary/20' : 'bg-secondary'}`}>
              <ImageIcon className={`h-10 w-10 transition-colors ${isDragging ? 'text-primary' : 'text-muted-foreground'}`} />
            </div>
            <div>
              <p className="font-semibold text-foreground text-lg">デザイン画像をアップロード</p>
              <p className="text-sm text-muted-foreground mt-2">ドラッグ&ドロップまたはクリックして選択</p>
            </div>
            <Button variant="default" className="mt-2 h-11 px-6 rounded-xl bg-primary hover:bg-primary/90" disabled={isUploading} asChild>
              <span>
                {isUploading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />アップロード中...</> : <><Upload className="h-4 w-4 mr-2" />ファイルを選択</>}
              </span>
            </Button>
            <p className="text-xs text-muted-foreground">対応形式: PNG, JPG, WebP（最大10MB / SVGはPNGに書き出してください）</p>
          </div>
        </label>
      </div>

      {selectedShape === 'die-cut' && (
        <div className="flex items-start gap-2 p-3 bg-accent/10 border border-accent/30 rounded-xl">
          <AlertTriangle className="h-4 w-4 text-accent shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground"><strong className="text-foreground">型抜き</strong>を選択中です。背景透過のPNG画像を推奨します。</p>
        </div>
      )}

      {error && <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl"><p className="text-sm text-destructive text-center">{error}</p></div>}
    </div>
  )
}
