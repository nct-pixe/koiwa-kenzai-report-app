'use client'

import { useState } from 'react'

export interface DetailItem {
  category: string
  content: string
  staffName: string
  date?: string
}

/** カテゴリ別の件数を一覧表示し、クリックすると該当する内容の詳細を展開する。 */
export function CategoryDetailList({ items }: { items: DetailItem[] }) {
  const [openCategory, setOpenCategory] = useState<string | null>(null)

  const categories = [...new Set(items.map((i) => i.category))]
  if (categories.length === 0) {
    return <p className="text-sm text-muted">表示できるデータがありません。</p>
  }

  return (
    <div className="flex flex-col gap-2">
      {categories.map((c) => {
        const list = items.filter((i) => i.category === c)
        const open = openCategory === c
        return (
          <div key={c} className="rounded-lg border border-line bg-surface">
            <button
              type="button"
              onClick={() => setOpenCategory(open ? null : c)}
              className="flex w-full items-center justify-between px-3 py-2 text-left text-sm"
            >
              <span className="font-bold">{c}</span>
              <span className="flex items-center gap-2 text-xs text-muted">
                {list.length}件
                <span className={`transition-transform ${open ? 'rotate-180' : ''}`}>▾</span>
              </span>
            </button>
            {open && (
              <ul className="flex flex-col gap-2 border-t border-line px-3 py-2">
                {list.map((item, i) => (
                  <li key={i} className="text-sm">
                    <div className="mb-0.5 flex items-center gap-2 text-[11px] text-muted">
                      <span className="font-bold">{item.staffName}</span>
                      {item.date && <span>{item.date}</span>}
                    </div>
                    <p>{item.content}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )
      })}
    </div>
  )
}
