import { ChevronRight } from 'lucide-react'
import { CollapsibleSection } from '@/components/layout/CollapsibleSection'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useEvents } from '@/features/events/useEvents'
import { useLoans } from '@/features/loans/useLoans'
import { formatUnits } from '@/features/loans/model'
import { formatDate } from '@/lib/format'
import { usageHistory } from './model'

// Zaujíma hlavne posledné použitie; staršie sa rozbalia na požiadanie.
const SHOWN = 3

type Props = {
  companyId: string
  /** Technika, ktorej použitie sa hľadá; pri case jeho obsah. */
  equipmentIds: string[]
  /** Pri case: ráta aj výpožičky, kde odišiel ako celok. */
  caseId?: string
}

/** Výpožičky a eventy, na ktorých bola technika alebo case, od najnovších. */
export function UsageHistory({ companyId, equipmentIds, caseId }: Props) {
  const loans = useLoans(companyId)
  const events = useEvents(companyId)
  const [showAll, setShowAll] = useState(false)
  const entries = usageHistory(loans.data ?? [], events.data ?? [], equipmentIds, caseId)
  const visible = showAll ? entries : entries.slice(0, SHOWN)

  return (
    <CollapsibleSection id="equipment.usage" title={<>Výpožičky a eventy ({entries.length})</>} className="mt-6">
      {loans.isPending || events.isPending ? (
        <p className="rounded-xl border bg-surface p-4 text-sm text-muted-foreground">Načítavam…</p>
      ) : loans.isError || events.isError ? (
        <p className="rounded-xl border bg-surface p-4 text-sm text-destructive">Históriu použitia sa nepodarilo načítať.</p>
      ) : entries.length === 0 ? (
        <p className="rounded-xl border border-dashed bg-surface p-4 text-sm text-muted-foreground">
          Zatiaľ nebolo na žiadnej výpožičke ani evente.
        </p>
      ) : (
        <>
          <ul className="divide-y overflow-hidden rounded-xl border bg-surface">
            {visible.map((entry) => (
              <li key={`${entry.kind}-${entry.id}`}>
                <Link to={entry.to} className="flex min-h-14 items-center gap-3 px-4 py-3 hover:bg-muted">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{entry.title}</span>
                    <span className="block truncate text-sm text-muted-foreground">
                      {[
                        entry.kind === 'loan' ? 'Výpožička' : 'Event',
                        entry.startsOn === entry.endsOn ? formatDate(entry.startsOn) : `${formatDate(entry.startsOn)} – ${formatDate(entry.endsOn)}`,
                        entry.units.length > 0 ? `kusy ${formatUnits(entry.units)}` : `${entry.quantity} ks`,
                      ].join(' · ')}
                    </span>
                  </span>
                  <span className="shrink-0 text-sm text-muted-foreground">{entry.status}</span>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
          {entries.length > SHOWN && (
            <button type="button" className="mt-2 text-sm text-accent hover:underline" onClick={() => setShowAll(!showAll)}>
              {showAll ? 'Zobraziť len posledné' : `Zobraziť všetky (${entries.length})`}
            </button>
          )}
        </>
      )}
    </CollapsibleSection>
  )
}
