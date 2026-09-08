import { createClient } from '@/lib/supabase/server'
import { getCurrentStaff } from '@/lib/auth/currentStaff'
import { toISODate, formatJPDate } from '@/lib/date'
import { CategoryDetailList, type DetailItem } from '../_components/CategoryDetailList'

function defaultFrom(): string {
  const d = new Date()
  d.setDate(d.getDate() - 60)
  return toISODate(d)
}

export default async function StoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>
}) {
  const staff = await getCurrentStaff()
  if (!staff) return null

  const params = await searchParams
  const from = params.from || defaultFrom()
  const to = params.to || toISODate(new Date())

  const supabase = await createClient()

  const { data: items } = await supabase
    .from('report_items')
    .select('category, content, created_at, staff(name, stores(name))')
    .in('category', ['成功談', '失敗談'])
    .gte('created_at', from)
    .lte('created_at', `${to}T23:59:59`)
    .order('created_at', { ascending: false })

  const detailItems: DetailItem[] = (items ?? []).map((item) => {
    const staffInfo = Array.isArray(item.staff) ? item.staff[0] : item.staff
    const storeName = staffInfo
      ? Array.isArray(staffInfo.stores)
        ? staffInfo.stores[0]?.name
        : (staffInfo.stores as { name: string } | null)?.name
      : ''
    return {
      category: item.category,
      content: item.content,
      staffName: `${staffInfo?.name ?? ''}${storeName ? `（${storeName}）` : ''}`,
      date: formatJPDate(new Date(item.created_at)),
    }
  })

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="mb-1 text-lg font-bold">成功談・失敗談</h1>
        <p className="text-sm text-muted">全スタッフの成功談・失敗談を閲覧できます。社内の営業ナレッジとしてご活用ください。</p>
      </div>

      <form method="get" className="flex flex-wrap items-end gap-3 rounded-lg border border-line bg-surface p-4">
        <label className="flex flex-col gap-1 text-xs text-muted">
          開始日
          <input type="date" name="from" defaultValue={from} className="rounded border border-line bg-surface-2 px-2 py-1.5 text-sm" />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          終了日
          <input type="date" name="to" defaultValue={to} className="rounded border border-line bg-surface-2 px-2 py-1.5 text-sm" />
        </label>
        <button type="submit" className="rounded bg-accent px-4 py-1.5 text-sm font-bold text-accent-ink">
          絞り込む
        </button>
      </form>

      <CategoryDetailList items={detailItems} />
    </div>
  )
}
