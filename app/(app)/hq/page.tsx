import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentStaff, canManageTargets } from '@/lib/auth/currentStaff'
import { getMonthStart, getWeekStart, getWeekDates, toISODate, formatCurrency, formatJPDate } from '@/lib/date'
import { BarComparisonChart, type BarChartRow } from '../_components/BarComparisonChart'
import { CategoryDetailList, type DetailItem } from '../_components/CategoryDetailList'
import { LineTrendChart, type TrendPoint } from '../_components/LineTrendChart'
import type { ReportCategory, TopicCategory } from '@/lib/supabase/types'

const CLAIM_ALERT_THRESHOLD = 3
const LOW_PROFIT_MARGIN_THRESHOLD = 15

export default async function HqDashboardPage() {
  const staff = await getCurrentStaff()
  if (!staff) return null
  if (staff.role !== 'hq' && staff.role !== 'manager') {
    redirect('/')
  }

  const today = new Date()
  const monthStart = toISODate(getMonthStart(today))
  const weekDates = getWeekDates(getWeekStart(today))
  const weekStartISO = toISODate(weekDates[0])
  const weekEndISO = toISODate(weekDates[6])

  const supabase = await createClient()

  let staffQuery = supabase
    .from('staff')
    .select('id, staff_code, name, role, store_id, stores(name)')
    .eq('active', true)
    .order('store_id')

  if (staff.role === 'manager') {
    staffQuery = staffQuery.eq('store_id', staff.storeId)
  }

  const { data: staffRows } = await staffQuery

  const staffIds = (staffRows ?? []).map((s) => s.id)

  const [{ data: targets }, { data: generalReports }, { data: logs }, { data: reportItems }, { data: topics }, { data: todayLogs }] =
    await Promise.all([
      staffIds.length
        ? supabase
            .from('monthly_targets')
            .select('staff_id, sales_target, profit_target')
            .eq('target_month', monthStart)
            .eq('category', 'general')
            .in('staff_id', staffIds)
        : Promise.resolve({ data: [] as { staff_id: string; sales_target: number; profit_target: number }[] }),
      staffIds.length
        ? supabase
            .from('performance_reports')
            .select('staff_id, cumulative_sales, cumulative_profit')
            .eq('target_month', monthStart)
            .eq('category', 'general')
            .in('staff_id', staffIds)
        : Promise.resolve({ data: [] as { staff_id: string; cumulative_sales: number; cumulative_profit: number }[] }),
      staffIds.length
        ? supabase.from('daily_logs').select('staff_id, log_date').gte('log_date', weekStartISO).lte('log_date', weekEndISO).in('staff_id', staffIds)
        : Promise.resolve({ data: [] as { staff_id: string; log_date: string }[] }),
      staffIds.length
        ? supabase
            .from('report_items')
            .select('staff_id, category, content, created_at')
            .eq('week_start', weekStartISO)
            .in('staff_id', staffIds)
        : Promise.resolve({ data: [] as { staff_id: string; category: ReportCategory; content: string; created_at: string }[] }),
      staffIds.length
        ? supabase
            .from('topics')
            .select('staff_id, category, content, created_at')
            .eq('week_start', weekStartISO)
            .in('staff_id', staffIds)
        : Promise.resolve({ data: [] as { staff_id: string; category: TopicCategory; content: string; created_at: string }[] }),
      staffIds.length
        ? supabase
            .from('daily_logs')
            .select('staff_id, content, customer_name, proposal_content')
            .eq('log_date', toISODate(today))
            .in('staff_id', staffIds)
        : Promise.resolve({ data: [] as { staff_id: string; content: string; customer_name: string | null; proposal_content: string | null }[] }),
    ])

  const salesByStaff = new Map<string, number>()
  const profitByStaff = new Map<string, number>()
  for (const r of generalReports ?? []) {
    salesByStaff.set(r.staff_id, r.cumulative_sales)
    profitByStaff.set(r.staff_id, r.cumulative_profit)
  }

  const targetByStaff = new Map<string, { sales: number; profit: number }>()
  for (const t of targets ?? []) {
    targetByStaff.set(t.staff_id, { sales: t.sales_target, profit: t.profit_target })
  }

  const submittedDaysByStaff = new Map<string, Set<string>>()
  for (const l of logs ?? []) {
    const set = submittedDaysByStaff.get(l.staff_id) ?? new Set<string>()
    set.add(l.log_date)
    submittedDaysByStaff.set(l.staff_id, set)
  }

  const rows = (staffRows ?? []).map((s) => {
    const storeName = Array.isArray(s.stores) ? s.stores[0]?.name : (s.stores as { name: string } | null)?.name
    const salesTarget = targetByStaff.get(s.id)?.sales ?? 0
    const salesActual = salesByStaff.get(s.id) ?? 0
    const profitTarget = targetByStaff.get(s.id)?.profit ?? 0
    const profitActual = profitByStaff.get(s.id) ?? 0
    const submittedDays = submittedDaysByStaff.get(s.id)?.size ?? 0
    return {
      id: s.id,
      name: s.name,
      staffCode: s.staff_code,
      storeName: storeName ?? '',
      salesTarget,
      salesActual,
      profitTarget,
      profitActual,
      ratio: salesTarget ? salesActual / salesTarget : null,
      profitRatio: profitTarget ? profitActual / profitTarget : null,
      submittedDays,
    }
  })

  const elapsedWeekdays = weekDates.filter((d) => d <= today).length
  const totalSubmitted = rows.filter((r) => r.submittedDays >= elapsedWeekdays && elapsedWeekdays > 0).length
  const unsubmitted = rows.filter((r) => r.submittedDays < elapsedWeekdays)

  const totalSales = rows.reduce((sum, r) => sum + r.salesActual, 0)
  const totalSalesTarget = rows.reduce((sum, r) => sum + r.salesTarget, 0)
  const totalProfit = rows.reduce((sum, r) => sum + r.profitActual, 0)
  const totalProfitTarget = rows.reduce((sum, r) => sum + r.profitTarget, 0)
  const profitMargin = totalSales ? (totalProfit / totalSales) * 100 : null
  const totalActionCount = logs?.length ?? 0
  const claimCount = (reportItems ?? []).filter((r) => r.category === 'クレーム').length

  const storeGroups = new Map<string, typeof rows>()
  for (const r of rows) {
    const list = storeGroups.get(r.storeName) ?? []
    list.push(r)
    storeGroups.set(r.storeName, list)
  }

  const storeChartRows: BarChartRow[] = [...storeGroups.entries()].map(([storeName, storeRows]) => ({
    label: storeName,
    value: storeRows.reduce((sum, r) => sum + r.salesActual, 0),
    target: storeRows.reduce((sum, r) => sum + r.salesTarget, 0),
    sublabel: `${storeRows.length}名`,
  }))

  const storeProfitChartRows: BarChartRow[] = [...storeGroups.entries()].map(([storeName, storeRows]) => ({
    label: storeName,
    value: storeRows.reduce((sum, r) => sum + r.profitActual, 0),
    target: storeRows.reduce((sum, r) => sum + r.profitTarget, 0),
    sublabel: `${storeRows.length}名`,
  }))

  const storeProfitRanking: BarChartRow[] = [...storeProfitChartRows].sort((a, b) => b.value - a.value)
  const storeSalesRanking: BarChartRow[] = [...storeChartRows].sort((a, b) => b.value - a.value)

  const staffChartRowsByStore = new Map<string, BarChartRow[]>(
    [...storeGroups.entries()].map(([storeName, storeRows]) => [
      storeName,
      storeRows.map((r) => ({ label: r.name, value: r.salesActual, target: r.salesTarget || undefined })),
    ]),
  )

  const staffProfitChartRowsByStore = new Map<string, BarChartRow[]>(
    [...storeGroups.entries()].map(([storeName, storeRows]) => [
      storeName,
      storeRows.map((r) => ({ label: r.name, value: r.profitActual, target: r.profitTarget || undefined })),
    ]),
  )

  const salesRanking: BarChartRow[] = [...rows]
    .sort((a, b) => b.salesActual - a.salesActual)
    .map((r) => ({ label: r.name, value: r.salesActual, target: r.salesTarget || undefined, sublabel: r.storeName }))

  const profitRanking: BarChartRow[] = [...rows]
    .sort((a, b) => b.profitActual - a.profitActual)
    .map((r) => ({ label: r.name, value: r.profitActual, target: r.profitTarget || undefined, sublabel: r.storeName }))

  const staffNameById = new Map((staffRows ?? []).map((s) => [s.id, s.name]))

  const reportDetailItems: DetailItem[] = (reportItems ?? []).map((r) => ({
    category: r.category,
    content: r.content,
    staffName: staffNameById.get(r.staff_id) ?? '',
    date: formatJPDate(new Date(r.created_at)),
  }))
  const topicDetailItems: DetailItem[] = (topics ?? []).map((t) => ({
    category: t.category,
    content: t.content,
    staffName: staffNameById.get(t.staff_id) ?? '',
    date: formatJPDate(new Date(t.created_at)),
  }))

  const todayActivity = (staffRows ?? [])
    .map((s) => {
      const log = (todayLogs ?? []).find((l) => l.staff_id === s.id)
      return { id: s.id, name: s.name, content: log ? log.content || log.proposal_content || log.customer_name || '（詳細未記入）' : null }
    })
    .filter((a) => a.content !== null) as { id: string; name: string; content: string }[]

  const storeList = [...storeGroups.keys()].map((storeName) => ({
    storeName,
    storeId: (staffRows ?? []).find((s) => (Array.isArray(s.stores) ? s.stores[0]?.name : (s.stores as { name: string } | null)?.name) === storeName)
      ?.store_id,
  }))
  const monthlyTrendByStore = await Promise.all(
    storeList.map(async ({ storeId, storeName }) => {
      if (!storeId) return { storeName, points: [] as TrendPoint[] }
      const { data } = await supabase.rpc('get_store_monthly_trend', { p_store_id: storeId, p_months: 6 })
      const points: TrendPoint[] = (data ?? []).map((d) => {
        const [, m] = d.target_month.split('-')
        return { label: `${Number(m)}月`, actual: d.sales_actual, target: d.sales_target || undefined, prevYear: d.prev_year_sales || undefined }
      })
      return { storeName, points }
    }),
  )

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="mb-1 text-lg font-bold">本部ダッシュボード</h1>
          <p className="text-sm text-muted">
            {today.getFullYear()}年{today.getMonth() + 1}月・今週（{weekStartISO} 〜 {weekEndISO}）
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/hq/daily"
            className="rounded-full border border-line px-3 py-1.5 text-xs font-bold text-accent hover:bg-surface-2"
          >
            スタッフ一覧・日報を見る →
          </Link>
          <Link
            href="/hq/performance"
            className="rounded-full border border-line px-3 py-1.5 text-xs font-bold text-accent hover:bg-surface-2"
          >
            実績報告一覧を見る →
          </Link>
          {canManageTargets(staff) && (
            <Link
              href="/hq/targets"
              className="rounded-full border border-line px-3 py-1.5 text-xs font-bold text-accent hover:bg-surface-2"
            >
              目標設定 →
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-line bg-surface p-4">
          <p className="mb-1 text-[11px] text-muted">今週の提出済み</p>
          <p className="text-lg font-bold tabular-nums">{totalSubmitted}/{rows.length}名</p>
        </div>
        <div className="rounded-lg border border-line bg-surface p-4">
          <p className="mb-1 text-[11px] text-muted">未提出</p>
          <p className={`text-lg font-bold tabular-nums ${unsubmitted.length > 0 ? 'text-warn' : ''}`}>{unsubmitted.length}名</p>
        </div>
        <div className="rounded-lg border border-line bg-surface p-4">
          <p className="mb-1 text-[11px] text-muted">月間売上目標比</p>
          <p className="text-lg font-bold tabular-nums">
            {totalSalesTarget ? `${Math.round((totalSales / totalSalesTarget) * 100)}%` : '—'}
          </p>
        </div>
        <div className="rounded-lg border border-line bg-surface p-4">
          <p className="mb-1 text-[11px] text-muted">月間利益目標比</p>
          <p className="text-lg font-bold tabular-nums">
            {totalProfitTarget ? `${Math.round((totalProfit / totalProfitTarget) * 100)}%` : '—'}
          </p>
        </div>
        <div className="rounded-lg border border-line bg-surface p-4">
          <p className="mb-1 text-[11px] text-muted">全社粗利率</p>
          <p className={`text-lg font-bold tabular-nums ${profitMargin !== null && profitMargin < LOW_PROFIT_MARGIN_THRESHOLD ? 'text-crit' : ''}`}>
            {profitMargin === null ? '—' : `${profitMargin.toFixed(1)}%`}
          </p>
          {profitMargin !== null && profitMargin < LOW_PROFIT_MARGIN_THRESHOLD && (
            <p className="mt-0.5 text-[10px] font-bold text-crit">{LOW_PROFIT_MARGIN_THRESHOLD}%未満</p>
          )}
        </div>
        <div className="rounded-lg border border-line bg-surface p-4">
          <p className="mb-1 text-[11px] text-muted">今週の行動件数</p>
          <p className="text-lg font-bold tabular-nums">{totalActionCount}件</p>
        </div>
        <div className="rounded-lg border border-line bg-surface p-4">
          <p className="mb-1 text-[11px] text-muted">要注意報告（クレーム）</p>
          <p className={`text-lg font-bold tabular-nums ${claimCount >= CLAIM_ALERT_THRESHOLD ? 'text-crit' : ''}`}>{claimCount}件</p>
        </div>
      </div>

      {unsubmitted.length > 0 && (
        <div className="rounded-lg border border-warn/30 bg-warn/10 p-4">
          <p className="mb-1.5 text-xs font-bold text-warn">未提出者</p>
          <p className="text-sm">{unsubmitted.map((r) => r.name).join('、')}</p>
        </div>
      )}

      {claimCount >= CLAIM_ALERT_THRESHOLD && (
        <div className="rounded-lg border border-crit/30 bg-crit/10 p-4">
          <p className="text-xs font-bold text-crit">クレーム報告が今週 {claimCount} 件と増加しています。内容の確認をおすすめします。</p>
        </div>
      )}

      <div className="rounded-lg border border-line bg-surface p-5">
        <h2 className="mb-4 text-sm font-bold text-muted">本日の営業活動</h2>
        {todayActivity.length === 0 ? (
          <p className="text-sm text-muted">本日の活動報告はまだありません。</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {todayActivity.map((a) => (
              <li key={a.id} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm">
                <span className="shrink-0 font-bold">{a.name}</span>
                <span className="text-muted">{a.content}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="rounded-lg border border-line bg-surface p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-muted">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-accent" />
            営業所別 利益実績比較（縦線＝目標）
          </h2>
          <BarComparisonChart rows={storeProfitChartRows} formatValue={formatCurrency} metric="profit" />
        </div>
        <div className="rounded-lg border border-line bg-surface p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-muted">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-accent-2" />
            営業所別 売上実績比較（縦線＝目標）
          </h2>
          <BarComparisonChart rows={storeChartRows} formatValue={formatCurrency} metric="sales" />
        </div>
      </div>

      <div className="rounded-lg border border-line bg-surface p-5">
        <h2 className="mb-4 text-sm font-bold text-muted">営業所別 売上推移（直近6ヶ月・実績／目標／前年）</h2>
        <div className="flex flex-col gap-6">
          {monthlyTrendByStore.map(({ storeName, points }) => (
            <div key={storeName}>
              <p className="mb-2 text-xs font-bold">{storeName}</p>
              <LineTrendChart points={points} formatValue={formatCurrency} />
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="rounded-lg border border-line bg-surface p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-muted">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-accent" />
            営業所別ランキング（利益順）
          </h2>
          <BarComparisonChart rows={storeProfitRanking} formatValue={formatCurrency} metric="profit" />
        </div>
        <div className="rounded-lg border border-line bg-surface p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-muted">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-accent-2" />
            営業所別ランキング（売上順）
          </h2>
          <BarComparisonChart rows={storeSalesRanking} formatValue={formatCurrency} metric="sales" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="rounded-lg border border-line bg-surface p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-muted">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-accent" />
            スタッフ別ランキング（利益順・全員）
          </h2>
          <BarComparisonChart rows={profitRanking} formatValue={formatCurrency} metric="profit" />
        </div>
        <div className="rounded-lg border border-line bg-surface p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-muted">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-accent-2" />
            スタッフ別ランキング（売上順・全員）
          </h2>
          <BarComparisonChart rows={salesRanking} formatValue={formatCurrency} metric="sales" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="rounded-lg border border-line bg-surface p-5">
          <h2 className="mb-4 text-sm font-bold text-muted">報告事項（今週・クリックで詳細表示）</h2>
          <CategoryDetailList items={reportDetailItems} />
        </div>
        <div className="rounded-lg border border-line bg-surface p-5">
          <h2 className="mb-4 text-sm font-bold text-muted">その他報告事項（今週・クリックで詳細表示）</h2>
          <CategoryDetailList items={topicDetailItems} />
        </div>
      </div>

      {[...storeGroups.entries()].map(([storeName, storeRows]) => (
        <div key={storeName} className="overflow-hidden rounded-lg border border-line bg-surface">
          <div className="border-b border-line bg-surface-2 px-4 py-2 text-sm font-bold">{storeName}</div>
          <div className="grid grid-cols-1 gap-4 border-b border-line p-4 lg:grid-cols-2">
            <div>
              <p className="mb-2 inline-flex items-center gap-1 text-[11px] font-bold text-muted">
                <span className="inline-block h-2 w-2 rounded-full bg-accent" />
                利益
              </p>
              <BarComparisonChart rows={staffProfitChartRowsByStore.get(storeName) ?? []} formatValue={formatCurrency} metric="profit" />
            </div>
            <div>
              <p className="mb-2 inline-flex items-center gap-1 text-[11px] font-bold text-muted">
                <span className="inline-block h-2 w-2 rounded-full bg-accent-2" />
                売上
              </p>
              <BarComparisonChart rows={staffChartRowsByStore.get(storeName) ?? []} formatValue={formatCurrency} metric="sales" />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs text-muted">
                  <th className="px-3 py-2 font-semibold" rowSpan={2}>スタッフ</th>
                  <th className="px-3 py-2 font-semibold" rowSpan={2}>&nbsp;</th>
                  <th className="px-3 py-2 font-semibold">進捗</th>
                  <th className="px-3 py-2 text-right font-semibold">％</th>
                  <th className="px-3 py-2 text-right font-semibold" rowSpan={2}>日報日数</th>
                  <th className="px-3 py-2 text-right font-semibold" rowSpan={2}>提出</th>
                </tr>
              </thead>
              <tbody>
                {storeRows.map((r) => {
                  const pct = r.ratio === null ? null : Math.round(r.ratio * 100)
                  const profitPct = r.profitRatio === null ? null : Math.round(r.profitRatio * 100)
                  const ok = elapsedWeekdays === 0 || r.submittedDays >= elapsedWeekdays
                  return (
                    <>
                      <tr key={`${r.id}-profit`} className="border-b border-line/60">
                        <td className="px-3 py-2 align-top whitespace-nowrap" rowSpan={2}>{r.name}</td>
                        <td className="px-3 py-2 font-bold text-foreground">利益</td>
                        <td className="px-3 py-2">
                          {profitPct === null ? (
                            <span className="text-xs text-muted">目標未設定</span>
                          ) : (
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 w-24 overflow-hidden rounded-full bg-surface-2">
                                <div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(100, profitPct)}%` }} />
                              </div>
                              <span className="text-xs text-muted tabular-nums">{formatCurrency(r.profitActual)}</span>
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">{profitPct === null ? '—' : `${profitPct}%`}</td>
                        <td className="px-3 py-2 text-right align-top tabular-nums" rowSpan={2}>{r.submittedDays}日</td>
                        <td className="px-3 py-2 text-right align-top" rowSpan={2}>
                          <span
                            className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${
                              ok ? 'bg-good/15 text-good' : 'bg-crit/15 text-crit'
                            }`}
                          >
                            {ok ? '✓' : '!'}
                          </span>
                        </td>
                      </tr>
                      <tr key={`${r.id}-sales`} className="border-b border-line last:border-none">
                        <td className="px-3 py-2 text-muted">売上</td>
                        <td className="px-3 py-2">
                          {pct === null ? (
                            <span className="text-xs text-muted">目標未設定</span>
                          ) : (
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 w-24 overflow-hidden rounded-full bg-surface-2">
                                <div className="h-full rounded-full bg-accent-2" style={{ width: `${Math.min(100, pct)}%` }} />
                              </div>
                              <span className="text-xs text-muted tabular-nums">
                                {formatCurrency(r.salesActual)}
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">{pct === null ? '—' : `${pct}%`}</td>
                      </tr>
                    </>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {rows.length === 0 && (
        <p className="text-sm text-muted">表示できるスタッフがいません。</p>
      )}
    </div>
  )
}
