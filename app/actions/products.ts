'use server'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { revalidatePath } from 'next/cache'
import { type Product } from '@/lib/products'

/**
 * Defence-in-depth admin guard for product server actions.
 * The middleware guards the /admin page routes, but server actions are
 * callable via POST from any client that knows the action ID.
 * This check ensures only admin-role users can mutate product data.
 */
async function requireAdmin(): Promise<void> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('認証が必要です')
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
    if (profile?.role !== 'admin') throw new Error('管理者権限が必要です')
}

function productToRow(p: Partial<Product> & { isActive?: boolean }) {
    const row: Record<string, any> = {}
    if (p.name !== undefined)          row.name = p.name
    if (p.description !== undefined)   row.description = p.description
    if (p.shortDescription !== undefined) row.short_description = p.shortDescription
    if (p.category !== undefined)      row.category = p.category
    if (p.requiresMold !== undefined)  row.requires_mold = p.requiresMold
    if (p.moldFee !== undefined)       row.mold_fee = p.moldFee
    if (p.leadTimeDays !== undefined)  row.lead_time_days = p.leadTimeDays
    if (p.expressDeliveryFee !== undefined) row.express_delivery_fee = p.expressDeliveryFee
    if (p.notificationEmail !== undefined) row.notification_email = p.notificationEmail
    if (p.minQuantity !== undefined)   row.min_quantity = p.minQuantity
    if (p.maxQuantity !== undefined)   row.max_quantity = p.maxQuantity
    if (p.imageUrl !== undefined)      row.image_url = p.imageUrl
    if (p.features !== undefined)      row.features = p.features
    if (p.quantityPresets !== undefined) row.quantity_presets = p.quantityPresets
    if (p.priceTiers !== undefined)    row.price_tiers = p.priceTiers
    if (p.options !== undefined)       row.options = p.options
    if (p.isActive !== undefined)      row.is_active = p.isActive
    // defaultFactoryId: null means "no default" — we store it explicitly so
    // admins can clear a previously-set factory by selecting "未設定".
    if ('defaultFactoryId' in p)       row.default_factory_id = p.defaultFactoryId ?? null
    return row
}

export async function updateProduct(id: string, updates: Partial<Product> & { isActive?: boolean }) {
    await requireAdmin()
    const supabase = createServiceClient()
    const { error } = await supabase
        .from('products')
        .update(productToRow(updates))
        .eq('id', id)
    if (error) throw new Error(error.message)
    revalidatePath('/admin/products')
    revalidatePath('/products')
    revalidatePath(`/products/${id}`)
    revalidatePath('/')
}

export async function createProduct(product: Omit<Product, 'id'> & { id: string }) {
    await requireAdmin()
    const supabase = createServiceClient()
    const row = {
        id: product.id,
        slug: product.slug,
        ...productToRow(product),
    }
    const { error } = await supabase.from('products').insert(row)
    if (error) throw new Error(error.message)
    revalidatePath('/admin/products')
    revalidatePath('/products')
    revalidatePath('/')
}

export async function toggleProductActive(id: string, isActive: boolean) {
    await requireAdmin()
    const supabase = createServiceClient()
    const { error } = await supabase
        .from('products')
        .update({ is_active: isActive })
        .eq('id', id)
    if (error) throw new Error(error.message)
    revalidatePath('/admin/products')
    revalidatePath('/products')
    revalidatePath('/')
}

/**
 * Multiply every price tier unit price across all products by (percent / 100).
 * e.g. percent=110 → +10%, percent=90 → -10%.
 * Prices are rounded to the nearest integer (JPY).
 */
export async function applyGlobalPriceAdjustment(percent: number) {
    await requireAdmin()
    if (percent <= 0 || !Number.isFinite(percent)) throw new Error('率は0より大きい値を指定してください')
    const supabase = createServiceClient()
    const { data: products, error } = await supabase.from('products').select('id, price_tiers')
    if (error) throw new Error(error.message)
    const multiplier = percent / 100
    const results = await Promise.allSettled((products ?? []).map((p: any) => {
        const tiers = (p.price_tiers as Array<{ minQuantity: number; maxQuantity: number; unitPrice: number }>) ?? []
        const newTiers = tiers.map((t) => ({ ...t, unitPrice: Math.max(1, Math.round(t.unitPrice * multiplier)) }))
        return supabase.from('products').update({ price_tiers: newTiers }).eq('id', p.id)
    }))
    const failed = results.filter((r) => r.status === 'rejected')
    if (failed.length > 0) {
        const total = results.length
        throw new Error(`価格更新中に${failed.length}/${total}件でエラーが発生しました。成功した商品は既に更新済みです。`)
    }
    revalidatePath('/admin/products')
    revalidatePath('/products')
    revalidatePath('/')
}

/**
 * Upload a product image to Supabase Storage (product-images bucket).
 * Returns the public URL.
 */
export async function uploadProductImage(formData: FormData): Promise<string> {
    await requireAdmin()
    const file = formData.get('file') as File | null
    if (!file || file.size === 0) throw new Error('ファイルが必要です')
    const maxBytes = 5 * 1024 * 1024 // 5 MB
    if (file.size > maxBytes) throw new Error('ファイルサイズは5MB以内にしてください')
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowed.includes(file.type)) throw new Error('JPG・PNG・WebP・GIF のみアップロード可能です')
    const ext = file.name.split('.').pop() ?? 'jpg'
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const bytes = await file.arrayBuffer()
    const supabase = createServiceClient()
    const { error } = await supabase.storage
        .from('product-images')
        .upload(path, bytes, { contentType: file.type, upsert: false })
    if (error) throw new Error(error.message)
    const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(path)
    return publicUrl
}
