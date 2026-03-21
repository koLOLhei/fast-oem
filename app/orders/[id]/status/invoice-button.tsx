'use client'

import { useState } from 'react'

interface Props {
    orderId: string
    token: string
    defaultName: string
}

export function InvoiceButton({ orderId, token, defaultName }: Props) {
    const [open, setOpen] = useState(false)
    const [addressee, setAddressee] = useState(defaultName)
    const [error, setError] = useState('')

    const handleDownload = () => {
        if (!addressee.trim()) {
            setError('宛名を入力してください')
            return
        }
        const url = `/api/invoices/${orderId}?token=${encodeURIComponent(token)}&addressee=${encodeURIComponent(addressee.trim())}`
        window.open(url, '_blank', 'noopener,noreferrer')
    }

    if (!open) {
        return (
            <button
                onClick={() => setOpen(true)}
                className="shrink-0 px-4 py-2 bg-secondary text-secondary-foreground text-sm font-medium rounded-lg hover:bg-secondary/80 border transition"
            >
                📋 請求書PDF
            </button>
        )
    }

    return (
        <div className="shrink-0 space-y-2 min-w-[220px]">
            <div className="space-y-1">
                <label className="block text-xs font-semibold text-foreground">
                    宛名 <span className="text-destructive">*</span>
                </label>
                <input
                    type="text"
                    value={addressee}
                    onChange={(e) => { setAddressee(e.target.value); setError('') }}
                    placeholder="例：株式会社〇〇"
                    className="block w-full text-sm border border-border rounded-lg px-3 py-1.5 bg-background focus:outline-none focus:ring-2 focus:ring-primary/40"
                    autoFocus
                />
                {error && <p className="text-xs text-destructive">{error}</p>}
            </div>
            <div className="flex gap-2">
                <button
                    onClick={handleDownload}
                    className="flex-1 px-3 py-1.5 bg-secondary text-secondary-foreground text-sm font-medium rounded-lg hover:bg-secondary/80 border transition"
                >
                    📋 発行する
                </button>
                <button
                    onClick={() => setOpen(false)}
                    className="px-3 py-1.5 border text-sm rounded-lg hover:bg-muted transition"
                >
                    戻る
                </button>
            </div>
        </div>
    )
}
