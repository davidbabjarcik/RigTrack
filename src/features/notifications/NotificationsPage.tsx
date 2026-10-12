import { useQuery } from '@tanstack/react-query'
import { BellRing, ChevronRight, CircleAlert } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ErrorBlock, LoadingBlock } from '@/components/feedback/QueryState'
import { PageHeader } from '@/components/layout/PageHeader'
import { useAuth } from '@/features/auth/auth-context'
import { companyKeys, fetchMyInvitations } from '@/features/companies/api'
import { useCompany } from '@/features/companies/company-context'
import { equipmentKeys, fetchEquipmentList } from '@/features/equipment/api'
import { useLoans } from '@/features/loans/useLoans'
import { useTasks } from '@/features/tasks/useTasks'
import { useVehicles } from '@/features/vehicles/useVehicles'
import { todayIso } from '@/lib/format'
import { buildNotifications, type Notification } from './model'

function NotificationList({ title, items }: { title: string; items: Notification[] }) {
  if (items.length === 0) return null
  const urgent = items[0].severity === 'urgent'
  // Naliehavosť nesie ikona a nadpis skupiny, nielen farba.
  const Icon = urgent ? CircleAlert : BellRing
  return (
    <section className="mb-6">
      <h2 className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Icon className={urgent ? 'size-4 text-destructive' : 'size-4 text-accent'} aria-hidden />
        {title} ({items.length})
      </h2>
      <ul className="divide-y overflow-hidden rounded-xl border bg-surface">
        {items.map((item) => (
          <li key={item.id}>
            <Link to={item.to} className="flex min-h-14 items-center gap-3 px-4 py-3 hover:bg-muted">
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{item.title}</span>
                <span className="block truncate text-sm text-muted-foreground">{item.detail}</span>
              </span>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function NotificationsPage() {
  const companyId = useCompany().active!.companyId
  const user = useAuth().session!.user

  const equipment = useQuery({ queryKey: equipmentKeys.list(companyId), queryFn: () => fetchEquipmentList(companyId) })
  const loans = useLoans(companyId)
  const tasks = useTasks(companyId)
  const vehicles = useVehicles(companyId)
  const invitations = useQuery({
    queryKey: companyKeys.myInvitations(user.id),
    queryFn: () => fetchMyInvitations(user.email!),
  })
  const sources = [equipment, loans, tasks, vehicles, invitations]

  const all = buildNotifications(
    {
      equipment: equipment.data ?? [],
      loans: loans.data ?? [],
      tasks: tasks.data ?? [],
      vehicles: vehicles.data ?? [],
      invitations: invitations.data ?? [],
    },
    todayIso(),
    user.id,
  )

  return (
    <>
      <PageHeader title="Upozornenia" description="Čo práve potrebuje vašu pozornosť" />
      {sources.some((source) => source.isPending) ? (
        <LoadingBlock />
      ) : sources.some((source) => source.isError) ? (
        <ErrorBlock message="Upozornenia sa nepodarilo načítať." onRetry={() => sources.forEach((source) => void source.refetch())} />
      ) : all.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-surface px-6 py-16 text-center">
          <p className="font-medium">Všetko je vybavené</p>
          <p className="mt-1 text-sm text-muted-foreground">Žiadne termíny nehoria a nič nechýba.</p>
        </div>
      ) : (
        <>
          <NotificationList title="Treba riešiť hneď" items={all.filter((item) => item.severity === 'urgent')} />
          <NotificationList title="Blíži sa" items={all.filter((item) => item.severity === 'soon')} />
        </>
      )}
    </>
  )
}
