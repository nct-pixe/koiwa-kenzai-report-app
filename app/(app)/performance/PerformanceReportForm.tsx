'use client'

import { useActionState } from 'react'
import { savePerformanceReport, type PerformanceFormState } from '@/lib/actions/performanceReports'
import { formatCurrency } from '@/lib/date'
import type { PerformanceCategory } from '@/lib/supabase/types'

export interface PerformanceRowInput {
  target: number | null
  prevYear: number | null
  cumulative: number
}

const initialState: PerformanceFormState = {}

function pct(actual: number, base: number | null): number | null {
  if (!base) return null
  return Math.round((actual / base) * 100)
}

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-surface-2 px-3 py-2.5">
      <p className="mb-1 text-[11px] text-muted">{label}</p>
      <p className="text-sm font-bold tabular-nums">{value}</p>
    </div>
  )
}

function AmountRow({
  label,
  name,
  target,
  prevYear,
  cumulative,
}: {
  label: string
  name: string
  target: number | null
  prevYear: number | null
  cumulative: number
}) {
  const achievementPct = pct(cumulative, target)
  return (
    <div className="rounded-lg border border-line bg-surface p-4">
      <p className="mb-3 text-sm font-bold">{label}</p>
      <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        <StatCell label="前年実績" value={formatCurrency(prevYear ?? 0)} />
        <StatCell label="今月目標" value={formatCurrency(target ?? 0)} />
        <StatCell label="目標達成率" value={achievementPct === null ? '—' : `${achievementPct}%`} />
      </div>
      <label className="block text-xs font-bold text-muted">本日までの累計実績</label>
      <input
        type="number"
        name={name}
        step={1}
        defaultValue={cumulative}
        className="mt-1 w-40 rounded border border-line bg-surface-2 px-3 py-2 text-right text-sm tabular-nums outline-none focus:border-accent focus:ring-1 focus:ring-accent"
      />
    </div>
  )
}

export function PerformanceReportForm({
  targetMonth,
  category,
  title,
  description,
  sales,
  profit,
}: {
  targetMonth: string
  category: PerformanceCategory
  title: string
  description?: string
  sales: PerformanceRowInput
  profit: PerformanceRowInput
}) {
  const [state, formAction, pending] = useActionState(savePerformanceReport, initialState)

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="targetMonth" value={targetMonth} />
      <input type="hidden" name="category" value={category} />

      <div>
        <h2 className="text-sm font-bold">{title}</h2>
        {description && <p className="text-xs text-muted">{description}</p>}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <AmountRow label="売上" name="cumulativeSales" target={sales.target} prevYear={sales.prevYear} cumulative={sales.cumulative} />
        <AmountRow label="利益" name="cumulativeProfit" target={profit.target} prevYear={profit.prevYear} cumulative={profit.cumulative} />
      </div>

      {state.error && (
        <p className="rounded border border-crit/30 bg-crit/10 px-3 py-2 text-sm text-crit">{state.error}</p>
      )}
      {state.success && (
        <p className="rounded border border-good/30 bg-good/10 px-3 py-2 text-sm text-good">保存しました</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded bg-accent px-4 py-2 text-sm font-bold text-accent-ink disabled:opacity-60"
      >
        {pending ? '保存中…' : '保存する'}
      </button>
    </form>
  )
}
