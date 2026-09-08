export interface TrendPoint {
  label: string
  actual: number
  target?: number
  prevYear?: number
}

const WIDTH = 640
const HEIGHT = 180
const PAD_X = 8
const PAD_Y = 16

function buildPath(values: (number | undefined)[], max: number, count: number): string {
  const usable = values
    .map((v, i) => (v === undefined ? null : { x: PAD_X + (i / Math.max(1, count - 1)) * (WIDTH - PAD_X * 2), y: HEIGHT - PAD_Y - (v / max) * (HEIGHT - PAD_Y * 2) }))
    .filter((p): p is { x: number; y: number } => p !== null)
  if (usable.length === 0) return ''
  return usable.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
}

/** 実績・目標・前年の推移を折れ線で表示する軽量SVGチャート（外部ライブラリ不使用）。 */
export function LineTrendChart({ points, formatValue }: { points: TrendPoint[]; formatValue: (n: number) => string }) {
  if (points.length === 0) {
    return <p className="text-sm text-muted">表示できるデータがありません。</p>
  }

  const max = Math.max(
    1,
    ...points.map((p) => p.actual),
    ...points.map((p) => p.target ?? 0),
    ...points.map((p) => p.prevYear ?? 0),
  )

  const actualPath = buildPath(points.map((p) => p.actual), max, points.length)
  const targetPath = buildPath(points.map((p) => p.target), max, points.length)
  const prevYearPath = buildPath(points.map((p) => p.prevYear), max, points.length)

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-3 text-[11px] text-muted">
        <span className="flex items-center gap-1"><span className="inline-block h-0.5 w-3 bg-accent-2" />実績</span>
        {targetPath && <span className="flex items-center gap-1"><span className="inline-block h-0.5 w-3 bg-foreground/40" />目標</span>}
        {prevYearPath && <span className="flex items-center gap-1"><span className="inline-block h-0.5 w-3 bg-muted" style={{ borderTop: '1px dashed currentColor' }} />前年</span>}
      </div>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" preserveAspectRatio="none" style={{ height: `${HEIGHT}px` }}>
        {targetPath && <path d={targetPath} fill="none" stroke="currentColor" strokeWidth={1.5} className="text-foreground/30" />}
        {prevYearPath && (
          <path d={prevYearPath} fill="none" stroke="currentColor" strokeWidth={1.5} strokeDasharray="4 3" className="text-muted" />
        )}
        <path d={actualPath} fill="none" stroke="currentColor" strokeWidth={2} className="text-accent-2" />
      </svg>
      <div className="flex justify-between text-[10px] text-muted">
        <span>{points[0].label}</span>
        <span className="tabular-nums">最新：{formatValue(points[points.length - 1].actual)}</span>
        <span>{points[points.length - 1].label}</span>
      </div>
    </div>
  )
}
