import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentStaff, canManageTargets } from '@/lib/auth/currentStaff'
import { YearSelect } from './YearSelect'
import { AnnualPlanForm, type AnnualMonthRow } from './AnnualPlanForm'

const YEAR_PATTERN = /^\d{4}$/
const MONTH_LABELS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']

export default async function AnnualPlanPage({
  params,
  searchParams,
}: {
  params: Promise<{ staffId: string }>
  searchParams: Promise<{ year?: string }>
}) {
  const staff = await getCurrentStaff()
  if (!staff) return null
  if (!canManageTargets(staff)) {
    redirect('/')
  }

  const { staffId } = await params
  const requestedYear = (await searchParams).year
  const currentYear = new Date().getFullYear()
  const year = requestedYear && YEAR_PATTERN.test(requestedYear) ? requestedYear : String(currentYear)
  const yearOptions = [currentYear - 1, currentYear, currentYear + 1, currentYear + 2].map(String)

  const supabase = await createClient()

  const { data: targetStaff } = await supabase
    .from('staff')
    .select('id, name, store_id, stores(name)')
    .eq('id', staffId)
    .maybeSingle()
  if (!targetStaff) notFound()

  const storeName = Array.isArray(targetStaff.stores)
    ? targetStaff.stores[0]?.name
    : (targetStaff.stores as { name: string } | null)?.name

  const { data: targets } = await supabase
    .from('monthly_targets')
    .select('target_month, sales_target, profit_target, prev_year_sales, prev_year_profit')
    .eq('staff_id', staffId)
    .eq('category', 'general')
    .gte('target_month', `${year}-01-01`)
    .lte('target_month', `${year}-12-01`)

  const byMonth = new Map((targets ?? []).map((t) => [t.target_month.slice(5, 7), t]))

  const rows: AnnualMonthRow[] = MONTH_LABELS.map((label, i) => {
    const month = i + 1
    const t = byMonth.get(String(month).padStart(2, '0'))
    return {
      month,
      label,
      salesTarget: t?.sales_target ?? null,
      profitTarget: t?.profit_target ?? null,
      prevYearSales: t?.prev_year_sales ?? null,
      prevYearProfit: t?.prev_year_profit ?? null,
    }
  })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/hq/targets" className="text-xs font-semibold text-accent underline underline-offset-2">
            ← 目標設定に戻る
          </Link>
          <h1 className="mt-1 mb-1 text-lg font-bold">
            年間計画：{targetStaff.name}
            <span className="ml-2 text-xs font-normal text-muted">（{storeName}）</span>
          </h1>
          <p className="text-sm text-muted">1月〜12月分の前年実績・今月目標をまとめて入力できます。</p>
        </div>
        <YearSelect value={year} options={yearOptions} basePath={`/hq/targets/${staffId}`} />
      </div>

      <AnnualPlanForm staffId={staffId} year={year} rows={rows} />
    </div>
  )
}
