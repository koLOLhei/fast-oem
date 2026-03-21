import { createServiceClient } from '@/lib/supabase/service'
import { SettingsForm } from './settings-form'
import { ShippingFeesForm } from './shipping-fees-form'

export const dynamic = 'force-dynamic'

const SHIPPING_KEYS = ['shipping_fee_okinawa', 'shipping_fee_remote_island'] as const

export default async function AdminSettingsPage() {
    const supabase = createServiceClient()
    const { data: rows } = await supabase
        .from('site_settings')
        .select('key, label, value')
        .order('key')

    const allRows = rows ?? []

    const companyFields = allRows
        .filter((r) => !SHIPPING_KEYS.includes(r.key as any))
        .map((r) => ({ key: r.key, label: r.label, value: r.value }))

    const shippingRows = allRows
        .filter((r) => SHIPPING_KEYS.includes(r.key as any))
        .map((r) => ({ key: r.key, label: r.label, value: r.value }))

    return (
        <div className="max-w-2xl mx-auto px-4 py-10 space-y-8">
            <div>
                <h1 className="text-2xl font-bold">サイト設定</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    領収書・メール・サイト上に表示される法人情報を管理できます。
                </p>
            </div>

            {/* Company info */}
            <div className="rounded-xl border bg-card p-6 shadow-sm">
                <h2 className="text-base font-semibold mb-4">法人情報</h2>
                <SettingsForm fields={companyFields} />
            </div>

            {/* Shipping fees */}
            <div className="rounded-xl border bg-card p-6 shadow-sm">
                <h2 className="text-base font-semibold mb-1">送料設定</h2>
                <p className="text-sm text-muted-foreground mb-4">
                    本州・四国・九州・北海道は無料（¥0固定）。沖縄・離島のみ設定できます。
                </p>
                <ShippingFeesForm fields={shippingRows} />
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                <p className="font-semibold mb-1">⚠ 注意</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>変更はすぐに反映されます（次回の注文・領収書発行から適用）。</li>
                    <li>適格請求書発行事業者番号は領収書PDFにのみ記載されます。</li>
                    <li>環境変数（<code>COMPANY_NAME</code> 等）が設定されている場合、DB設定より優先されます。</li>
                </ul>
            </div>
        </div>
    )
}
