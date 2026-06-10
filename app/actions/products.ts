'use server'

import { createServiceClient } from '@/lib/supabase/service'
import { revalidatePath, revalidateTag } from 'next/cache'
import { type Product } from '@/lib/products'
import { requireAdmin } from '@/lib/auth/require-admin'

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
    if (p.moldFeeRules !== undefined)  row.mold_fee_rules = p.moldFeeRules
    if (p.is3d !== undefined)          row.is_3d = p.is3d
    if (p.imageViews !== undefined)    row.image_views = p.imageViews
    if (p.fixedUnitPrice !== undefined) row.fixed_unit_price = p.fixedUnitPrice
    if (p.complexityRules !== undefined) row.complexity_rules = p.complexityRules
    // defaultFactoryId: null means "no default" — we store it explicitly so
    // admins can clear a previously-set factory by selecting "未設定".
    if ('defaultFactoryId' in p)       row.default_factory_id = p.defaultFactoryId ?? null
    return row
}

function validatePriceTiers(tiers: Product['priceTiers']): void {
    if (!tiers || tiers.length === 0) throw new Error('価格帯を1件以上設定してください')
    const sorted = [...tiers].sort((a, b) => a.minQuantity - b.minQuantity)
    for (let i = 0; i < sorted.length; i++) {
        const t = sorted[i]
        if (t.minQuantity < 1) throw new Error('最小数量は1以上にしてください')
        if (t.maxQuantity < t.minQuantity) throw new Error(`価格帯 ${i + 1}: 最大数量は最小数量以上にしてください`)
        if (t.unitPrice < 1) throw new Error(`価格帯 ${i + 1}: 単価は1以上にしてください`)
        if (i > 0) {
            const prev = sorted[i - 1]
            if (t.minQuantity <= prev.maxQuantity) {
                throw new Error(`価格帯の数量が重複しています（${prev.minQuantity}〜${prev.maxQuantity} と ${t.minQuantity}〜${t.maxQuantity}）`)
            }
            if (t.minQuantity > prev.maxQuantity + 1) {
                throw new Error(`価格帯の数量にギャップがあります（${prev.maxQuantity + 1}〜${t.minQuantity - 1} が未設定）`)
            }
        }
    }
}

export async function updateProduct(id: string, updates: Partial<Product> & { isActive?: boolean }) {
    await requireAdmin()
    if (updates.priceTiers !== undefined) validatePriceTiers(updates.priceTiers)
    const supabase = createServiceClient()

    // If the image URL is changing, capture the old URL so we can delete it from storage after save
    let oldImagePath: string | null = null
    if (updates.imageUrl !== undefined) {
        const { data: existing } = await supabase.from('products').select('image_url').eq('id', id).single()
        if (existing?.image_url && existing.image_url !== updates.imageUrl) {
            // Extract the storage path from the public URL (last path segment)
            const url = existing.image_url as string
            const bucketMarker = '/product-images/'
            const idx = url.indexOf(bucketMarker)
            if (idx !== -1) oldImagePath = url.slice(idx + bucketMarker.length)
        }
    }

    const { error } = await supabase
        .from('products')
        .update(productToRow(updates))
        .eq('id', id)
    if (error) {
        console.error('[updateProduct] DB error:', error.message)
        throw new Error('商品の更新に失敗しました')
    }

    // Best-effort deletion — don't fail the whole operation if cleanup fails
    if (oldImagePath) {
        await supabase.storage.from('product-images').remove([oldImagePath]).catch(() => null)
    }
    revalidateTag('products', 'max')
    revalidatePath('/admin/products')
    revalidatePath('/products')
    revalidatePath('/products/[slug]', 'page')
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
    if (error) {
        if (error.code === '23505' && error.message.includes('slug')) {
            throw new Error(`スラッグ「${row.slug}」は既に使用されています。商品名を変更してください。`)
        }
        console.error('[createProduct] DB error:', error.message)
        throw new Error('商品の作成に失敗しました')
    }
    revalidateTag('products', 'max')
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
    if (error) {
        console.error('[toggleProductActive] DB error:', error.message)
        throw new Error('商品の状態変更に失敗しました')
    }
    revalidateTag('products', 'max')
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
    if (error) {
        console.error('[applyGlobalPriceAdjustment] DB error:', error.message)
        throw new Error('商品データの取得に失敗しました')
    }
    const multiplier = percent / 100
    const list = products ?? []
    const updates = list.map((p: any) => {
        const tiers = (p.price_tiers as Array<{ minQuantity: number; maxQuantity: number; unitPrice: number }>) ?? []
        return { id: p.id, originalTiers: tiers, newTiers: tiers.map((t) => ({ ...t, unitPrice: Math.max(1, Math.round(t.unitPrice * multiplier)) })) }
    })
    // IMPORTANT: supabase-js .update() RESOLVES with { error } on a DB failure
    // (RLS/constraint/transient) — it does NOT reject. So we must inspect the
    // resolved error field; throwing inside the callback makes allSettled mark
    // the entry 'rejected' so the rollback logic below actually triggers.
    const results = await Promise.allSettled(
        updates.map(async (u) => {
            const { error: updateError } = await supabase.from('products').update({ price_tiers: u.newTiers }).eq('id', u.id)
            if (updateError) throw updateError
        })
    )
    const failedIndices = results.flatMap((r, i) => r.status === 'rejected' ? [i] : [])
    if (failedIndices.length > 0) {
        // Roll back the successfully updated products (also checking resolved errors).
        const successIndices = results.flatMap((r, i) => r.status === 'fulfilled' ? [i] : [])
        const rollback = await Promise.allSettled(
            successIndices.map(async (i) => {
                const { error: rbError } = await supabase.from('products').update({ price_tiers: updates[i].originalTiers }).eq('id', updates[i].id)
                if (rbError) throw rbError
            })
        )
        const rollbackFailures = rollback.filter((r) => r.status === 'rejected').length
        console.error(`[applyGlobalPriceAdjustment] ${failedIndices.length}/${list.length} updates failed; rollback failures: ${rollbackFailures}`)
        if (rollbackFailures > 0) {
            throw new Error(`価格更新中に${failedIndices.length}件のエラーが発生し、${rollbackFailures}件は元に戻せませんでした。商品価格を確認してください。`)
        }
        throw new Error(`価格更新中に${failedIndices.length}/${list.length}件でエラーが発生しました。変更はすべて元に戻しました。`)
    }
    revalidateTag('products', 'max')
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
    const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif']
    const ext = (file.name.split('.').pop() ?? 'jpg').toLowerCase()
    if (!ALLOWED_EXTENSIONS.includes(ext)) throw new Error('許可されていないファイル拡張子です')
    const path = `${Date.now()}-${crypto.randomUUID().slice(0, 12)}.${ext}`
    const bytes = await file.arrayBuffer()
    const supabase = createServiceClient()
    const { error } = await supabase.storage
        .from('product-images')
        .upload(path, bytes, { contentType: file.type, upsert: false })
    if (error) {
        console.error('[uploadProductImage] Storage error:', error.message)
        throw new Error('画像のアップロードに失敗しました')
    }
    const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(path)
    return publicUrl
}
