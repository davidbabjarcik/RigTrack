import { cn } from '@/lib/utils'
import { STATUS_LABELS, type EquipmentStatus } from './model'
import { tx } from '@/lib/i18n'

const STYLES: Record<EquipmentStatus, string> = {
  available: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  loaned: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  in_service: 'bg-sky-500/15 text-sky-700 dark:text-sky-400',
  damaged: 'bg-red-500/15 text-red-700 dark:text-red-400',
  retired: 'bg-muted text-muted-foreground',
  archived: 'bg-violet-500/15 text-violet-700 dark:text-violet-400',
  sold: 'bg-muted text-muted-foreground line-through decoration-1',
}

export function StatusBadge({ status }: { status: EquipmentStatus }) {
  return (
    <span className={cn('inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium', STYLES[status])}>
      {tx(STATUS_LABELS[status])}
    </span>
  )
}
