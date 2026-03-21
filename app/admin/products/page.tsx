import { createClient } from '@/lib/supabase/server'
import { getAllProductsForAdmin } from '@/lib/products-db'
import { ProductsClient } from './products-client'

export default async function AdminProductsPage() {
    const supabase = await createClient()
    const [products, { data: factories }] = await Promise.all([
        getAllProductsForAdmin(),
        supabase.from('factories').select('id, name').order('name'),
    ])
    return <ProductsClient initialProducts={products} factories={factories ?? []} />
}
