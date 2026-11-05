import { lazy, Suspense, type ReactNode } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { LoadingScreen } from '@/components/feedback/LoadingScreen'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/auth-context'
import { useCompany } from '@/features/companies/company-context'
import type { PermissionKey } from '@/features/permissions/catalog'
import { can } from '@/lib/permissions'
import { isSupabaseConfigured } from '@/lib/supabase/client'
import { FoundPage } from '@/features/scan/FoundPage'
import { tx } from '@/lib/i18n'

// Guardy sú iba UX. Dáta chráni RLS v databáze.

// Úvodná stránka pre neprihlásených na „/“ (načíta sa až keď treba).
const HomePage = lazy(() => import('@/features/home/HomePage').then((module) => ({ default: module.HomePage })))

export function RequireAuth() {
  const { session, loading } = useAuth()
  const location = useLocation()

  // Bez backendu nie je čo chrániť; shell ostáva prístupný na vývoj UI.
  if (!isSupabaseConfigured) return <Outlet />
  if (loading) return <LoadingScreen />
  if (!session) {
    // QR štítok naskenovaný fotoaparátom bez účtu: „Našli ste…“ (ak to firma povolila), inak výzva prihlásiť sa.
    const scanned = /^\/(equipment|cases)\/([0-9a-f-]{36})\/?$/i.exec(location.pathname)
    if (scanned) {
      const unit = Number(new URLSearchParams(location.search).get('unit')) || null
      return <FoundPage kind={scanned[1].toLowerCase() === 'cases' ? 'case' : 'equipment'} id={scanned[2].toLowerCase()} unit={unit} />
    }
    if (location.pathname === '/') {
      return (
        <Suspense fallback={<LoadingScreen />}>
          <HomePage />
        </Suspense>
      )
    }
    return <Navigate to="/auth" replace state={{ from: location.pathname + location.search }} />
  }
  return <Outlet />
}

export function RequireCompany() {
  const { active, loading, error, refetch } = useCompany()

  if (!isSupabaseConfigured) return <Outlet />
  if (loading) return <LoadingScreen />
  if (error) {
    return (
      <div role="alert" className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
        <p>{tx('Nepodarilo sa načítať vaše firmy. Skontrolujte pripojenie.')}</p>
        <Button onClick={refetch}>{tx('Skúsiť znova')}</Button>
      </div>
    )
  }
  if (!active) return <Navigate to="/company/select" replace />
  return <Outlet />
}

/** Stránka modulu, ktorý člen nesmie vidieť, sa ani nevykreslí. Dáta aj tak nevydá databáza. */
export function RequirePermission({ permission, children }: { permission?: PermissionKey; children: ReactNode }) {
  const { active } = useCompany()
  if (!permission || !active || can(active, permission)) return children
  return (
    <div role="alert" className="rounded-xl border border-dashed bg-surface px-6 py-16 text-center">
      <p className="font-medium">{tx('Na túto časť nemáte oprávnenie')}</p>
      <p className="mt-1 text-sm text-muted-foreground">{tx('Ak ju potrebujete, požiadajte admina vašej firmy.')}</p>
    </div>
  )
}
