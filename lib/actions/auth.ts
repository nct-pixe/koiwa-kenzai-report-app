'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { staffCodeToEmail } from '@/lib/auth/staffCode'
import { pinToPassword, isValidPin } from '@/lib/auth/pin'

export interface LoginState {
  error?: string
}

export async function login(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const staffCode = String(formData.get('staffCode') ?? '').trim()
  const pin = String(formData.get('password') ?? '')

  if (!staffCode || !pin) {
    return { error: '社員コードと暗証番号を入力してください' }
  }
  if (!isValidPin(pin)) {
    return { error: '暗証番号は数字4桁で入力してください' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: staffCodeToEmail(staffCode),
    password: pinToPassword(pin),
  })

  if (error) {
    return { error: '社員コードまたはパスワードが正しくありません' }
  }

  redirect('/')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
