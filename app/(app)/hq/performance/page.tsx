import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentStaff } from '@/lib/auth/currentStaff'
import { getMonthStart, getMonthOptions, toISODate } from '@/lib/date'
import { MonthSelect } from '../../_components/MonthSelect'
import { PerformanceOverviewTable, type StaffPerfRow } from './PerformanceOverviewTable'
import type { PerformanceRowInput } from '../../performance/PerformanceReportForm'

const MONTH_PATTERN = /^\d{4}-\d{2}-01$/
const EMPTY_ROW: PerformanceRowInput = { target: null, prevYear: null, cumulative: 0 }

export default async function HqPerformancePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const staff = await getCurrentStaff()
  if (!staff) return null
  if (staff.role !== 'hq' && staff.role !== 'manager') {
    redirect('/')
  }

  const monthOptions = getMonthOptions(24)
  const requestedMonth = (await searchParams).month
  const targetMonth =
    requestedMonth && MONTH_PATTERN.test(requestedMonth) ? requestedMonth : toISODate(getMonthStart(new Date()))

  const supabase = await createClient()

  let staffQuery = supabase
    .from('staff')
    .select('id, name, store_id, stores(name)')
    .eq('active', true)
    .order('store_id')
  if (staff.role === 'manager') {
    staffQuery = staffQuery.eq('store_id', staff.storeId)
  }
  const { data: staffRows } = await staffQuery
  const staffIds = (staffRows ?? []).map((s) => s.id)

  const [{ data: targets }, { data: reports }] = await Promise.all([
    staffIds.length
      ? supabase
          .from('monthly_targets')
          .select('staff_id, category, sales_target, profit_target, prev_year_sales, prev_year_profit')
          .eq('target_month', targetMonth)
          .in('staff_id', staffIds)
      : Promise.resolve({ data: [] }),
    staffIds.length
      ? supabase
          .from('performance_reports')
          .select('staff_id, category, cumulative_sales, cumulative_profit')
          .eq('target_month', targetMonth)
          .in('staff_id', staffIds)
      : Promise.resolve({ data: [] }),
  ])

  const targetByStaffCategory = new Map((targets ?? []).map((t) => [`${t.staff_id}:${t.category}`, t]))
  const reportByStaffCategory = new Map((reports ?? []).map((r) => [`${r.staff_id}:${r.category}`, r]))

  function buildRows(category: 'general'): StaffPerfRow[] {
    return (staffRows ?? []).map((s) => {
      const storeName = Array.isArray(s.stores) ? s.stores[0]?.name : (s.stores as { name: string } | null)?.name
      const target = targetByStaffCategory.get(`${s.id}:${category}`)
      const report = reportByStaffCategory.get(`${s.id}:${category}`)
      return {
        staffId: s.id,
        name: s.name,
        storeName: storeName ?? '',
        sales: {
          target: target?.sales_target ?? null,
          prevYear: target?.prev_year_sales ?? null,
          cumulative: report?.cumulative_sales ?? EMPTY_ROW.cumulative,
        },
        profit: {
          target: target?.profit_target ?? null,
          prevYear: target?.prev_year_profit ?? null,
          cumulative: report?.cumulative_profit ?? EMPTY_ROW.cumulative,
        },
      }
    })
  }

  const generalRows = buildRows('general')

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/hq" className="text-xs font-semibold text-accent underline underline-offset-2">
            ← 本部ダッシュボードに戻る
          </Link>
          <h1 className="mt-1 mb-1 text-lg font-bold">実績報告一覧（全スタッフ）</h1>
          <p className="text-sm text-muted">スタッフ自身が入力した実績報告の閲覧専用ビューです。</p>
        </div>
        <MonthSelect value={targetMonth} options={monthOptions} basePath="/hq/performance" />
      </div>

      <div>
        <h2 className="mb-3 text-sm font-bold">スタッフ実績</h2>
        <PerformanceOverviewTable rows={generalRows} />
      </div>
    </div>
  )
}
