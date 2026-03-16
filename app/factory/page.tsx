import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { FactoryPortalClient } from './factory-portal-client'

export default async function FactoryPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    // Get the factory_id for this user
    const { data: profile } = await supabase
        .from('profiles')
        .select('factory_id, factories(name)')
        .eq('id', user.id)
        .single()

    const factory = profile?.factories as any
    const factoryId = profile?.factory_id
    const factoryName = factory?.name ?? 'Factory'

    if (!factoryId) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <p className="text-muted-foreground">
                    このアカウントに工場が割り当てられていません。管理者にお問い合わせください。
                </p>
            </div>
        )
    }

    // Fetch only items assigned to this factory
    // NOTE: price information is intentionally NOT selected
    const { data: items } = await supabase
        .from('order_items')
        .select(`
      id,
      product_name,
      quantity,
      options,
      status,
      design_file_name,
      design_url,
      converted_design_url,
      orders (
        created_at,
        shipping_address
      )
    `)
        .eq('factory_id', factoryId)
        .order('created_at', { ascending: false })

    return (
        <FactoryPortalClient
            items={(items ?? []) as any}
            factoryName={factoryName}
        />
    )
}
