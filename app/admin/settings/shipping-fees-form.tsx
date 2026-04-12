'use client'

import { SHIPPING_TIERS } from '@/lib/shipping'

/**
 * Read-only display of the current quantity-based shipping tiers.
 * Shipping fees are code-defined in lib/shipping.ts, not DB-driven,
 * so this component is purely informational for the admin.
 */
export function ShippingFeesForm({ fields: _fields }: { fields: unknown[] }) {
    return (
        <div className="space-y-4">
            <div className="overflow-hidden rounded-lg border border-border">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-muted/40">
                            <th className="text-left px-4 py-2 font-medium">数量</th>
                            <th className="text-right px-4 py-2 font-medium">送料（税込）</th>
                        </tr>
                    </thead>
                    <tbody>
                        {SHIPPING_TIERS.map((tier) => (
                            <tr key={tier.minQuantity} className="border-t border-border">
                                <td className="px-4 py-2">
                                    {tier.minQuantity.toLocaleString()}〜{tier.maxQuantity.toLocaleString()}個
                                </td>
                                <td className="px-4 py-2 text-right font-medium">
                                    ¥{tier.fee.toLocaleString()}
                                </td>
                            </tr>
                        ))}
                        <tr className="border-t border-border">
                            <td className="px-4 py-2">4,001個〜</td>
                            <td className="px-4 py-2 text-right font-medium">
                                ¥20,000 + ¥2,000/1,000個
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div className="rounded-lg bg-orange-50 border border-orange-200 px-4 py-3">
                <p className="text-sm font-medium text-orange-800">特急便: 送料 ×2</p>
                <p className="text-xs text-orange-700 mt-1">
                    特急納期を選択した場合、送料が2倍になります。
                </p>
            </div>

            <p className="text-xs text-muted-foreground">
                送料テーブルの変更は <code className="bg-muted px-1 py-0.5 rounded">lib/shipping.ts</code> を編集してデプロイしてください。
            </p>
        </div>
    )
}
