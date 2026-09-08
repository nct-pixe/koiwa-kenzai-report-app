import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const targets = ['az01','hq01','ng01','nm01','sd01','tk01']
  .map(function(code) { return code + '@staff.koiwa-kenzai.local' })

const listResult = await supabase.auth.admin.listUsers()
console.log('listError:', listResult.error)
console.log('userCount:', listResult.data ? listResult.data.users.length : 'no data')
console.log('emails:', listResult.data ? listResult.data.users.map(function(u){return u.email}) : [])
console.log('targets:', targets)

const data = listResult.data

for (const email of targets) {
  const user = data.users.find(function(u) { return u.email === email })
  if (!user) { console.log('not found:', email); continue }
  const result = await supabase.auth.admin.updateUserById(user.id, { password: '0000-kw' })
  console.log(email, result.error ? 'ERROR: ' + result.error.message : 'updated to 0000-kw')
}
