import { createClient } from '@/lib/supabase/server'
import { getCurrentStaff } from '@/lib/auth/currentStaff'
import { getMonthStart, getMonthOptions, toISODate } from '@/lib/date'
import { PerformanceReportForm, type PerformanceRowInput } from './PerformanceReportForm'
import { MonthSelect } from '../_components/MonthSelect'

const EMPTY_ROW: PerformanceRowInput = { target: null, prevYear: null, cumulative: 0 }
const MONTH_PATTERN = /^\d{4}-\d{2}-01$/

export default async function PerformancePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const staff = await getCurrentStaff()
  if (!staff) return null

  const monthOptions = getMonthOptions(24)
  const requestedMonth = (await searchParams).month
  const targetMonth =
    requestedMonth && MONTH_PATTERN.test(requestedMonth) ? requestedMonth : toISODate(getMonthStart(new Date()))
  const supabase = await createClient()

  const [{ data: targets }, { data: reports }] = await Promise.all([
    supabase
      .from('monthly_targets')
      .select('category, sales_target, profit_target, prev_year_sales, prev_year_profit')
      .eq('staff_id', staff.id)
      .eq('target_month', targetMonth),
    supabase
      .from('performance_reports')
      .select('category, cumulative_sales, cumulative_profit')
      .eq('staff_id', staff.id)
      .eq('target_month', targetMonth),
  ])

  const generalTarget = targets?.find((t) => t.category === 'general') ?? null
  const generalReport = reports?.find((r) => r.category === 'general') ?? null

  const generalSales: PerformanceRowInput = {
    target: generalTarget?.sales_target ?? null,
    prevYear: generalTarget?.prev_year_sales ?? null,
    cumulative: generalReport?.cumulative_sales ?? EMPTY_ROW.cumulative,
  }
  const generalProfit: PerformanceRowInput = {
    target: generalTarget?.profit_target ?? null,
    prevYear: generalTarget?.prev_year_profit ?? null,
    cumulative: generalReport?.cumulative_profit ?? EMPTY_ROW.cumulative,
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="mb-1 text-lg font-bold">実績報告</h1>
          <p className="text-sm text-muted">本日までの累計実績を入力してください（前年実績・今月目標は本部が設定します）</p>
        </div>
        <MonthSelect value={targetMonth} options={monthOptions} basePath="/performance" />
      </div>

      <PerformanceReportForm
        targetMonth={targetMonth}
        category="general"
        title="スタッフ実績"
        sales={generalSales}
        profit={generalProfit}
      />
    </div>
  )
}
