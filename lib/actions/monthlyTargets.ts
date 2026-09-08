'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentStaff, canManageTargets } from '@/lib/auth/currentStaff'
import type { PerformanceCategory } from '@/lib/supabase/types'

export interface MonthlyTargetFormState {
  error?: string
}

export interface AnnualPlanFormState {
  error?: string
  success?: boolean
}

function numberOrNull(value: FormDataEntryValue | null): number | null {
  if (value === null || value === '') return null
  const n = Number(value)
  return Number.isNaN(n) ? null : n
}

function numberOrZero(value: FormDataEntryValue | null): number {
  return numberOrNull(value) ?? 0
}

export async function saveMonthlyTarget(formData: FormData) {
  const staff = await getCurrentStaff()
  if (!staff || !canManageTargets(staff)) {
    throw new Error('Unauthorized')
  }

  const targetStaffId = String(formData.get('staffId') ?? '')
  const targetMonth = String(formData.get('targetMonth') ?? '')
  const category = String(formData.get('category') ?? '') as PerformanceCategory
  if (!targetStaffId || !targetMonth || category !== 'general') {
    throw new Error('不正なリクエストです')
  }

  const supabase = await createClient()
  await supabase.from('monthly_targets').upsert(
    {
      staff_id: targetStaffId,
      target_month: targetMonth,
      category,
      sales_target: numberOrZero(formData.get('salesTarget')),
      profit_target: numberOrZero(formData.get('profitTarget')),
      prev_year_sales: numberOrNull(formData.get('prevYearSales')),
      prev_year_profit: numberOrNull(formData.get('prevYearProfit')),
      set_by: staff.id,
    },
    { onConflict: 'staff_id,target_month,category' },
  )

  revalidatePath('/hq/targets')
  revalidatePath('/performance')
  revalidatePath('/hq/performance')
  revalidatePath('/ranking')
}

export async function saveAnnualPlan(
  _prevState: AnnualPlanFormState,
  formData: FormData,
): Promise<AnnualPlanFormState> {
  const staff = await getCurrentStaff()
  if (!staff || !canManageTargets(staff)) {
    return { error: '権限がありません' }
  }

  const targetStaffId = String(formData.get('staffId') ?? '')
  const year = String(formData.get('year') ?? '')
  if (!targetStaffId || !/^\d{4}$/.test(year)) {
    return { error: '不正なリクエストです' }
  }

  const rows = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1
    return {
      staff_id: targetStaffId,
      target_month: `${year}-${String(month).padStart(2, '0')}-01`,
      category: 'general' as PerformanceCategory,
      sales_target: numberOrZero(formData.get(`m${month}_salesTarget`)),
      profit_target: numberOrZero(formData.get(`m${month}_profitTarget`)),
      prev_year_sales: numberOrNull(formData.get(`m${month}_prevYearSales`)),
      prev_year_profit: numberOrNull(formData.get(`m${month}_prevYearProfit`)),
      set_by: staff.id,
    }
  })

  const supabase = await createClient()
  const { error } = await supabase
    .from('monthly_targets')
    .upsert(rows, { onConflict: 'staff_id,target_month,category' })

  if (error) return { error: '保存に失敗しました。時間をおいて再度お試しください。' }

  revalidatePath('/hq/targets')
  revalidatePath('/performance')
  revalidatePath('/hq/performance')
  revalidatePath('/ranking')
  return { success: true }
}
