import { LoginForm } from './LoginForm'

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="text-xs font-bold tracking-widest text-accent uppercase">
            光和建材
          </p>
          <h1 className="mt-2 text-xl font-bold text-foreground">
            営業日報・週報
          </h1>
        </div>
        <div className="rounded-lg border border-line bg-surface p-6 shadow-sm">
          <LoginForm />
        </div>
      </div>
    </main>
  )
}
