'use client'

import { useTransition } from 'react'
import { saveMonthlyTarget } from '@/lib/actions/monthlyTargets'
import type { PerformanceCategory } from '@/lib/supabase/types'

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

export function TargetRow({
  staffId,
  staffName,
  storeName,
  targetMonth,
  category,
  salesTarget,
  profitTarget,
  prevYearSales,
  prevYearProfit,
}: {
  staffId: string
  staffName: string
  storeName: string
  targetMonth: string
  category: PerformanceCategory
  salesTarget: number | null
  profitTarget: number | null
  prevYearSales: number | null
  prevYearProfit: number | null
}) {
  const [pending, startTransition] = useTransition()

  return (
    <form
      action={(formData) => startTransition(() => saveMonthlyTarget(formData))}
      className="flex flex-wrap items-end gap-3 py-1"
    >
      <input type="hidden" name="staffId" value={staffId} />
      <input type="hidden" name="targetMonth" value={targetMonth} />
      <input type="hidden" name="category" value={category} />
      <div className="mr-2 min-w-[8rem]">
        <p className="text-sm font-bold">{staffName}</p>
        <p className="text-[11px] text-muted">{storeName}</p>
      </div>
      <label className="flex flex-col gap-1 text-[11px] text-muted">
        前年売上
        <NumberInput name="prevYearSales" defaultValue={prevYearSales} />
      </label>
      <label className="flex flex-col gap-1 text-[11px] text-muted">
        前年利益
        <NumberInput name="prevYearProfit" defaultValue={prevYearProfit} />
      </label>
      <label className="flex flex-col gap-1 text-[11px] text-muted">
        今月目標（売上）
        <NumberInput name="salesTarget" defaultValue={salesTarget} />
      </label>
      <label className="flex flex-col gap-1 text-[11px] text-muted">
        今月目標（利益）
        <NumberInput name="profitTarget" defaultValue={profitTarget} />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-accent px-3 py-1.5 text-xs font-bold text-accent-ink disabled:opacity-60"
      >
        {pending ? '保存中…' : '保存'}
      </button>
    </form>
  )
}
