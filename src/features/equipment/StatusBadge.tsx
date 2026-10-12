import { cn } from '@/lib/utils'
import { STATUS_LABELS, type EquipmentStatus } from './model'

const STYLES: Record<EquipmentStatus, string> = {
  available: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  loaned: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  in_service: 'bg-sky-500/15 text-sky-700 dark:text-sky-400',
  damaged: 'bg-red-500/15 text-red-700 dark:text-red-400',
  retired: 'bg-muted text-muted-foreground',
}

export function StatusBadge({ status }: { status: EquipmentStatus }) {
  return (
    <span className={cn('inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium', STYLES[status])}>
      {STATUS_LABELS[status]}
    </span>
  )
}
