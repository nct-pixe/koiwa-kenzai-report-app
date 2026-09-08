'use client'

import { useActionState } from 'react'
import { saveAnnualPlan, type AnnualPlanFormState } from '@/lib/actions/monthlyTargets'

export interface AnnualMonthRow {
  month: number
  label: string
  salesTarget: number | null
  profitTarget: number | null
  prevYearSales: number | null
  prevYearProfit: number | null
}

const initialState: AnnualPlanFormState = {}

function NumberInput({ name, defaultValue }: { name: string; defaultValue: number | null }) {
  return (
    <input
      type="number"
      name={name}
      step={1}
      defaultValue={defaultValue ?? 0}
      className="w-28 rounded border border-line bg-surface-2 px-2 py-1.5 text-right text-sm tabular-nums outline-none focus:border-accent focus:ring-1 focus:ring-accent"
    />
  )
}

export function AnnualPlanForm({
  staffId,
  year,
  rows,
}: {
  staffId: string
  year: string
  rows: AnnualMonthRow[]
}) {
  const [state, formAction, pending] = useActionState(saveAnnualPlan, initialState)

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="staffId" value={staffId} />
      <input type="hidden" name="year" value={year} />

      <div className="overflow-x-auto rounded-lg border border-line bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line bg-surface-2 text-left text-xs text-muted">
              <th className="px-3 py-2 font-semibold">月</th>
              <th className="px-3 py-2 text-right font-semibold">前年売上</th>
              <th className="px-3 py-2 text-right font-semibold">前年利益</th>
              <th className="px-3 py-2 text-right font-semibold">今月目標（売上）</th>
              <th className="px-3 py-2 text-right font-semibold">今月目標（利益）</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.month} className="border-b border-line last:border-none">
                <td className="px-3 py-2 whitespace-nowrap font-bold">{r.label}</td>
                <td className="px-3 py-2 text-right">
                  <NumberInput name={`m${r.month}_prevYearSales`} defaultValue={r.prevYearSales} />
                </td>
                <td className="px-3 py-2 text-right">
                  <NumberInput name={`m${r.month}_prevYearProfit`} defaultValue={r.prevYearProfit} />
                </td>
                <td className="px-3 py-2 text-right">
                  <NumberInput name={`m${r.month}_salesTarget`} defaultValue={r.salesTarget} />
                </td>
                <td className="px-3 py-2 text-right">
                  <NumberInput name={`m${r.month}_profitTarget`} defaultValue={r.profitTarget} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {state.error && (
        <p className="rounded border border-crit/30 bg-crit/10 px-3 py-2 text-sm text-crit">{state.error}</p>
      )}
      {state.success && (
        <p className="rounded border border-good/30 bg-good/10 px-3 py-2 text-sm text-good">
          年間計画を保存しました
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded bg-accent px-4 py-2 text-sm font-bold text-accent-ink disabled:opacity-60"
      >
        {pending ? '保存中…' : '年間計画を保存する'}
      </button>
    </form>
  )
}
