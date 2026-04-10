import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'ページが見つかりません | FAST OEM',
  description: 'お探しのページは存在しないか、移動した可能性があります。FAST OEMのトップページまたは商品一覧からお探しの情報をご確認ください。',
  robots: { index: false, follow: true },
}

export default function NotFound() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
            <div className="text-center space-y-6 max-w-md">
                <div className="space-y-2">
                    <p className="text-6xl font-bold text-muted-foreground/40">404</p>
                    <h1 className="text-2xl font-bold">ページが見つかりません</h1>
                    <p className="text-muted-foreground text-sm">
                        お探しのページは存在しないか、移動した可能性があります。
                    </p>
                </div>
                <Link
                    href="/"
                    className="inline-block px-6 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition"
                >
                    トップページへ戻る
                </Link>
            </div>
        </div>
    )
}
