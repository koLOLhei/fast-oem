/**
 * Server-side product fetching from Supabase.
 * Falls back to the hardcoded PRODUCTS array if the DB is unavailable or empty.
 */
import { createClient } from '@/lib/supabase/server'
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
    }
}

export async function getProductsFromDb(): Promise<Product[]> {
    try {
        const supabase = await createClient()
        const { data, error } = await supabase
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
}

export async function getProductBySlugFromDb(slug: string): Promise<Product | undefined> {
    try {
        const supabase = await createClient()
        // Use maybeSingle() instead of single() to avoid throwing when slug is duplicated
        const { data, error } = await supabase
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
}

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
