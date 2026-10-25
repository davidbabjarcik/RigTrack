import { CalendarDays, TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCompany, type Membership } from '@/features/companies/company-context'
import { formatDate, todayIso } from '@/lib/format'
import { cn } from '@/lib/utils'
import { byMonth, overlaps, useMyEvents, type MyEvent } from './myCalendar'

const MONTHS = ['január', 'február', 'marec', 'apríl', 'máj', 'jún', 'júl', 'august', 'september', 'október', 'november', 'december']
const RESPONSE = { pending: 'nepotvrdené', yes: 'idem', no: 'nemôžem' } as const
// Farby firiem v kalendári (podľa poradia firiem), aby sa dali akcie rýchlo rozlíšiť.
const DOTS = ['bg-sky-500', 'bg-amber-500', 'bg-emerald-500', 'bg-violet-500', 'bg-rose-500', 'bg-teal-500']

/** Moje akcie zo všetkých firiem; prekrývajúce sa akcie sú označené červenou. */
export function MyCalendar({ userId, memberships }: { userId: string; memberships: Membership[] }) {
  const events = useMyEvents(userId)
  const navigate = useNavigate()
  const { setActive } = useCompany()
  const [past, setPast] = useState(false)
  if (events.isPending) return <p className="rounded-xl border bg-surface p-4 text-sm text-muted-foreground">Načítavam…</p>
  if (events.isError) return <p className="rounded-xl border bg-surface p-4 text-sm text-muted-foreground">Kalendár sa nepodarilo načítať.</p>

  const today = todayIso()
  const shown = events.data.filter((event) => (past ? event.endsOn < today : event.endsOn >= today))
  const clashes = overlaps(events.data)
  const upcomingClashes = events.data.filter((event) => event.endsOn >= today && clashes.has(event.id)).length
  const companyIndex = (companyId: string) => Math.max(0, memberships.findIndex((item) => item.companyId === companyId))
  const companyName = (companyId: string) => memberships.find((item) => item.companyId === companyId)?.companyName ?? 'firma'
  const range = (event: Pick<MyEvent, 'startsOn' | 'endsOn'>) => (event.startsOn === event.endsOn ? formatDate(event.startsOn) : `${formatDate(event.startsOn)} – ${formatDate(event.endsOn)}`)
  const open = (event: MyEvent) => {
    setActive(event.companyId)
    navigate(`/events/${event.id}`)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-surface p-3">
        <div role="tablist" className="flex gap-1 rounded-lg bg-muted p-1">
          {[false, true].map((value) => (
            <button
              key={String(value)}
              type="button"
              role="tab"
              aria-selected={past === value}
              onClick={() => setPast(value)}
              className={cn('rounded-md px-3 py-1 text-sm font-medium', past === value ? 'bg-surface text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}
            >
              {value ? 'Minulé' : 'Nadchádzajúce'}
            </button>
          ))}
        </div>
        {memberships.length > 1 && (
          <ul className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            {memberships.map((item, index) => (
              <li key={item.companyId} className="flex items-center gap-1.5">
                <span className={cn('size-2.5 rounded-full', DOTS[index % DOTS.length])} aria-hidden />
                {item.companyName}
              </li>
            ))}
          </ul>
        )}
      </div>

      {upcomingClashes > 0 && !past && (
        <p role="alert" className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
          Niektoré akcie sa prekrývajú ({upcomingClashes}) – si v posádke na dvoch miestach naraz. Sú označené červenou.
        </p>
      )}

      {shown.length === 0 ? (
        <p className="rounded-xl border border-dashed bg-surface p-6 text-center text-sm text-muted-foreground">
          <CalendarDays className="mx-auto mb-2 size-6" aria-hidden />
          {past ? 'Žiadne minulé akcie.' : 'Zatiaľ nemáte žiadne nadchádzajúce akcie.'}
        </p>
      ) : (
        (past ? byMonth(shown).reverse() : byMonth(shown)).map(([month, list]) => (
          <section key={month}>
            <h3 className="mb-2 text-sm font-medium text-muted-foreground">
              {MONTHS[Number(month.slice(5)) - 1]} {month.slice(0, 4)}
            </h3>
            <ul className="divide-y overflow-hidden rounded-xl border bg-surface">
              {(past ? [...list].reverse() : list).map((event) => {
                const clash = clashes.get(event.id)
                return (
                  <li key={event.id}>
                    <button type="button" onClick={() => open(event)} className={cn('flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-muted', clash && 'bg-destructive/5')}>
                      <span className={cn('mt-1.5 size-2.5 shrink-0 rounded-full', DOTS[companyIndex(event.companyId) % DOTS.length])} aria-hidden />
                      <span className="min-w-0 flex-1">
                        <span className={cn('block font-medium', event.cancelled && 'line-through opacity-60')}>{event.name}</span>
                        <span className="block text-sm text-muted-foreground">
                          {[range(event), event.venue, companyName(event.companyId), event.cancelled ? 'zrušené' : RESPONSE[event.response]].filter(Boolean).join(' · ')}
                        </span>
                        {clash && (
                          <span className="mt-0.5 flex items-center gap-1 text-sm text-destructive">
                            <TriangleAlert className="size-3.5 shrink-0" aria-hidden />
                            Prekrýva sa s: {clash.map((other) => `${other.name} (${companyName(other.companyId)})`).join(', ')}
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>
        ))
      )}
    </div>
  )
}
