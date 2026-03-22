'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        Sentry.captureException(error)
    }, [error])

    return (
        <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
            <div className="text-center space-y-6 max-w-md">
                <div className="space-y-2">
                    <p className="text-5xl font-bold text-muted-foreground/40">⚠</p>
                    <h1 className="text-2xl font-bold">エラーが発生しました</h1>
                    <p className="text-muted-foreground text-sm">
                        申し訳ありません。予期しないエラーが発生しました。
                        <br />
                        問題が続く場合はお問い合わせください。
                    </p>
                </div>
                <div className="flex gap-3 justify-center">
                    <button
                        onClick={reset}
                        className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition"
                    >
                        再試行する
                    </button>
                    <a
                        href="/"
                        className="px-6 py-2.5 border border-border rounded-lg text-sm font-semibold hover:bg-muted/50 transition"
                    >
                        トップへ戻る
                    </a>
                </div>
            </div>
        </div>
    )
}
