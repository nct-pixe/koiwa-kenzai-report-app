import { createClient } from '@/lib/supabase/server'
import { getCurrentStaff } from '@/lib/auth/currentStaff'
import { getWeekStart, getWeekDates, getBusinessWeekDates, formatJPDate, toISODate } from '@/lib/date'
import { DayCard, type DayCardDetail } from './DayCard'
import { DailyTabs } from './DailyTabs'
import { ReportItemForm, DeleteReportItemButton } from './ReportItemForm'
import { PlanDayCard } from './PlanDayCard'
import { TopicForm, DeleteTopicButton } from './TopicForm'

const REPORT_ITEM_WEEKLY_LIMIT = 5

export default async function DailyPage() {
  const staff = await getCurrentStaff()
  if (!staff) return null

  const today = new Date()
  const thisWeekStart = getWeekStart(today)
  const thisWeekDates = getWeekDates(thisWeekStart)
  const thisWeekStartISO = toISODate(thisWeekStart)
  const todayISO = toISODate(today)

  const nextWeekStart = new Date(thisWeekStart)
  nextWeekStart.setDate(nextWeekStart.getDate() + 7)
  const nextWeekBusinessDates = getBusinessWeekDates(nextWeekStart)
  const thisWeekBusinessDates = getBusinessWeekDates(thisWeekStart)

  const supabase = await createClient()

  const [{ data: logs }, { data: reportItems }, { data: planItems }, { data: lastWeekPlanItems }, { data: topics }] =
    await Promise.all([
      supabase
        .from('daily_logs')
        .select(
          'log_date, content, customer_name, purpose, contact_person, customer_reaction, proposal_content, progress_status, issues, next_action, next_action_assignee, next_visit_date',
        )
        .eq('staff_id', staff.id)
        .gte('log_date', toISODate(thisWeekDates[0]))
        .lte('log_date', toISODate(thisWeekDates[6])),
      supabase
        .from('report_items')
        .select('id, category, content, created_at')
        .eq('staff_id', staff.id)
        .eq('week_start', thisWeekStartISO)
        .order('created_at', { ascending: false }),
      supabase
        .from('plan_items')
        .select('plan_date, content')
        .eq('staff_id', staff.id)
        .gte('plan_date', toISODate(nextWeekBusinessDates[0]))
        .lte('plan_date', toISODate(nextWeekBusinessDates[nextWeekBusinessDates.length - 1])),
      supabase
        .from('plan_items')
        .select('plan_date, content')
        .eq('staff_id', staff.id)
        .gte('plan_date', toISODate(thisWeekBusinessDates[0]))
        .lte('plan_date', toISODate(thisWeekBusinessDates[thisWeekBusinessDates.length - 1])),
      supabase
        .from('topics')
        .select('id, category, content, created_at')
        .eq('staff_id', staff.id)
        .eq('week_start', thisWeekStartISO)
        .order('created_at', { ascending: false }),
    ])

  const logByDate = new Map((logs ?? []).map((l) => [l.log_date, l]))
  const planByDate = new Map((planItems ?? []).map((p) => [p.plan_date, p.content]))
  const lastWeekPlanByDate = new Map((lastWeekPlanItems ?? []).map((p) => [p.plan_date, p.content]))
  const reportItemCount = reportItems?.length ?? 0

  const nextWeekPlanSummary = nextWeekBusinessDates
    .map((d) => ({ iso: toISODate(d), label: formatJPDate(d), content: planByDate.get(toISODate(d)) ?? '' }))
    .filter((p) => p.content.trim() !== '')

  const doTab = (
    <div>
      <p className="mb-4 text-sm text-muted">
        {formatJPDate(thisWeekDates[0])} 〜 {formatJPDate(thisWeekDates[6])}
      </p>

      <div className="mb-4 rounded-lg border border-line bg-surface-2/50 p-3.5">
        <p className="mb-2 text-xs font-bold text-muted">来週の行動予定（サマリー）</p>
        {nextWeekPlanSummary.length === 0 ? (
          <p className="text-sm text-muted">来週の行動予定はまだ入力されていません。</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {nextWeekPlanSummary.map((p) => (
              <li key={p.iso} className="flex gap-2 text-sm">
                <span className="w-16 shrink-0 text-muted">{p.label}</span>
                <span className="flex-1">{p.content}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-3">
        {thisWeekDates.map((d) => {
          const iso = toISODate(d)
          const log = logByDate.get(iso)
          const detail: DayCardDetail = {
            customerName: log?.customer_name ?? null,
            purpose: log?.purpose ?? null,
            contactPerson: log?.contact_person ?? null,
            customerReaction: log?.customer_reaction ?? null,
            proposalContent: log?.proposal_content ?? null,
            progressStatus: log?.progress_status ?? null,
            issues: log?.issues ?? null,
            nextAction: log?.next_action ?? null,
            nextActionAssignee: log?.next_action_assignee ?? null,
            nextVisitDate: log?.next_visit_date ?? null,
          }
          return (
            <DayCard
              key={iso}
              logDate={iso}
              label={formatJPDate(d)}
              initialContent={log?.content ?? ''}
              detail={detail}
              lastWeekPlan={lastWeekPlanByDate.get(iso) || undefined}
              defaultAssignee={staff.name}
              isToday={iso === todayISO}
            />
          )
        })}
      </div>
    </div>
  )

  const reportTab = (
    <div>
      <p className="mb-4 text-sm text-muted">
        失敗談・成功談・市況情報・クレーム・会合・メーカー情報など（1週間に最大{REPORT_ITEM_WEEKLY_LIMIT}件）
      </p>
      <div className="mb-4 rounded-lg border border-line bg-surface p-4">
        <ReportItemForm weekStart={thisWeekStartISO} disabled={reportItemCount >= REPORT_ITEM_WEEKLY_LIMIT} />
      </div>
      <ul className="flex flex-col gap-2">
        {(reportItems ?? []).map((item) => (
          <li key={item.id} className="flex items-start justify-between gap-3 rounded-lg border border-line bg-surface p-3">
            <div>
              <span className="mb-1 inline-block rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-bold text-muted">
                {item.category}
              </span>
              <p className="text-sm">{item.content}</p>
            </div>
            <DeleteReportItemButton id={item.id} />
          </li>
        ))}
        {(!reportItems || reportItems.length === 0) && (
          <p className="text-sm text-muted">今週の報告事項はまだありません。</p>
        )}
      </ul>
    </div>
  )

  const planTab = (
    <div>
      <p className="mb-4 text-sm text-muted">
        来週の行動予定（何を提案するか）・{formatJPDate(nextWeekBusinessDates[0])} 〜{' '}
        {formatJPDate(nextWeekBusinessDates[nextWeekBusinessDates.length - 1])}
      </p>
      <div className="flex flex-col gap-3">
        {nextWeekBusinessDates.map((d) => {
          const iso = toISODate(d)
          return (
            <PlanDayCard key={iso} planDate={iso} label={formatJPDate(d)} initialContent={planByDate.get(iso) ?? ''} />
          )
        })}
      </div>
    </div>
  )

  const otherTab = (
    <div>
      <p className="mb-4 text-sm text-muted">イベント情報・課題・問題点・改善策など</p>
      <div className="mb-4 rounded-lg border border-line bg-surface p-4">
        <TopicForm weekStart={thisWeekStartISO} />
      </div>
      <ul className="flex flex-col gap-2">
        {(topics ?? []).map((t) => (
          <li key={t.id} className="flex items-start justify-between gap-3 rounded-lg border border-line bg-surface p-3">
            <div>
              <span className="mb-1 inline-block rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-bold text-muted">
                {t.category}
              </span>
              <p className="text-sm">{t.content}</p>
            </div>
            <DeleteTopicButton id={t.id} />
          </li>
        ))}
        {(!topics || topics.length === 0) && <p className="text-sm text-muted">今週の報告はまだありません。</p>}
      </ul>
    </div>
  )

  return (
    <div>
      <h1 className="mb-4 text-lg font-bold">日報</h1>
      <DailyTabs doTab={doTab} reportTab={reportTab} planTab={planTab} otherTab={otherTab} />
    </div>
  )
}
