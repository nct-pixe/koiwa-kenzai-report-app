export function ProgressBar({ ratio }: { ratio: number }) {
  const pct = Math.min(100, Math.max(0, Math.round(ratio * 100)))
  const low = pct < 50
  return (
    <div className="h-2 overflow-hidden rounded-full bg-surface-2">
      <div
        className={`h-full rounded-full ${low ? 'bg-warn' : 'bg-accent-2'}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
