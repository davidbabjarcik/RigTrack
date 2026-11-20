import { Printer, TriangleAlert } from 'lucide-react'
import { Link } from 'react-router-dom'
import { usePrintedLabels } from '@/features/print/api'
import { formatDate } from '@/lib/format'
import { tf, tx } from '@/lib/i18n'
import { contentPrintState, type ContentGear as Gear } from './model'

/** Riadok pri case: hárok s obsahom vytlačený / nevytlačený / treba vytlačiť znova. */
export function ContentPrintStatus({ companyId, caseId, equipment }: { companyId: string; caseId: string; equipment: Gear[] }) {
  const printed = usePrintedLabels(companyId)
  // Bez migrácie 0123 (null) sa nič neukáže.
  if (!printed.data) return null
  const record = printed.data.find((item) => item.kind === 'case' && item.targetId === caseId && item.label === 'content')
  const status = contentPrintState(record, caseId, equipment)
  const when = status.printedAt ? formatDate(status.printedAt.slice(0, 10)) : ''

  if (status.state === 'changed') {
    return (
      <p role="status" className="mt-2 flex flex-wrap items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
        <TriangleAlert className="size-4 shrink-0" aria-hidden />
        <span className="min-w-0 flex-1">{tf('Obsah case sa od tlače hárku ({0}) zmenil – vytlačte hárok s obsahom znova.', when)}</span>
        <Link to={`/cases/${caseId}/content`} className="inline-flex items-center gap-1 font-medium underline">
          <Printer className="size-4" aria-hidden />
          {tx('Vytlačiť hárok')}
        </Link>
      </p>
    )
  }
  return (
    <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
      <Printer className="size-4" aria-hidden />
      {status.state === 'printed' ? (when ? tf('Hárok s obsahom vytlačený {0}', when) : tx('Hárok s obsahom je vytlačený')) : tx('Hárok s obsahom ešte nebol vytlačený')}
    </p>
  )
}
