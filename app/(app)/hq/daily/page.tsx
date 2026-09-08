import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentStaff } from '@/lib/auth/currentStaff'
import { getMonthStart, getWeekStart, getWeekDates, toISODate, formatCurrency } from '@/lib/date'

export default async function HqDailyListPage() {
  const staff = await getCurrentStaff()
  if (!staff) return null
  if (staff.role !== 'hq' && staff.role !== 'manager') {
    redirect('/')
  }

  const today = new Date()
  const todayISO = toISODate(today)
  const monthStart = toISODate(getMonthStart(today))
  const weekDates = getWeekDates(getWeekStart(today))
  const weekStartISO = toISODate(weekDates[0])
  const weekEndISO = toISODate(weekDates[6])

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

  const [{ data: targets }, { data: reports }, { data: weekLogs }] = await Promise.all([
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
      ? supabase
          .from('daily_logs')
          .select('staff_id, log_date')
          .gte('log_date', weekStartISO)
          .lte('log_date', weekEndISO)
          .in('staff_id', staffIds)
      : Promise.resolve({ data: [] as { staff_id: string; log_date: string }[] }),
  ])

  const targetByStaff = new Map((targets ?? []).map((t) => [t.staff_id, t]))
  const reportByStaff = new Map((reports ?? []).map((r) => [r.staff_id, r]))
  const weekLogCountByStaff = new Map<string, number>()
  const reportedTodayByStaff = new Set<string>()
  for (const l of weekLogs ?? []) {
    weekLogCountByStaff.set(l.staff_id, (weekLogCountByStaff.get(l.staff_id) ?? 0) + 1)
    if (l.log_date === todayISO) reportedTodayByStaff.add(l.staff_id)
  }

  const rows = (staffRows ?? []).map((s) => {
    const storeName = Array.isArray(s.stores) ? s.stores[0]?.name : (s.stores as { name: string } | null)?.name
    const salesTarget = targetByStaff.get(s.id)?.sales_target ?? 0
    const salesActual = reportByStaff.get(s.id)?.cumulative_sales ?? 0
    const profitTarget = targetByStaff.get(s.id)?.profit_target ?? 0
    const profitActual = reportByStaff.get(s.id)?.cumulative_profit ?? 0
    return {
      id: s.id,
      name: s.name,
      storeName: storeName ?? '',
      salesTarget,
      salesActual,
      achievementPct: salesTarget ? Math.round((salesActual / salesTarget) * 100) : null,
      profitTarget,
      profitActual,
      profitAchievementPct: profitTarget ? Math.round((profitActual / profitTarget) * 100) : null,
      reportedToday: reportedTodayByStaff.has(s.id),
      weekLogCount: weekLogCountByStaff.get(s.id) ?? 0,
    }
  })

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/hq" className="text-xs font-semibold text-accent underline underline-offset-2">
          ← 本部ダッシュボードに戻る
        </Link>
        <h1 className="mt-1 mb-1 text-lg font-bold">スタッフ一覧</h1>
        <p className="text-sm text-muted">氏名をクリックすると、詳しい行動内容（過去の日報）を確認できます。</p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-line bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line bg-surface-2 text-left text-xs text-muted">
              <th className="px-3 py-2 font-semibold" rowSpan={2}>氏名</th>
              <th className="px-3 py-2 font-semibold" rowSpan={2}>所属</th>
              <th className="px-3 py-2 font-semibold" rowSpan={2}>&nbsp;</th>
              <th className="px-3 py-2 text-right font-semibold">当月累計実績</th>
              <th className="px-3 py-2 text-right font-semibold">目標達成率</th>
              <th className="px-3 py-2 text-center font-semibold" rowSpan={2}>本日の報告</th>
              <th className="px-3 py-2 text-right font-semibold" rowSpan={2}>今週の行動件数</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <>
                <tr key={`${r.id}-profit`} className="border-b border-line/60">
                  <td className="px-3 py-2 align-top whitespace-nowrap" rowSpan={2}>
                    <Link href={`/history?staff=${r.id}`} className="font-bold text-accent underline underline-offset-2">
                      {r.name}
                    </Link>
                  </td>
                  <td className="px-3 py-2 align-top whitespace-nowrap text-muted" rowSpan={2}>{r.storeName}</td>
                  <td className="px-3 py-2 font-bold text-foreground">利益</td>
                  <td className="px-3 py-2 text-right font-bold tabular-nums">{formatCurrency(r.profitActual)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {r.profitAchievementPct === null ? '—' : `${r.profitAchievementPct}%`}
                  </td>
                  <td className="px-3 py-2 text-center align-top" rowSpan={2}>
                    <span
                      className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${
                        r.reportedToday ? 'bg-good/15 text-good' : 'bg-crit/15 text-crit'
                      }`}
                    >
                      {r.reportedToday ? '✓' : '!'}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right align-top tabular-nums" rowSpan={2}>{r.weekLogCount}件</td>
                </tr>
                <tr key={`${r.id}-sales`} className="border-b border-line last:border-none">
                  <td className="px-3 py-2 text-muted">売上</td>
                  <td className="px-3 py-2 text-right tabular-nums text-muted">{formatCurrency(r.salesActual)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-muted">
                    {r.achievementPct === null ? '—' : `${r.achievementPct}%`}
                  </td>
                </tr>
              </>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-sm text-muted">
                  表示できるスタッフがいません。
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
