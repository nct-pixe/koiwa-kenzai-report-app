'use client'

import { useRouter } from 'next/navigation'

export function YearSelect({ value, options, basePath }: { value: string; options: string[]; basePath: string }) {
  const router = useRouter()
  return (
    <select
      value={value}
      onChange={(e) => router.push(`${basePath}?year=${e.target.value}`)}
      className="rounded border border-line bg-surface-2 px-2 py-1.5 text-sm outline-none focus:border-accent"
    >
      {options.map((y) => (
        <option key={y} value={y}>
          {y}年
        </option>
      ))}
    </select>
  )
}
