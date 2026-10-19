import { useQuery } from '@tanstack/react-query'
import { Briefcase, Plus, Speaker } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CollapsibleSection } from '@/components/layout/CollapsibleSection'
import { LinkButton } from '@/components/ui/button'
import { SelectField } from '@/components/ui/field'
import { useCases } from '@/features/cases/useCases'
import { useCompany } from '@/features/companies/company-context'
import { DeviceList } from '@/features/devices/MyDevicesSettings'
import { equipmentKeys, fetchEquipmentList } from '@/features/equipment/api'
import type { CompanyEvent } from '@/features/events/model'
import { fetchPayments, payoutKeys } from '@/features/payouts/api'
import { formatDate, formatMoney, todayIso } from '@/lib/format'
import { can } from '@/lib/permissions'
import { isAdminRole } from '@/lib/roles'
import type { Person } from './model'
import { pastEventsOf, periods, personStats } from './stats'

type Props = { companyId: string; person: Person; events: CompanyEvent[]; userId: string }

/** Zariadenia člena (MAC, Wi-Fi siete) – vidí ich on sám a správca tímu. */
export function StaffDevices({ companyId, person, userId }: Omit<Props, 'events'>) {
  const company = useCompany().active!
  const canManage = can(company, 'staff.manage')
  if (!person.memberId || (!canManage && person.memberId !== userId)) return null
  return (
    <CollapsibleSection id="staff.devices" title="Zariadenia (mobil, notebook, iPad)">
      <div className="rounded-xl border bg-surface p-4">
        <p className="text-sm text-muted-foreground">MAC a IP adresy pre Wi-Fi siete. Nie je to technika firmy.</p>
        <DeviceList companyId={companyId} userId={person.memberId} canEdit empty="Zatiaľ žiadne zariadenia." />
      </div>
    </CollapsibleSection>
  )
}

/** Technika a cases / racky, ktoré zamestnancovi patria (jeho vlastné, nie firmy). */
export function StaffOwnGear({ companyId, person }: Pick<Props, 'companyId' | 'person'>) {
  const company = useCompany().active!
  const equipment = useQuery({ queryKey: equipmentKeys.list(companyId), queryFn: () => fetchEquipmentList(companyId), enabled: can(company, 'equipment.view') })
  const cases = useCases(companyId)
  const ownerKey = person.staffId ?? `m-${person.memberId}`
  const items = person.staffId ? (equipment.data ?? []).filter((item) => item.ownerStaffId === person.staffId) : []
  const boxes = person.staffId ? (cases.data ?? []).filter((box) => box.ownerStaffId === person.staffId) : []
  if (!can(company, 'equipment.view')) return null
  return (
    <CollapsibleSection
      id="staff.gear"
      title={`Vlastná technika (${items.length + boxes.length})`}
      actions={
        can(company, 'equipment.edit') && (
          <>
            <LinkButton to={`/equipment/new?owner=${ownerKey}`} variant="outline" size="sm">
              <Plus className="size-4" aria-hidden />
              Technika
            </LinkButton>
            {can(company, 'cases.edit') && (
              <LinkButton to={`/cases/new?owner=${ownerKey}`} variant="outline" size="sm">
                <Plus className="size-4" aria-hidden />
                Case / rack
              </LinkButton>
            )}
          </>
        )
      }
    >
      {items.length + boxes.length === 0 ? (
        <p className="rounded-xl border border-dashed bg-surface p-4 text-sm text-muted-foreground">Nemá zapísanú vlastnú techniku.</p>
      ) : (
        <ul className="divide-y overflow-hidden rounded-xl border bg-surface">
          {boxes.map((box) => (
            <li key={box.id}>
              <Link to={`/cases/${box.id}`} className="flex items-center gap-3 px-4 py-2 hover:bg-muted">
                <Briefcase className="size-4 text-muted-foreground" aria-hidden />
                <span className="font-medium">{box.name}</span>
              </Link>
            </li>
          ))}
          {items.map((item) => (
            <li key={item.id}>
              <Link to={`/equipment/${item.id}`} className="flex items-center gap-3 px-4 py-2 hover:bg-muted">
                <Speaker className="size-4 text-muted-foreground" aria-hidden />
                <span className="min-w-0 flex-1 truncate font-medium">{item.name}</span>
                {item.quantity !== 1 && <span className="text-sm text-muted-foreground">{item.quantity} ks</span>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </CollapsibleSection>
  )
}

/** Eventy, na ktorých už bol (od najnovších). */
export function StaffPastEvents({ person, events }: Pick<Props, 'person' | 'events'>) {
  const [all, setAll] = useState(false)
  const past = pastEventsOf(events, { memberId: person.memberId, name: person.name }, todayIso())
  const shown = all ? past : past.slice(0, 10)
  return (
    <CollapsibleSection id="staff.past-events" title={`Minulé eventy (${past.length})`}>
      {past.length === 0 ? (
        <p className="text-sm text-muted-foreground">Zatiaľ nebol na žiadnom evente.</p>
      ) : (
        <>
          <ul className="divide-y overflow-hidden rounded-xl border bg-surface">
            {shown.map((event) => {
              const role = event.crew.find((crew) => (person.memberId ? crew.memberId === person.memberId : crew.name === person.name))?.role
              return (
                <li key={event.id}>
                  <Link to={`/events/${event.id}`} className="flex items-center justify-between gap-3 px-4 py-2 hover:bg-muted">
                    <span className="min-w-0 truncate font-medium">{event.name}</span>
                    <span className="shrink-0 text-sm text-muted-foreground">
                      {formatDate(event.startsOn)}
                      {role && ` · ${role}`}
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
          {past.length > 10 && (
            <button type="button" className="mt-2 text-sm text-accent hover:underline" onClick={() => setAll(!all)}>
              {all ? 'Ukázať menej' : `Ukázať všetky (${past.length})`}
            </button>
          )}
        </>
      )}
    </CollapsibleSection>
  )
}

/**
 * Prehľad za obdobie pre admina / CEO a vedúceho (správca tímu): na koľkých eventoch bol a nebol,
 * dni na akciách, role a zárobky (zárobky len s oprávnením vidieť všetky odmeny).
 */
export function StaffOverview({ companyId, person, events, userId }: Props) {
  const company = useCompany().active!
  const leader = isAdminRole(company.role) || can(company, 'staff.manage')
  const seesMoney = can(company, 'payouts.view_all') || person.memberId === userId
  const payments = useQuery({ queryKey: payoutKeys.list(companyId), queryFn: () => fetchPayments(companyId), enabled: seesMoney && Boolean(person.memberId) })
  const today = todayIso()
  const options = periods(today, events)
  const [periodId, setPeriodId] = useState(String(Number(today.slice(0, 4)) - 1))
  if (!leader && person.memberId !== userId) return null
  const period = options.find((option) => option.id === periodId) ?? options[0]
  const stats = personStats(events, payments.data ?? [], { memberId: person.memberId, name: person.name }, period, today)
  const share = stats.total > 0 ? Math.round((stats.attended.length / stats.total) * 100) : 0

  return (
    <CollapsibleSection id="staff.overview" title="Prehľad">
      <div className="rounded-xl border bg-surface p-4">
        <SelectField label="Obdobie" className="mb-3 w-60" value={period.id} onChange={(event) => setPeriodId(event.target.value)}>
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </SelectField>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg bg-muted/60 p-3">
            <dt className="text-xs text-muted-foreground">Bol na eventoch</dt>
            <dd className="text-2xl font-semibold tabular-nums">
              {stats.attended.length}
              <span className="text-sm font-normal text-muted-foreground"> / {stats.total}</span>
            </dd>
            <dd className="text-xs text-muted-foreground">{share} % akcií firmy</dd>
          </div>
          <div className="rounded-lg bg-muted/60 p-3">
            <dt className="text-xs text-muted-foreground">Nebol</dt>
            <dd className="text-2xl font-semibold tabular-nums">{stats.missed.length}</dd>
          </div>
          <div className="rounded-lg bg-muted/60 p-3">
            <dt className="text-xs text-muted-foreground">Dní na akciách</dt>
            <dd className="text-2xl font-semibold tabular-nums">{stats.days}</dd>
          </div>
          {seesMoney && person.memberId && (
            <div className="rounded-lg bg-muted/60 p-3">
              <dt className="text-xs text-muted-foreground">Zarobil</dt>
              <dd className="text-2xl font-semibold tabular-nums">{formatMoney(stats.earned, 'EUR')}</dd>
              <dd className="text-xs text-muted-foreground">
                {[stats.advances > 0 && `zálohy ${formatMoney(stats.advances, 'EUR')}`, stats.unpaid > 0 && `nevyplatené ${formatMoney(stats.unpaid, 'EUR')}`].filter(Boolean).join(' · ') || 'všetko vyplatené'}
              </dd>
            </div>
          )}
        </dl>
        {stats.roles.length > 0 && (
          <p className="mt-3 text-sm">
            <span className="text-muted-foreground">Role: </span>
            {stats.roles.map((role) => `${role.role} ${role.count}×`).join(' · ')}
          </p>
        )}
        {stats.missed.length > 0 && (
          <details className="mt-3 text-sm">
            <summary className="cursor-pointer text-accent">Eventy, kde nebol ({stats.missed.length})</summary>
            <ul className="mt-2 flex flex-col gap-1">
              {stats.missed.map((event) => (
                <li key={event.id}>
                  <Link to={`/events/${event.id}`} className="hover:underline">
                    {formatDate(event.startsOn)} · {event.name}
                  </Link>
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </CollapsibleSection>
  )
}
