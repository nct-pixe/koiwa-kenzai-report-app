import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getCurrentStaff } from '@/lib/auth/currentStaff'
import { getMonthStart, getWeekStart, getWeekDates, getBusinessWeekDates, toISODate, formatJPDate, formatCurrency } from '@/lib/date'
import { ProgressBar } from './_components/ProgressBar'

const REPORT_ITEM_WEEKLY_LIMIT = 5

export default async function MyPage() {
  const staff = await getCurrentStaff()
  if (!staff) return null

  const today = new Date()
  const monthStart = toISODate(getMonthStart(today))
  const weekStart = getWeekStart(today)
  const weekDates = getWeekDates(weekStart)
  const weekStartISO = toISODate(weekDates[0])
  const weekEndISO = toISODate(weekDates[6])

  const nextWeekStart = new Date(weekStart)
  nextWeekStart.setDate(nextWeekStart.getDate() + 7)
  const nextWeekBusinessDates = getBusinessWeekDates(nextWeekStart)

  const supabase = await createClient()

  const [{ data: target }, { data: report }, { data: logs }, { data: reportItems }, { data: planItems }, { data: topics }] =
    await Promise.all([
      supabase
        .from('monthly_targets')
        .select('sales_target, profit_target')
        .eq('staff_id', staff.id)
        .eq('target_month', monthStart)
        .eq('category', 'general')
        .maybeSingle(),
      supabase
        .from('performance_reports')
        .select('cumulative_sales, cumulative_profit')
        .eq('staff_id', staff.id)
        .eq('target_month', monthStart)
        .eq('category', 'general')
        .maybeSingle(),
      supabase
        .from('daily_logs')
        .select('log_date, content')
        .eq('staff_id', staff.id)
        .gte('log_date', weekStartISO)
        .lte('log_date', weekEndISO)
        .order('log_date', { ascending: false }),
      supabase
        .from('report_items')
        .select('id, category, content, created_at')
        .eq('staff_id', staff.id)
        .eq('week_start', weekStartISO)
        .order('created_at', { ascending: false }),
      supabase
        .from('plan_items')
        .select('plan_date, content')
        .eq('staff_id', staff.id)
        .gte('plan_date', toISODate(nextWeekBusinessDates[0]))
        .lte('plan_date', toISODate(nextWeekBusinessDates[nextWeekBusinessDates.length - 1])),
      supabase
        .from('topics')
        .select('id, category, content, created_at')
        .eq('staff_id', staff.id)
        .eq('week_start', weekStartISO)
        .order('created_at', { ascending: false }),
    ])

  const salesActual = report?.cumulative_sales ?? 0
  const profitActual = report?.cumulative_profit ?? 0
  const salesTarget = target?.sales_target ?? 0
  const profitTarget = target?.profit_target ?? 0

  const submittedCount = logs?.length ?? 0
  const planFilledCount = (planItems ?? []).filter((p) => p.content.trim() !== '').length

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="mb-1 text-lg font-bold">マイページ</h1>
        <p className="text-sm text-muted">{today.getMonth() + 1}月の実績</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-line bg-surface p-4">
          <p className="mb-1 text-[11px] text-muted">売上実績</p>
          <p className="text-lg font-bold tabular-nums">{formatCurrency(salesActual)}</p>
        </div>
        <div className="rounded-lg border border-line bg-surface p-4">
          <p className="mb-1 text-[11px] text-muted">利益実績</p>
          <p className="text-lg font-bold tabular-nums">{formatCurrency(profitActual)}</p>
        </div>
        <div className="rounded-lg border border-line bg-surface p-4">
          <p className="mb-1 text-[11px] text-muted">今週の日報提出</p>
          <p className="text-lg font-bold tabular-nums">{submittedCount}/7</p>
        </div>
        <div className="rounded-lg border border-line bg-surface p-4">
          <p className="mb-1 text-[11px] text-muted">所属</p>
          <p className="text-lg font-bold">{staff.storeName}</p>
        </div>
      </div>

      <div className="rounded-lg border border-line bg-surface p-5">
        <h2 className="mb-4 text-sm font-bold text-muted">目標に対する進捗</h2>
        {salesTarget === 0 && profitTarget === 0 ? (
          <p className="text-sm text-muted">今月の目標がまだ設定されていません。店長にご確認ください。</p>
        ) : (
          <div className="flex flex-col gap-4">
            <div>
              <div className="mb-1.5 flex justify-between text-xs">
                <span className="text-muted">売上</span>
                <span className="tabular-nums">{formatCurrency(salesActual)} / {formatCurrency(salesTarget)}</span>
              </div>
              <ProgressBar ratio={salesTarget ? salesActual / salesTarget : 0} />
            </div>
            <div>
              <div className="mb-1.5 flex justify-between text-xs">
                <span className="text-muted">利益</span>
                <span className="tabular-nums">{formatCurrency(profitActual)} / {formatCurrency(profitTarget)}</span>
              </div>
              <ProgressBar ratio={profitTarget ? profitActual / profitTarget : 0} />
            </div>
          </div>
        )}
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold">今週の日報サマリー</h2>
          <Link href="/daily" className="text-xs font-semibold text-accent underline underline-offset-2">
            日報を編集する
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-line bg-surface p-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs font-bold text-muted">今週の行動結果（Do）</h3>
              <span className="text-xs tabular-nums text-muted">{submittedCount}/7日</span>
            </div>
            {!logs || logs.length === 0 ? (
              <p className="text-sm text-muted">今週はまだ入力がありません。</p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {logs.slice(0, 3).map((l) => (
                  <li key={l.log_date} className="flex gap-2 text-sm">
                    <span className="w-14 shrink-0 text-muted">{formatJPDate(new Date(l.log_date))}</span>
                    <span className="flex-1 truncate">{l.content}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-lg border border-line bg-surface p-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs font-bold text-muted">報告事項（Check⇒Action）</h3>
              <span className="text-xs tabular-nums text-muted">{reportItems?.length ?? 0}/{REPORT_ITEM_WEEKLY_LIMIT}件</span>
            </div>
            {!reportItems || reportItems.length === 0 ? (
              <p className="text-sm text-muted">今週の報告事項はまだありません。</p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {reportItems.slice(0, 3).map((item) => (
                  <li key={item.id} className="flex gap-2 text-sm">
                    <span className="shrink-0 rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-bold text-muted">
                      {item.category}
                    </span>
                    <span className="flex-1 truncate">{item.content}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-lg border border-line bg-surface p-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs font-bold text-muted">来週の行動予定（Plan）</h3>
              <span className="text-xs tabular-nums text-muted">{planFilledCount}/{nextWeekBusinessDates.length}日</span>
            </div>
            {planFilledCount === 0 ? (
              <p className="text-sm text-muted">来週の行動予定はまだありません。</p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {(planItems ?? [])
                  .filter((p) => p.content.trim() !== '')
                  .slice(0, 3)
                  .map((p) => (
                    <li key={p.plan_date} className="flex gap-2 text-sm">
                      <span className="w-14 shrink-0 text-muted">{formatJPDate(new Date(p.plan_date))}</span>
                      <span className="flex-1 truncate">{p.content}</span>
                    </li>
                  ))}
              </ul>
            )}
          </div>

          <div className="rounded-lg border border-line bg-surface p-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs font-bold text-muted">その他報告事項</h3>
              <span className="text-xs tabular-nums text-muted">{topics?.length ?? 0}件</span>
            </div>
            {!topics || topics.length === 0 ? (
              <p className="text-sm text-muted">今週の報告はまだありません。</p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {topics.slice(0, 3).map((t) => (
                  <li key={t.id} className="flex gap-2 text-sm">
                    <span className="shrink-0 rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-bold text-muted">
                      {t.category}
                    </span>
                    <span className="flex-1 truncate">{t.content}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
