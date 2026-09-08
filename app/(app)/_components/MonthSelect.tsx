'use client'

import { useRouter } from 'next/navigation'

export function MonthSelect({
  value,
  options,
  basePath,
}: {
  value: string
  options: { value: string; label: string }[]
  basePath: string
}) {
  const router = useRouter()
  return (
    <select
      value={value}
      onChange={(e) => router.push(`${basePath}?month=${e.target.value}`)}
      className="rounded border border-line bg-surface-2 px-2 py-1.5 text-sm outline-none focus:border-accent"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}
