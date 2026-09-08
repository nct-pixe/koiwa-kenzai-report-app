'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentStaff } from '@/lib/auth/currentStaff'
import type { ReportCategory, TopicCategory } from '@/lib/supabase/types'

const REPORT_ITEM_WEEKLY_LIMIT = 5

export interface SimpleFormState {
  error?: string
}

export async function addReportItem(_prevState: SimpleFormState, formData: FormData): Promise<SimpleFormState> {
  const staff = await getCurrentStaff()
  if (!staff) return { error: 'ログインしてください' }

  const weekStart = String(formData.get('weekStart') ?? '')
  const category = String(formData.get('category') ?? '') as ReportCategory
  const content = String(formData.get('content') ?? '').trim()

  if (!weekStart || !content) return { error: '内容を入力してください' }

  const supabase = await createClient()

  const { count } = await supabase
    .from('report_items')
    .select('id', { count: 'exact', head: true })
    .eq('staff_id', staff.id)
    .eq('week_start', weekStart)
  if ((count ?? 0) >= REPORT_ITEM_WEEKLY_LIMIT) {
    return { error: `1週間に登録できる報告事項は${REPORT_ITEM_WEEKLY_LIMIT}件までです` }
  }

  const { error } = await supabase.from('report_items').insert({
    staff_id: staff.id,
    week_start: weekStart,
    category,
    content,
  })
  if (error) return { error: '登録に失敗しました' }

  revalidatePath('/daily')
  return {}
}

export async function deleteReportItem(id: string) {
  const staff = await getCurrentStaff()
  if (!staff) throw new Error('Unauthorized')
  const supabase = await createClient()
  await supabase.from('report_items').delete().eq('id', id).eq('staff_id', staff.id)
  revalidatePath('/daily')
}

export async function savePlanItem(formData: FormData) {
  const staff = await getCurrentStaff()
  if (!staff) throw new Error('Unauthorized')

  const planDate = String(formData.get('planDate') ?? '')
  const content = String(formData.get('content') ?? '').trim()
  if (!planDate) throw new Error('planDate is required')

  const supabase = await createClient()
  if (!content) {
    await supabase.from('plan_items').delete().eq('staff_id', staff.id).eq('plan_date', planDate)
  } else {
    await supabase
      .from('plan_items')
      .upsert({ staff_id: staff.id, plan_date: planDate, content }, { onConflict: 'staff_id,plan_date' })
  }
  revalidatePath('/daily')
}

export async function addTopic(_prevState: SimpleFormState, formData: FormData): Promise<SimpleFormState> {
  const staff = await getCurrentStaff()
  if (!staff) return { error: 'ログインしてください' }

  const weekStart = String(formData.get('weekStart') ?? '')
  const category = String(formData.get('category') ?? '') as TopicCategory
  const content = String(formData.get('content') ?? '').trim()
  if (!weekStart || !content) return { error: '内容を入力してください' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('topics')
    .insert({ staff_id: staff.id, week_start: weekStart, category, content })
  if (error) return { error: '登録に失敗しました' }

  revalidatePath('/daily')
  return {}
}

export async function deleteTopic(id: string) {
  const staff = await getCurrentStaff()
  if (!staff) throw new Error('Unauthorized')
  const supabase = await createClient()
  await supabase.from('topics').delete().eq('id', id).eq('staff_id', staff.id)
  revalidatePath('/daily')
}
