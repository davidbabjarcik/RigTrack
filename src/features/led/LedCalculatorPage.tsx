import { TriangleAlert } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Field, SelectField } from '@/components/ui/field'
import { cn } from '@/lib/utils'
import { calculateLed, DEFAULT_INPUT, describePieces, MOUNT_LABELS, MOUNTS, PANEL_PRESETS, TRUSS_PRESETS, type LedInput, type Panel } from './model'

const STORAGE_KEY = 'rigtrack.led'

function load(): LedInput {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? { ...DEFAULT_INPUT, ...(JSON.parse(saved) as Partial<LedInput>) } : DEFAULT_INPUT
  } catch {
    return DEFAULT_INPUT
  }
}

const fmt = (value: number, digits = 2) => value.toLocaleString('sk-SK', { maximumFractionDigits: digits })

/** Číselné pole: prázdne / neplatné sa neuloží, aby výpočet nepadol počas písania. */
function Num({ label, value, onChange, step = 'any', min = 0, className }: { label: string; value: number; onChange: (value: number) => void; step?: string; min?: number; className?: string }) {
  const [text, setText] = useState(String(value))
  const [shown, setShown] = useState(value)
  // Hodnota sa zmenila zvonka (napr. výber panela) – pole ju prevezme.
  if (shown !== value) {
    setShown(value)
    setText(String(value))
  }
  return (
    <Field
      label={label}
      className={className}
      type="number"
      inputMode="decimal"
      min={min}
      step={step}
      value={text}
      onChange={(e) => {
        setText(e.target.value)
        const next = e.target.valueAsNumber
        if (Number.isFinite(next) && next >= min) {
          setShown(next)
          onChange(next)
        }
      }}
    />
  )
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border bg-surface p-4">
      <h2 className="mb-3 text-sm font-medium text-muted-foreground">{title}</h2>
      {children}
    </section>
  )
}

function Rows({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="divide-y text-sm">
      {rows
        .filter(([, value]) => value !== null && value !== false && value !== '')
        .map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4 py-1.5">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="text-right font-medium">{value}</dd>
          </div>
        ))}
    </dl>
  )
}

/** LED kalkulačka: z rozmeru panely, m², rozlíšenie, prúd, a podľa spôsobu stavby hliník a rigging materiál. */
export function LedCalculatorPage() {
  const [input, setInput] = useState<LedInput>(load)
  const set = (patch: Partial<LedInput>) => setInput((current) => ({ ...current, ...patch }))
  const setPanel = (patch: Partial<Panel>) => setInput((current) => ({ ...current, panel: { ...current.panel, ...patch, name: patch.name ?? 'Vlastný panel' } }))
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(input))
    } catch {
      // Bez úložiska sa nastavenie len nezapamätá.
    }
  }, [input])
  const result = calculateLed(input)
  const presetIndex = PANEL_PRESETS.findIndex((preset) => preset.name === input.panel.name)
  const trussIndex = TRUSS_PRESETS.findIndex((preset) => preset.name === input.truss.name)
  const hanging = input.mount !== 'stacked'

  return (
    <>
      <PageHeader title="LED kalkulačka" description="Koľko panelov, m², rozlíšenie, prúd, hliník a rigging na LED stenu" />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-4">
          <Card title="Panel">
            <div className="grid grid-cols-2 gap-3">
              <SelectField
                label="Typ panela"
                className="col-span-2"
                value={presetIndex >= 0 ? String(presetIndex) : 'custom'}
                onChange={(e) => e.target.value !== 'custom' && set({ panel: PANEL_PRESETS[Number(e.target.value)] })}
              >
                {PANEL_PRESETS.map((preset, index) => (
                  <option key={preset.name} value={index}>
                    {preset.name}
                  </option>
                ))}
                <option value="custom">Vlastný panel</option>
              </SelectField>
              <Num label="Šírka panela (mm)" value={input.panel.widthMm} min={1} onChange={(value) => setPanel({ widthMm: value })} />
              <Num label="Výška panela (mm)" value={input.panel.heightMm} min={1} onChange={(value) => setPanel({ heightMm: value })} />
              <Num label="Pixely na šírku" value={input.panel.pxW} min={1} step="1" onChange={(value) => setPanel({ pxW: value })} />
              <Num label="Pixely na výšku" value={input.panel.pxH} min={1} step="1" onChange={(value) => setPanel({ pxH: value })} />
              <Num label="Váha panela (kg)" value={input.panel.weightKg} onChange={(value) => setPanel({ weightKg: value })} />
              <Num label="Príkon max (W)" value={input.panel.maxW} min={1} onChange={(value) => setPanel({ maxW: value })} />
              <Num label="Príkon priemer (W)" value={input.panel.avgW} onChange={(value) => setPanel({ avgW: value })} />
            </div>
          </Card>

          <Card title="Rozmer steny">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Num label="Šírka (m)" value={input.widthM} min={0.1} onChange={(value) => set({ widthM: value })} />
              <Num label="Výška (m)" value={input.heightM} min={0.1} onChange={(value) => set({ heightM: value })} />
              <SelectField label="Zaokrúhliť" value={input.rounding} onChange={(e) => set({ rounding: e.target.value as LedInput['rounding'] })}>
                <option value="nearest">na najbližší</option>
                <option value="down">nikdy väčšia</option>
                <option value="up">nikdy menšia</option>
              </SelectField>
            </div>
          </Card>

          <Card title="Stavba">
            <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label="Spôsob stavby">
              {MOUNTS.map((mount) => (
                <button
                  key={mount}
                  type="button"
                  aria-pressed={input.mount === mount}
                  onClick={() => set({ mount })}
                  className={cn('h-9 rounded-lg border px-3 text-sm font-medium', input.mount === mount ? 'bg-primary text-primary-foreground' : 'bg-surface hover:bg-muted')}
                >
                  {MOUNT_LABELS[mount]}
                </button>
              ))}
            </div>
            {hanging && (
              <div className="grid gap-3 sm:grid-cols-2">
                <SelectField
                  label="Truss"
                  value={trussIndex >= 0 ? String(trussIndex) : '0'}
                  onChange={(e) => set({ truss: TRUSS_PRESETS[Number(e.target.value)] })}
                >
                  {TRUSS_PRESETS.map((preset, index) => (
                    <option key={preset.name} value={index}>
                      {preset.name} ({fmt(preset.kgPerM, 1)} kg/m)
                    </option>
                  ))}
                </SelectField>
                <Field
                  label="Diely, ktoré máme (m)"
                  placeholder="3, 2, 1, 0,5"
                  defaultValue={input.trussLengths.map((size) => String(size).replace('.', ',')).join(', ')}
                  onChange={(e) => {
                    const sizes = e.target.value
                      .split(/[;\s]+|,\s+/)
                      .map((part) => Number(part.replace(',', '.')))
                      .filter((size) => Number.isFinite(size) && size > 0)
                    if (sizes.length > 0) set({ trussLengths: sizes })
                  }}
                />
                <Num label="Presah trussu na každej strane (m)" value={input.overhangM} onChange={(value) => set({ overhangM: value })} />
                {input.mount === 'goalpost' && <Num label="Spodok steny nad zemou (m)" value={input.clearanceM} onChange={(value) => set({ clearanceM: value })} />}
                {input.mount === 'flown' && (
                  <>
                    <Num label="Max. rozostup bodov (m)" value={input.pointSpacingM} min={0.5} onChange={(value) => set({ pointSpacingM: value })} />
                    <Num label="Nosnosť motora (kg)" value={input.hoistKg} min={1} onChange={(value) => set({ hoistKg: value })} />
                  </>
                )}
              </div>
            )}
            {hanging && (
              <details className="mt-3">
                <summary className="cursor-pointer text-sm font-medium">Materiál na lištu, bod a spoj</summary>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <Num label="Váha závesnej lišty (kg)" value={input.barKg} onChange={(value) => set({ barKg: value })} />
                  <Num label="Úväzy na lištu" value={input.slingsPerBar} step="1" onChange={(value) => set({ slingsPerBar: value })} />
                  <Num label="Shackle na lištu" value={input.shacklesPerBar} step="1" onChange={(value) => set({ shacklesPerBar: value })} />
                  {input.mount === 'flown' && (
                    <>
                      <Num label="Úväzy na bod" value={input.slingsPerPoint} step="1" onChange={(value) => set({ slingsPerPoint: value })} />
                      <Num label="Topy (2 nekonečné oká) na bod" value={input.steelsPerPoint} step="1" onChange={(value) => set({ steelsPerPoint: value })} />
                      <Num label="Shackle na bod" value={input.shacklesPerPoint} step="1" onChange={(value) => set({ shacklesPerPoint: value })} />
                    </>
                  )}
                  <Num label="Kónusy (kocky) na spoj" value={input.conesPerJoint} step="1" onChange={(value) => set({ conesPerJoint: value })} />
                  <Num label="Čapy / skrutky na spoj" value={input.pinsPerJoint} step="1" onChange={(value) => set({ pinsPerJoint: value })} />
                  <Num label="Závlačky / matice na spoj" value={input.clipsPerJoint} step="1" onChange={(value) => set({ clipsPerJoint: value })} />
                </div>
              </details>
            )}
            <details className="mt-3">
              <summary className="cursor-pointer text-sm font-medium">Prúd a procesor</summary>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <Num label="Bezpečne na 16 A okruh (W)" value={input.wattsPerCircuit} min={100} onChange={(value) => set({ wattsPerCircuit: value })} />
                <Num label="Pixelov na port" value={input.pixelsPerPort} min={1000} step="1000" onChange={(value) => set({ pixelsPerPort: value })} />
              </div>
            </details>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          {result.warnings.length > 0 && (
            <div role="alert" className="flex flex-col gap-1 rounded-xl border border-accent/40 bg-accent/10 p-4 text-sm">
              {result.warnings.map((warning) => (
                <p key={warning} className="flex gap-2">
                  <TriangleAlert className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
                  {warning}
                </p>
              ))}
            </div>
          )}
          <Card title="Stena">
            <p className="mb-3 text-2xl font-semibold">
              {fmt(result.widthM)} × {fmt(result.heightM)} m <span className="text-base font-normal text-muted-foreground">· {fmt(result.areaM2)} m²</span>
            </p>
            <Rows
              rows={[
                ['Panely', `${result.columns} × ${result.rows} = ${result.panels} ks`],
                ['Rozlíšenie', `${result.resolution.w} × ${result.resolution.h} px (${result.aspect})`],
                ['Pixelov spolu', fmt(result.resolution.total, 0)],
                ['Porty procesora', `${result.ports}`],
                ['Váha panelov', `${fmt(result.screenKg, 1)} kg`],
              ]}
            />
          </Card>
          <Card title="Elektrina">
            <Rows
              rows={[
                ['Príkon max / priemer', `${fmt(result.power.maxW / 1000, 1)} kW / ${fmt(result.power.avgW / 1000, 1)} kW`],
                ['Prúd 1-fázovo (230 V)', `${fmt(result.power.ampsSingle, 1)} A`],
                ['Prúd na fázu (3-fázovo)', `${fmt(result.power.ampsPerPhase, 1)} A`],
                ['Okruhy 16 A', `${result.power.circuits} (najviac ${result.power.panelsPerCircuit} panelov na okruh)`],
              ]}
            />
          </Card>
          {result.truss && (
            <Card title="Hliník">
              <Rows
                rows={[
                  ...result.truss.runs.map((run): [string, ReactNode] => [run.label, `${fmt(run.totalM)} m: ${describePieces(run.pieces)}`]),
                  ['Hliník spolu', `${fmt(result.truss.totalM)} m · ${fmt(result.truss.weightKg, 1)} kg`],
                  ['Rohové kocky', result.truss.cornerCubes > 0 && `${result.truss.cornerCubes} ks`],
                  ['Podstavy (base plate)', result.truss.basePlates > 0 && `${result.truss.basePlates} ks`],
                  ['Spoje', `${result.truss.joints}`],
                  ['Kónusy (kocky na spoje)', `${result.truss.cones} ks`],
                  ['Čapy / skrutky', `${result.truss.pins} ks`],
                  ['Závlačky / matice', `${result.truss.clips} ks`],
                ]}
              />
            </Card>
          )}
          {result.rigging && (
            <Card title="Rigging">
              <Rows
                rows={[
                  ['Závesné lišty', `${result.rigging.bars} ks · ${fmt(result.rigging.barsKg, 1)} kg`],
                  ['Závesné body / motory', input.mount === 'flown' && `${result.rigging.points}`],
                  ['Úväzy', `${result.rigging.slings} ks`],
                  ['Topy (2 nekonečné oká)', result.rigging.steels > 0 && `${result.rigging.steels} ks`],
                  ['Shackle', `${result.rigging.shackles} ks`],
                  ['Visí spolu', `${fmt(result.rigging.totalKg, 1)} kg`],
                  [
                    input.mount === 'goalpost' ? 'Na jednu vežu' : 'Na jeden bod',
                    <span key="point" className={result.rigging.overload ? 'text-destructive' : undefined}>
                      {fmt(result.rigging.kgPerPoint, 1)} kg
                    </span>,
                  ],
                ]}
              />
            </Card>
          )}
          {result.stack && (
            <Card title="Ground stack">
              <Rows
                rows={[
                  ['Spodné nosníky (na stĺpec)', `${result.stack.baseBars} ks`],
                  ['Zadné podpery', `${result.stack.braces} ks`],
                ]}
              />
            </Card>
          )}
          <p className="text-xs text-muted-foreground">
            Orientačný výpočet. Hodnoty panelov a materiálu na lištu / bod / spoj upravte podľa vášho systému; nosnosť trussu a motorov vždy overte podľa výrobcu.
          </p>
        </div>
      </div>
    </>
  )
}
