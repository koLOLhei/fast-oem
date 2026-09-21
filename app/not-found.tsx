import type { Metadata } from 'next'
import { ArrowRight } from 'lucide-react'
import { btnPrimary } from '@/components/lp/styles'

export const metadata: Metadata = {
  title: 'ページが見つかりません',
  robots: { index: false, follow: true },
}

export default function NotFound() {
  return (
    <section className="flex min-h-[60vh] items-center justify-center bg-muted px-4 py-20">
      <div className="max-w-lg text-center">
        <p className="text-6xl font-black text-border">404</p>
        <h1 className="mt-4 text-2xl font-black text-foreground">ページが見つかりません</h1>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          FAST OEM はサイトをリニューアルし、現在は定期発注のご相談のみ承っています。
          <br />
          以前の商品ページや注文ページは公開を終了しました。
        </p>
        <div className="mt-8 flex flex-col items-center gap-3">
          <a href="/" className={`${btnPrimary} h-12`}>
            トップページへ
            <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </a>
          <a href="/#contact" className="text-sm font-bold text-primary underline underline-offset-4">
            定期発注のお見積もり依頼はこちら
          </a>
        </div>
      </div>
    </section>
  )
}
