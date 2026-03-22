import { createServiceClient } from '@/lib/supabase/service'
import { FactoriesClient } from './factories-client'

export const dynamic = 'force-dynamic'

export default async function FactoriesPage() {
    const { data: factories } = await createServiceClient()
        .from('factories')
        .select('id, name, country, contact_email, contact_name, phone, address, max_capacity, is_active, created_at, profiles(id)')
        .order('name')

    return <FactoriesClient factories={(factories ?? []) as any} />
}
