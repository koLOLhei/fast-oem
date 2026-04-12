/**
 * Server-side product fetching from Supabase.
 * Falls back to the hardcoded PRODUCTS array if the DB is unavailable or empty.
 *
 * Neither function uses unstable_cache — product pages are force-dynamic and
 * admin-created products must be accessible immediately without cache delay.
 * The Supabase round-trip is fast enough (~50ms) and avoids all cache
 * invalidation bugs that caused new products to 404.
 */
import { createClient } from '@supabase/supabase-js'
import { type Product, PRODUCTS } from './products'

/**
 * Create a Supabase client for product reads.
 * Uses service key if available (bypasses RLS), falls back to anon key.
 * Public product pages don't need service key — anon key works with RLS
 * policies that allow SELECT on active products.
 */
function createProductsClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    return createClient(url, key)
}

/** Strip admin-UI placeholder options/values that were never customised */
function sanitizeOptions(raw: any[]): any[] {
    return raw
        .map((opt: any) => ({
            ...opt,
            values: (opt.values ?? []).filter(
                (v: any) => v.label && v.label !== '新しい値',
            ),
        }))
        .filter(
            (opt: any) =>
                opt.name &&
                opt.name !== '新しいオプション' &&
                // number type options may legitimately have no values list
                (opt.type === 'number' || (opt.values ?? []).length > 0),
        )
}

function rowToProduct(row: any): Product {
    return {
        id: row.id,
        slug: row.slug,
        name: row.name,
        description: row.description,
        shortDescription: row.short_description,
        category: row.category,
        requiresMold: row.requires_mold,
        moldFee: row.mold_fee,
        moldFeeRules: row.mold_fee_rules ?? [],
        leadTimeDays: row.lead_time_days,
        expressDeliveryFee: row.express_delivery_fee ?? 0,
        notificationEmail: row.notification_email ?? '',
        defaultFactoryId: row.default_factory_id ?? undefined,
        minQuantity: row.min_quantity,
        maxQuantity: row.max_quantity,
        imageUrl: row.image_url,
        features: row.features ?? [],
        quantityPresets: row.quantity_presets ?? [],
        priceTiers: row.price_tiers ?? [],
        options: sanitizeOptions(row.options ?? []),
        isActive: row.is_active ?? true,
        is3d: row.is_3d ?? false,
        imageViews: row.image_views ?? [],
        fixedUnitPrice: row.fixed_unit_price ?? false,
        complexityRules: row.complexity_rules ?? [],
    }
}

/** Filter out inactive products (isActive explicitly set to false) */
function filterActive(products: Product[]): Product[] {
    return products.filter((p) => p.isActive !== false)
}

/**
 * Fetch all active products. Falls back to static PRODUCTS on DB error.
 */
export async function getProductsFromDb(): Promise<Product[]> {
    try {
        const { data, error } = await createProductsClient()
            .from('products')
            .select('*')
            .eq('is_active', true)
            .order('created_at')
        if (error) {
            console.error('[getProductsFromDb] Supabase error:', { code: error.code, message: error.message })
        }
        if (error || !data || data.length === 0) {
            console.warn('[getProductsFromDb] Falling back to static PRODUCTS. DB returned:', { error: !!error, count: data?.length ?? 0 })
            return filterActive(PRODUCTS)
        }
        return data.map(rowToProduct)
    } catch (err) {
        console.error('[getProductsFromDb] DB error, falling back to static data:', (err as Error).message)
        return filterActive(PRODUCTS)
    }
}

/**
 * Fetch a single product by slug. Returns undefined if not found or inactive.
 */
export async function getProductBySlugFromDb(slug: string): Promise<Product | undefined> {
    try {
        const { data, error } = await createProductsClient()
            .from('products')
            .select('*')
            .eq('slug', slug)
            .eq('is_active', true)
            .maybeSingle()
        if (error) {
            console.error('[getProductBySlugFromDb] Supabase error:', { slug, code: error.code, message: error.message, details: error.details })
        }
        if (!data) {
            console.warn('[getProductBySlugFromDb] No product found for slug:', slug, error ? '(query error)' : '(not in DB or inactive)')
            const fallback = PRODUCTS.find((p) => p.slug === slug)
            return fallback && fallback.isActive !== false ? fallback : undefined
        }
        return rowToProduct(data)
    } catch (err) {
        console.error('[getProductBySlugFromDb] Exception:', (err as Error).message)
        const fallback = PRODUCTS.find((p) => p.slug === slug)
        return fallback && fallback.isActive !== false ? fallback : undefined
    }
}

/**
 * Fetch a few related products, excluding the given slug.
 * Much lighter than fetching all products just to pick 3.
 */
export async function getRelatedProducts(excludeSlug: string, limit = 3): Promise<Product[]> {
    try {
        const { data, error } = await createProductsClient()
            .from('products')
            .select('*')
            .eq('is_active', true)
            .neq('slug', excludeSlug)
            .limit(limit)
        if (error || !data || data.length === 0) {
            return filterActive(PRODUCTS).filter((p) => p.slug !== excludeSlug).slice(0, limit)
        }
        return data.map(rowToProduct)
    } catch {
        return filterActive(PRODUCTS).filter((p) => p.slug !== excludeSlug).slice(0, limit)
    }
}

/** Used by admin page — returns ALL products including inactive */
export async function getAllProductsForAdmin() {
    // Use service client to bypass RLS: the public policy only allows is_active=TRUE,
    // so the regular client would hide inactive products from the admin.
    const { createServiceClient } = await import('@/lib/supabase/service')
    const { data, error } = await createServiceClient()
        .from('products')
        .select('*')
        .order('created_at')
    if (error) {
        console.error('[getAllProductsForAdmin] DB error:', error.message)
        throw new Error('商品データの取得に失敗しました')
    }
    return (data ?? []).map(rowToProduct)
}
