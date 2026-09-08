// 既存スタッフの暗証番号(PIN)を一括更新するスクリプト
// 使い方: node --env-file=.env.local scripts/reset-pins.mjs

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const { staff = [] } = JSON.parse(readFileSync(path.join(__dirname, 'seed-data.json'), 'utf-8'))

const PIN_SUFFIX = '-kw'
const pinToPassword = (pin) => `${pin}${PIN_SUFFIX}`

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(url, serviceRoleKey)

async function main() {
  for (const s of staff) {
    const { data: row } = await supabase.from('staff').select('auth_user_id').eq('staff_code', s.staffCode).maybeSingle()
    if (!row?.auth_user_id) {
      console.error(`スタッフが見つかりません: ${s.staffCode}`)
      continue
    }
    const { error } = await supabase.auth.admin.updateUserById(row.auth_user_id, {
      password: pinToPassword(s.pin),
    })
    if (error) {
      console.error(`更新失敗: ${s.staffCode} - ${error.message}`)
      continue
    }
    console.log(`更新: ${s.staffCode}（暗証番号: ${s.pin}）`)
  }
  console.log('完了しました。')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
