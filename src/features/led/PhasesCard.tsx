import { SelectField } from '@/components/ui/field'
import { cn } from '@/lib/utils'
import { balancePhases, type PowerWall } from './power'

const fmt = (value: number, digits = 1) => value.toLocaleString('sk-SK', { maximumFractionDigits: digits })

type Props = {
  walls: PowerWall[]
  wattsPerCircuit: number
  phaseCount: 1 | 2 | 3
  /** Iné zaťaženie na fázach L1–L3 (kW). */
  existingKw: [number, number, number]
  onChange: (patch: { phaseCount?: 1 | 2 | 3; existingKw?: [number, number, number] }) => void
}

/** Rozfázovanie LED stien: okruhy 16 A po stĺpcoch rozdelené na fázy čo najrovnomernejšie. */
export function PhasesCard({ walls, wattsPerCircuit, phaseCount, existingKw, onChange }: Props) {
  const plan = balancePhases(walls, wattsPerCircuit, existingKw.map((kw) => kw * 1000) as [number, number, number], phaseCount)
  const highest = Math.max(...plan.phases.map((phase) => phase.maxW))
  const setExisting = (index: number, value: number) => {
    const next = [...existingKw] as [number, number, number]
    next[index] = value
    onChange({ existingKw: next })
  }
  return (
    <section className="rounded-xl border bg-surface p-4">
      <h2 className="mb-3 text-sm font-medium text-muted-foreground">Rozfázovanie elektriky</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SelectField label="Fázy" value={phaseCount} onChange={(e) => onChange({ phaseCount: Number(e.target.value) as 1 | 2 | 3 })}>
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
              className="h-11 rounded-lg border bg-background px-3"
              value={existingKw[index] || ''}
              placeholder="0"
              onChange={(e) => setExisting(index, Number.isFinite(e.target.valueAsNumber) ? Math.max(0, e.target.valueAsNumber) : 0)}
            />
          </label>
        ))}
      </div>
      <ul className="mt-3 flex flex-col gap-2 text-sm">
        {plan.phases.map((phase) => (
          <li key={phase.phase}>
            <span className="flex justify-between gap-3">
              <span className="font-medium">L{phase.phase}</span>
              <span className={cn(phase.amps > 32 && 'text-destructive')}>
                {fmt(phase.maxW / 1000)} kW · {fmt(phase.amps)} A{phase.maxW !== phase.ledW && ` (LED ${fmt(phase.ledW / 1000)} kW)`}
              </span>
            </span>
            <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
              <span className="block h-full rounded-full bg-accent" style={{ width: `${highest > 0 ? (phase.maxW / highest) * 100 : 0}%` }} />
            </span>
            <span className="text-xs text-muted-foreground">okruhy {phase.circuits.join(', ') || '—'}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-sm">
        Nevyváženosť: <span className={cn('font-medium', plan.imbalance > 20 && 'text-accent')}>{plan.imbalance} %</span>
      </p>
      <details className="mt-2">
        <summary className="cursor-pointer text-sm font-medium">Okruhy (16 A) po stĺpcoch</summary>
        <ul className="mt-2 flex flex-col gap-1 text-sm">
          {plan.circuits.map((circuit) => (
            <li key={circuit.id}>
              <span className="font-medium">Okruh {circuit.id}</span> · L{circuit.phase} · {circuit.wall}: {circuit.fromColumn === circuit.toColumn ? `stĺpec ${circuit.fromColumn}` : `stĺpce ${circuit.fromColumn}–${circuit.toColumn}`} ·{' '}
              {circuit.panels} panelov · {fmt(circuit.maxW / 1000)} kW max
            </li>
          ))}
        </ul>
      </details>
      <p className="mt-2 text-xs text-muted-foreground">Ráta sa s maximálnym príkonom panelov. Fáza nad 32 A je červená.</p>
    </section>
  )
}
