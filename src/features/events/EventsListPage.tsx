import { ChevronRight, Disc3, Plus, Route } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ErrorBlock, LoadingBlock } from '@/components/feedback/QueryState'
import { PageHeader } from '@/components/layout/PageHeader'
import { SharedEventsSection } from '@/features/links/SharedEventsSection'
import { LinkButton } from '@/components/ui/button'
import { useCompany } from '@/features/companies/company-context'
import { formatDate, todayIso } from '@/lib/format'
import { can } from '@/lib/permissions'
import { cn } from '@/lib/utils'
import { EventStatusBadge } from './EventStatusBadge'
import { djCrew, isLive, sortEvents } from './model'
import { memberName, useMembers } from '@/features/companies/useMembers'
import { useEvents } from './useEvents'
import { tx, tf } from '@/lib/i18n'

export function EventsListPage() {
  const company = useCompany().active!
  const canEdit = can(company, 'events.edit')
  const events = useEvents(company.companyId)
  const members = useMembers(company.companyId)
  const [showPast, setShowPast] = useState(false)
  const today = todayIso()

  const all = sortEvents(events.data ?? [], today)
  const upcoming = all.filter((event) => isLive(event) && event.endsOn >= today)
  const visible = showPast ? all : upcoming

  return (
    <>
      <PageHeader
        title={tx('Eventy')}
        description={tx('Akcie, technika na ne, posádka a dokumenty')}
        action={
          canEdit && (
            <div className="flex flex-wrap gap-2">
              <LinkButton to="/tours" variant="outline">
                <Route className="size-4" aria-hidden />{tx('Turné')}</LinkButton>
              <LinkButton to="/events/new?kind=dj" variant="outline">
                <Disc3 className="size-4" aria-hidden />{tx('DJ hranie')}</LinkButton>
              <LinkButton to="/events/new">
                <Plus className="size-4" aria-hidden />{tx('Nový')}</LinkButton>
            </div>
          )
        }
      />

      <div className="mb-4 flex gap-2" role="group" aria-label={tx('Filter eventov')}>
        {[
          { past: false, label: tf('Nadchádzajúce ({0})', upcoming.length) },
          { past: true, label: tf('Všetky ({0})', all.length) },
        ].map((option) => (
          <button
            key={option.label}
            type="button"
            aria-pressed={showPast === option.past}
            onClick={() => setShowPast(option.past)}
            className={cn(
              'h-9 rounded-lg border px-3 text-sm font-medium',
              showPast === option.past ? 'bg-primary text-primary-foreground' : 'bg-surface hover:bg-muted',
            )}
          >
            {tx(option.label)}
          </button>
        ))}
      </div>

      {events.isPending ? (
        <LoadingBlock />
      ) : events.isError ? (
        <ErrorBlock message={tx('Eventy sa nepodarilo načítať.')} onRetry={() => void events.refetch()} />
      ) : visible.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-surface px-6 py-16 text-center">
          <p className="font-medium">{all.length === 0 ? tx('Zatiaľ tu nie je žiadny event') : tx('Žiadny nadchádzajúci event')}</p>
          {canEdit && all.length === 0 && <p className="mt-1 text-sm text-muted-foreground">{tx('Začnite tlačidlom Nový.')}</p>}
        </div>
      ) : (
        <ul className="divide-y overflow-hidden rounded-xl border bg-surface">
          {visible.map((event) => (
            <li key={event.id}>
              <Link to={`/events/${event.id}`} className="flex min-h-16 items-center gap-3 px-4 py-3 hover:bg-muted">
                <span className="min-w-0 flex-1">
                  <span className="flex min-w-0 items-center gap-2">
                    {event.kind === 'dj' && (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-fuchsia-500/15 px-2 py-0.5 text-xs font-medium text-fuchsia-800 dark:text-fuchsia-200">
                        <Disc3 className="size-3" aria-hidden />DJ
                      </span>
                    )}
                    <span className="truncate font-medium">{event.name}</span>
                  </span>
                  <span className="block truncate text-sm text-muted-foreground">
                    {[
                      event.startsOn === event.endsOn ? formatDate(event.startsOn) : `${formatDate(event.startsOn)} – ${formatDate(event.endsOn)}`,
                      event.venue,
                      event.kind === 'dj' && djCrew(event).map((person) => person.memberId ? memberName(members.data, person.memberId) : person.name).filter(Boolean).join(', '),
                      event.client,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </span>
                <EventStatusBadge status={event.status} endsOn={event.endsOn} />
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-6">
        <SharedEventsSection companyId={company.companyId} canEdit={canEdit} />
      </div>
    </>
  )
}
