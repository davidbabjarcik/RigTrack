import { cn } from '@/lib/utils'

type Props = {
  label: string
  /** Čísla kusov, ktoré sa ponúkajú. */
  units: number[]
  chosen: number[]
  /** Kusy, ktoré sa vybrať nedajú (sú obsadené inde). */
  taken?: number[]
  takenHint?: string
  error?: string
  /** Farba vybraného kusu: bežný výber alebo označenie poškodenia. */
  tone?: 'primary' | 'destructive'
  onChange: (chosen: number[]) => void
}

/** Výber očíslovaných kusov techniky (#1, #2, …) tlačidlami. */
export function UnitPicker({ label, units, chosen, taken = [], takenHint, error, tone = 'primary', onChange }: Props) {
  const toggle = (unit: number) =>
    onChange(chosen.includes(unit) ? chosen.filter((other) => other !== unit) : [...chosen, unit].sort((a, b) => a - b))

  return (
    <fieldset className="min-w-0">
      <legend className="mb-1.5 text-sm font-medium">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {units.map((unit) => {
          const blocked = taken.includes(unit) && !chosen.includes(unit)
          return (
            <label
              key={unit}
              title={blocked ? takenHint : undefined}
              className={cn(
                'inline-flex h-10 min-w-12 cursor-pointer items-center justify-center rounded-lg border px-3 text-sm font-medium tabular-nums has-focus-visible:ring-2 has-focus-visible:ring-ring',
                chosen.includes(unit)
                  ? tone === 'destructive'
                    ? 'border-destructive bg-destructive text-white'
                    : 'bg-primary text-primary-foreground'
                  : 'bg-surface hover:bg-muted',
                blocked && 'cursor-not-allowed opacity-40 hover:bg-surface',
              )}
            >
              <input type="checkbox" className="sr-only" checked={chosen.includes(unit)} disabled={blocked} onChange={() => toggle(unit)} />
              #{unit}
            </label>
          )
        })}
      </div>
      {takenHint && units.some((unit) => taken.includes(unit) && !chosen.includes(unit)) && (
        <p className="mt-1.5 text-sm text-muted-foreground">Vyblednuté kusy: {takenHint}.</p>
      )}
      {error && (
        <p role="alert" className="mt-1.5 text-sm text-destructive">
          {error}
        </p>
      )}
    </fieldset>
  )
}
