import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { LoadingScreen } from '@/components/feedback/LoadingScreen'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/auth-context'
import { useCompany } from '@/features/companies/company-context'
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
