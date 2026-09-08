// スタッフアカウントの初期発行スクリプト
//
// 使い方:
//   1. scripts/seed-data.example.json をコピーして scripts/seed-data.json を作成し、
//      実際の店舗名・スタッフを記入する（pinはログイン用の4桁暗証番号）
//   2. .env.local を用意した状態で以下を実行:
//      node --env-file=.env.local scripts/seed-staff.mjs
//
// 既に存在する店舗名・社員コードはスキップされるため、追加のスタッフを
// 後から同じファイルに書き足して再実行することもできる。

import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

// lib/auth/pin.ts の pinToPassword と同じ変換ロジック（Supabase Authの最小6文字要件を満たすため）
const PIN_SUFFIX = '-kw'
const pinToPassword = (pin) => `${pin}${PIN_SUFFIX}`

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dataPath = path.join(__dirname, 'seed-data.json')

if (!existsSync(dataPath)) {
  console.error(`scripts/seed-data.json が見つかりません。scripts/seed-data.example.json をコピーして作成してください。`)
  process.exit(1)
}

const { stores = [], staff = [] } = JSON.parse(readFileSync(dataPath, 'utf-8'))

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const dummyDomain = process.env.NEXT_PUBLIC_AUTH_DUMMY_DOMAIN ?? 'staff.koiwa-kenzai.local'

if (!url || !serviceRoleKey) {
  console.error('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY が設定されていません。')
  process.exit(1)
}

const supabase = createClient(url, serviceRoleKey)

async function main() {
  const storeIdByName = new Map()

  for (const name of stores) {
    const { data: existing } = await supabase.from('stores').select('id').eq('name', name).maybeSingle()
    if (existing) {
      storeIdByName.set(name, existing.id)
      console.log(`店舗スキップ（既存）: ${name}`)
      continue
    }
    const { data, error } = await supabase.from('stores').insert({ name }).select('id').single()
    if (error) throw error
    storeIdByName.set(name, data.id)
    console.log(`店舗作成: ${name}`)
  }

  for (const s of staff) {
    const { data: existing } = await supabase.from('staff').select('id').eq('staff_code', s.staffCode).maybeSingle()
    if (existing) {
      console.log(`スタッフスキップ（既存）: ${s.staffCode} ${s.name}`)
      continue
    }

    const storeId = storeIdByName.get(s.store)
    if (!storeId) {
      console.error(`店舗が見つかりません: ${s.store}（${s.staffCode}をスキップ）`)
      continue
    }

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
      role: s.role ?? 'staff',
      store_id: storeId,
      auth_user_id: authUser.user.id,
    })
    if (staffError) {
      console.error(`staffレコード作成失敗: ${s.staffCode} - ${staffError.message}`)
      continue
    }

    console.log(`スタッフ作成: ${s.staffCode} ${s.name}（初期暗証番号: ${s.pin}）`)
  }

  console.log('完了しました。')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
