import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import { FactoryPortalClient } from './factory-portal-client'
import { toSignedUrls } from '@/lib/supabase/storage'

export default async function FactoryPage() {
    const supabase = await createClient()
    // Role is already enforced by factory/layout.tsx (requireRole check)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    // Use service client to bypass RLS — ensures factory users can always
    // read their own profile and assigned items regardless of RLS policies.
    const service = createServiceClient()

    // Get the factory_id for this user
    const { data: profile } = await service
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
    const { data: items } = await service
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

    // Batch-sign all production file URLs in a single API call.
    // Null entries are skipped automatically; signed URLs expire in 12 hours.
    // This keeps the `designs` bucket private — client components never receive
    // permanent storage URLs, only short-lived signed ones.
    const itemList = items ?? []
    const allPaths = itemList.flatMap((item) => [
        (item as any).converted_design_url as string | null,
        (item as any).delivery_pdf_url as string | null,
        (item as any).design_url as string | null,
    ])
    const signedUrls = await toSignedUrls(allPaths, 43200)

    const signedItems = itemList.map((item, i) => ({
        ...(item as any),
        converted_design_url: signedUrls[i * 3],
        delivery_pdf_url: signedUrls[i * 3 + 1],
        design_url: signedUrls[i * 3 + 2],
    }))

    return (
        <FactoryPortalClient
            items={signedItems as any}
            factoryName={factoryName}
        />
    )
}
