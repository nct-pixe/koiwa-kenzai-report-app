import { createClient } from '@/lib/supabase/server'
import type { StoreType } from '@/lib/supabase/types'

export interface CurrentStaff {
  id: string
  staffCode: string
  name: string
  role: 'staff' | 'manager' | 'hq'
  storeId: string
  storeName: string
  storeType: StoreType
}

/** ログイン中ユーザーのstaffレコードを取得する。未ログイン・staff未紐付けの場合はnull。 */
export async function getCurrentStaff(): Promise<CurrentStaff | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('staff')
    .select('id, staff_code, name, role, store_id, stores(name, type)')
    .eq('auth_user_id', user.id)
    .single()

  if (error || !data) return null

  const store = Array.isArray(data.stores) ? data.stores[0] : data.stores

  return {
    id: data.id,
    staffCode: data.staff_code,
    name: data.name,
    role: data.role,
    storeId: data.store_id,
    storeName: store?.name ?? '',
    storeType: store?.type ?? 'branch',
  }
}

/** 目標設定（本社所属の店長・本部管理者のみ）を操作できるかどうか */
export function canManageTargets(staff: CurrentStaff): boolean {
  return (staff.role === 'hq' || staff.role === 'manager') && staff.storeType === 'headquarters'
}
