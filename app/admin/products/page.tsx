import { createServiceClient } from '@/lib/supabase/service'
import { getAllProductsForAdmin } from '@/lib/products-db'
import { ProductsClient } from './products-client'

export default async function AdminProductsPage() {
    const [products, { data: factories }] = await Promise.all([
        getAllProductsForAdmin(),
        createServiceClient().from('factories').select('id, name').order('name'),
    ])
    return <ProductsClient initialProducts={products} factories={factories ?? []} />
}
