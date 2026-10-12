import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { NAV_ITEMS } from '@/lib/navigation'
import { isSupabaseConfigured } from '@/lib/supabase/client'

export function DashboardPage() {
  const modules = NAV_ITEMS.filter((item) => item.id !== 'dashboard')

  return (
    <>
      <PageHeader title="Prehľad" description="Evidencia techniky a jej prevádzky" />

      {!isSupabaseConfigured && (
        <div role="status" className="mb-6 rounded-xl border border-accent/40 bg-accent/10 p-4 text-sm">
          <p className="font-medium">Databáza zatiaľ nie je pripojená</p>
          <p className="mt-1 text-muted-foreground">
            Doplňte <code>VITE_SUPABASE_URL</code> a <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> do súboru{' '}
            <code>.env.local</code>.
          </p>
        </div>
      )}

      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {modules.map((item) => (
          <li key={item.id}>
            <Link
              to={item.to}
              className="flex h-full flex-col gap-2 rounded-xl border bg-surface p-4 transition-colors hover:bg-muted"
            >
              <item.icon className="size-6 text-accent" aria-hidden />
              <span className="font-medium">{item.label}</span>
              <span className="text-xs text-muted-foreground">{item.description}</span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  )
}
