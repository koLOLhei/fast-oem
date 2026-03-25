'use client'

import { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react'
import { ZoomIn, ZoomOut, RotateCw, Maximize2 } from 'lucide-react'

// ────────────────────────────────────────────────────────
// Shape path builders (CanvasRenderingContext2D)
// ────────────────────────────────────────────────────────
function buildShapePath(
  ctx: CanvasRenderingContext2D,
  shape: string,
  x: number, y: number, w: number, h: number,
) {
  const cx = x + w / 2
  const cy = y + h / 2
  ctx.beginPath()
  switch (shape) {
    case 'circle':
      ctx.arc(cx, cy, Math.min(w, h) / 2, 0, Math.PI * 2)
      break
    case 'square':
      ctx.rect(x, y, w, h)
      break
    case 'rounded': {
      const r = Math.min(w, h) * 0.1
      ctx.roundRect(x, y, w, h, r)
      break
    }
    case 'heart':
      // Start at the center dip between the two bumps
      ctx.moveTo(cx, y + h * 0.3)
      // Left bump: curve up-left then back down to left side
      ctx.bezierCurveTo(cx, y + h * 0.1, x, y, x, y + h * 0.3)
      // Left side down to bottom tip
      ctx.bezierCurveTo(x, y + h * 0.55, cx, y + h * 0.75, cx, y + h)
      // Right side up from bottom tip
      ctx.bezierCurveTo(cx, y + h * 0.75, x + w, y + h * 0.55, x + w, y + h * 0.3)
      // Right bump: curve up-right then back to center dip
      ctx.bezierCurveTo(x + w, y, cx, y + h * 0.1, cx, y + h * 0.3)
      ctx.closePath()
      break
    case 'star': {
      for (let i = 0; i < 10; i++) {
        const a = (i * Math.PI) / 5 - Math.PI / 2
        const r = i % 2 === 0 ? Math.min(w, h) / 2 : Math.min(w, h) * 0.2
        const px = cx + r * Math.cos(a)
        const py = cy + r * Math.sin(a)
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)
      }
      ctx.closePath()
      break
    }
    case 'oval':
      ctx.ellipse(cx, cy, w * 0.45, h * 0.35, 0, 0, Math.PI * 2)
      break
    case 'plastic-bag':
      ctx.moveTo(x + w * 0.35, y)
      ctx.lineTo(x + w * 0.65, y)
      ctx.lineTo(x + w * 0.65, y + h * 0.12)
      ctx.lineTo(x + w * 0.73, y + h * 0.12)
      ctx.quadraticCurveTo(x + w * 0.92, y + h * 0.29, x + w * 0.92, y + h * 0.34)
      ctx.lineTo(x + w * 0.96, y + h)
      ctx.lineTo(x + w * 0.04, y + h)
      ctx.lineTo(x + w * 0.08, y + h * 0.34)
      ctx.quadraticCurveTo(x + w * 0.08, y + h * 0.29, x + w * 0.27, y + h * 0.12)
      ctx.lineTo(x + w * 0.35, y + h * 0.12)
      ctx.closePath()
      break
    default: // die-cut: bounding box as guide
      ctx.rect(x, y, w, h)
  }
}

// ────────────────────────────────────────────────────────
// Canvas render helper
// ────────────────────────────────────────────────────────
interface Transform { tx: number; ty: number; scale: number; rot: number }

function renderToCanvas(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement | null,
  shape: string,
  t: Transform,
  exportMode = false,
) {
  const dpr = exportMode ? 4 : (window.devicePixelRatio || 1)
  const displaySize = exportMode ? 1200 : 400

  canvas.width = displaySize * dpr
  canvas.height = displaySize * dpr
  if (!exportMode) {
    canvas.style.width = displaySize + 'px'
    canvas.style.height = displaySize + 'px'
  }

  const ctx = canvas.getContext('2d')!
  ctx.scale(dpr, dpr)
  ctx.clearRect(0, 0, displaySize, displaySize)

  // Checkered background
  const cs = 16
  for (let i = 0; i < displaySize / cs; i++) {
    for (let j = 0; j < displaySize / cs; j++) {
      ctx.fillStyle = (i + j) % 2 === 0 ? '#e5e5e5' : '#ffffff'
      ctx.fillRect(i * cs, j * cs, cs, cs)
    }
  }

  const pad = displaySize * 0.1
  const fw = displaySize - pad * 2
  const fh = fw
  const fx = pad
  const fy = pad

  // Draw image (clipped to shape for non-die-cut)
  if (image) {
    ctx.save()
    if (shape !== 'die-cut') {
      buildShapePath(ctx, shape, fx, fy, fw, fh)
      ctx.clip()
    }

    const imgAspect = image.naturalWidth / image.naturalHeight
    const baseW = fw
    const baseH = baseW / imgAspect
    const sw = baseW * t.scale
    const sh = baseH * t.scale

    const centerX = fx + fw / 2 + t.tx * fw
    const centerY = fy + fh / 2 + t.ty * fh

    ctx.translate(centerX, centerY)
    ctx.rotate((t.rot * Math.PI) / 180)
    ctx.drawImage(image, -sw / 2, -sh / 2, sw, sh)
    ctx.restore()
  }

  // Draw frame border
  ctx.save()
  buildShapePath(ctx, shape, fx, fy, fw, fh)
  if (shape === 'die-cut') {
    ctx.strokeStyle = '#ef4444'
    ctx.lineWidth = exportMode ? 3 : 1.5
    ctx.setLineDash([exportMode ? 12 : 6, exportMode ? 6 : 3])
    ctx.stroke()
    // Label
    if (!exportMode) {
      ctx.setLineDash([])
      ctx.font = '11px sans-serif'
      ctx.fillStyle = '#ef4444'
      ctx.fillText('● カットライン（赤破線）', fx + 4, fy + 15)
    }
  } else {
    ctx.strokeStyle = '#1e40af'
    ctx.lineWidth = exportMode ? 4 : 2
    ctx.setLineDash([])
    ctx.stroke()
  }
  ctx.restore()
}

// ────────────────────────────────────────────────────────
// Public API via ref
// ────────────────────────────────────────────────────────
export interface DesignCanvasRef {
  exportPNG: () => Promise<Blob>
  exportPDF: () => Promise<Blob>
}

interface Props {
  imageUrl: string
  shape: string
  onTransformChange?: (t: Transform) => void
  onCanvasChange?: (dataUrl: string) => void
}

// ────────────────────────────────────────────────────────
// Component
// ────────────────────────────────────────────────────────
const DesignCanvas = forwardRef<DesignCanvasRef, Props>(function DesignCanvas(
  { imageUrl, shape, onTransformChange, onCanvasChange },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)
  const [transform, setTransform] = useState<Transform>({ tx: 0, ty: 0, scale: 1, rot: 0 })
  const [loaded, setLoaded] = useState(false)
  const dragging = useRef(false)
  const lastPos = useRef({ x: 0, y: 0 })
  const canvasChangeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load image
  useEffect(() => {
    setLoaded(false)
    const img = new window.Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      imageRef.current = img
      setLoaded(true)
    }
    img.onerror = () => {
      console.error('[DesignCanvas] Failed to load image:', imageUrl)
      imageRef.current = null
      setLoaded(true) // still mark loaded so canvas renders (without image)
    }
    img.src = imageUrl
  }, [imageUrl])

  // Re-render canvas when transform or image changes
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    renderToCanvas(canvas, imageRef.current, shape, transform)

    // Throttled preview callback — max once per 100ms to avoid perf issues
    if (onCanvasChange && loaded) {
      if (canvasChangeTimer.current) clearTimeout(canvasChangeTimer.current)
      canvasChangeTimer.current = setTimeout(() => {
        const c = canvasRef.current
        if (c) onCanvasChange(c.toDataURL('image/png'))
      }, 100)
    }

    return () => {
      if (canvasChangeTimer.current) clearTimeout(canvasChangeTimer.current)
    }
  }, [transform, shape, loaded, onCanvasChange])

  useEffect(() => {
    onTransformChange?.(transform)
  }, [transform, onTransformChange])

  // Reset transform
  const handleCenter = useCallback(() => {
    setTransform({ tx: 0, ty: 0, scale: 1, rot: 0 })
  }, [])

  // Mouse / touch drag
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    dragging.current = true
    lastPos.current = { x: e.clientX, y: e.clientY }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }, [])

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return
    const dx = (e.clientX - lastPos.current.x) / 400
    const dy = (e.clientY - lastPos.current.y) / 400
    lastPos.current = { x: e.clientX, y: e.clientY }
    setTransform((prev) => ({
      ...prev,
      tx: Math.max(-0.5, Math.min(0.5, prev.tx + dx)),
      ty: Math.max(-0.5, Math.min(0.5, prev.ty + dy)),
    }))
  }, [])

  const onPointerUp = useCallback(() => { dragging.current = false }, [])

  // Attach wheel listener natively with { passive: false } so preventDefault() works.
  // React's onWheel is passive by default and cannot prevent page scroll.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const handler = (e: WheelEvent) => {
      e.preventDefault()
      const delta = e.deltaY > 0 ? -0.05 : 0.05
      setTransform((prev) => ({ ...prev, scale: Math.max(0.2, Math.min(5, prev.scale + delta)) }))
    }
    canvas.addEventListener('wheel', handler, { passive: false })
    return () => canvas.removeEventListener('wheel', handler)
  }, [])

  // Export functions
  useImperativeHandle(ref, () => ({
    async exportPNG(): Promise<Blob> {
      const canvas = document.createElement('canvas')
      renderToCanvas(canvas, imageRef.current, shape, transform, true)
      return new Promise((resolve, reject) =>
        canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Export failed'))), 'image/png', 1.0),
      )
    },
    async exportPDF(): Promise<Blob> {
      // Generate high-res PNG then wrap in PDF using pdf-lib
      const canvas = document.createElement('canvas')
      renderToCanvas(canvas, imageRef.current, shape, transform, true)
      const pngDataUrl = canvas.toDataURL('image/png', 1.0)

      const { PDFDocument } = await import('pdf-lib')
      const pdfDoc = await PDFDocument.create()
      const page = pdfDoc.addPage([canvas.width / 4, canvas.height / 4]) // pt = px/dpr
      const pngImage = await pdfDoc.embedPng(pngDataUrl)
      page.drawImage(pngImage, { x: 0, y: 0, width: page.getWidth(), height: page.getHeight() })
      const pdfBytes = await pdfDoc.save()
      return new Blob([pdfBytes], { type: 'application/pdf' })
    },
  }))

  return (
    <div className="space-y-3">
      {/* Canvas */}
      <div className="relative rounded-2xl overflow-hidden border border-border shadow-md w-full max-w-[400px] mx-auto">
        <canvas
          ref={canvasRef}
          style={{ width: 400, height: 400, cursor: dragging.current ? 'grabbing' : 'grab', touchAction: 'none' }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        />
        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/60">
            <span className="text-sm text-muted-foreground">読み込み中...</span>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-3 max-w-[400px] mx-auto">
        {/* Scale */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <ZoomOut className="h-3.5 w-3.5 shrink-0" />
          <input
            type="range" min={20} max={500} step={5}
            value={Math.round(transform.scale * 100)}
            onChange={(e) => setTransform((p) => ({ ...p, scale: parseInt(e.target.value) / 100 }))}
            className="flex-1 accent-primary"
          />
          <ZoomIn className="h-3.5 w-3.5 shrink-0" />
          <span className="w-12 text-right">{Math.round(transform.scale * 100)}%</span>
        </div>
        {/* Rotation */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <RotateCw className="h-3.5 w-3.5 shrink-0" />
          <input
            type="range" min={-180} max={180} step={1}
            value={transform.rot}
            onChange={(e) => setTransform((p) => ({ ...p, rot: parseInt(e.target.value) }))}
            className="flex-1 accent-primary"
          />
          <span className="w-12 text-right">{transform.rot}°</span>
        </div>
        {/* Buttons */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleCenter}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-border rounded-lg hover:bg-muted transition"
          >
            <Maximize2 className="h-3.5 w-3.5" />
            中央にリセット
          </button>
          <p className="text-xs text-muted-foreground self-center">ドラッグで移動 / スクロールで拡縮</p>
        </div>

        {/* Shape guide text */}
        {shape === 'die-cut' && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            型抜き：画像の輪郭がそのままカットラインになります。赤破線は製品の最大範囲を示します。
          </p>
        )}
        {shape !== 'die-cut' && (
          <p className="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
            青枠の内側が製品の印刷範囲です。枠に合わせて画像を配置してください。
          </p>
        )}
      </div>
    </div>
  )
})

export default DesignCanvas
