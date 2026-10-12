import { useQuery } from '@tanstack/react-query'
import { ArrowLeftRight, Car, ListTodo, ShoppingCart, Ticket, Wrench, type LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ErrorBlock, LoadingBlock } from '@/components/feedback/QueryState'
import { PageHeader } from '@/components/layout/PageHeader'
import { useCompany } from '@/features/companies/company-context'
import { equipmentKeys, fetchEquipmentList } from '@/features/equipment/api'
import { useEvents } from '@/features/events/useEvents'
import { useLoans } from '@/features/loans/useLoans'
import { fetchShoppingItems, shoppingKeys } from '@/features/shopping/api'
import { useTasks } from '@/features/tasks/useTasks'
import { useVehicles } from '@/features/vehicles/useVehicles'
import { formatDate, todayIso } from '@/lib/format'
import { cn } from '@/lib/utils'
import { addDays, buildAgenda, ENTRY_KIND_LABELS, ENTRY_KINDS, groupAgenda, type AgendaEntry, type EntryKind } from './model'

const ICONS: Record<EntryKind, LucideIcon> = {
  event: Ticket,
  loan: ArrowLeftRight,
  vehicle: Car,
  task: ListTodo,
  service: Wrench,
  shopping: ShoppingCart,
}

const WINDOWS = [
  { days: 30, label: '30 dní' },
  { days: 90, label: '3 mesiace' },
  { days: 365, label: 'Rok' },
]

function weekday(isoDate: string) {
  const [year, month, day] = isoDate.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('sk-SK', { weekday: 'long' })
}

function EntryRow({ entry, showDate }: { entry: AgendaEntry; showDate?: boolean }) {
  const Icon = ICONS[entry.kind]
  return (
    <Link to={entry.to} className="flex items-center gap-3 px-4 py-3 hover:bg-muted">
      <Icon className="size-5 shrink-0 text-muted-foreground" aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{entry.title}</span>
        <span className="block truncate text-sm text-muted-foreground">
          {ENTRY_KIND_LABELS[entry.kind]} · {entry.detail}
        </span>
      </span>
      {showDate && <span className="shrink-0 text-sm text-destructive">{formatDate(entry.date)}</span>}
    </Link>
  )
}

export function CalendarPage() {
  const companyId = useCompany().active!.companyId
  const [days, setDays] = useState(90)
  const [hidden, setHidden] = useState<EntryKind[]>([])
  const today = todayIso()

  const events = useEvents(companyId)
  const loans = useLoans(companyId)
  const vehicles = useVehicles(companyId)
  const tasks = useTasks(companyId)
  const equipment = useQuery({ queryKey: equipmentKeys.list(companyId), queryFn: () => fetchEquipmentList(companyId) })
  const shopping = useQuery({ queryKey: shoppingKeys.list(companyId), queryFn: () => fetchShoppingItems(companyId) })
  const sources = [events, loans, vehicles, tasks, equipment, shopping]

  const entries = buildAgenda(
    {
      events: events.data ?? [],
      loans: loans.data ?? [],
      vehicles: vehicles.data ?? [],
      tasks: tasks.data ?? [],
      equipment: equipment.data ?? [],
      shopping: shopping.data ?? [],
    },
    today,
  ).filter((entry) => !hidden.includes(entry.kind))
  const { overdue, upcoming, later } = groupAgenda(entries, today, addDays(today, days))
  const toggle = (kind: EntryKind) =>
    setHidden((current) => (current.includes(kind) ? current.filter((value) => value !== kind) : [...current, kind]))

  return (
    <>
      <PageHeader title="Kalendár" description="Termíny zo všetkých častí aplikácie na jednom mieste" />

      <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label="Obdobie">
        {WINDOWS.map((option) => (
          <button
            key={option.days}
            type="button"
            aria-pressed={days === option.days}
            onClick={() => setDays(option.days)}
            className={cn(
              'h-9 rounded-lg border px-3 text-sm font-medium',
              days === option.days ? 'bg-primary text-primary-foreground' : 'bg-surface hover:bg-muted',
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
      <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="Čo zobraziť">
        {ENTRY_KINDS.map((kind) => {
          const Icon = ICONS[kind]
          const shown = !hidden.includes(kind)
          return (
            <button
              key={kind}
              type="button"
              aria-pressed={shown}
              onClick={() => toggle(kind)}
              className={cn(
                'inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-sm',
                shown ? 'bg-muted font-medium' : 'bg-surface text-muted-foreground line-through',
              )}
            >
              <Icon className="size-4" aria-hidden />
              {ENTRY_KIND_LABELS[kind]}
            </button>
          )
        })}
      </div>

      {sources.some((source) => source.isPending) ? (
        <LoadingBlock />
      ) : sources.some((source) => source.isError) ? (
        <ErrorBlock message="Termíny sa nepodarilo načítať." onRetry={() => sources.forEach((source) => void source.refetch())} />
      ) : overdue.length === 0 && upcoming.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-surface px-6 py-16 text-center">
          <p className="font-medium">V tomto období nie sú žiadne termíny</p>
          {later > 0 && <p className="mt-1 text-sm text-muted-foreground">Neskôr ich je {later}; zvoľte dlhšie obdobie.</p>}
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {overdue.length > 0 && (
            <section aria-labelledby="overdue-heading">
              <h2 id="overdue-heading" className="mb-2 text-sm font-medium text-destructive">
                Po termíne ({overdue.length})
              </h2>
              <ul className="divide-y overflow-hidden rounded-xl border border-destructive/40 bg-surface">
                {overdue.map((entry) => (
                  <li key={entry.id}>
                    <EntryRow entry={entry} showDate />
                  </li>
                ))}
              </ul>
            </section>
          )}
          {upcoming.map((group) => (
            <section key={group.date} aria-label={formatDate(group.date)}>
              <h2 className="mb-2 text-sm font-medium text-muted-foreground">
                {group.date === today ? 'Dnes' : group.date === addDays(today, 1) ? 'Zajtra' : weekday(group.date)} ·{' '}
                {formatDate(group.date)}
              </h2>
              <ul className="divide-y overflow-hidden rounded-xl border bg-surface">
                {group.entries.map((entry) => (
                  <li key={entry.id}>
                    <EntryRow entry={entry} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
          {later > 0 && <p className="text-sm text-muted-foreground">Po tomto období je ešte {later} ďalších termínov.</p>}
        </div>
      )}
    </>
  )
}
