import { useQuery } from '@tanstack/react-query'
import { ChevronRight, Plus, Server } from 'lucide-react'
import { useEffect } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
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

/** Zoznam rackov 19" (návrhy osadenia po U) – na stránke Cases a racks aj samostatne. */
function RackList({ companyId, canEdit }: { companyId: string; canEdit: boolean }) {
  const racks = useQuery({ queryKey: rackKeys.list(companyId), queryFn: () => fetchRacks(companyId) })
  const { hash } = useLocation()
  // Po návrate z racku (/cases#racks) posunie stránku na racky, keď sú načítané.
  useEffect(() => {
    if (hash === '#racks' && racks.data) document.getElementById('racks')?.scrollIntoView()
  }, [hash, racks.data])
  const cases = useCases(companyId)
  const events = useEvents(companyId)

  if (racks.isPending) return <LoadingBlock />
  if (racks.isError) return <ErrorBlock message={tx('Racky sa nepodarilo načítať.')} onRetry={() => void racks.refetch()} />
  if (racks.data === null) return <ErrorBlock message={tx('Racky zatiaľ nie sú v databáze pripravené (migrácia 0195).')} />

  const caseName = (id: string | null) => {
    const box = id ? cases.data?.find((item) => item.id === id) : undefined
    return box ? caseTitle(box) : ''
  }
  const eventName = (id: string | null) => (id ? events.data?.find((item) => item.id === id)?.name ?? '' : '')

  if (racks.data.length === 0)
    return (
      <div className="rounded-xl border border-dashed bg-surface px-6 py-8 text-center">
        <p className="font-medium">{tx('Zatiaľ žiadny rack')}</p>
        {canEdit && <p className="mt-1 text-sm text-muted-foreground">{tx('Začnite tlačidlom Nový rack – napr. FOH rack alebo rack so zosilňovačmi.')}</p>}
      </div>
    )
  return (
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
  )
}

const newRackButton = () => (
  <LinkButton to="/racks/new" variant="outline" size="sm">
    <Plus className="size-4" aria-hidden />
    {tx('Nový rack')}
  </LinkButton>
)

/** Racky 19" ako časť stránky Cases a racks (len s oprávnením racks.view). */
export function RacksSection() {
  const company = useCompany().active
  if (company && !can(company, 'racks.view')) return null
  const canEdit = !company || can(company, 'racks.edit')
  return (
    <section id="racks" aria-labelledby="racks-heading" className="mt-8 scroll-mt-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 id="racks-heading" className="text-lg font-semibold">{tx('Racky 19"')}</h2>
          <p className="text-sm text-muted-foreground">{tx('Osadenie po jednotkách U – predok, zadok, hmotnosť a príkon.')}</p>
        </div>
        {canEdit && newRackButton()}
      </div>
      {company && <RackList companyId={company.companyId} canEdit={canEdit} />}
    </section>
  )
}

/**
 * /racks: racky sú na stránke Cases a racks. Samostatná stránka ostáva len pre toho, kto vidí racky, ale nie cases.
 */
export function RacksPage() {
  const company = useCompany().active!
  if (can(company, 'cases.view')) return <Navigate to="/cases#racks" replace />
  const canEdit = can(company, 'racks.edit')
  return (
    <>
      <PageHeader title={tx('Racky')} description={tx('Osadenie 19" rackov po jednotkách U – predok, zadok, hmotnosť a príkon.')} action={canEdit && newRackButton()} />
      <RackList companyId={company.companyId} canEdit={canEdit} />
    </>
  )
}
