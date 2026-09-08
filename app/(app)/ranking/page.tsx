import { createClient } from '@/lib/supabase/server'
import { getCurrentStaff } from '@/lib/auth/currentStaff'
import { getMonthStart, getMonthOptions, toISODate, formatCurrency } from '@/lib/date'
import { MonthSelect } from '../_components/MonthSelect'
import { BarComparisonChart, type BarChartRow } from '../_components/BarComparisonChart'

const MONTH_PATTERN = /^\d{4}-\d{2}-01$/

function prevYearPct(cumulative: number, prevYear: number | null): number | null {
  if (!prevYear) return null
  return Math.round((cumulative / prevYear) * 100)
}

export default async function RankingPage({
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
  const [{ data: ranking }, { data: storeRanking }] = await Promise.all([
    supabase.rpc('get_profit_ranking', { p_target_month: targetMonth }),
    supabase.rpc('get_store_profit_ranking', { p_target_month: targetMonth }),
  ])

  const storeProfitChart: BarChartRow[] = (storeRanking ?? []).map((r) => ({
    label: r.store_name,
    value: r.cumulative_profit,
    target: r.profit_target || undefined,
  }))
  const storeSalesChart: BarChartRow[] = (storeRanking ?? []).map((r) => ({
    label: r.store_name,
    value: r.cumulative_sales,
    target: r.sales_target || undefined,
  }))

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="mb-1 text-lg font-bold">営業成績ランキング</h1>
          <p className="text-sm text-muted">利益実績（累計）順。売上は利益に紐づけて表示します。</p>
        </div>
        <MonthSelect value={targetMonth} options={monthOptions} basePath="/ranking" />
      </div>

      <div>
        <h2 className="mb-3 text-sm font-bold">店舗ランキング</h2>
        <div className="overflow-x-auto rounded-lg border border-line bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line bg-surface-2 text-left text-xs text-muted">
                <th className="px-3 py-2 font-semibold" rowSpan={2}>順位</th>
                <th className="px-3 py-2 font-semibold" rowSpan={2}>店舗</th>
                <th className="px-3 py-2 font-semibold" rowSpan={2}>&nbsp;</th>
                <th className="px-3 py-2 text-right font-semibold">今月目標</th>
                <th className="px-3 py-2 text-right font-semibold">累計実績</th>
                <th className="px-3 py-2 text-right font-semibold">達成率</th>
                <th className="px-3 py-2 text-right font-semibold">前年実績</th>
                <th className="px-3 py-2 text-right font-semibold">前年比</th>
              </tr>
            </thead>
            <tbody>
              {(storeRanking ?? []).map((r) => (
                <>
                  <tr key={`${r.store_id}-profit`} className={`border-b border-line/60 ${r.store_id === staff.storeId ? 'bg-accent/5' : ''}`}>
                    <td className="px-3 py-2 align-top font-bold tabular-nums" rowSpan={2}>{r.rank}</td>
                    <td className="px-3 py-2 align-top whitespace-nowrap" rowSpan={2}>
                      {r.store_name}
                      {r.store_id === staff.storeId && <span className="ml-1.5 text-[10px] font-bold text-accent">あなたの店舗</span>}
                    </td>
                    <td className="px-3 py-2 font-bold text-foreground">利益</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(r.profit_target)}</td>
                    <td className="px-3 py-2 text-right font-bold tabular-nums">{formatCurrency(r.cumulative_profit)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{r.profit_achievement_pct === null ? '—' : `${r.profit_achievement_pct}%`}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-muted">{formatCurrency(r.prev_year_profit)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {(() => {
                        const pct = prevYearPct(r.cumulative_profit, r.prev_year_profit)
                        return pct === null ? '—' : `${pct}%`
                      })()}
                    </td>
                  </tr>
                  <tr key={`${r.store_id}-sales`} className={`border-b border-line last:border-none ${r.store_id === staff.storeId ? 'bg-accent/5' : ''}`}>
                    <td className="px-3 py-2 text-muted">売上</td>
                    <td className="px-3 py-2 text-right tabular-nums text-muted">{formatCurrency(r.sales_target)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-muted">{formatCurrency(r.cumulative_sales)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-muted">{r.achievement_pct === null ? '—' : `${r.achievement_pct}%`}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-muted">{formatCurrency(r.prev_year_sales)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-muted">
                      {(() => {
                        const pct = prevYearPct(r.cumulative_sales, r.prev_year_sales)
                        return pct === null ? '—' : `${pct}%`
                      })()}
                    </td>
                  </tr>
                </>
              ))}
              {(!storeRanking || storeRanking.length === 0) && (
                <tr>
                  <td colSpan={8} className="px-3 py-6 text-center text-sm text-muted">
                    表示できるデータがありません。
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="rounded-lg border border-line bg-surface p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-muted">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-accent" />
            店舗別 利益比較
          </h2>
          <BarComparisonChart rows={storeProfitChart} formatValue={formatCurrency} metric="profit" />
        </div>
        <div className="rounded-lg border border-line bg-surface p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-muted">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-accent-2" />
            店舗別 売上比較
          </h2>
          <BarComparisonChart rows={storeSalesChart} formatValue={formatCurrency} metric="sales" />
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-bold">全営業スタッフランキング</h2>
        <div className="overflow-x-auto rounded-lg border border-line bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line bg-surface-2 text-left text-xs text-muted">
                <th className="px-3 py-2 font-semibold" rowSpan={2}>順位</th>
                <th className="px-3 py-2 font-semibold" rowSpan={2}>氏名</th>
                <th className="px-3 py-2 font-semibold" rowSpan={2}>所属</th>
                <th className="px-3 py-2 font-semibold" rowSpan={2}>&nbsp;</th>
                <th className="px-3 py-2 text-right font-semibold">今月目標</th>
                <th className="px-3 py-2 text-right font-semibold">累計実績</th>
                <th className="px-3 py-2 text-right font-semibold">達成率</th>
                <th className="px-3 py-2 text-right font-semibold">前年実績</th>
                <th className="px-3 py-2 text-right font-semibold">前年比</th>
              </tr>
            </thead>
            <tbody>
              {(ranking ?? []).map((r) => (
                <>
                  <tr
                    key={`${r.staff_id}-profit`}
                    className={`border-b border-line/60 ${r.staff_id === staff.id ? 'bg-accent/5' : ''}`}
                  >
                    <td className="px-3 py-2 align-top font-bold tabular-nums" rowSpan={2}>{r.rank}</td>
                    <td className="px-3 py-2 align-top whitespace-nowrap" rowSpan={2}>
                      {r.name}
                      {r.staff_id === staff.id && <span className="ml-1.5 text-[10px] font-bold text-accent">あなた</span>}
                    </td>
                    <td className="px-3 py-2 align-top whitespace-nowrap text-muted" rowSpan={2}>{r.store_name}</td>
                    <td className="px-3 py-2 font-bold text-foreground">利益</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(r.profit_target ?? 0)}</td>
                    <td className="px-3 py-2 text-right font-bold tabular-nums">{formatCurrency(r.cumulative_profit)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {r.profit_achievement_pct === null ? '—' : `${r.profit_achievement_pct}%`}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-muted">{formatCurrency(r.prev_year_profit ?? 0)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {(() => {
                        const pct = prevYearPct(r.cumulative_profit, r.prev_year_profit)
                        return pct === null ? '—' : `${pct}%`
                      })()}
                    </td>
                  </tr>
                  <tr key={`${r.staff_id}-sales`} className={`border-b border-line last:border-none ${r.staff_id === staff.id ? 'bg-accent/5' : ''}`}>
                    <td className="px-3 py-2 text-muted">売上</td>
                    <td className="px-3 py-2 text-right tabular-nums text-muted">{formatCurrency(r.sales_target ?? 0)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-muted">{formatCurrency(r.cumulative_sales)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-muted">
                      {r.achievement_pct === null ? '—' : `${r.achievement_pct}%`}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-muted">{formatCurrency(r.prev_year_sales ?? 0)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-muted">
                      {(() => {
                        const pct = prevYearPct(r.cumulative_sales, r.prev_year_sales)
                        return pct === null ? '—' : `${pct}%`
                      })()}
                    </td>
                  </tr>
                </>
              ))}
              {(!ranking || ranking.length === 0) && (
                <tr>
                  <td colSpan={9} className="px-3 py-6 text-center text-sm text-muted">
                    表示できるデータがありません。
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
