'use client'

import { useTransition } from 'react'
import { savePlanItem } from '@/lib/actions/weekly'

export function PlanDayCard({
  planDate,
  label,
  initialContent,
}: {
  planDate: string
  label: string
  initialContent: string
}) {
  const [pending, startTransition] = useTransition()

  return (
    <form
      action={(formData) => startTransition(() => savePlanItem(formData))}
      className="rounded-lg border border-line bg-surface p-3.5"
    >
      <input type="hidden" name="planDate" value={planDate} />
      <div className="mb-2 text-sm font-bold">{label}</div>
      <textarea
        name="content"
        defaultValue={initialContent}
        placeholder="何を提案するか"
        rows={2}
        className="w-full resize-y rounded border border-line bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
      />
      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded bg-accent px-3 py-1.5 text-xs font-bold text-accent-ink disabled:opacity-60"
      >
        {pending ? '保存中…' : '保存'}
      </button>
    </form>
  )
}
