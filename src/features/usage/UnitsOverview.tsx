import { Link } from 'react-router-dom'
import { CollapsibleSection } from '@/components/layout/CollapsibleSection'
import { describeUnitDmx, unitIdsOf, type Equipment } from '@/features/equipment/model'
import { useLoans } from '@/features/loans/useLoans'
import { useQuery } from '@tanstack/react-query'
import { fetchPurchases, orderKeys } from '@/features/orders/api'
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

type Props = {
  companyId: string
  equipment: Pick<Equipment, 'id' | 'quantity' | 'unitIds' | 'unitInfo' | 'unitPurchases'>
  showInvoices?: boolean
  /** Len jeden kus (otvorený cez QR alebo z prehľadu kusov). */
  only?: number | null
}

/** Prehľad očíslovaných kusov techniky: kde je ktorý kus teraz a čo má za sebou. */
export function UnitsOverview({ companyId, equipment, showInvoices = false, only = null }: Props) {
  const loans = useLoans(companyId)
  const records = useServiceRecords(companyId)
  // Faktúry ku kusom: nákupy prepojené s číslami kusov (vidí, kto vidí objednávky).
  const purchases = useQuery({ queryKey: orderKeys.purchases(companyId, equipment.id), queryFn: () => fetchPurchases(companyId, equipment.id), enabled: showInvoices })
  const byUnit = (purchases.data ?? []).filter((purchase) => purchase.unitNumbers.length > 0)
  const invoiceOf = (unit: number) => byUnit.find((purchase) => purchase.unitNumbers.includes(unit))
  const units = unitSummaries(equipment.id, only !== null ? [only] : unitIdsOf(equipment), loans.data ?? [], records.data ?? [], todayIso())

  return (
    <CollapsibleSection id="equipment.units" title={<>Kusy ({units.length})</>} className="mt-6">
      <ul className="divide-y overflow-hidden rounded-xl border bg-surface">
        {units.map((unit) => (
          <li key={unit.unit} className="flex items-center gap-3 px-4 py-2.5">
            <span className="w-10 shrink-0 font-semibold tabular-nums">#{unit.unit}</span>
            <span className="min-w-0 flex-1 text-sm text-muted-foreground">
              {(() => {
                const info = equipment.unitInfo?.[String(unit.unit)]
                const bought = equipment.unitPurchases?.[String(unit.unit)]
                const ids = [info?.inv && `inv. ${info.inv}`, info?.serial && `SN ${info.serial}`, bought && `kúpené ${formatDate(bought)}`, describeUnitDmx(info)].filter(Boolean)
                return ids.length > 0 ? <span className="block truncate font-medium text-foreground">{ids.join(' · ')}</span> : null
              })()}
              <span className="block truncate">
                servis {unit.serviceCount}× · výpožičky {unit.loanCount}×
                {byUnit.length > 0 &&
                  (() => {
                    const purchase = invoiceOf(unit.unit)
                    return purchase ? (
                      <span className={purchase.hasInvoice ? 'text-emerald-700 dark:text-emerald-400' : 'text-accent'}>
                        {' · '}
                        {purchase.hasInvoice ? 'faktúra' : 'nákup bez faktúry'} {purchase.supplier} {formatDate(purchase.orderedAt)}
                      </span>
                    ) : (
                      <span className="text-accent"> · bez faktúry</span>
                    )
                  })()}
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
    </CollapsibleSection>
  )
}
