import type { ReactNode } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { LoadingScreen } from '@/components/feedback/LoadingScreen'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/auth-context'
import { useCompany } from '@/features/companies/company-context'
import type { PermissionKey } from '@/features/permissions/catalog'
import { can } from '@/lib/permissions'
import { isSupabaseConfigured } from '@/lib/supabase/client'

// Guardy sú iba UX. Dáta chráni RLS v databáze.

export function RequireAuth() {
  const { session, loading } = useAuth()
  const location = useLocation()

  // Bez backendu nie je čo chrániť; shell ostáva prístupný na vývoj UI.
  if (!isSupabaseConfigured) return <Outlet />
  if (loading) return <LoadingScreen />
  if (!session) return <Navigate to="/auth" replace state={{ from: location.pathname }} />
  return <Outlet />
}

export function RequireCompany() {
  const { active, loading, error, refetch } = useCompany()

  if (!isSupabaseConfigured) return <Outlet />
  if (loading) return <LoadingScreen />
  if (error) {
    return (
      <div role="alert" className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
        <p>Nepodarilo sa načítať vaše firmy. Skontrolujte pripojenie.</p>
        <Button onClick={refetch}>Skúsiť znova</Button>
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
      <p className="font-medium">Na túto časť nemáte oprávnenie</p>
      <p className="mt-1 text-sm text-muted-foreground">Ak ju potrebujete, požiadajte admina vašej firmy.</p>
    </div>
  )
}
