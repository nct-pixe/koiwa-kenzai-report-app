const WEEKDAY_JA = ['日', '月', '火', '水', '木', '金', '土']

export function toISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** 指定日が属する週の月曜日を返す */
export function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay() // 0=日 ... 6=土
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

/** 月曜始まりで7日分の日付配列を返す */
export function getWeekDates(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + i)
    return d
  })
}

export function formatJPDate(d: Date): string {
  return `${d.getMonth() + 1}/${d.getDate()}（${WEEKDAY_JA[d.getDay()]}）`
}

export function getMonthStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

export function formatCurrency(n: number): string {
  return `¥${n.toLocaleString('ja-JP')}`
}

/** 年度の月順（3月始まり〜翌2月、決算月2月に対応） */
export const FISCAL_MONTHS = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2]

/** 年度内の月から、実際の西暦年を返す（1・2月は翌年扱い） */
export function fiscalMonthToCalendarYear(fiscalYear: number, month: number): number {
  return month <= 2 ? fiscalYear + 1 : fiscalYear
}

/** 指定日が属する年度（3月始まり）の開始西暦年を返す */
export function getCurrentFiscalYear(date: Date): number {
  const month = date.getMonth() + 1
  return month <= 2 ? date.getFullYear() - 1 : date.getFullYear()
}

/** 当月を含む直近 monthsBack ヶ月分の選択肢（新しい月が先頭）を返す */
export function getMonthOptions(monthsBack = 12): { value: string; label: string }[] {
  const base = getMonthStart(new Date())
  return Array.from({ length: monthsBack }, (_, i) => {
    const d = new Date(base.getFullYear(), base.getMonth() - i, 1)
    return { value: toISODate(d), label: `${d.getFullYear()}年${d.getMonth() + 1}月` }
  })
}
