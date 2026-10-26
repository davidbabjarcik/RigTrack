import { ChevronRight, LayoutDashboard } from 'lucide-react'
import { Link } from 'react-router-dom'
import { InstallHint } from '@/components/feedback/InstallGuide'
import { PageHeader } from '@/components/layout/PageHeader'
import { useCompany } from '@/features/companies/company-context'
import { MigrationBanner } from '@/features/companies/MigrationStatus'
import { RestockList } from '@/features/equipment/RestockList'
import { LoanAlerts } from '@/features/loans/LoanAlerts'
import { MyAttendance } from '@/features/attendance/MyAttendance'
import { SideWidgets } from '@/features/dashboard/SideWidgets'
import { VehicleDeadlineAlerts } from '@/features/vehicles/VehicleDeadlineAlerts'
import { visibleNavItems } from '@/lib/navigation'
import { isAdminRole } from '@/lib/roles'
import { isSupabaseConfigured } from '@/lib/supabase/client'

export function DashboardPage() {
  const { active } = useCompany()
  // Len moduly, na ktoré má člen práva (helper nevidí nič navyše).
  const modules = visibleNavItems(active).filter((item) => item.id !== 'dashboard')

  return (
    <>
      {/* Na mobile chýba bočný panel s firmou – názov firmy je preto v popise. */}
      <PageHeader title="Prehľad" description={active ? active.companyName : 'Evidencia techniky a jej prevádzky'} />
      <InstallHint />
      {/* Na mobile sú bloky (úlohy, kalendár, čísla) na samostatnej karte, aby Prehľad nebol preplnený. */}
      {isSupabaseConfigured && active && (
        <Link to="/panel" className="mb-4 flex items-center gap-3 rounded-xl border bg-surface p-4 hover:bg-muted lg:hidden">
          <LayoutDashboard className="size-5 shrink-0 text-accent" aria-hidden />
          <span className="min-w-0 flex-1">
            <span className="block font-medium">Môj panel</span>
            <span className="block text-sm text-muted-foreground">Moje úlohy, kalendár, čísla</span>
          </span>
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        </Link>
      )}

      {!isSupabaseConfigured && (
        <div role="status" className="mb-6 rounded-xl border border-accent/40 bg-accent/10 p-4 text-sm">
          <p className="font-medium">Databáza zatiaľ nie je pripojená</p>
          <p className="mt-1 text-muted-foreground">
            Doplňte <code>VITE_SUPABASE_URL</code> a <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> do súboru{' '}
            <code>.env.local</code>.
          </p>
        </div>
      )}

      {/* Na PC (od 1024 px) je stĺpec s blokmi vpravo; na mobile hore nad ostatným. */}
      <div className="flex flex-col lg:grid lg:grid-cols-[1fr_18rem] lg:items-start lg:gap-6 xl:grid-cols-[1fr_20rem]">
        {isSupabaseConfigured && active && (
          <aside className="hidden lg:sticky lg:top-4 lg:order-2 lg:block">
            <SideWidgets company={active} />
          </aside>
        )}
        <div className="min-w-0 lg:order-1">
          {isSupabaseConfigured && active && (
            <>
              {isAdminRole(active.role) && <MigrationBanner />}
              <MyAttendance companyId={active.companyId} />
              <LoanAlerts companyId={active.companyId} />
              <VehicleDeadlineAlerts companyId={active.companyId} />
              <RestockList companyId={active.companyId} />
            </>
          )}

          <ul className="grid grid-cols-2 gap-3 xl:grid-cols-3">
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
        </div>
      </div>
    </>
  )
}
