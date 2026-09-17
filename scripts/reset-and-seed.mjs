// 全データリセット + 3名アカウント再発行スクリプト
//
// 実行内容:
//   1. 既存の日報・実績・案件・スタッフ・店舗データを全て削除
//   2. 既存のSupabase Authユーザーを全て削除
//   3. 店舗「本社」（headquarters）「会津営業所」（branch）を作成
//   4. 3名のスタッフアカウントを作成（安齋裕也/梨本康弘/笠原秀幸、PINは全員0000）
//
// 使い方:
//   RESET_CONFIRM=YES-DELETE-ALL-DATA node --env-file=.env.local scripts/reset-and-seed.mjs
//
// 安全のため、環境変数 RESET_CONFIRM が正しくセットされていない場合は何もしない。

import { createClient } from '@supabase/supabase-js'

const PIN_SUFFIX = '-kw'
const pinToPassword = (pin) => `${pin}${PIN_SUFFIX}`

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const dummyDomain = process.env.NEXT_PUBLIC_AUTH_DUMMY_DOMAIN ?? 'staff.koiwa-kenzai.local'

if (!url || !serviceRoleKey) {
  console.error('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY が設定されていません。')
  process.exit(1)
}

if (process.env.RESET_CONFIRM !== 'YES-DELETE-ALL-DATA') {
  console.error(
    '安全のため停止しました。全データ削除を実行するには RESET_CONFIRM=YES-DELETE-ALL-DATA を指定してください。',
  )
  process.exit(1)
}

const NEW_STORES = [
  { name: '本社', type: 'headquarters' },
  { name: '会津営業所', type: 'branch' },
]

const NEW_STAFF = [
  { staffCode: 'AZ01', name: '安齋裕也', role: 'manager', store: '会津営業所', pin: '0000' },
  { staffCode: 'NM01', name: '梨本康弘', role: 'staff', store: '会津営業所', pin: '0000' },
  { staffCode: 'HQ01', name: '笠原秀幸', role: 'hq', store: '本社', pin: '0000' },
]

const supabase = createClient(url, serviceRoleKey)

const DATA_TABLES = [
  'performance_report_daily',
  'performance_reports',
  'monthly_targets',
  'deals',
  'topics',
  'plan_items',
  'report_items',
  'daily_logs',
]

async function main() {
  console.log('=== 1. 既存データテーブルを全削除 ===')
  for (const table of DATA_TABLES) {
    const { error } = await supabase.from(table).delete().not('id', 'is', null)
    if (error) throw new Error(`${table} 削除失敗: ${error.message}`)
    console.log(`削除完了: ${table}`)
  }

  console.log('=== 2. 既存スタッフの認証ユーザーを削除 ===')
  const { data: existingStaff, error: staffFetchError } = await supabase
    .from('staff')
    .select('id, auth_user_id, staff_code')
  if (staffFetchError) throw new Error(`staff取得失敗: ${staffFetchError.message}`)

  for (const s of existingStaff ?? []) {
    if (s.auth_user_id) {
      const { error } = await supabase.auth.admin.deleteUser(s.auth_user_id)
      if (error) console.error(`認証ユーザー削除失敗: ${s.staff_code} - ${error.message}`)
      else console.log(`認証ユーザー削除: ${s.staff_code}`)
    }
  }

  console.log('=== 3. staffレコードを全削除 ===')
  const { error: staffDeleteError } = await supabase.from('staff').delete().not('id', 'is', null)
  if (staffDeleteError) throw new Error(`staff削除失敗: ${staffDeleteError.message}`)

  console.log('=== 4. storesを全削除 ===')
  const { error: storeDeleteError } = await supabase.from('stores').delete().not('id', 'is', null)
  if (storeDeleteError) throw new Error(`stores削除失敗: ${storeDeleteError.message}`)

  console.log('=== 5. 新しい店舗を作成 ===')
  const storeIdByName = new Map()
  for (const store of NEW_STORES) {
    const { data, error } = await supabase.from('stores').insert(store).select('id').single()
    if (error) throw new Error(`店舗作成失敗: ${store.name} - ${error.message}`)
    storeIdByName.set(store.name, data.id)
    console.log(`店舗作成: ${store.name} (${store.type})`)
  }

  console.log('=== 6. 新しいスタッフアカウントを作成 ===')
  for (const s of NEW_STAFF) {
    const storeId = storeIdByName.get(s.store)
    const email = `${s.staffCode.toLowerCase()}@${dummyDomain}`
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: pinToPassword(s.pin),
      email_confirm: true,
    })
    if (authError) {
      console.error(`認証ユーザー作成失敗: ${s.staffCode} - ${authError.message}`)
      continue
    }

    const { error: staffError } = await supabase.from('staff').insert({
      staff_code: s.staffCode,
      name: s.name,
      role: s.role,
      store_id: storeId,
      auth_user_id: authUser.user.id,
    })
    if (staffError) {
      console.error(`staffレコード作成失敗: ${s.staffCode} - ${staffError.message}`)
      continue
    }

    console.log(`スタッフ作成: ${s.staffCode} / ${s.name} / ${s.role} / ${s.store}（PIN: ${s.pin}）`)
  }

  console.log('=== 完了しました ===')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
