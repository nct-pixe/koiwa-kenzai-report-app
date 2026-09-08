import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database } from './types'

/** service role キーで RLS を回避するサーバー専用クライアント（ブラウザに公開しないこと） */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
