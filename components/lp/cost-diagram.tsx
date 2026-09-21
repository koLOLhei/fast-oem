/**
 * 単価の内訳イメージ。材料費・加工費はほぼ変わらず、初期費用や段取り・割増・中間コストが
 * 小さくなることで単価が下がる、という考え方を示す（金額ではなく構成の比較）。
 */

type Segment = { key: string; label: string; color: string; spot: number; recurring: number; note: string }

const SEGMENTS: Segment[] = [
  { key: 'material', label: '材料費', color: '#124e7e', spot: 30, recurring: 29, note: 'まとめて手配' },
  { key: 'process', label: '加工費', color: '#1e73be', spot: 24, recurring: 24, note: '品質はそのまま' },
  { key: 'tooling', label: '型・版・校正', color: '#5aa3dc', spot: 14, recurring: 3, note: '初回のみ' },
  { key: 'setup', label: '段取り・調整', color: '#9cc7ea', spot: 10, recurring: 4, note: '計画生産で削減' },
  { key: 'rush', label: '急ぎ・割増', color: '#f5a623', spot: 8, recurring: 0, note: '前もって生産' },
  { key: 'margin', label: '中間コスト', color: '#b8c4d2', spot: 14, recurring: 6, note: '工場と直接取引' },
]

const recurringTotal = SEGMENTS.reduce((sum, s) => sum + s.recurring, 0)

function Bar({ kind }: { kind: 'spot' | 'recurring' }) {
  return (
    <div className="flex h-11 w-full overflow-hidden rounded-lg">
      {SEGMENTS.filter((s) => s[kind] > 0).map((s) => (
        <span
          key={s.key}
          className="h-full border-r-2 border-white last:border-r-0"
          style={{ width: `${s[kind]}%`, backgroundColor: s.color }}
          title={s.label}
        />
      ))}
      {kind === 'recurring' && (
        <span
          className="flex h-full items-center justify-center rounded-r-lg border-2 border-dashed border-accent bg-brand-amber-soft/60 text-[11px] font-bold text-[#7a4f00] sm:text-xs"
          style={{ width: `${100 - recurringTotal}%` }}
        >
          ここが下がる
        </span>
      )}
    </div>
  )
}

export function CostDiagram() {
  return (
    <figure className="rounded-2xl bg-card p-5 shadow-card ring-1 ring-border sm:p-8">
      <figcaption className="text-base font-bold text-foreground sm:text-lg">単価の内訳（イメージ）</figcaption>
      <p className="sr-only">
        単発で発注する場合、単価には材料費と加工費のほかに、型・版・校正、段取り・調整、急ぎの割増、中間コストが毎回含まれます。定期発注では材料費と加工費はほぼ同じまま、型・版は初回のみ、段取りは計画生産で減り、急ぎの割増はなくなり、中間コストも抑えられます。
      </p>

      <div className="mt-6 space-y-5" aria-hidden="true">
        <div>
          <p className="mb-2 text-sm font-bold text-muted-foreground">単発で発注</p>
          <Bar kind="spot" />
        </div>
        <div>
          <p className="mb-2 text-sm font-bold text-primary">定期発注（FAST OEM）</p>
          <Bar kind="recurring" />
        </div>
      </div>

      <ul className="mt-7 grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
        {SEGMENTS.map((s) => (
          <li key={s.key} className="flex items-start gap-2.5 text-sm">
            <span className="mt-1 h-3.5 w-3.5 shrink-0 rounded-[4px]" style={{ backgroundColor: s.color }} aria-hidden="true" />
            <span>
              <span className="font-bold text-foreground">{s.label}</span>
              <span className="text-muted-foreground">：{s.note}</span>
            </span>
          </li>
        ))}
      </ul>

      <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
        ※ 考え方を示したイメージ図です。実際の単価は、仕様・数量・発注頻度によって異なります。
      </p>
    </figure>
  )
}
