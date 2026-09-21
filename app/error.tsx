'use client'

import { useEffect } from 'react'

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        console.error(error)
    }, [error])

    return (
        <div className="min-h-[60vh] flex items-center justify-center bg-muted px-4 py-20">
            <div className="text-center space-y-6 max-w-md">
                <div className="space-y-2">
                    <h1 className="text-2xl font-bold">エラーが発生しました</h1>
                    <p className="text-muted-foreground text-sm">
                        申し訳ありません。予期しないエラーが発生しました。
                        <br />
                        問題が続く場合は、時間をおいてから再度アクセスしてください。
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
                        className="px-6 py-2.5 border border-border rounded-lg text-sm font-semibold hover:bg-background transition"
                    >
                        トップへ戻る
                    </a>
                </div>
            </div>
        </div>
    )
}
