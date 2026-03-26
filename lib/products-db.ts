/**
 * Server-side product fetching from Supabase.
 * Falls back to the hardcoded PRODUCTS array if the DB is unavailable or empty.
 *
 * getProductsFromDb and getProductBySlugFromDb are wrapped with unstable_cache so
 * repeated calls within the same Next.js deployment hit the data cache instead of
 * making a fresh Supabase round-trip on every request.  Call revalidateTag('products')
 * (from app/actions/products.ts) whenever product data changes.
 */
import { unstable_cache } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/service'
import { type Product, PRODUCTS } from './products'

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
        options: row.options ?? [],
        isActive: row.is_active ?? true,
        is3d: row.is_3d ?? false,
        imageViews: row.image_views ?? [],
    }
}

export const getProductsFromDb = unstable_cache(
    async (): Promise<Product[]> => {
        try {
            const { data, error } = await createServiceClient()
                .from('products')
                .select('*')
                .eq('is_active', true)
                .order('created_at')
            if (error || !data || data.length === 0) return PRODUCTS
            return data.map(rowToProduct)
        } catch (err) {
            console.error('[getProductsFromDb] DB error, falling back to static data:', err)
            return PRODUCTS
        }
    },
    ['products-list'],
    { tags: ['products'] }
)

export const getProductBySlugFromDb = unstable_cache(
    async (slug: string): Promise<Product | undefined> => {
        try {
            const { data, error } = await createServiceClient()
                .from('products')
                .select('*')
                .eq('slug', slug)
                .eq('is_active', true)
                .maybeSingle()
            if (error || !data) return PRODUCTS.find((p) => p.slug === slug)
            return rowToProduct(data)
        } catch (err) {
            console.error('[getProductBySlugFromDb] DB error, falling back to static data:', err)
            return PRODUCTS.find((p) => p.slug === slug)
        }
    },
    ['product-by-slug'],
    { tags: ['products'] }
)

/** Used by admin page — returns ALL products including inactive */
export async function getAllProductsForAdmin() {
    // Use service client to bypass RLS: the public policy only allows is_active=TRUE,
    // so the regular client would hide inactive products from the admin.
    const { data, error } = await createServiceClient()
        .from('products')
        .select('*')
        .order('created_at')
    if (error) throw new Error(error.message)
    return (data ?? []).map(rowToProduct)
}
