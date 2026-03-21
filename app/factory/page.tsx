import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { FactoryPortalClient } from './factory-portal-client'
import { toSignedUrl } from '@/lib/supabase/storage'

export default async function FactoryPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')
    // Role is already enforced by factory/layout.tsx — this is a belt-and-suspenders guard

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

    // Fetch all items assigned to this factory (including cancelled)
    // NOTE: price information is intentionally NOT selected
    // NOTE: stripe_session_id and pricing columns are intentionally excluded
    const { data: items } = await supabase
        .from('order_items')
        .select(`
      id,
      product_name,
      quantity,
      options,
      status,
      tracking_number,
      design_file_name,
      design_url,
      converted_design_url,
      delivery_pdf_url,
      express_delivery,
      mold_order_id,
      orders (
        created_at,
        shipping_address,
        order_number,
        status,
        factory_note
      )
    `)
        .eq('factory_id', factoryId)
        .order('created_at', { ascending: false })

    // Generate signed URLs (1 hour) for production files before passing to client.
    // This keeps the `designs` bucket private — client components never receive
    // permanent storage URLs, only short-lived signed ones.
    const signedItems = await Promise.all(
        (items ?? []).map(async (item) => ({
            ...(item as any),
            converted_design_url: await toSignedUrl((item as any).converted_design_url, 43200),
            delivery_pdf_url: await toSignedUrl((item as any).delivery_pdf_url, 43200),
        }))
    )

    return (
        <FactoryPortalClient
            items={signedItems as any}
            factoryName={factoryName}
        />
    )
}
