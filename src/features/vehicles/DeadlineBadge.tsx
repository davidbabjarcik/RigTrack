import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import { describeDays, type Deadline } from './model'

const STYLES = {
  expired: 'text-destructive',
  soon: 'text-accent',
  ok: 'text-muted-foreground',
}

/** Termín so slovným stavom: „STK · 1. 3. 2027 · o 139 dní“. */
export function DeadlineLine({ deadline, className }: { deadline: Deadline; className?: string }) {
  return (
    <span className={cn(STYLES[deadline.state], className)}>
      {deadline.label} · {formatDate(deadline.date)} · {describeDays(deadline.days)}
    </span>
  )
}
