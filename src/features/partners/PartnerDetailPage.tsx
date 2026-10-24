import { ArrowLeft, ChevronRight, Receipt } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ErrorBlock, LoadingBlock } from '@/components/feedback/QueryState'
import { useCompany } from '@/features/companies/company-context'
import { EventStatusBadge } from '@/features/events/EventStatusBadge'
import { LoanStatusBadge } from '@/features/loans/LoanStatusBadge'
import { loanPricing } from '@/features/loans/model'
import { formatDate, formatMoney, todayIso } from '@/lib/format'
import { can } from '@/lib/permissions'
import { usePartners } from './api'
import { clientSummary } from './history'
import { PartnerCard } from './PartnerCard'
import { PartnerForm } from './PartnerForm'
import { useClientHistory } from './useClientHistory'

function Tile({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <div className="rounded-xl border bg-surface p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
      {hint && <p className="mt-0.5 text-sm text-muted-foreground">{hint}</p>}
    </div>
  )
}

/** Klient (firma / organizátor): kontakty, na ktorých akciách bol, koľko priniesli a čo si požičal. */
export function PartnerDetailPage() {
  const { id = '' } = useParams()
  const company = useCompany().active!
  const companyId = company.companyId
  const canEdit = can(company, 'events.edit')
  const partners = usePartners(companyId)
  const history = useClientHistory(companyId)
  const [editing, setEditing] = useState(false)
  const today = todayIso()
  const money = (value: number) => formatMoney(value, 'EUR')

  const back = (
    <Link to="/partners" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
      <ArrowLeft className="size-4" aria-hidden />
      Firmy a kontakty
    </Link>
  )
  if (partners.isPending || !history.ready) return <LoadingBlock />
  const partner = partners.data?.find((item) => item.id === id)
  if (!partner) return <>{back}<ErrorBlock message="Táto firma neexistuje alebo k nej nemáte prístup." /></>

  const items = history.eventsOf(partner)
  const summary = clientSummary(items, today)
  const loans = history.loansOf(partner)
  const loanTotal = Math.round(loans.reduce((sum, loan) => sum + (loanPricing(loan).priced ? loanPricing(loan).total : 0), 0) * 100) / 100

  return (
    <>
      {back}
      <h1 className="mb-4 text-2xl font-semibold tracking-tight break-words">{partner.name}</h1>
      {editing ? (
        <PartnerForm companyId={companyId} current={partner} onDone={() => setEditing(false)} />
      ) : (
        <PartnerCard companyId={companyId} partner={partner} canEdit={canEdit} onEdit={() => setEditing(true)} />
      )}

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label="Akcií" value={summary.count} hint={summary.first ? `prvá ${formatDate(summary.first.startsOn)}` : undefined} />
        <Tile label="Naposledy" value={summary.last ? formatDate(summary.last.startsOn) : '—'} hint={summary.last?.name} />
        <Tile label="Najbližšie" value={summary.next ? formatDate(summary.next.startsOn) : '—'} hint={summary.next?.name} />
        {history.seesIncome ? (
          <Tile label="Tržby z akcií (s DPH)" value={money(summary.revenue)} hint={loans.length > 0 ? `+ výpožičky ${money(loanTotal)}` : undefined} />
        ) : (
          <Tile label="Výpožičky" value={loans.length} />
        )}
      </div>

      <section className="mt-6">
        <h2 className="mb-2 text-sm font-medium text-muted-foreground">Akcie ({items.length})</h2>
        {items.length === 0 ? (
          <p className="rounded-xl border border-dashed bg-surface p-4 text-sm text-muted-foreground">
            Zatiaľ žiadne. Firmu priradíte v detaile eventu (Organizátori a firmy) alebo ako organizátora.
          </p>
        ) : (
          <ul className="divide-y overflow-hidden rounded-xl border bg-surface">
            {items.map(({ event, kind, revenue }) => (
              <li key={event.id} className="flex items-center gap-3 px-4 py-3">
                <Link to={`/events/${event.id}`} className="min-w-0 flex-1 hover:underline">
                  <span className="block truncate font-medium">{event.name}</span>
                  <span className="block truncate text-sm text-muted-foreground">
                    {[
                      event.startsOn === event.endsOn ? formatDate(event.startsOn) : `${formatDate(event.startsOn)} – ${formatDate(event.endsOn)}`,
                      kind === 'organizer' ? 'organizátor' : 'partner',
                      event.venue,
                      history.seesIncome && revenue > 0 && money(revenue),
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </Link>
                <EventStatusBadge status={event.status} />
                {canEdit && event.startsOn >= today && (
                  <Link to={`/events/${event.id}/quote`} className="inline-flex shrink-0 items-center gap-1 text-sm text-accent hover:underline" aria-label={`Ponuka: ${event.name}`}>
                    <Receipt className="size-4" aria-hidden />
                    Ponuka
                  </Link>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {can(company, 'loans.view') && loans.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 text-sm font-medium text-muted-foreground">Výpožičky ({loans.length})</h2>
          <ul className="divide-y overflow-hidden rounded-xl border bg-surface">
            {loans.map((loan) => {
              const pricing = loanPricing(loan)
              return (
                <li key={loan.id}>
                  <Link to={`/loans/${loan.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-muted">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">
                        {formatDate(loan.startsOn)} – {formatDate(loan.endsOn)}
                      </span>
                      <span className="block truncate text-sm text-muted-foreground">
                        {[`${loan.items.reduce((sum, item) => sum + item.quantity, 0)} ks techniky`, pricing.priced && money(pricing.total)].filter(Boolean).join(' · ')}
                      </span>
                    </span>
                    <LoanStatusBadge loan={loan} today={today} />
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </>
  )
}
