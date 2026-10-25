import { FileText, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ErrorBlock, LoadingBlock } from '@/components/feedback/QueryState'
import { PageHeader } from '@/components/layout/PageHeader'
import { LinkButton } from '@/components/ui/button'
import { useCompany } from '@/features/companies/company-context'
import { formatDate, formatMoney } from '@/lib/format'
import { can } from '@/lib/permissions'
import { isAdminRole } from '@/lib/roles'
import { cn } from '@/lib/utils'
import { useOffers } from './api'
import { OFFER_STATUS_LABELS, sumPrices } from './model'

const STATUS_TONES = { draft: 'bg-muted text-muted-foreground', sent: 'bg-sky-500/15 text-sky-700 dark:text-sky-300', accepted: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300', rejected: 'bg-destructive/10 text-destructive' } as const

/** Zoznam cenových ponúk. */
export function OffersPage() {
  const company = useCompany().active!
  const companyId = company.companyId
  const offers = useOffers(companyId)
  const canEdit = can(company, 'offers.edit')

  return (
    <>
      <PageHeader
        title="Cenové ponuky"
        description="Ponuky pre klientov s časťami, cenami a rozpočtom"
        action={
          canEdit ? (
            <LinkButton to="/offers/new">
              <Plus className="size-4" aria-hidden />
              Nová ponuka
            </LinkButton>
          ) : undefined
        }
      />
      {offers.isPending ? (
        <LoadingBlock />
      ) : offers.isError ? (
        <ErrorBlock message="Ponuky sa nepodarilo načítať. Táto časť databázy ešte nemusí byť pripravená (migrácia 0096)." />
      ) : offers.data.length === 0 ? (
        <p className="rounded-xl border border-dashed bg-surface p-8 text-center text-sm text-muted-foreground">
          <FileText className="mx-auto mb-2 size-6" aria-hidden />
          Zatiaľ žiadne ponuky. Novú vytvoríte tlačidlom hore alebo z detailu eventu.
        </p>
      ) : (
        <ul className="divide-y overflow-hidden rounded-xl border bg-surface">
          {offers.data.map((offer) => {
            const total = offer.totalOverride ?? sumPrices(offer.sections)
            return (
              <li key={offer.id}>
                <Link to={`/offers/${offer.id}`} className="flex flex-wrap items-center gap-3 px-4 py-3 hover:bg-muted">
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{offer.title || 'Bez názvu'}</span>
                    <span className="block text-sm text-muted-foreground">
                      {[`č. ${offer.number || '—'}`, formatDate(offer.issuedOn), offer.client.name, offer.issuer.name].filter(Boolean).join(' · ')}
                    </span>
                  </span>
                  <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', STATUS_TONES[offer.status])}>{OFFER_STATUS_LABELS[offer.status]}</span>
                  <span className="w-28 text-right font-semibold tabular-nums">{total > 0 ? formatMoney(total, 'EUR') : '—'}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
      {isAdminRole(company.role) && (
        <p className="mt-6 text-sm text-muted-foreground">
          Za koho sa ponuky vystavujú (s.r.o., živnosť), nastavíte v{' '}
          <Link to="/settings" className="text-accent hover:underline">
            Nastavenia → Firma → Vystavovanie ponúk
          </Link>
          .
        </p>
      )}
    </>
  )
}
