'use client'

import { useState } from 'react'

export function SecretUrlCopier({ url }: { url: string }) {
    const [copied, setCopied] = useState(false)

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(url)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch {
            // fallback: select text in input
        }
    }

    return (
        <div className="flex items-center gap-2">
            <input
                readOnly
                value={url}
                className="flex-1 text-xs font-mono bg-white border border-amber-200 rounded-lg px-3 py-2 text-amber-900 truncate"
                onFocus={(e) => e.target.select()}
            />
            <button
                onClick={handleCopy}
                className="shrink-0 px-3 py-2 text-xs font-medium bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition"
            >
                {copied ? '✓ コピー済み' : 'コピー'}
            </button>
        </div>
    )
}
