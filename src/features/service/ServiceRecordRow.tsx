import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import { SERVICE_KIND_LABELS, SERVICE_STATUS_LABELS, type ServiceRecord } from './model'

const STATUS_STYLES = {
  open: 'bg-red-500/15 text-red-700 dark:text-red-400',
  in_progress: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  done: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
}

type Props = {
  record: ServiceRecord
  /** Názov techniky; v detaile techniky sa vynecháva, lebo je zrejmý. */
  equipmentName?: string
}

/** Jeden servisný záznam v zozname; kliknutím sa otvorí na úpravu. */
export function ServiceRecordRow({ record, equipmentName }: Props) {
  const summary = record.problem || record.workDone
  return (
    <Link to={`/service/${record.id}`} className="flex min-h-16 items-center gap-3 px-4 py-3 hover:bg-muted">
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{equipmentName ?? SERVICE_KIND_LABELS[record.kind]}</span>
        <span className="block truncate text-sm text-muted-foreground">
          {[equipmentName && SERVICE_KIND_LABELS[record.kind], formatDate(record.happenedOn), record.technician].filter(Boolean).join(' · ')}
        </span>
        {summary && <span className="block truncate text-sm">{summary}</span>}
      </span>
      <span className={cn('inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium', STATUS_STYLES[record.status])}>
        {SERVICE_STATUS_LABELS[record.status]}
      </span>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
    </Link>
  )
}
