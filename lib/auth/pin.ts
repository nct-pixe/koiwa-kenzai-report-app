/**
 * SupabaseAuthはパスワード6文字以上を要求するため、4桁PIN入力の裏側で
 * 固定サフィックスを付与し要件を満たす形に変換する。ユーザーは常に4桁の数字だけを扱う。
 */
const SUFFIX = "-kw"

export function pinToPassword(pin: string): string {
  return `${pin.trim()}${SUFFIX}`
}

export function isValidPin(pin: string): boolean {
  return /^\d{4}$/.test(pin.trim())
}
