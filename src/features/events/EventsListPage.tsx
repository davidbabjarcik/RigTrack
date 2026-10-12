import { ChevronRight, Plus } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ErrorBlock, LoadingBlock } from '@/components/feedback/QueryState'
import { PageHeader } from '@/components/layout/PageHeader'
import { LinkButton } from '@/components/ui/button'
import { useCompany } from '@/features/companies/company-context'
import { formatDate, todayIso } from '@/lib/format'
import { canEditInventory } from '@/lib/permissions'
import { cn } from '@/lib/utils'
import { EventStatusBadge } from './EventStatusBadge'
import { isLive, sortEvents } from './model'
import { useEvents } from './useEvents'

export function EventsListPage() {
  const company = useCompany().active!
  const canEdit = canEditInventory(company.role)
  const events = useEvents(company.companyId)
  const [showPast, setShowPast] = useState(false)
  const today = todayIso()

  const all = sortEvents(events.data ?? [], today)
  const upcoming = all.filter((event) => isLive(event) && event.endsOn >= today)
  const visible = showPast ? all : upcoming

  return (
    <>
      <PageHeader
        title="Eventy"
        description="Akcie, technika na ne, posádka a dokumenty"
        action={
          canEdit && (
            <LinkButton to="/events/new">
              <Plus className="size-4" aria-hidden />
              Nový
            </LinkButton>
          )
        }
      />

      <div className="mb-4 flex gap-2" role="group" aria-label="Filter eventov">
        {[
          { past: false, label: `Nadchádzajúce (${upcoming.length})` },
          { past: true, label: `Všetky (${all.length})` },
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
            {option.label}
          </button>
        ))}
      </div>

      {events.isPending ? (
        <LoadingBlock />
      ) : events.isError ? (
        <ErrorBlock message="Eventy sa nepodarilo načítať." onRetry={() => void events.refetch()} />
      ) : visible.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-surface px-6 py-16 text-center">
          <p className="font-medium">{all.length === 0 ? 'Zatiaľ tu nie je žiadny event' : 'Žiadny nadchádzajúci event'}</p>
          {canEdit && all.length === 0 && <p className="mt-1 text-sm text-muted-foreground">Začnite tlačidlom Nový.</p>}
        </div>
      ) : (
        <ul className="divide-y overflow-hidden rounded-xl border bg-surface">
          {visible.map((event) => (
            <li key={event.id}>
              <Link to={`/events/${event.id}`} className="flex min-h-16 items-center gap-3 px-4 py-3 hover:bg-muted">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{event.name}</span>
                  <span className="block truncate text-sm text-muted-foreground">
                    {[
                      event.startsOn === event.endsOn ? formatDate(event.startsOn) : `${formatDate(event.startsOn)} – ${formatDate(event.endsOn)}`,
                      event.venue,
                      event.client,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </span>
                <EventStatusBadge status={event.status} />
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
