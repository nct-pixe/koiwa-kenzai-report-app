const DUMMY_DOMAIN = process.env.NEXT_PUBLIC_AUTH_DUMMY_DOMAIN ?? 'staff.koiwa-kenzai.local'

/** 社員コードをSupabase Auth用のダミーメールアドレスに変換する（例: AZ01 -> az01@staff.koiwa-kenzai.local） */
export function staffCodeToEmail(staffCode: string): string {
  return `${staffCode.trim().toLowerCase()}@${DUMMY_DOMAIN}`
}
