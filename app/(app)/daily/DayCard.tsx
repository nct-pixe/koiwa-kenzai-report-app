'use client'

import { useTransition } from 'react'
import { saveDailyLog } from '@/lib/actions/dailyLogs'

export interface DayCardDetail {
  customerName: string | null
  purpose: string | null
  contactPerson: string | null
  customerReaction: string | null
  proposalContent: string | null
  progressStatus: string | null
  issues: string | null
  nextAction: string | null
  nextActionAssignee: string | null
  nextVisitDate: string | null
}

const VISIT_DETAIL_FIELDS: { key: keyof DayCardDetail; name: string; label: string; placeholder: string }[] = [
  { key: 'customerName', name: 'customerName', label: '訪問先・顧客名', placeholder: '例）〇〇工務店' },
  { key: 'purpose', name: 'purpose', label: '訪問目的', placeholder: '例）新商品の提案' },
  { key: 'contactPerson', name: 'contactPerson', label: '誰と話したか', placeholder: '例）購買担当・佐藤様' },
  { key: 'customerReaction', name: 'customerReaction', label: '顧客の反応', placeholder: '例）前向きに検討したいとのこと' },
  { key: 'proposalContent', name: 'proposalContent', label: '提案した内容', placeholder: '例）新型パネルの見積提示' },
  { key: 'progressStatus', name: 'progressStatus', label: '商談の進捗', placeholder: '例）見積提出済み、返答待ち' },
  { key: 'issues', name: 'issues', label: '課題・懸念事項', placeholder: '例）納期が短く社内調整が必要' },
]

export function DayCard({
  logDate,
  label,
  initialContent,
  detail,
  lastWeekPlan,
  defaultAssignee,
  isToday,
}: {
  logDate: string
  label: string
  initialContent: string
  detail: DayCardDetail
  lastWeekPlan?: string
  defaultAssignee: string
  isToday: boolean
}) {
  const [pending, startTransition] = useTransition()
  const status = lastWeekPlan ? (initialContent.trim() ? '実施済み' : '未実施') : null

  return (
    <form
      action={(formData) => startTransition(() => saveDailyLog(formData))}
      className={`rounded-lg border p-3.5 ${isToday ? 'border-accent/40 bg-accent/5' : 'border-line bg-surface'}`}
    >
      <input type="hidden" name="logDate" value={logDate} />
      <div className="mb-2 flex items-center justify-between">
        <span className={`text-sm font-bold ${isToday ? 'text-accent' : 'text-foreground'}`}>
          {label}
          {isToday && <span className="ml-1.5 text-[10px] font-bold text-accent">今日</span>}
        </span>
        {status && (
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
              status === '実施済み' ? 'bg-good/15 text-good' : 'bg-warn/15 text-warn'
            }`}
          >
            {status}
          </span>
        )}
      </div>

      {lastWeekPlan && (
        <p className="mb-2 rounded bg-surface-2 px-2.5 py-1.5 text-xs text-muted">
          <span className="font-bold">先週の予定：</span>
          {lastWeekPlan}
        </p>
      )}

      <textarea
        name="content"
        defaultValue={initialContent}
        placeholder="行動内容／訪問先／商談内容"
        rows={2}
        className="w-full resize-y rounded border border-line bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
      />

      <details className="mt-2">
        <summary className="cursor-pointer text-xs font-bold text-accent">詳細を追加（任意）</summary>

        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {VISIT_DETAIL_FIELDS.map((f) => (
            <label key={f.key} className="flex flex-col gap-1 text-[11px] text-muted">
              {f.label}
              <input
                type="text"
                name={f.name}
                defaultValue={detail[f.key] ?? ''}
                placeholder={f.placeholder}
                className="rounded border border-line bg-surface-2 px-2 py-1.5 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
              />
            </label>
          ))}
        </div>

        <div className="mt-3 rounded border border-line bg-surface-2/50 p-2.5">
          <p className="mb-2 text-[11px] font-bold text-muted">次のアクション</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <label className="flex flex-col gap-1 text-[11px] text-muted">
              次の行動
              <input
                type="text"
                name="nextAction"
                defaultValue={detail.nextAction ?? ''}
                placeholder="例）見積の再提示"
                className="rounded border border-line bg-surface px-2 py-1.5 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
              />
            </label>
            <label className="flex flex-col gap-1 text-[11px] text-muted">
              担当者
              <input
                type="text"
                name="nextActionAssignee"
                defaultValue={detail.nextActionAssignee ?? defaultAssignee}
                placeholder="例）自分／店長"
                className="rounded border border-line bg-surface px-2 py-1.5 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
              />
            </label>
            <label className="flex flex-col gap-1 text-[11px] text-muted">
              期限
              <input
                type="date"
                name="nextVisitDate"
                defaultValue={detail.nextVisitDate ?? ''}
                className="rounded border border-line bg-surface px-2 py-1.5 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
              />
            </label>
          </div>
        </div>
      </details>

      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded bg-accent px-3 py-1.5 text-xs font-bold text-accent-ink disabled:opacity-60"
      >
        {pending ? '保存中…' : 'この日を保存'}
      </button>
    </form>
  )
}
