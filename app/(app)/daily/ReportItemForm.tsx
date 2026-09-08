'use client'

import { useActionState, useEffect, useRef } from 'react'
import { addReportItem, deleteReportItem, type SimpleFormState } from '@/lib/actions/weekly'
import type { ReportCategory } from '@/lib/supabase/types'

const CATEGORIES: ReportCategory[] = ['失敗談', '成功談', '市況情報', 'クレーム', '会合', 'メーカー情報', 'その他']

const initialState: SimpleFormState = {}

export function ReportItemForm({ weekStart, disabled }: { weekStart: string; disabled: boolean }) {
  const [state, formAction, pending] = useActionState(addReportItem, initialState)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (!state.error) formRef.current?.reset()
  }, [state])

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="weekStart" value={weekStart} />
      <div className="flex gap-2">
        <select
          name="category"
          defaultValue="成功談"
          className="rounded border border-line bg-surface-2 px-2 py-2 text-sm outline-none focus:border-accent"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>
      <textarea
        name="content"
        placeholder="内容を入力"
        rows={2}
        required
        className="w-full resize-y rounded border border-line bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
      />
      {state.error && <p className="text-xs text-crit">{state.error}</p>}
      <button
        type="submit"
        disabled={pending || disabled}
        className="self-start rounded bg-accent px-3 py-1.5 text-xs font-bold text-accent-ink disabled:opacity-60"
      >
        {pending ? '追加中…' : disabled ? '今週は上限です' : '追加する'}
      </button>
    </form>
  )
}

export function DeleteReportItemButton({ id }: { id: string }) {
  return (
    <form action={deleteReportItem.bind(null, id)}>
      <button type="submit" className="text-xs text-muted hover:text-crit">削除</button>
    </form>
  )
}
