import { CalendarSync } from 'lucide-react'

const SCHEDULE = ['1月', '4月', '7月', '10月']

/** ヒーローに置く「定期発注の例」カード。年間見込みで単価を決める考え方を一目で伝える。 */
export function PlanCard({ className = '' }: { className?: string }) {
  return (
    <figure
      className={`rounded-2xl bg-white p-5 shadow-float ring-1 ring-border sm:p-6 ${className}`}
      aria-label="定期発注の例：ガチャ景品用アクリルキーホルダーを3ヶ月ごとに3,000個、年間12,000個の見込みで単価を算出"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="inline-flex items-center gap-1.5 text-xs font-bold text-primary">
          <CalendarSync className="h-4 w-4" aria-hidden="true" />
          定期発注の例
        </p>
        <span className="rounded-full bg-brand-amber-soft px-2.5 py-1 text-[11px] font-bold text-[#7a4f00]">
          年間見込みで単価を設計
        </span>
      </div>

      <p className="mt-3 font-bold leading-snug text-foreground">ガチャ景品用 アクリルキーホルダー</p>

      <dl className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-muted px-3 py-2.5">
          <dt className="text-[11px] font-semibold text-muted-foreground">1回の発注</dt>
          <dd className="mt-0.5 text-lg font-black tracking-tight tabular-nums">3,000個</dd>
        </div>
        <div className="rounded-xl bg-muted px-3 py-2.5">
          <dt className="text-[11px] font-semibold text-muted-foreground">頻度</dt>
          <dd className="mt-0.5 text-lg font-black tracking-tight">3ヶ月ごと</dd>
        </div>
      </dl>

      <ol className="mt-4 grid grid-cols-4 gap-2" aria-label="納品スケジュール">
        {SCHEDULE.map((month) => (
          <li key={month} className="text-center">
            <span className="block h-1.5 rounded-full bg-primary" aria-hidden="true" />
            <span className="mt-1.5 block text-[11px] font-semibold text-muted-foreground">{month}</span>
            <span className="block text-xs font-bold tabular-nums text-foreground">3,000個</span>
          </li>
        ))}
      </ol>

      <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-brand-blue-deep px-4 py-3 text-white">
        <span className="text-xs font-semibold leading-tight text-white/80">
          単価の
          <br />
          計算ベース
        </span>
        <span className="whitespace-nowrap text-xl font-black tracking-tight tabular-nums">年間 12,000個</span>
      </div>
      <figcaption className="mt-2.5 text-[11px] leading-relaxed text-muted-foreground">
        1回ごとの数量ではなく、年間の発注見込みで単価を計算します（数量・頻度は一例です）。
      </figcaption>
    </figure>
  )
}
