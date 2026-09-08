'use client'

import { useState, type ReactNode } from 'react'

type TabKey = 'do' | 'report' | 'plan' | 'other'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'do', label: '今週の行動結果（Do）' },
  { key: 'report', label: '報告事項（Check⇒Action）' },
  { key: 'plan', label: '来週の行動予定（Plan）' },
  { key: 'other', label: 'その他報告事項' },
]

export function DailyTabs({
  doTab,
  reportTab,
  planTab,
  otherTab,
}: {
  doTab: ReactNode
  reportTab: ReactNode
  planTab: ReactNode
  otherTab: ReactNode
}) {
  const [active, setActive] = useState<TabKey>('do')
  const content: Record<TabKey, ReactNode> = { do: doTab, report: reportTab, plan: planTab, other: otherTab }

  return (
    <div>
      <div className="mb-5 flex gap-1 overflow-x-auto border-b border-line">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setActive(t.key)}
            className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm font-bold ${
              active === t.key ? 'border-accent text-accent' : 'border-transparent text-muted hover:text-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div>{content[active]}</div>
    </div>
  )
}
