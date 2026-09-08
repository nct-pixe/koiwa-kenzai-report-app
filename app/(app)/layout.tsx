import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getCurrentStaff, canManageTargets } from '@/lib/auth/currentStaff'
import { logout } from '@/lib/actions/auth'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const staff = await getCurrentStaff()

  if (!staff) {
    redirect('/login')
  }

  const navItems = [
    { href: '/', label: 'マイページ' },
    { href: '/daily', label: '日報' },
    { href: '/performance', label: '実績報告' },
    { href: '/ranking', label: 'ランキング' },
    { href: '/history', label: '過去の日報' },
    { href: '/stories', label: '成功談・失敗談' },
  ]
  if (staff.role === 'hq' || staff.role === 'manager') {
    navItems.push(
      { href: '/hq', label: '本部ダッシュボード' },
      { href: '/hq/daily', label: 'スタッフ一覧' },
    )
  }
  if (canManageTargets(staff)) {
    navItems.push({ href: '/hq/targets', label: '目標設定' })
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <div>
            <p className="text-[11px] font-bold tracking-widest text-accent uppercase">光和建材</p>
            <p className="text-sm font-bold">{staff.name}<span className="ml-1 text-xs font-normal text-muted">（{staff.storeName}）</span></p>
          </div>
          <form action={logout}>
            <button type="submit" className="text-xs text-muted underline underline-offset-2 hover:text-foreground">
              ログアウト
            </button>
          </form>
        </div>
        <nav className="mx-auto flex max-w-4xl gap-1 overflow-x-auto px-4 pb-2 text-sm">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="whitespace-nowrap rounded-full px-3 py-1.5 text-muted hover:bg-surface-2 hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6">{children}</main>
    </div>
  )
}
