import { useQuery } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { ErrorBlock, LoadingBlock } from '@/components/feedback/QueryState'
import { PageHeader } from '@/components/layout/PageHeader'
import { useCompany } from '@/features/companies/company-context'
import { equipmentKeys, fetchEquipmentList } from '@/features/equipment/api'
import { formatNumber } from '@/features/equipment/model'
import { useLoans } from '@/features/loans/useLoans'
import { useServiceRecords } from '@/features/service/useServiceRecords'
import { fetchVehicleCosts, vehicleKeys } from '@/features/vehicles/api'
import { useVehicles } from '@/features/vehicles/useVehicles'
import { formatMoney, todayIso } from '@/lib/format'
import { addDays } from '@/features/calendar/model'
import { buildStats, type Ranked } from './model'

function Tile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border bg-surface p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-sm text-muted-foreground">{hint}</p>}
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-sm font-medium text-muted-foreground">{title}</h2>
      {children}
    </section>
  )
}

/**
 * Poradie s pruhmi: jedna farba pre veľkosť, hodnota vždy vypísaná číslom vedľa pruhu,
 * takže sa dá čítať aj bez neho.
 */
function Ranking({ title, rows, format, empty }: { title: string; rows: Ranked[]; format: (value: number) => string; empty: string }) {
  const max = Math.max(...rows.map((row) => row.value), 0)
  return (
    <div className="rounded-xl border bg-surface p-4">
      <h3 className="mb-3 font-medium">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((row) => (
            <li key={row.id}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="min-w-0 truncate">{row.label}</span>
                <span className="shrink-0 font-medium tabular-nums">{format(row.value)}</span>
              </div>
              <div className="mt-1 h-2 rounded-r bg-muted" aria-hidden>
                <div className="h-2 min-w-1 rounded-r bg-accent" style={{ width: `${max === 0 ? 0 : (row.value / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

const count = (value: number) => String(value)
const daysLabel = (value: number) => `${value} ${value === 1 ? 'deň' : value <= 4 ? 'dni' : 'dní'}`
const money = (value: number) => formatMoney(value, 'EUR')

export function StatsPage() {
  const companyId = useCompany().active!.companyId
  const today = todayIso()

  const equipment = useQuery({ queryKey: equipmentKeys.list(companyId), queryFn: () => fetchEquipmentList(companyId) })
  const loans = useLoans(companyId)
  const service = useServiceRecords(companyId)
  const vehicles = useVehicles(companyId)
  const vehicleCosts = useQuery({ queryKey: vehicleKeys.costs(companyId), queryFn: () => fetchVehicleCosts(companyId) })
  const sources = [equipment, loans, service, vehicles, vehicleCosts]

  if (sources.some((source) => source.isPending)) return <LoadingBlock />
  if (sources.some((source) => source.isError)) {
    return <ErrorBlock message="Štatistiky sa nepodarilo načítať." onRetry={() => sources.forEach((source) => void source.refetch())} />
  }

  const stats = buildStats(
    {
      equipment: equipment.data ?? [],
      loans: loans.data ?? [],
      service: service.data ?? [],
      vehicles: vehicles.data ?? [],
      vehicleCosts: vehicleCosts.data ?? [],
    },
    today,
    addDays(today, -365),
  )

  return (
    <>
      <PageHeader title="Štatistiky" description="Prehľad z údajov, ktoré sú v aplikácii zapísané" />

      <Section title="Technika">
        <div className="mb-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Tile label="Položiek" value={String(stats.equipment.items)} hint={`${stats.equipment.pieces} kusov`} />
          <Tile label="Dostupnosť" value={`${Math.round(stats.equipment.availability * 100)} %`} hint="kusov pripravených na výdaj" />
          <Tile label="V cases" value={String(stats.equipment.packed)} hint={`${stats.equipment.unpacked} mimo cases`} />
          <Tile label="Otvorené výpožičky" value={String(stats.loans.open)} hint={stats.loans.overdue > 0 ? `${stats.loans.overdue} po termíne` : 'žiadna po termíne'} />
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          <Ranking title="Technika podľa stavu" rows={stats.equipment.byStatus} format={count} empty="Zatiaľ žiadna technika." />
          <Ranking
            title="Najviac požičiavaná technika (posledných 12 mesiacov)"
            rows={stats.loans.mostLent}
            format={daysLabel}
            empty="Zatiaľ sa nič nepožičalo."
          />
        </div>
      </Section>

      <Section title="Servis">
        <div className="mb-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Tile label="Servisné záznamy" value={String(stats.service.records)} hint={`${stats.service.open} rozpracovaných`} />
          <Tile label="Odpracované hodiny" value={`${formatNumber(stats.service.hours)} h`} />
          <Tile label="Servisné náklady" value={money(stats.service.cost)} />
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          <Ranking title="Záznamy podľa typu" rows={stats.service.byKind} format={count} empty="Zatiaľ žiadne servisné záznamy." />
          <Ranking title="Najdrahšia technika na servis" rows={stats.service.costliest} format={money} empty="Žiadne zapísané náklady." />
        </div>
      </Section>

      <Section title="Vozidlá">
        <div className="mb-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Tile label="Aktívne vozidlá" value={String(stats.vehicles.count)} />
          <Tile label="Termíny na vybavenie" value={String(stats.vehicles.due)} hint="po termíne alebo do 30 dní" />
        </div>
        <Ranking title="Náklady na prevádzku podľa vozidla" rows={stats.vehicles.costs} format={money} empty="Žiadne zapísané náklady." />
      </Section>
    </>
  )
}
