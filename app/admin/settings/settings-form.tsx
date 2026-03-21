'use client'

import { useState, useTransition } from 'react'
import { updateSiteSettings } from '@/app/actions/settings'

interface Field {
    key: string
    label: string
    value: string
}

interface Props {
    fields: Field[]
}

export function SettingsForm({ fields }: Props) {
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
        startTransition(async () => {
            try {
                await updateSiteSettings(values)
                setSaved(true)
            } catch (err: any) {
                setError(err?.message ?? '保存に失敗しました')
            }
        })
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            {fields.map((field) => (
                <div key={field.key} className="space-y-1.5">
                    <label className="block text-sm font-medium text-foreground">
                        {field.label}
                    </label>
                    <input
                        type="text"
                        value={values[field.key] ?? ''}
                        onChange={(e) => handleChange(field.key, e.target.value)}
                        className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                    <p className="text-xs text-muted-foreground font-mono">{field.key}</p>
                </div>
            ))}

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex items-center gap-4 pt-2">
                <button
                    type="submit"
                    disabled={isPending}
                    className="px-5 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition disabled:opacity-60"
                >
                    {isPending ? '保存中...' : '保存する'}
                </button>
                {saved && (
                    <span className="text-sm text-green-600 font-medium">✓ 保存しました</span>
                )}
            </div>
        </form>
    )
}
