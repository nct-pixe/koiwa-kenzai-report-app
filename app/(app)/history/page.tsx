import { createClient } from '@/lib/supabase/server'
import { getCurrentStaff } from '@/lib/auth/currentStaff'
import { formatJPDate, toISODate } from '@/lib/date'

function defaultFrom(): string {
  const d = new Date()
  d.setDate(d.getDate() - 30)
  return toISODate(d)
}

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; staff?: string; store?: string; q?: string }>
}) {
  const staff = await getCurrentStaff()
  if (!staff) return null

  const params = await searchParams
  const from = params.from || defaultFrom()
  const to = params.to || toISODate(new Date())
  const q = params.q?.trim() || ''

  const supabase = await createClient()

  let staffQuery = supabase.from('staff').select('id, name, store_id, stores(name)').eq('active', true).order('store_id')
  if (staff.role === 'staff') {
    staffQuery = staffQuery.eq('id', staff.id)
  } else if (staff.role === 'manager') {
    staffQuery = staffQuery.eq('store_id', staff.storeId)
  }
  const { data: visibleStaff } = await staffQuery

  const { data: stores } = staff.role === 'hq' ? await supabase.from('stores').select('id, name').order('name') : { data: [] }

  const storeFilter = staff.role === 'hq' ? params.store : undefined
  const candidateStaffIds = (visibleStaff ?? [])
    .filter((s) => !storeFilter || s.store_id === storeFilter)
    .map((s) => s.id)

  const selectedStaffId = staff.role === 'staff' ? staff.id : params.staff && candidateStaffIds.includes(params.staff) ? params.staff : ''
  const targetStaffIds = selectedStaffId ? [selectedStaffId] : candidateStaffIds

  let logsQuery = supabase
    .from('daily_logs')
    .select(
      'staff_id, log_date, content, customer_name, purpose, contact_person, customer_reaction, proposal_content, progress_status, issues, next_action, next_action_assignee, next_visit_date, staff(name, stores(name))',
    )
    .gte('log_date', from)
    .lte('log_date', to)
    .order('log_date', { ascending: false })
    .limit(200)

  if (targetStaffIds.length) {
    logsQuery = logsQuery.in('staff_id', targetStaffIds)
  }
  if (q) {
    logsQuery = logsQuery.or(
      `content.ilike.%${q}%,customer_name.ilike.%${q}%,purpose.ilike.%${q}%,proposal_content.ilike.%${q}%,next_action.ilike.%${q}%`,
    )
  }

  const { data: logs } = targetStaffIds.length || staff.role !== 'staff' ? await logsQuery : { data: [] }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="mb-1 text-lg font-bold">過去の日報検索</h1>
        <p className="text-sm text-muted">期間・担当者・キーワードで過去の行動内容を確認できます。</p>
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
        {staff.role !== 'staff' && (
          <label className="flex flex-col gap-1 text-xs text-muted">
            担当者
            <select name="staff" defaultValue={selectedStaffId} className="rounded border border-line bg-surface-2 px-2 py-1.5 text-sm">
              <option value="">全員</option>
              {(visibleStaff ?? [])
                .filter((s) => !storeFilter || s.store_id === storeFilter)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
            </select>
          </label>
        )}
        {staff.role === 'hq' && (
          <label className="flex flex-col gap-1 text-xs text-muted">
            拠点
            <select name="store" defaultValue={storeFilter ?? ''} className="rounded border border-line bg-surface-2 px-2 py-1.5 text-sm">
              <option value="">全拠点</option>
              {(stores ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="flex flex-1 flex-col gap-1 text-xs text-muted" style={{ minWidth: '10rem' }}>
          キーワード（顧客名・案件名・行動内容）
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="例）〇〇商店"
            className="rounded border border-line bg-surface-2 px-2 py-1.5 text-sm"
          />
        </label>
        <button type="submit" className="rounded bg-accent px-4 py-1.5 text-sm font-bold text-accent-ink">
          検索
        </button>
      </form>

      <div className="flex flex-col gap-3">
        {(logs ?? []).map((l, i) => {
          const staffInfo = Array.isArray(l.staff) ? l.staff[0] : l.staff
          const storeName = staffInfo
            ? Array.isArray(staffInfo.stores)
              ? staffInfo.stores[0]?.name
              : (staffInfo.stores as { name: string } | null)?.name
            : ''
          return (
            <div key={`${l.staff_id}-${l.log_date}-${i}`} className="rounded-lg border border-line bg-surface p-4">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-bold">{formatJPDate(new Date(l.log_date))}</span>
                {staff.role !== 'staff' && (
                  <span className="text-xs text-muted">
                    {staffInfo?.name}
                    {storeName ? `（${storeName}）` : ''}
                  </span>
                )}
              </div>
              {l.content && <p className="mb-2 text-sm">{l.content}</p>}
              <dl className="grid grid-cols-1 gap-x-4 gap-y-1 text-xs sm:grid-cols-2">
                {l.customer_name && (
                  <div><dt className="inline text-muted">訪問先：</dt><dd className="inline">{l.customer_name}</dd></div>
                )}
                {l.purpose && <div><dt className="inline text-muted">目的：</dt><dd className="inline">{l.purpose}</dd></div>}
                {l.contact_person && (
                  <div><dt className="inline text-muted">対応者：</dt><dd className="inline">{l.contact_person}</dd></div>
                )}
                {l.customer_reaction && (
                  <div><dt className="inline text-muted">反応：</dt><dd className="inline">{l.customer_reaction}</dd></div>
                )}
                {l.proposal_content && (
                  <div><dt className="inline text-muted">提案内容：</dt><dd className="inline">{l.proposal_content}</dd></div>
                )}
                {l.progress_status && (
                  <div><dt className="inline text-muted">進捗：</dt><dd className="inline">{l.progress_status}</dd></div>
                )}
                {l.issues && <div><dt className="inline text-muted">課題：</dt><dd className="inline">{l.issues}</dd></div>}
              </dl>
              {(l.next_action || l.next_action_assignee || l.next_visit_date) && (
                <div className="mt-2 rounded border border-line bg-surface-2/50 px-2.5 py-1.5 text-xs">
                  <span className="font-bold text-muted">次のアクション：</span>
                  {l.next_action || '—'}
                  <span className="ml-3 text-muted">担当者：</span>
                  {l.next_action_assignee || '—'}
                  <span className="ml-3 text-muted">期限：</span>
                  {l.next_visit_date ? formatJPDate(new Date(l.next_visit_date)) : '—'}
                </div>
              )}
            </div>
          )
        })}
        {(!logs || logs.length === 0) && (
          <p className="rounded-lg border border-line bg-surface p-4 text-sm text-muted">条件に一致する日報が見つかりませんでした。</p>
        )}
      </div>
    </div>
  )
}
