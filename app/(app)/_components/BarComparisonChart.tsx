export interface BarChartRow {
  label: string
  value: number
  target?: number
  sublabel?: string
}

export type BarChartMetric = 'sales' | 'profit'

const BAR_COLOR: Record<BarChartMetric, string> = {
  sales: 'bg-accent-2',
  profit: 'bg-accent',
}

/** 横棒グラフ。value を棒の長さ、target があれば目標ラインを重ねて表示する。
 * metric に応じてバーの色を変え、売上グラフか利益グラフかを一目で判別できるようにする。 */
export function BarComparisonChart({
  rows,
  formatValue,
  metric = 'sales',
}: {
  rows: BarChartRow[]
  formatValue: (n: number) => string
  metric?: BarChartMetric
}) {
  const max = Math.max(1, ...rows.map((r) => Math.max(r.value, r.target ?? 0)))

  if (rows.length === 0) {
    return <p className="text-sm text-muted">表示できるデータがありません。</p>
  }

  return (
    <div className="flex flex-col gap-3">
      {rows.map((r) => {
        const widthPct = Math.min(100, (r.value / max) * 100)
        const targetPct = r.target ? Math.min(100, (r.target / max) * 100) : null
        return (
          <div key={r.label}>
            <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
              <span className="font-bold text-foreground">{r.label}</span>
              <span className="tabular-nums text-muted">
                {formatValue(r.value)}
                {r.target ? ` / ${formatValue(r.target)}` : ''}
                {r.sublabel ? `　${r.sublabel}` : ''}
              </span>
            </div>
            <div className="relative h-2.5 overflow-hidden rounded-full bg-surface-2">
              <div className={`h-full rounded-full ${BAR_COLOR[metric]}`} style={{ width: `${widthPct}%` }} />
              {targetPct !== null && (
                <div
                  className="absolute top-0 h-full w-0.5 bg-foreground/40"
                  style={{ left: `${targetPct}%` }}
                />
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
