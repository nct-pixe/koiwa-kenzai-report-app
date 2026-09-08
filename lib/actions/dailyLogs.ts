'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentStaff } from '@/lib/auth/currentStaff'

function textOrNull(formData: FormData, name: string): string | null {
  const v = String(formData.get(name) ?? '').trim()
  return v === '' ? null : v
}

export async function saveDailyLog(formData: FormData) {
  const staff = await getCurrentStaff()
  if (!staff) throw new Error('Unauthorized')

  const logDate = String(formData.get('logDate') ?? '')
  const content = String(formData.get('content') ?? '').trim()
  if (!logDate) throw new Error('logDate is required')

  const supabase = await createClient()

  const detailFields = {
    customer_name: textOrNull(formData, 'customerName'),
    purpose: textOrNull(formData, 'purpose'),
    contact_person: textOrNull(formData, 'contactPerson'),
    customer_reaction: textOrNull(formData, 'customerReaction'),
    proposal_content: textOrNull(formData, 'proposalContent'),
    progress_status: textOrNull(formData, 'progressStatus'),
    issues: textOrNull(formData, 'issues'),
    next_action: textOrNull(formData, 'nextAction'),
    next_action_assignee: textOrNull(formData, 'nextActionAssignee'),
    next_visit_date: textOrNull(formData, 'nextVisitDate'),
  }
  const hasDetail = Object.values(detailFields).some((v) => v !== null)

  if (!content && !hasDetail) {
    await supabase.from('daily_logs').delete().eq('staff_id', staff.id).eq('log_date', logDate)
  } else {
    await supabase
      .from('daily_logs')
      .upsert(
        { staff_id: staff.id, log_date: logDate, content, ...detailFields },
        { onConflict: 'staff_id,log_date' },
      )
  }

  revalidatePath('/daily')
  revalidatePath('/')
}
