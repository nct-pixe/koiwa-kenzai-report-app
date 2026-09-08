'use client'

import { useActionState } from 'react'
import { login, type LoginState } from '@/lib/actions/auth'

const initialState: LoginState = {}

export function LoginForm() {
  const [state, formAction, pending] = useActionState(login, initialState)

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="staffCode" className="text-xs font-semibold text-muted tracking-wide">
          社員コード
        </label>
        <input
          id="staffCode"
          name="staffCode"
          type="text"
          autoComplete="username"
          autoCapitalize="characters"
          placeholder="例：AZ01"
          required
          className="rounded border border-line bg-surface-2 px-3 py-2.5 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-xs font-semibold text-muted tracking-wide">
          暗証番号（数字4桁）
        </label>
        <input
          id="password"
          name="password"
          type="password"
          inputMode="numeric"
          pattern="\d{4}"
          maxLength={4}
          autoComplete="current-password"
          placeholder="例：0000"
          required
          className="rounded border border-line bg-surface-2 px-3 py-2.5 text-sm tracking-[0.5em] outline-none focus:border-accent focus:ring-1 focus:ring-accent"
        />
      </div>

      {state.error && (
        <p className="rounded border border-crit/30 bg-crit/10 px-3 py-2 text-sm text-crit">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded bg-accent px-4 py-2.5 text-sm font-bold text-accent-ink disabled:opacity-60"
      >
        {pending ? 'ログイン中…' : 'ログイン'}
      </button>
    </form>
  )
}
