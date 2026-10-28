import { useQuery } from '@tanstack/react-query'
import { ArrowDown, ArrowUp, BarChart3, CalendarDays, Check, Settings2 } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/features/auth/auth-context'
import type { Membership } from '@/features/companies/company-context'
import { addDays, entriesByDay, monthGridDays, type AgendaEntry } from '@/features/calendar/model'
import { KIND_STYLES } from '@/features/calendar/kindStyles'
import { equipmentKeys, fetchEquipmentList } from '@/features/equipment/api'
import { useEvents } from '@/features/events/useEvents'
import { isOpen } from '@/features/loans/model'
import { useLoans } from '@/features/loans/useLoans'
import { MyResponsibilities } from '@/features/responsibilities/MyResponsibilities'
import { useUserPrefs } from '@/features/settings/userPrefs'
import { MyTasks } from '@/features/tasks/MyTasks'
import { isAssignedTo, isTaskOverdue } from '@/features/tasks/model'
import { useTasks } from '@/features/tasks/useTasks'
import { formatDate, todayIso } from '@/lib/format'
import { can } from '@/lib/permissions'
import { cn } from '@/lib/utils'
import { DEFAULT_STAT_TILES, DEFAULT_WIDGETS, STAT_TILES, WIDGETS, widgetOrder, type StatTileId, type WidgetId } from './widgets'
import { useCases } from '@/features/cases/useCases'
import { unpackedEquipment } from '@/features/equipment/model'
import { isFillTask } from '@/features/tasks/board'

const WEEKDAYS = ['Po', 'Ut', 'St', 'Št', 'Pi', 'So', 'Ne']

/** Mesiac s bodkami pri dňoch, kde sa niečo deje, a najbližšie termíny. */
function MiniCalendar({ company }: { company: Membership }) {
  const companyId = company.companyId
  const userId = useAuth().session?.user.id
  const today = todayIso()
  const month = today.slice(0, 7)
  const events = useEvents(companyId)
  const loans = useLoans(companyId)
  const tasks = useTasks(companyId)
  const days = monthGridDays(month)
  const byDay = entriesByDay(
    {
      events: can(company, 'events.view') ? (events.data ?? []) : [],
      loans: can(company, 'loans.view') ? (loans.data ?? []) : [],
      vehicles: [],
      tasks: (tasks.data ?? []).filter((task) => isAssignedTo(task, userId)),
      equipment: [],
      shopping: [],
    },
    today,
    days[0],
    days[days.length - 1],
  )
  const upcoming: AgendaEntry[] = []
  for (const day of days.filter((value) => value >= today)) {
    for (const entry of byDay.get(day) ?? []) if (!upcoming.some((other) => other.title === entry.title)) upcoming.push(entry)
  }
  const title = new Date(`${today}T00:00:00`).toLocaleDateString('sk-SK', { month: 'long', year: 'numeric' })

  return (
    <section aria-labelledby="mini-calendar-heading" className="mb-6 rounded-xl border bg-surface p-4">
      <h2 id="mini-calendar-heading" className="mb-2 flex items-center gap-2 font-medium">
        <CalendarDays className="size-5 text-accent" aria-hidden />
        <Link to="/calendar" className="capitalize hover:underline">
          {title}
        </Link>
      </h2>
      <div className="grid grid-cols-7 gap-0.5 text-center text-xs">
        {WEEKDAYS.map((day) => (
          <span key={day} className="py-1 text-muted-foreground">
            {day}
          </span>
        ))}
        {days.map((day) => {
          const entries = byDay.get(day) ?? []
          return (
            <span
              key={day}
              title={entries.map((entry) => entry.title).join(', ')}
              className={cn(
                'flex h-8 flex-col items-center justify-center rounded-md',
                !day.startsWith(month) && 'text-muted-foreground/50',
                day === today && 'bg-primary font-semibold text-primary-foreground',
              )}
            >
              {Number(day.slice(8))}
              <span className="flex h-1.5 gap-0.5">
                {[...new Set(entries.map((entry) => entry.kind))].slice(0, 3).map((kind) => (
                  <span key={kind} className={cn('size-1.5 rounded-full', KIND_STYLES[kind].dot)} />
                ))}
              </span>
            </span>
          )
        })}
      </div>
      {upcoming.length > 0 ? (
        <ul className="mt-3 flex flex-col gap-1 text-sm">
          {upcoming.slice(0, 5).map((entry) => (
            <li key={entry.id}>
              <Link to={entry.to} className="flex items-center gap-2 rounded-md px-1 py-0.5 hover:bg-muted">
                <span className={cn('size-2 shrink-0 rounded-full', KIND_STYLES[entry.kind].dot)} aria-hidden />
                <span className="min-w-0 flex-1 truncate">{entry.title}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{formatDate(entry.date)}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">Do konca mesiaca nič naplánované.</p>
      )}
    </section>
  )
}

/** Pár čísel na prvý pohľad. */
function QuickStats({ company, tileIds }: { company: Membership; tileIds: StatTileId[] }) {
  const companyId = company.companyId
  const userId = useAuth().session?.user.id
  const today = todayIso()
  const equipment = useQuery({ queryKey: equipmentKeys.list(companyId), queryFn: () => fetchEquipmentList(companyId), enabled: can(company, 'equipment.view') })
  const loans = useLoans(companyId)
  const events = useEvents(companyId)
  const tasks = useTasks(companyId)
  const cases = useCases(companyId)
  const gear = (equipment.data ?? []).filter((item) => item.status !== 'retired' && item.kind !== 'consumable')
  const mine = (tasks.data ?? []).filter((task) => isAssignedTo(task, userId) && task.status !== 'done')
  const sum = (items: { quantity: number }[]) => items.reduce((total, item) => total + item.quantity, 0)
  const filled = new Set(gear.map((item) => item.caseId).filter(Boolean))
  const seeGear = can(company, 'equipment.view')
  const all: Record<StatTileId, { value: number; to: string } | false> = {
    // Technika bez káblov; káble zvlášť v kusoch a v metroch (dĺžka × počet).
    pieces: seeGear && { value: sum(gear.filter((item) => item.kind !== 'cable')), to: '/equipment' },
    cables: seeGear && { value: sum(gear.filter((item) => item.kind === 'cable')), to: '/equipment' },
    cableMeters: seeGear && { value: Math.round(gear.filter((item) => item.kind === 'cable').reduce((total, item) => total + (item.attributes.lengthM ?? 0) * item.quantity, 0)), to: '/equipment' },
    inService: seeGear && { value: gear.filter((item) => item.status === 'in_service').length, to: '/equipment' },
    unpacked: seeGear && { value: sum(unpackedEquipment(gear)), to: '/equipment?case=none' },
    emptyCases: seeGear && { value: (cases.data ?? []).filter((item) => !filled.has(item.id)).length, to: '/cases' },
    events30: can(company, 'events.view') && { value: (events.data ?? []).filter((event) => event.status !== 'cancelled' && event.endsOn >= today && event.startsOn <= addDays(today, 30)).length, to: '/events' },
    loans: can(company, 'loans.view') && { value: (loans.data ?? []).filter(isOpen).length, to: '/loans' },
    myTasks: { value: mine.length, to: '/todos' },
    overdue: { value: mine.filter((task) => isTaskOverdue(task, today)).length, to: '/todos' },
    fill: { value: mine.filter(isFillTask).length, to: '/todos' },
  }
  const tiles = tileIds.flatMap((id) => {
    const tile = all[id]
    return tile ? [{ ...tile, label: STAT_TILES[id] }] : []
  })

  return (
    <section aria-labelledby="quick-stats-heading" className="mb-6 rounded-xl border bg-surface p-4">
      <h2 id="quick-stats-heading" className="mb-2 flex items-center gap-2 font-medium">
        <BarChart3 className="size-5 text-accent" aria-hidden />
        <Link to="/stats" className="hover:underline">
          Štatistiky
        </Link>
      </h2>
      <div className="grid grid-cols-2 gap-2">
        {tiles.map((tile) => (
          <Link key={tile.label} to={tile.to} className="rounded-lg border p-2 hover:bg-muted">
            <span className="block text-xl font-semibold">{tile.value}</span>
            <span className="block text-xs text-muted-foreground">{tile.label}</span>
          </Link>
        ))}
      </div>
    </section>
  )
}

/** Stĺpec na kraji Prehľadu: bloky si každý zapne, vypne a zoradí (uloží sa k účtu). */
/** Bloky na Prehľade (PC) alebo na karte Môj panel (mobil) – každé rozloženie má vlastné nastavenie. */
export function SideWidgets({ company, layout = 'desktop' }: { company: Membership; layout?: 'desktop' | 'mobile' }) {
  const { prefs, update } = useUserPrefs()
  const [editing, setEditing] = useState(false)
  const saved = (layout === 'mobile' ? prefs.dashboardWidgetsMobile : undefined) ?? prefs.dashboardWidgets ?? DEFAULT_WIDGETS
  const shown = widgetOrder(saved).filter((id) => saved.includes(id))
  const order = widgetOrder(shown)
  const set = (next: WidgetId[]) => update(layout === 'mobile' ? { dashboardWidgetsMobile: next } : { dashboardWidgets: next })
  const tileIds = (prefs.statsTiles ?? DEFAULT_STAT_TILES).filter((id): id is StatTileId => id in STAT_TILES)
  const toggleTile = (id: StatTileId) => update({ statsTiles: tileIds.includes(id) ? tileIds.filter((value) => value !== id) : [...tileIds, id] })
  const move = (id: WidgetId, by: number) => {
    const list = shown.filter((value) => value !== id)
    const index = Math.min(Math.max(shown.indexOf(id) + by, 0), list.length)
    set([...list.slice(0, index), id, ...list.slice(index)] as WidgetId[])
  }

  const render = (id: WidgetId) => {
    switch (id) {
      case 'responsibilities':
        return <MyResponsibilities key={id} companyId={company.companyId} />
      case 'tasks':
        return <MyTasks key={id} companyId={company.companyId} />
      case 'calendar':
        return <MiniCalendar key={id} company={company} />
      case 'stats':
        return <QuickStats key={id} company={company} tileIds={tileIds} />
    }
  }

  return (
    <>
      {editing ? (
        <section className="mb-6 rounded-xl border border-accent/40 bg-surface p-4">
          <h2 className="mb-2 font-medium">Čo chcem vidieť {layout === 'mobile' ? 'na mobile' : 'na PC'}</h2>
          <ul className="flex flex-col gap-1">
            {order.map((id) => {
              const on = shown.includes(id)
              return (
                <li key={id} className="flex items-center gap-2">
                  <label className="flex flex-1 items-center gap-2 text-sm">
                    <input type="checkbox" className="size-4" checked={on} onChange={() => set(on ? shown.filter((value) => value !== id) : [...shown, id])} />
                    {WIDGETS[id]}
                  </label>
                  {on && (
                    <>
                      <button type="button" aria-label={`Vyššie: ${WIDGETS[id]}`} className="rounded p-1 hover:bg-muted" onClick={() => move(id, -1)}>
                        <ArrowUp className="size-4" aria-hidden />
                      </button>
                      <button type="button" aria-label={`Nižšie: ${WIDGETS[id]}`} className="rounded p-1 hover:bg-muted" onClick={() => move(id, 1)}>
                        <ArrowDown className="size-4" aria-hidden />
                      </button>
                    </>
                  )}
                </li>
              )
            })}
          </ul>
          {shown.includes('stats') && (
            <fieldset className="mt-3 border-t pt-3">
              <legend className="mb-1 text-sm font-medium">V bloku Štatistiky</legend>
              <div className="grid gap-1 sm:grid-cols-2">
                {(Object.keys(STAT_TILES) as StatTileId[]).map((id) => (
                  <label key={id} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" className="size-4" checked={tileIds.includes(id)} onChange={() => toggleTile(id)} />
                    {STAT_TILES[id]}
                  </label>
                ))}
              </div>
            </fieldset>
          )}
          <button type="button" className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline" onClick={() => setEditing(false)}>
            <Check className="size-4" aria-hidden />
            Hotovo
          </button>
        </section>
      ) : null}
      {shown.filter((id): id is WidgetId => id in WIDGETS).map(render)}
      {!editing && (
        <button type="button" className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground" onClick={() => setEditing(true)}>
          <Settings2 className="size-4" aria-hidden />
          Upraviť tento stĺpec
        </button>
      )}
    </>
  )
}
