/**
 * Supabase Storage — signed URL utilities
 *
 * The `designs` bucket stores customer design files and processed PDFs.
 * Because these files contain proprietary customer IP we keep the bucket
 * **private** and serve every file via a short-lived signed URL generated
 * server-side (never in client components).
 *
 * DB columns (converted_design_url, delivery_pdf_url) store ONLY the
 * storage path, e.g. "processed/orderId_productId_1234_converted.png".
 * Legacy rows may contain a full public URL — this helper handles both.
 */

import { createServiceClient } from '@/lib/supabase/service'

const DESIGNS_BUCKET = 'designs'

// The prefix Supabase uses for public bucket URLs
const PUBLIC_PREFIX_PATTERN = /\/storage\/v1\/object\/public\/designs\//

/**
 * Extract the storage path from either:
 *   - A path:       "processed/xxx_converted.png"
 *   - A public URL: "https://xyz.supabase.co/storage/v1/object/public/designs/processed/xxx_converted.png"
 */
function extractPath(pathOrUrl: string): string {
    const match = pathOrUrl.match(PUBLIC_PREFIX_PATTERN)
    if (match) {
        return pathOrUrl.slice(pathOrUrl.indexOf(match[0]) + match[0].length)
    }
    return pathOrUrl
}

/**
 * Convert a storage path or legacy public URL to a signed URL.
 * Returns the original value unchanged if:
 *   - the value is null/empty
 *   - the value is a data:URI
 *   - the path doesn't belong to Supabase Storage
 *   - signing fails (fail-open so the page still renders)
 *
 * @param pathOrUrl  Storage path or legacy public URL
 * @param expiresIn  Seconds until expiry (default: 3600 = 1 hour)
 */
export async function toSignedUrl(
    pathOrUrl: string | null | undefined,
    expiresIn = 3600,
): Promise<string | null> {
    if (!pathOrUrl) return null
    if (pathOrUrl.startsWith('data:')) return null // raw base64 — not stored in bucket

    const path = extractPath(pathOrUrl)
    if (!path) return null

    try {
        const service = createServiceClient()
        const { data, error } = await service
            .storage
            .from(DESIGNS_BUCKET)
            .createSignedUrl(path, expiresIn)

        if (error || !data?.signedUrl) {
            console.error('[toSignedUrl] Failed to create signed URL:', { path, error })
            return null
        }
        return data.signedUrl
    } catch (err) {
        console.error('[toSignedUrl] Unexpected error:', { path, err })
        return null
    }
}

/**
 * Batch-sign multiple paths/URLs in a single Supabase Storage API call.
 * Null/empty/data-URI entries pass through as null.
 * Falls back to null for any path that fails to sign.
 */
export async function toSignedUrls(
    paths: (string | null | undefined)[],
    expiresIn = 3600,
): Promise<(string | null)[]> {
    // Resolve each input to a bucket-relative path, or null if it should be skipped
    const resolved = paths.map((p) => {
        if (!p || p.startsWith('data:')) return null
        return extractPath(p)
    })

    const batchPaths = resolved.filter((p): p is string => p !== null)
    if (batchPaths.length === 0) return paths.map(() => null)

    try {
        const service = createServiceClient()
        const { data } = await service
            .storage
            .from(DESIGNS_BUCKET)
            .createSignedUrls(batchPaths, expiresIn)

        const urlMap = new Map<string, string>()
        for (const item of data ?? []) {
            if (item.signedUrl && item.path) urlMap.set(item.path, item.signedUrl)
        }

        return resolved.map((p) => (p ? (urlMap.get(p) ?? null) : null))
    } catch (err) {
        console.error('[toSignedUrls] Batch signing failed:', err)
        return paths.map(() => null)
    }
}
