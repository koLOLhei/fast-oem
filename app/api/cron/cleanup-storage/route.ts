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
      //
      // Helper: extract clean filename from a URL or path, stripping any query string
      // (signed URLs contain `?token=...`). Also reject filenames that would break
      // PostgREST .or() parsing (commas, parens, quotes).
      const extractFilename = (urlOrPath: string | null | undefined): string | null => {
        if (!urlOrPath) return null
        // Strip query string and hash first
        const cleaned = urlOrPath.split('?')[0].split('#')[0]
        const name = cleaned.split('/').pop() || cleaned
        // Reject filenames with characters that would break .or() parsing
        if (/[,()"']/.test(name)) return null
        return name
      }

      const fileNames = filePaths
        .map(p => extractFilename(p))
        .filter((n): n is string => !!n)

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
        const { data, error: refError } = await supabase
          .from('order_items')
          .select('design_url, converted_design_url, delivery_pdf_url, back_design_url, back_delivery_pdf_url, back_converted_design_url')
          .or(batchConditions.join(','))
        // CRITICAL: a failed batch (transient DB error, malformed filter) would
        // contribute ZERO referenced filenames, causing genuinely-referenced
        // files to be classified safe-to-delete and IRREVERSIBLY removed. Never
        // delete when the reference set is known-incomplete — abort the run.
        if (refError) {
          console.error('[cleanup] reference cross-check failed — aborting before any deletion:', refError.message)
          return NextResponse.json({ error: 'Reference check failed; cleanup aborted to avoid deleting referenced files.' }, { status: 500 })
        }
        if (data) referencedItems = referencedItems.concat(data)
      }

      const referencedFiles = new Set<string>()
      for (const item of referencedItems ?? []) {
        for (const url of [item.design_url, item.converted_design_url, item.delivery_pdf_url, item.back_design_url, item.back_delivery_pdf_url, item.back_converted_design_url]) {
          const name = extractFilename(url)
          if (name) referencedFiles.add(name)
        }
      }

      // Match by filename (last segment of path, without query string) since DB stores full URLs.
      // If a filename contains unsafe characters, err on the side of safety and KEEP the file.
      const safeToDelete = filePaths.filter(p => {
        const fileName = extractFilename(p)
        if (!fileName) return false // unsafe filename → don't delete
        return !referencedFiles.has(fileName)
      })
      const skipped = filePaths.length - safeToDelete.length

      if (skipped > 0) {
        console.warn(`[cleanup] Skipping ${skipped} files still referenced by orders`)
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
