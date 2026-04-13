import { NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { createServiceClient } from '@/lib/supabase/service'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  // 認証チェック
  const authHeader = request.headers.get('authorization') ?? ''
  const secret = (process.env.CLEANUP_SECRET ?? '').trim()

  try {
    const a = Buffer.from(authHeader.trim())
    const b = Buffer.from(`Bearer ${secret}`)
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = createServiceClient()

    // 30日以上前の未使用デザインファイルを削除
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    // Paginate through all files in the bucket (Supabase max 1000 per page)
    // Scan root and known subdirectories (processed/ for converted images)
    const PAGE_SIZE = 500
    const SCAN_DIRS = ['', 'processed']
    let allFiles: Array<{ name: string; created_at: string | null }> = []
    for (const dir of SCAN_DIRS) {
      let offset = 0
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { data: page, error: listError } = await supabase
          .storage
          .from('designs')
          .list(dir, { limit: PAGE_SIZE, offset })

        if (listError) {
          console.error(`Storage list error (dir: ${dir || 'root'}):`, listError.message)
          break // continue with other directories
        }
        if (!page || page.length === 0) break
        // Prefix with directory path for correct delete/reference matching
        const prefixed = page.map(f => ({
          name: dir ? `${dir}/${f.name}` : f.name,
          created_at: f.created_at,
        }))
        allFiles = allFiles.concat(prefixed)
        if (page.length < PAGE_SIZE) break
        offset += PAGE_SIZE
      }
    }

    const oldFiles = allFiles.filter(file => {
      const createdAt = new Date(file.created_at ?? '')
      return createdAt < thirtyDaysAgo
    })

    if (oldFiles.length > 0) {
      const filePaths = oldFiles.map(f => f.name)

      // Cross-reference with DB: only delete files NOT referenced by any order_item.
      // Check all URL columns: design_url, converted_design_url, delivery_pdf_url,
      // back_design_url, back_delivery_pdf_url
      const fileNames = filePaths.map(p => p.split('/').pop() || p)
      const orConditions = fileNames.flatMap(p => [
        `design_url.ilike.%${p}`,
        `converted_design_url.ilike.%${p}`,
        `delivery_pdf_url.ilike.%${p}`,
        `back_design_url.ilike.%${p}`,
        `back_delivery_pdf_url.ilike.%${p}`,
        `back_converted_design_url.ilike.%${p}`,
      ])

      // Batch .or() queries to avoid PostgREST query-string length limits
      const BATCH_SIZE = 100 // 100 files × 6 conditions = 600 OR clauses per batch
      let referencedItems: Array<Record<string, string | null>> = []
      for (let i = 0; i < fileNames.length; i += BATCH_SIZE) {
        const batchNames = fileNames.slice(i, i + BATCH_SIZE)
        const batchConditions = batchNames.flatMap(p => [
          `design_url.ilike.%${p}`,
          `converted_design_url.ilike.%${p}`,
          `delivery_pdf_url.ilike.%${p}`,
          `back_design_url.ilike.%${p}`,
          `back_delivery_pdf_url.ilike.%${p}`,
          `back_converted_design_url.ilike.%${p}`,
        ])
        const { data } = await supabase
          .from('order_items')
          .select('design_url, converted_design_url, delivery_pdf_url, back_design_url, back_delivery_pdf_url, back_converted_design_url')
          .or(batchConditions.join(','))
        if (data) referencedItems = referencedItems.concat(data)
      }

      const referencedFiles = new Set<string>()
      for (const item of referencedItems ?? []) {
        for (const url of [item.design_url, item.converted_design_url, item.delivery_pdf_url, item.back_design_url, item.back_delivery_pdf_url, item.back_converted_design_url]) {
          if (url) {
            // Extract filename from URL (last path segment)
            const filename = url.split('/').pop()
            if (filename) referencedFiles.add(filename)
          }
        }
      }

      // Match by filename (last segment of path) since DB stores full URLs
      const safeToDelete = filePaths.filter(p => {
        const fileName = p.split('/').pop() || p
        return !referencedFiles.has(fileName)
      })
      const skipped = filePaths.length - safeToDelete.length

      if (skipped > 0) {
        console.log(`[cleanup] Skipping ${skipped} files still referenced by orders`)
      }

      if (safeToDelete.length > 0) {
        const { error: deleteError } = await supabase
          .storage
          .from('designs')
          .remove(safeToDelete)

        if (deleteError) {
          console.error('Storage delete error:', deleteError.message)
          return NextResponse.json({ error: 'Failed to delete files' }, { status: 500 })
        }
      }

      return NextResponse.json({
        success: true,
        deleted: safeToDelete.length,
        skipped,
        message: `${safeToDelete.length}件のファイルを削除しました（${skipped}件はDB参照ありのためスキップ）`
      })
    }

    return NextResponse.json({
      success: true,
      deleted: 0,
      message: '削除対象のファイルはありません'
    })
  } catch (error) {
    console.error('Cleanup error:', (error as Error).message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
