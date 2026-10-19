import { useState } from 'react'
import { CalculatorTabs } from '@/components/layout/ModuleTabs'
import { PageHeader } from '@/components/layout/PageHeader'
import { Field, SelectField } from '@/components/ui/field'
import { cn } from '@/lib/utils'
import { addressFromSwitches, describeSwitches, dipSwitches, MAX_ADDRESS, patchFixtures } from './model'

/** Rad dip prepínačov; zapnuté hore (ON), klikom sa dajú prepínať. */
function Switches({ on, onToggle }: { on: boolean[]; onToggle?: (index: number) => void }) {
  return (
    <div className="flex flex-wrap gap-1" role="group" aria-label="Dip prepínače">
      {on.map((value, index) => (
        <button
          key={index}
          type="button"
          disabled={!onToggle}
          aria-pressed={value}
          aria-label={`Prepínač ${index + 1} (${1 << index}) ${value ? 'zapnutý' : 'vypnutý'}`}
          onClick={() => onToggle?.(index)}
          className="flex flex-col items-center gap-1"
        >
          <span className="flex h-12 w-6 flex-col rounded-md border-2 border-foreground/70 bg-muted p-0.5">
            <span className={cn('h-1/2 w-full rounded-sm transition-colors', value ? 'bg-accent' : 'translate-y-full bg-foreground/60')} />
          </span>
          <span className="text-xs font-medium">{index + 1}</span>
        </button>
      ))}
    </div>
  )
}

/** DMX kalkulačka: adresa ↔ dip prepínače a adresy pre rad svetiel. */
export function DmxPage() {
  const [address, setAddress] = useState(1)
  const [switchCount, setSwitchCount] = useState(9)
  const [start, setStart] = useState(1)
  const [channels, setChannels] = useState(16)
  const [count, setCount] = useState(8)
  const on = dipSwitches(address, switchCount)
  const valid = (value: number, max: number) => (Number.isFinite(value) ? Math.max(1, Math.min(max, Math.round(value))) : 1)
  const fixtures = patchFixtures(start, channels, Math.min(count, 200))

  return (
    <>
      <CalculatorTabs />
      <PageHeader title="DMX dip switch" description="Adresa na dip prepínače a späť, adresy pre rad svetiel" />
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border bg-surface p-4">
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">Adresa ↔ prepínače</h2>
          <div className="mb-4 grid grid-cols-2 gap-3">
            <Field label="DMX adresa" type="number" inputMode="numeric" min={1} max={MAX_ADDRESS} value={address} onChange={(e) => setAddress(valid(e.target.valueAsNumber, 511))} />
            <SelectField label="Počet prepínačov" value={switchCount} onChange={(e) => setSwitchCount(Number(e.target.value))}>
              <option value={9}>9 (adresa)</option>
              <option value={10}>10 (10. = funkcia / 512)</option>
            </SelectField>
          </div>
          <Switches on={on} onToggle={(index) => setAddress(Math.max(1, Math.min(511, addressFromSwitches(on.map((value, i) => (i === index ? !value : value))))))} />
          <p className="mt-3 text-sm">
            Zapnúť: <span className="font-medium">{on.flatMap((value, index) => (value ? [index + 1] : [])).join(', ') || '—'}</span>
            <span className="text-muted-foreground"> · hodnoty {describeSwitches(on)} = {address}</span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Klikom na prepínač sa adresa prepočíta. Prepínač 1 = 1, 2 = 2, 3 = 4 … 9 = 256.</p>
        </section>

        <section className="rounded-xl border bg-surface p-4">
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">Adresy pre rad svetiel</h2>
          <div className="mb-3 grid grid-cols-3 gap-3">
            <Field label="Štart" type="number" inputMode="numeric" min={1} max={512} value={start} onChange={(e) => setStart(valid(e.target.valueAsNumber, 512))} />
            <Field label="Kanálov / svetlo" type="number" inputMode="numeric" min={1} max={512} value={channels} onChange={(e) => setChannels(valid(e.target.valueAsNumber, 512))} />
            <Field label="Počet svetiel" type="number" inputMode="numeric" min={1} max={200} value={count} onChange={(e) => setCount(valid(e.target.valueAsNumber, 200))} />
          </div>
          <ul className="divide-y rounded-lg border text-sm">
            {fixtures.map((item) => (
              <li key={item.fixture} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                <span>
                  <span className="font-medium">#{item.fixture}</span> · {item.universe > 1 && `univerzum ${item.universe} · `}adresa <span className="font-mono font-semibold">{item.address}</span>
                  <span className="text-muted-foreground"> (do {item.last})</span>
                </span>
                <button type="button" className="text-xs text-accent hover:underline" onClick={() => setAddress(Math.min(511, item.address))}>
                  dip: {dipSwitches(item.address, switchCount).flatMap((value, index) => (value ? [index + 1] : [])).join(', ')}
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  )
}
