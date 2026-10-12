import { cn } from '@/lib/utils'
import { EVENT_STATUS_LABELS, type EventStatus } from './model'

const STYLES: Record<EventStatus, string> = {
  planned: 'bg-sky-500/15 text-sky-700 dark:text-sky-400',
  confirmed: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  done: 'bg-muted text-muted-foreground',
  cancelled: 'bg-red-500/15 text-red-700 dark:text-red-400',
}

export function EventStatusBadge({ status }: { status: EventStatus }) {
  return (
    <span className={cn('inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium', STYLES[status])}>
      {EVENT_STATUS_LABELS[status]}
    </span>
  )
}
