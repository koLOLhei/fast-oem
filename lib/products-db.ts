/**
 * Server-side product fetching from Supabase.
 * Falls back to the hardcoded PRODUCTS array if the DB is unavailable or empty.
 */
import { createClient } from '@/lib/supabase/server'
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
    } catch {
        return PRODUCTS
    }
}

export async function getProductBySlugFromDb(slug: string): Promise<Product | undefined> {
    try {
        const supabase = await createClient()
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .eq('slug', slug)
            .eq('is_active', true)
            .single()
        if (error || !data) return PRODUCTS.find((p) => p.slug === slug)
        return rowToProduct(data)
    } catch {
        return PRODUCTS.find((p) => p.slug === slug)
    }
}

/** Used by admin page — returns ALL products including inactive */
export async function getAllProductsForAdmin() {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at')
    if (error) throw new Error(error.message)
    return (data ?? []).map(rowToProduct)
}
