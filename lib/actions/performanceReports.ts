'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentStaff } from '@/lib/auth/currentStaff'
import type { PerformanceCategory } from '@/lib/supabase/types'

export interface PerformanceFormState {
  error?: string
  success?: boolean
}

function numberOrZero(value: FormDataEntryValue | null): number {
  const n = Number(value)
  return Number.isNaN(n) ? 0 : n
}

export async function savePerformanceReport(
  _prevState: PerformanceFormState,
  formData: FormData,
): Promise<PerformanceFormState> {
  const staff = await getCurrentStaff()
  if (!staff) return { error: 'ログインしてください' }

  const targetMonth = String(formData.get('targetMonth') ?? '')
  const category = String(formData.get('category') ?? '') as PerformanceCategory
  if (!targetMonth || category !== 'general') {
    return { error: '不正なリクエストです' }
  }

  const payload = {
    staff_id: staff.id,
    target_month: targetMonth,
    category,
    cumulative_sales: numberOrZero(formData.get('cumulativeSales')),
    cumulative_profit: numberOrZero(formData.get('cumulativeProfit')),
    updated_at: new Date().toISOString(),
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('performance_reports')
    .upsert(payload, { onConflict: 'staff_id,target_month,category' })

  if (error) return { error: '保存に失敗しました。時間をおいて再度お試しください。' }

  revalidatePath('/performance')
  revalidatePath('/')
  return { success: true }
}
