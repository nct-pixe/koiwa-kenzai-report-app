import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentStaff, canManageTargets } from '@/lib/auth/currentStaff'
import { getMonthStart, getMonthOptions, toISODate } from '@/lib/date'
import { MonthSelect } from '../../_components/MonthSelect'
import { TargetRow } from './TargetRow'

const MONTH_PATTERN = /^\d{4}-\d{2}-01$/

export default async function HqTargetsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const staff = await getCurrentStaff()
  if (!staff) return null
  if (!canManageTargets(staff)) {
    redirect('/')
  }

  const monthOptions = getMonthOptions(24)
  const requestedMonth = (await searchParams).month
  const targetMonth =
    requestedMonth && MONTH_PATTERN.test(requestedMonth) ? requestedMonth : toISODate(getMonthStart(new Date()))

  const supabase = await createClient()

  const { data: staffRows } = await supabase
    .from('staff')
    .select('id, name, store_id, stores(name)')
    .eq('active', true)
    .order('store_id')
  const staffIds = (staffRows ?? []).map((s) => s.id)

  const { data: targets } = staffIds.length
    ? await supabase
        .from('monthly_targets')
        .select('staff_id, category, sales_target, profit_target, prev_year_sales, prev_year_profit')
        .eq('target_month', targetMonth)
        .in('staff_id', staffIds)
    : { data: [] }

  const targetByStaffCategory = new Map(
    (targets ?? []).map((t) => [`${t.staff_id}:${t.category}`, t]),
  )

  const rows = (staffRows ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    storeName: Array.isArray(s.stores) ? s.stores[0]?.name : (s.stores as { name: string } | null)?.name,
  }))

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/hq" className="text-xs font-semibold text-accent underline underline-offset-2">
            ← 本部ダッシュボードに戻る
          </Link>
          <h1 className="mt-1 mb-1 text-lg font-bold">目標設定（前年実績・今月目標）</h1>
          <p className="text-sm text-muted">スタッフ自身は編集できません。ここで登録した値が実績報告・ランキングに反映されます。</p>
        </div>
        <MonthSelect value={targetMonth} options={monthOptions} basePath="/hq/targets" />
      </div>

      <div>
        <h2 className="mb-3 text-sm font-bold">スタッフ実績</h2>
        <div className="overflow-x-auto rounded-lg border border-line bg-surface">
          {rows.length === 0 ? (
            <p className="p-4 text-sm text-muted">表示できるスタッフがいません。</p>
          ) : (
            rows.map((r) => {
              const t = targetByStaffCategory.get(`${r.id}:general`)
              return (
                <div key={r.id} className="flex flex-wrap items-center gap-2 border-b border-line px-3 py-1.5 last:border-none">
                  <TargetRow
                    staffId={r.id}
                    staffName={r.name}
                    storeName={r.storeName ?? ''}
                    targetMonth={targetMonth}
                    category="general"
                    salesTarget={t?.sales_target ?? null}
                    profitTarget={t?.profit_target ?? null}
                    prevYearSales={t?.prev_year_sales ?? null}
                    prevYearProfit={t?.prev_year_profit ?? null}
                  />
                  <Link
                    href={`/hq/targets/${r.id}`}
                    className="rounded-full border border-line px-3 py-1.5 text-xs font-bold text-accent hover:bg-surface-2"
                  >
                    年間計画を入力 →
                  </Link>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
