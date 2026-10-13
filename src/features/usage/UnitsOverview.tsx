import { Link } from 'react-router-dom'
import { unitIdsOf, type Equipment } from '@/features/equipment/model'
import { useLoans } from '@/features/loans/useLoans'
import { useServiceRecords } from '@/features/service/useServiceRecords'
import { formatDate, todayIso } from '@/lib/format'
import { cn } from '@/lib/utils'
import { unitSummaries } from './model'

const STATE_STYLES = {
  free: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  reserved: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  loaned: 'bg-violet-500/15 text-violet-700 dark:text-violet-400',
  service: 'bg-sky-500/15 text-sky-700 dark:text-sky-400',
}
const STATE_LABELS = { free: 'Voľný', reserved: 'Rezervovaný', loaned: 'Vypožičaný', service: 'V servise' }

type Props = { companyId: string; equipment: Pick<Equipment, 'id' | 'quantity' | 'unitIds'> }

/** Prehľad očíslovaných kusov techniky: kde je ktorý kus teraz a čo má za sebou. */
export function UnitsOverview({ companyId, equipment }: Props) {
  const loans = useLoans(companyId)
  const records = useServiceRecords(companyId)
  const units = unitSummaries(equipment.id, unitIdsOf(equipment), loans.data ?? [], records.data ?? [], todayIso())

  return (
    <section className="mt-6" aria-labelledby="units-heading">
      <h2 id="units-heading" className="mb-2 text-sm font-medium text-muted-foreground">
        Kusy ({units.length})
      </h2>
      <ul className="divide-y overflow-hidden rounded-xl border bg-surface">
        {units.map((unit) => (
          <li key={unit.unit} className="flex items-center gap-3 px-4 py-2.5">
            <span className="w-10 shrink-0 font-semibold tabular-nums">#{unit.unit}</span>
            <span className="min-w-0 flex-1 text-sm text-muted-foreground">
              <span className="block truncate">
                servis {unit.serviceCount}× · výpožičky {unit.loanCount}×
              </span>
              {unit.current ? (
                <Link to={unit.current.to} className="block truncate text-accent hover:underline">
                  {unit.current.label}
                </Link>
              ) : (
                unit.lastLoan && (
                  <Link to={`/loans/${unit.lastLoan.id}`} className="block truncate hover:underline">
                    naposledy {unit.lastLoan.borrower}, {formatDate(unit.lastLoan.startsOn)}
                  </Link>
                )
              )}
            </span>
            <span className={cn('inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium', STATE_STYLES[unit.state])}>
              {STATE_LABELS[unit.state]}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
