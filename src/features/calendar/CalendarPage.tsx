import { useQuery } from '@tanstack/react-query'
import { ArrowLeftRight, CalendarDays, CalendarPlus, CalendarX, Gift, Car, List, ListTodo, ShoppingCart, Ticket, Wrench, type LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ErrorBlock, LoadingBlock } from '@/components/feedback/QueryState'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { useCompany } from '@/features/companies/company-context'
import { equipmentKeys, fetchEquipmentList } from '@/features/equipment/api'
import { useEvents } from '@/features/events/useEvents'
import { useLoans } from '@/features/loans/useLoans'
import { fetchShoppingItems, shoppingKeys } from '@/features/shopping/api'
import { useTasks } from '@/features/tasks/useTasks'
import { useStaff } from '@/features/staff/useStaff'
import { Availability } from '@/features/staff/Availability'
import { useAuth } from '@/features/auth/auth-context'
import { useVehicles } from '@/features/vehicles/useVehicles'
import { formatDate, todayIso } from '@/lib/format'
import { downloadIcs } from '@/lib/ics'
import { cn } from '@/lib/utils'
import { CalendarGrid } from './CalendarGrid'
import { calendarExport } from './export'
import { KIND_STYLES } from './kindStyles'
import {
  addDays,
  buildAgenda,
  ENTRY_KIND_LABELS,
  ENTRY_KINDS,
  entriesByDay,
  groupAgenda,
  monthGridDays,
  type AgendaEntry,
  type AgendaSources,
  type EntryKind,
} from './model'

const ICONS: Record<EntryKind, LucideIcon> = {
  event: Ticket,
  loan: ArrowLeftRight,
  vehicle: Car,
  task: ListTodo,
  service: Wrench,
  shopping: ShoppingCart,
  celebration: Gift,
  away: CalendarX,
}

const VIEW_KEY = 'rigtrack.calendar.view'

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
    <Link to={entry.to} className={cn('flex items-center gap-3 border-l-4 px-4 py-3 hover:bg-muted', KIND_STYLES[entry.kind].bar)}>
      <Icon className={cn('size-5 shrink-0', KIND_STYLES[entry.kind].text)} aria-hidden />
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
  const userId = useAuth().session?.user.id
  const [days, setDays] = useState(90)
  const [hidden, setHidden] = useState<EntryKind[]>([])
  const today = todayIso()
  // Zvolený pohľad si prehliadač pamätá.
  const [view, setView] = useState<'list' | 'grid'>(() => (localStorage.getItem(VIEW_KEY) === 'grid' ? 'grid' : 'list'))
  const [month, setMonth] = useState(today.slice(0, 7))
  const chooseView = (next: 'list' | 'grid') => {
    setView(next)
    localStorage.setItem(VIEW_KEY, next)
  }

  const events = useEvents(companyId)
  const loans = useLoans(companyId)
  const vehicles = useVehicles(companyId)
  const tasks = useTasks(companyId)
  const equipment = useQuery({ queryKey: equipmentKeys.list(companyId), queryFn: () => fetchEquipmentList(companyId) })
  const shopping = useQuery({ queryKey: shoppingKeys.list(companyId), queryFn: () => fetchShoppingItems(companyId) })
  const staff = useStaff(companyId)
  const sources = [events, loans, vehicles, tasks, equipment, shopping]

  const data: AgendaSources = {
    events: events.data ?? [],
    loans: loans.data ?? [],
    vehicles: vehicles.data ?? [],
    tasks: tasks.data ?? [],
    equipment: equipment.data ?? [],
    shopping: shopping.data ?? [],
    people: staff.people,
    unavailability: staff.unavailability,
  }
  // Moja karta v tíme: tu si zapisujem, kedy nemôžem (vedúci to uvidí pri plánovaní posádky).
  const me = staff.people.find((person) => person.memberId === userId)
  const entries = buildAgenda(data, today).filter((entry) => !hidden.includes(entry.kind))
  const gridDays = monthGridDays(month)
  const gridEntries = new Map(
    [...entriesByDay(data, today, gridDays[0], gridDays[gridDays.length - 1])].map(([day, dayEntries]) => [
      day,
      dayEntries.filter((entry) => !hidden.includes(entry.kind)),
    ]),
  )
  const { overdue, upcoming, later } = groupAgenda(entries, today, addDays(today, days))
  const toggle = (kind: EntryKind) =>
    setHidden((current) => (current.includes(kind) ? current.filter((value) => value !== kind) : [...current, kind]))

  return (
    <>
      <PageHeader
        title="Kalendár"
        description="Termíny zo všetkých častí aplikácie na jednom mieste"
        action={
          <Button
            variant="outline"
            disabled={events.isPending || loans.isPending}
            title="Stiahne eventy a výpožičky (od minulého mesiaca) ako .ics – otvoríte ho v telefóne, Google Kalendári alebo Outlooku"
            onClick={() => downloadIcs(`rigtrack-kalendar-${today}`, calendarExport(data.events, data.loans, addDays(today, -30)))}
          >
            <CalendarPlus className="size-4" aria-hidden />
            Export do kalendára
          </Button>
        }
      />

      {me && (
        <div className="mb-5">
          <Availability companyId={companyId} person={me} canEdit title="Kedy nemôžem" />
        </div>
      )}

      <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label="Zobrazenie">
        {(
          [
            { id: 'list', label: 'Zoznam', icon: List },
            { id: 'grid', label: 'Mriežka', icon: CalendarDays },
          ] as const
        ).map((option) => (
          <button
            key={option.id}
            type="button"
            aria-pressed={view === option.id}
            onClick={() => chooseView(option.id)}
            className={cn(
              'inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium',
              view === option.id ? 'bg-primary text-primary-foreground' : 'bg-surface hover:bg-muted',
            )}
          >
            <option.icon className="size-4" aria-hidden />
            {option.label}
          </button>
        ))}
      </div>
      <div className={cn('mb-3 flex flex-wrap gap-2', view === 'grid' && 'hidden')} role="group" aria-label="Obdobie">
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
                shown ? cn('border-transparent font-medium', KIND_STYLES[kind].chip) : 'bg-surface text-muted-foreground line-through',
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
      ) : view === 'grid' ? (
        <CalendarGrid month={month} today={today} entries={gridEntries} onMonthChange={setMonth} renderEntry={(entry) => <EntryRow entry={entry} />} />
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
