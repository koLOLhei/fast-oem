'use client'

import { useState, useTransition } from 'react'
import { updateSiteSettings } from '@/app/actions/settings'

interface Field {
    key: string
    label: string
    value: string
}

const LABELS: Record<string, string> = {
    shipping_fee_okinawa: '沖縄（本島）送料（円）',
    shipping_fee_remote_island: '離島送料（円）',
}

export function ShippingFeesForm({ fields }: { fields: Field[] }) {
    const [values, setValues] = useState<Record<string, string>>(
        Object.fromEntries(fields.map((f) => [f.key, f.value]))
    )
    const [saved, setSaved] = useState(false)
    const [error, setError] = useState('')
    const [isPending, startTransition] = useTransition()

    const handleChange = (key: string, val: string) => {
        setValues((prev) => ({ ...prev, [key]: val }))
        setSaved(false)
        setError('')
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        // Validate: must be non-negative integers
        for (const [key, val] of Object.entries(values)) {
            const n = parseInt(val, 10)
            if (isNaN(n) || n < 0 || !Number.isInteger(Number(val))) {
                setError(`${LABELS[key] ?? key}: 0以上の整数を入力してください`)
                return
            }
        }
        startTransition(async () => {
            try {
                await updateSiteSettings(values)
                setSaved(true)
            } catch (err: any) {
                setError(err?.message ?? '保存に失敗しました')
            }
        })
    }

    const displayFields = fields.length > 0 ? fields : [
        { key: 'shipping_fee_okinawa', label: '沖縄（本島）送料（円）', value: '1500' },
        { key: 'shipping_fee_remote_island', label: '離島送料（円）', value: '2000' },
    ]

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {/* Fixed: mainland is always free */}
            <div className="flex items-center justify-between py-2 px-3 bg-muted/40 rounded-lg">
                <div>
                    <p className="text-sm font-medium">本州・四国・九州・北海道・沖縄本島以外</p>
                    <p className="text-xs text-muted-foreground">送料無料エリア（変更不可）</p>
                </div>
                <span className="text-sm font-semibold text-green-700">¥0（無料）</span>
            </div>

            {displayFields.map((field) => (
                <div key={field.key} className="flex items-center justify-between gap-4">
                    <label className="text-sm font-medium flex-1" htmlFor={field.key}>
                        {LABELS[field.key] ?? field.label}
                    </label>
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">¥</span>
                        <input
                            id={field.key}
                            type="number"
                            min="0"
                            step="100"
                            value={values[field.key] ?? field.value}
                            onChange={(e) => handleChange(field.key, e.target.value)}
                            className="w-28 text-sm border border-border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 text-right"
                        />
                    </div>
                </div>
            ))}

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex items-center gap-4 pt-2">
                <button
                    type="submit"
                    disabled={isPending}
                    className="px-5 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition disabled:opacity-60"
                >
                    {isPending ? '保存中...' : '送料を保存'}
                </button>
                {saved && (
                    <span className="text-sm text-green-600 font-medium">✓ 保存しました</span>
                )}
            </div>
        </form>
    )
}
