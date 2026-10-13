import { useQuery } from '@tanstack/react-query'
import { Check, SlidersHorizontal } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { ErrorBlock, LoadingBlock } from '@/components/feedback/QueryState'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
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
import { loadHidden, saveHidden, STAT_SECTIONS, STAT_WIDGETS, type StatWidgetId } from './widgets'

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
  const [editing, setEditing] = useState(false)
  const [hidden, setHidden] = useState(() => loadHidden(companyId))
  const toggle = (id: StatWidgetId) => {
    const next = hidden.includes(id) ? hidden.filter((other) => other !== id) : [...hidden, id]
    setHidden(next)
    saveHidden(companyId, next)
  }
  const showAll = () => {
    setHidden([])
    saveHidden(companyId, [])
  }

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

  // Jeden zápis pre každý widget zo zoznamu STAT_WIDGETS; chýbajúci by neprešiel kontrolou typov.
  const render: Record<StatWidgetId, ReactNode> = {
    'equipment.items': <Tile label="Položiek" value={String(stats.equipment.items)} hint={`${stats.equipment.pieces} kusov`} />,
    'equipment.availability': (
      <Tile label="Dostupnosť" value={`${Math.round(stats.equipment.availability * 100)} %`} hint="kusov pripravených na výdaj" />
    ),
    'equipment.packed': <Tile label="V cases" value={String(stats.equipment.packed)} hint={`${stats.equipment.unpacked} mimo cases`} />,
    'loans.open': (
      <Tile
        label="Otvorené výpožičky"
        value={String(stats.loans.open)}
        hint={stats.loans.overdue > 0 ? `${stats.loans.overdue} po termíne` : 'žiadna po termíne'}
      />
    ),
    'equipment.byStatus': <Ranking title="Technika podľa stavu" rows={stats.equipment.byStatus} format={count} empty="Zatiaľ žiadna technika." />,
    'loans.mostLent': (
      <Ranking
        title="Najviac požičiavaná technika (posledných 12 mesiacov)"
        rows={stats.loans.mostLent}
        format={daysLabel}
        empty="Zatiaľ sa nič nepožičalo."
      />
    ),
    'service.records': <Tile label="Servisné záznamy" value={String(stats.service.records)} hint={`${stats.service.open} rozpracovaných`} />,
    'service.hours': <Tile label="Odpracované hodiny" value={`${formatNumber(stats.service.hours)} h`} />,
    'service.cost': <Tile label="Servisné náklady" value={money(stats.service.cost)} />,
    'service.byKind': <Ranking title="Záznamy podľa typu" rows={stats.service.byKind} format={count} empty="Zatiaľ žiadne servisné záznamy." />,
    'service.costliest': <Ranking title="Najdrahšia technika na servis" rows={stats.service.costliest} format={money} empty="Žiadne zapísané náklady." />,
    'vehicles.count': <Tile label="Aktívne vozidlá" value={String(stats.vehicles.count)} />,
    'vehicles.due': <Tile label="Termíny na vybavenie" value={String(stats.vehicles.due)} hint="po termíne alebo do 30 dní" />,
    'vehicles.costs': <Ranking title="Náklady na prevádzku podľa vozidla" rows={stats.vehicles.costs} format={money} empty="Žiadne zapísané náklady." />,
  }
  const shown = STAT_WIDGETS.filter((widget) => !hidden.includes(widget.id))

  return (
    <>
      <PageHeader
        title="Štatistiky"
        description="Prehľad z údajov, ktoré sú v aplikácii zapísané"
        action={
          <Button variant="outline" onClick={() => setEditing(!editing)}>
            {editing ? <Check className="size-4" aria-hidden /> : <SlidersHorizontal className="size-4" aria-hidden />}
            {editing ? 'Hotovo' : 'Upraviť'}
          </Button>
        }
      />

      {editing && (
        <section aria-labelledby="stats-edit-heading" className="mb-8 rounded-xl border bg-surface p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 id="stats-edit-heading" className="font-medium">
              Čo chcem vidieť
            </h2>
            {hidden.length > 0 && (
              <button type="button" className="text-sm text-accent hover:underline" onClick={showAll}>
                Zobraziť všetko
              </button>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {STAT_SECTIONS.map((section) => (
              <fieldset key={section.id}>
                <legend className="mb-1.5 text-sm font-medium text-muted-foreground">{section.label}</legend>
                <div className="flex flex-col gap-1.5">
                  {STAT_WIDGETS.filter((widget) => widget.section === section.id).map((widget) => (
                    <label key={widget.id} className="flex cursor-pointer items-start gap-2 text-sm">
                      <input type="checkbox" className="mt-0.5 size-4 shrink-0" checked={!hidden.includes(widget.id)} onChange={() => toggle(widget.id)} />
                      {widget.label}
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}
          </div>
          <p className="mt-3 text-sm text-muted-foreground">Výber sa pamätá v tomto prehliadači a platí len pre vás.</p>
        </section>
      )}

      {shown.length === 0 && (
        <div className="rounded-xl border border-dashed bg-surface px-6 py-16 text-center">
          <p className="font-medium">Všetky štatistiky sú skryté</p>
          <button type="button" className="mt-2 text-sm text-accent hover:underline" onClick={showAll}>
            Zobraziť všetko
          </button>
        </div>
      )}

      {STAT_SECTIONS.map((section) => {
        const tiles = shown.filter((widget) => widget.section === section.id && widget.kind === 'tile')
        const rankings = shown.filter((widget) => widget.section === section.id && widget.kind === 'ranking')
        if (tiles.length + rankings.length === 0) return null
        return (
          <Section key={section.id} title={section.label}>
            {tiles.length > 0 && (
              <div className="mb-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
                {tiles.map((widget) => (
                  <div key={widget.id} className="contents">
                    {render[widget.id]}
                  </div>
                ))}
              </div>
            )}
            {rankings.length > 0 && (
              <div className={rankings.length > 1 ? 'grid gap-3 lg:grid-cols-2' : undefined}>
                {rankings.map((widget) => (
                  <div key={widget.id} className="contents">
                    {render[widget.id]}
                  </div>
                ))}
              </div>
            )}
          </Section>
        )
      })}
    </>
  )
}
