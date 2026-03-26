'use client'

import { useState, useCallback } from 'react'
import { ImageUploader } from '@/components/image-uploader'
import { type DesignImageEntry } from '@/lib/cart'

interface MultiViewUploaderProps {
  imageViews: { id: string; label: string; required: boolean }[]
  onImagesChange: (images: DesignImageEntry[], allRequiredDone: boolean) => void
  selectedShape?: string
  onPreviewChange?: (dataUrl: string) => void
  onViewPreviewChange?: (viewId: string, dataUrl: string) => void
}

interface ViewState {
  storagePath: string | null
  fileName: string | null
  deliveryPdfUrl: string | null
  previewDataUrl: string | null
}

export function MultiViewUploader({
  imageViews,
  onImagesChange,
  selectedShape,
  onPreviewChange,
  onViewPreviewChange,
}: MultiViewUploaderProps) {
  const [activeViewId, setActiveViewId] = useState(imageViews[0]?.id ?? '')
  const [viewStates, setViewStates] = useState<Record<string, ViewState>>(() => {
    const initial: Record<string, ViewState> = {}
    for (const view of imageViews) {
      initial[view.id] = { storagePath: null, fileName: null, deliveryPdfUrl: null, previewDataUrl: null }
    }
    return initial
  })

  const computeAndNotify = useCallback(
    (nextStates: Record<string, ViewState>) => {
      const images: DesignImageEntry[] = []
      for (const view of imageViews) {
        const s = nextStates[view.id]
        if (s?.storagePath && s.fileName) {
          images.push({
            viewId: view.id,
            viewLabel: view.label,
            storagePath: s.storagePath,
            fileName: s.fileName,
            deliveryPdfUrl: s.deliveryPdfUrl ?? undefined,
          })
        }
      }

      const allRequiredDone = imageViews
        .filter((v) => v.required)
        .every((v) => {
          const s = nextStates[v.id]
          return s?.storagePath && s?.deliveryPdfUrl
        })

      onImagesChange(images, allRequiredDone)
    },
    [imageViews, onImagesChange],
  )

  const handleViewImageSelect = useCallback(
    (viewId: string, storagePath: string | null, fileName: string | null, deliveryPdfUrl?: string | null) => {
      setViewStates((prev) => {
        const next = {
          ...prev,
          [viewId]: {
            storagePath,
            fileName,
            deliveryPdfUrl: deliveryPdfUrl ?? null,
            previewDataUrl: storagePath ? (prev[viewId]?.previewDataUrl ?? null) : null,
          },
        }
        // Use setTimeout to avoid setState-during-render warning
        setTimeout(() => computeAndNotify(next), 0)
        return next
      })
    },
    [computeAndNotify],
  )

  const isViewCompleted = (viewId: string) => {
    const s = viewStates[viewId]
    return !!(s?.storagePath && s?.deliveryPdfUrl)
  }

  const handleViewPreviewChange = useCallback(
    (dataUrl: string) => {
      onPreviewChange?.(dataUrl)
      onViewPreviewChange?.(activeViewId, dataUrl)
    },
    [activeViewId, onPreviewChange, onViewPreviewChange],
  )

  const activeView = imageViews.find((v) => v.id === activeViewId)

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex gap-1 border-b">
        {imageViews.map((view) => {
          const active = view.id === activeViewId
          const completed = isViewCompleted(view.id)
          return (
            <button
              key={view.id}
              type="button"
              onClick={() => setActiveViewId(view.id)}
              className={`px-4 py-2 text-sm transition-colors ${
                active
                  ? 'border-b-2 border-primary font-bold text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {view.label}
              {completed ? (
                <span className="ml-1 text-green-600">&#10003;</span>
              ) : view.required ? (
                <span className="ml-1 text-destructive">*</span>
              ) : null}
            </button>
          )
        })}
      </div>

      {/* Active tab content */}
      {activeView && (
        <ImageUploader
          key={activeViewId}
          onImageSelect={(path, name, pdf) =>
            handleViewImageSelect(activeViewId, path, name, pdf)
          }
          currentImage={viewStates[activeViewId]?.storagePath ?? null}
          currentFileName={viewStates[activeViewId]?.fileName ?? null}
          selectedShape={selectedShape}
          onPreviewChange={handleViewPreviewChange}
        />
      )}
    </div>
  )
}
