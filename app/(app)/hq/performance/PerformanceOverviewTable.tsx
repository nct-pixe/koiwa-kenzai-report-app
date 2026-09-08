import { Fragment } from 'react'
import { formatCurrency } from '@/lib/date'
import type { PerformanceRowInput } from '../../performance/PerformanceReportForm'

export interface StaffPerfRow {
  staffId: string
  name: string
  storeName: string
  sales: PerformanceRowInput
  profit: PerformanceRowInput
}

function pct(actual: number, base: number | null): number | null {
  if (!base) return null
  return Math.round((actual / base) * 100)
}

function PctCell({ cumulative, target, prevYear }: { cumulative: number; target: number | null; prevYear: number | null }) {
  const targetPct = pct(cumulative, target)
  const prevPct = pct(cumulative, prevYear)
  return (
    <td className="px-2 py-1.5 text-right align-middle text-xs whitespace-nowrap">
      <div className="tabular-nums">{targetPct === null ? '—' : `${targetPct}%`}</div>
      <div className="tabular-nums text-muted">{prevPct === null ? '' : `(前年${prevPct}%)`}</div>
    </td>
  )
}

export function PerformanceOverviewTable({ rows }: { rows: StaffPerfRow[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted">表示できるスタッフがいません。</p>
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-line bg-surface">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line bg-surface-2 text-left text-xs text-muted">
            <th className="px-2 py-2 font-semibold">スタッフ</th>
            <th className="px-2 py-2 font-semibold">&nbsp;</th>
            <th className="px-2 py-2 text-right font-semibold">前年実績</th>
            <th className="px-2 py-2 text-right font-semibold">今月目標</th>
            <th className="px-2 py-2 text-right font-semibold">累計実績</th>
            <th className="px-2 py-2 text-right font-semibold">達成率</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <Fragment key={r.staffId}>
              <tr className="border-b border-line/60">
                <td className="px-2 py-1.5 align-top font-bold" rowSpan={2}>
                  {r.name}
                  <div className="text-[11px] font-normal text-muted">{r.storeName}</div>
                </td>
                <td className="px-2 py-1.5 text-muted">売</td>
                <td className="px-2 py-1.5 text-right tabular-nums">{formatCurrency(r.sales.prevYear ?? 0)}</td>
                <td className="px-2 py-1.5 text-right tabular-nums">{formatCurrency(r.sales.target ?? 0)}</td>
                <td className="px-2 py-1.5 text-right tabular-nums">{formatCurrency(r.sales.cumulative)}</td>
                <PctCell cumulative={r.sales.cumulative} target={r.sales.target} prevYear={r.sales.prevYear} />
              </tr>
              <tr className="border-b border-line">
                <td className="px-2 py-1.5 text-muted">利</td>
                <td className="px-2 py-1.5 text-right tabular-nums">{formatCurrency(r.profit.prevYear ?? 0)}</td>
                <td className="px-2 py-1.5 text-right tabular-nums">{formatCurrency(r.profit.target ?? 0)}</td>
                <td className="px-2 py-1.5 text-right tabular-nums">{formatCurrency(r.profit.cumulative)}</td>
                <PctCell cumulative={r.profit.cumulative} target={r.profit.target} prevYear={r.profit.prevYear} />
              </tr>
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  )
}
