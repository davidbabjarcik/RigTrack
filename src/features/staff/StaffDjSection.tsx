import { useQuery } from '@tanstack/react-query'
import { Disc3 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { CollapsibleSection } from '@/components/layout/CollapsibleSection'
import { useCompany } from '@/features/companies/company-context'
import { equipmentKeys, fetchEquipmentList } from '@/features/equipment/api'
import type { CompanyEvent } from '@/features/events/model'
import { useEvents } from '@/features/events/useEvents'
import { fetchPayments, payoutKeys } from '@/features/payouts/api'
import { formatDate, formatMoney, todayIso } from '@/lib/format'
import { tf, tx } from '@/lib/i18n'
import { can } from '@/lib/permissions'
import { playsAt, type Person } from './model'

/**
 * DJ profil na karte človeka: jeho DJ hrania (najbližšie a minulé), koľko zarobil tento rok a jeho technika,
 * ktorú pri DJ hraní pridáte na event jedným ťuknutím. Ukáže sa len tomu, kto aspoň raz hral.
 */
export function StaffDjSection({ companyId, person }: { companyId: string; person: Person }) {
  const company = useCompany().active!
  const events = useEvents(companyId)
  const payments = useQuery({ queryKey: payoutKeys.list(companyId), queryFn: () => fetchPayments(companyId), retry: false })
  const equipment = useQuery({ queryKey: equipmentKeys.list(companyId), queryFn: () => fetchEquipmentList(companyId), enabled: can(company, 'equipment.view') })
  const gigs = (events.data ?? []).filter((event) => playsAt(event, person)).sort((a, b) => b.startsOn.localeCompare(a.startsOn))
  if (gigs.length === 0) return null

  const today = todayIso()
  const year = today.slice(0, 4)
  const upcoming = gigs.filter((event) => event.endsOn >= today && event.status !== 'cancelled').reverse()
  const past = gigs.filter((event) => event.endsOn < today && event.status !== 'cancelled')
  const gigIds = new Set(gigs.map((event) => event.id))
  // Odmeny vidí admin všetkým, ostatní len sebe (o tom rozhoduje databáza).
  const earned = person.memberId
    ? (payments.data ?? [])
        .filter((payment) => payment.memberId === person.memberId && payment.eventId && gigIds.has(payment.eventId) && payment.kind !== 'advance' && payment.happenedOn.startsWith(year))
        .reduce((sum, payment) => sum + payment.amount, 0)
    : null
  const gear = person.staffId ? (equipment.data ?? []).filter((item) => item.ownerStaffId === person.staffId && item.status !== 'sold' && item.status !== 'retired') : []
  const row = (event: CompanyEvent) => (
    <li key={event.id}>
      <Link to={`/events/${event.id}`} className="flex flex-wrap items-baseline justify-between gap-x-3 px-4 py-2 text-sm hover:bg-muted">
        <span className="font-medium">{event.name}</span>
        <span className="text-muted-foreground">{[formatDate(event.startsOn), event.venue].filter(Boolean).join(' · ')}</span>
      </Link>
    </li>
  )

  return (
    <CollapsibleSection id="staff.dj" title={<span className="inline-flex items-center gap-2"><Disc3 className="size-4 text-fuchsia-600 dark:text-fuchsia-400" aria-hidden />{tx('DJ')}</span>}>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border bg-surface p-3">
          <p className="text-sm text-muted-foreground">{tf('Hraní {0}', year)}</p>
          <p className="text-2xl font-semibold tabular-nums">{gigs.filter((event) => event.startsOn.startsWith(year) && event.status !== 'cancelled').length}</p>
          <p className="text-xs text-muted-foreground">{tf('spolu {0}', gigs.filter((event) => event.status !== 'cancelled').length)}</p>
        </div>
        {earned !== null && payments.isSuccess && (
          <div className="rounded-xl border bg-surface p-3">
            <p className="text-sm text-muted-foreground">{tf('Zarobené za hranie {0}', year)}</p>
            <p className="text-2xl font-semibold tabular-nums">{formatMoney(earned, 'EUR')}</p>
          </div>
        )}
        <div className="rounded-xl border bg-surface p-3">
          <p className="text-sm text-muted-foreground">{tx('Vlastná technika')}</p>
          <p className="text-2xl font-semibold tabular-nums">{gear.length}</p>
          <p className="text-xs text-muted-foreground">{tx('pri DJ hraní sa pridá jedným ťuknutím')}</p>
        </div>
      </div>
      {upcoming.length > 0 && (
        <>
          <h3 className="mt-4 mb-1 text-sm font-medium">{tx('Najbližšie hrania')}</h3>
          <ul className="divide-y overflow-hidden rounded-xl border bg-surface">{upcoming.slice(0, 5).map(row)}</ul>
        </>
      )}
      {past.length > 0 && (
        <>
          <h3 className="mt-4 mb-1 text-sm font-medium">{tx('Odohrané')}</h3>
          <ul className="divide-y overflow-hidden rounded-xl border bg-surface">{past.slice(0, 5).map(row)}</ul>
        </>
      )}
    </CollapsibleSection>
  )
}
