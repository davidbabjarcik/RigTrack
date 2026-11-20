import { cn } from '@/lib/utils'
import { todayIso } from '@/lib/format'
import { EVENT_STATUS_LABELS, shownStatus, type EventStatus } from './model'
import { tx } from '@/lib/i18n'

const STYLES: Record<EventStatus, string> = {
  planned: 'bg-sky-500/15 text-sky-700 dark:text-sky-400',
  confirmed: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  done: 'bg-muted text-muted-foreground',
  cancelled: 'bg-red-500/15 text-red-700 dark:text-red-400',
}

/** Štítok stavu; s `endsOn` sa event po termíne ukáže ako odohraný, aj keď ho nikto neprepol. */
export function EventStatusBadge({ status: saved, endsOn }: { status: EventStatus; endsOn?: string }) {
  const status = endsOn ? shownStatus({ status: saved, endsOn }, todayIso()) : saved
  return (
    <span className={cn('inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium', STYLES[status])}>
      {tx(EVENT_STATUS_LABELS[status])}
    </span>
  )
}
