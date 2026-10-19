import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { CollapsibleSection } from '@/components/layout/CollapsibleSection'
import { SelectField } from '@/components/ui/field'
import { equipmentKeys, fetchEquipmentList } from '@/features/equipment/api'
import { cn } from '@/lib/utils'
import { eventPhases, supplyOf } from './eventPower'
import { POWER_LABELS, type CompanyEvent } from './model'

const fmt = (value: number, digits = 1) => value.toLocaleString('sk-SK', { maximumFractionDigits: digits })

/** Rozfázovanie elektriky eventu: technika na L1–L3 čo najrovnomernejšie, prúd na fázu oproti prípojke. */
export function EventPowerSection({ companyId, event }: { companyId: string; event: CompanyEvent }) {
  const equipment = useQuery({ queryKey: equipmentKeys.list(companyId), queryFn: () => fetchEquipmentList(companyId) })
  const supply = supplyOf(event.power, event.powerCount)
  const [phaseCount, setPhaseCount] = useState<1 | 2 | 3>(supply?.phases ?? 3)
  const [existingKw, setExistingKw] = useState([0, 0, 0])
  if (!equipment.data || event.equipment.length === 0) return null
  const plan = eventPhases(event.equipment, equipment.data, phaseCount, existingKw.map((kw) => kw * 1000))
  if (plan.totalWatts === 0 && plan.unknown.length === 0) return null
  const highest = Math.max(...plan.phases.map((phase) => phase.watts))

  return (
    <CollapsibleSection id="event.power" title={`Elektrika – fázy (${fmt(plan.totalWatts / 1000)} kW)`}>
      <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SelectField label="Fázy" value={phaseCount} onChange={(e) => setPhaseCount(Number(e.target.value) as 1 | 2 | 3)}>
          <option value={3}>3 fázy (L1–L3)</option>
          <option value={2}>2 fázy</option>
          <option value={1}>1 fáza</option>
        </SelectField>
        {([0, 1, 2] as const).slice(0, phaseCount).map((index) => (
          <label key={index} className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Iné na L{index + 1} (kW)</span>
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step="0.1"
              placeholder="0"
              className="h-11 rounded-lg border bg-background px-3"
              value={existingKw[index] || ''}
              onChange={(e) => {
                const next = [...existingKw]
                next[index] = Number.isFinite(e.target.valueAsNumber) ? Math.max(0, e.target.valueAsNumber) : 0
                setExistingKw(next)
              }}
            />
          </label>
        ))}
      </div>
      <ul className="flex flex-col gap-3 text-sm">
        {plan.phases.map((phase) => {
          const over = supply && phase.amps > supply.amps
          return (
            <li key={phase.phase} className="rounded-xl border bg-surface p-3">
              <span className="flex justify-between gap-3">
                <span className="font-medium">L{phase.phase}</span>
                <span className={cn(over && 'font-medium text-destructive')}>
                  {fmt(phase.watts / 1000)} kW · {fmt(phase.amps)} A{supply && ` z ${supply.amps} A`}
                </span>
              </span>
              <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
                <span className={cn('block h-full rounded-full', over ? 'bg-destructive' : 'bg-accent')} style={{ width: `${highest > 0 ? (phase.watts / highest) * 100 : 0}%` }} />
              </span>
              <span className="mt-1 block text-muted-foreground">{phase.items.map((item) => `${item.count}× ${item.name}`).join(', ') || 'nič z techniky'}</span>
            </li>
          )
        })}
      </ul>
      <p className="mt-2 text-sm">
        Nevyváženosť: <span className={cn('font-medium', plan.imbalance > 20 && 'text-accent')}>{plan.imbalance} %</span>
        {event.power && <span className="text-muted-foreground"> · prípojka: {POWER_LABELS[event.power]}{event.powerCount && event.powerCount > 1 ? ` × ${event.powerCount}` : ''}</span>}
      </p>
      {plan.unknown.length > 0 && (
        <p className="mt-2 text-sm text-muted-foreground">Bez zadaného výkonu (nerátajú sa): {plan.unknown.join(', ')}. Výkon doplňte v Technike.</p>
      )}
      <p className="mt-1 text-xs text-muted-foreground">Ráta sa s maximálnym príkonom každého kusu techniky na evente.</p>
    </CollapsibleSection>
  )
}
