import { useQuery } from '@tanstack/react-query'
import { ChevronRight, Plus, Server } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ErrorBlock, LoadingBlock } from '@/components/feedback/QueryState'
import { PageHeader } from '@/components/layout/PageHeader'
import { LinkButton } from '@/components/ui/button'
import { caseTitle } from '@/features/cases/model'
import { useCases } from '@/features/cases/useCases'
import { useCompany } from '@/features/companies/company-context'
import { useEvents } from '@/features/events/useEvents'
import { formatDate } from '@/lib/format'
import { tf, tx } from '@/lib/i18n'
import { can } from '@/lib/permissions'
import { fetchRacks, rackKeys } from './api'
import { RACK_TYPE_LABELS } from './model'

/** Racky 19" – návrhy osadenia po U (k akcii, k fyzickému racku zo skladu alebo ako šablóna). */
export function RacksPage() {
  const company = useCompany().active!
  const companyId = company.companyId
  const racks = useQuery({ queryKey: rackKeys.list(companyId), queryFn: () => fetchRacks(companyId) })
  const cases = useCases(companyId)
  const events = useEvents(companyId)
  const canEdit = can(company, 'racks.edit')

  if (racks.isPending) return <LoadingBlock />
  if (racks.isError) return <ErrorBlock message={tx('Racky sa nepodarilo načítať.')} onRetry={() => void racks.refetch()} />
  if (racks.data === null) return <ErrorBlock message={tx('Racky zatiaľ nie sú v databáze pripravené (migrácia 0195).')} />

  const caseName = (id: string | null) => {
    const box = id ? cases.data?.find((item) => item.id === id) : undefined
    return box ? caseTitle(box) : ''
  }
  const eventName = (id: string | null) => (id ? events.data?.find((item) => item.id === id)?.name ?? '' : '')

  return (
    <>
      <PageHeader
        title={tx('Racky')}
        description={tx('Osadenie 19" rackov po jednotkách U – predok, zadok, hmotnosť a príkon.')}
        action={
          canEdit && (
            <LinkButton to="/racks/new">
              <Plus className="size-4" aria-hidden />
              {tx('Nový rack')}
            </LinkButton>
          )
        }
      />
      {racks.data.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-surface px-6 py-12 text-center">
          <p className="font-medium">{tx('Zatiaľ žiadny rack')}</p>
          {canEdit && <p className="mt-1 text-sm text-muted-foreground">{tx('Začnite tlačidlom Nový rack – napr. FOH rack alebo rack so zosilňovačmi.')}</p>}
        </div>
      ) : (
        <ul className="divide-y overflow-hidden rounded-xl border bg-surface">
          {racks.data.map((rack) => (
            <li key={rack.id}>
              <Link to={`/racks/${rack.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-muted">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <Server className="size-5" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium break-words">
                    {rack.name}
                    {rack.isTemplate && <span className="ml-2 rounded-full bg-accent/15 px-2 py-0.5 text-xs font-medium text-accent">{tx('šablóna')}</span>}
                  </span>
                  <span className="block text-sm text-muted-foreground">
                    {[
                      `${rack.units} U`,
                      tx(RACK_TYPE_LABELS[rack.rackType]),
                      eventName(rack.eventId) && tf('akcia {0}', eventName(rack.eventId)),
                      caseName(rack.caseId) && tf('v {0}', caseName(rack.caseId)),
                      tf('verzia {0} · {1}', rack.version, formatDate(rack.updatedAt.slice(0, 10))),
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </span>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
