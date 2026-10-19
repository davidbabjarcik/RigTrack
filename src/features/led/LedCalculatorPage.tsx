import { useQuery } from '@tanstack/react-query'
import { Plus, Trash2, TriangleAlert } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Field, SelectField } from '@/components/ui/field'
import { useCompany } from '@/features/companies/company-context'
import { equipmentKeys, fetchEquipmentList } from '@/features/equipment/api'
import { usePartners } from '@/features/partners/api'
import { can } from '@/lib/permissions'
import { cn } from '@/lib/utils'
import { CanvasDiagram } from './CanvasDiagram'
import { LedDiagram } from './LedDiagram'
import { planProcessors, PROCESSOR_PRESETS, type Processor } from './processor'
import { calculateLed, DEFAULT_INPUT, describePieces, MOUNT_LABELS, MOUNTS, PANEL_PRESETS, TRUSS_PRESETS, type LedInput, type Panel } from './model'

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

type StockPanel = { id: string; name: string; quantity: number; panel: Panel }

type EditorProps = {
  input: LedInput
  /** Vstup s dielmi hliníka zo skladu (ak sú zapnuté) – z neho sa počíta. */
  effective: LedInput
  name: string
  set: (patch: Partial<LedInput>) => void
  stockPanels: StockPanel[]
  panelEquipmentId: string | undefined
  onStockPanel: (item: StockPanel | null) => void
  stockTruss: boolean
}

/** Jedna stena: zadanie a výsledky (panely, prúd, hliník, rigging) s nákresom. */
function WallEditor({ input, effective, name, set, stockPanels, panelEquipmentId, onStockPanel, stockTruss }: EditorProps) {
  const setPanel = (patch: Partial<Panel>) => {
    onStockPanel(null)
    set({ panel: { ...input.panel, ...patch, name: patch.name ?? 'Vlastný panel' } })
  }
  const result = calculateLed(effective)
  const presetIndex = PANEL_PRESETS.findIndex((preset) => preset.name === input.panel.name)
  const trussIndex = TRUSS_PRESETS.findIndex((preset) => preset.name === input.truss.name)
  const hanging = input.mount !== 'stacked'
  const panelValue = panelEquipmentId ? `eq:${panelEquipmentId}` : presetIndex >= 0 ? String(presetIndex) : 'custom'

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-4">
          <Card title="Panel">
            <div className="grid grid-cols-2 gap-3">
              <SelectField
                label="Typ panela"
                className="col-span-2"
                value={panelValue}
                onChange={(e) => {
                  const value = e.target.value
                  if (value.startsWith('eq:')) {
                    const item = stockPanels.find((candidate) => candidate.id === value.slice(3))
                    if (item) {
                      onStockPanel(item)
                      set({ panel: item.panel })
                    }
                  } else if (value !== 'custom') {
                    onStockPanel(null)
                    set({ panel: PANEL_PRESETS[Number(value)] })
                  }
                }}
              >
                {stockPanels.length > 0 && (
                  <optgroup label="Z našej techniky">
                    {stockPanels.map((item) => (
                      <option key={item.id} value={`eq:${item.id}`}>
                        {item.name} ({item.quantity} ks)
                      </option>
                    ))}
                  </optgroup>
                )}
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
                {stockTruss ? (
                  <p className="self-end text-sm text-muted-foreground">Diely hliníka: {effective.trussLengths.map((size) => `${fmt(size)} m`).join(', ')} (z techniky)</p>
                ) : (
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
                )}
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
          <LedDiagram input={effective} result={result} name={name} />
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

type Wall = LedInput & { id: string; name: string; panelEquipmentId?: string }
type State = {
  walls: Wall[]
  active: number
  /** Hliník podľa dielov v technike (druh truss s dĺžkou). */
  stockTruss: boolean
  /** Procesor: „preset:N“ alebo id techniky. */
  processor: string
  /** Odkiaľ chýbajúce panely: kľúč panela → id firmy z Firmy a kontakty. */
  suppliers: Record<string, string>
}

const STATE_KEY = 'rigtrack.led.v2'
const newId = () => Math.random().toString(36).slice(2, 10)

function loadState(): State {
  const fallback: State = { walls: [{ ...DEFAULT_INPUT, id: newId(), name: 'Stena 1' }], active: 0, stockTruss: false, processor: 'preset:2', suppliers: {} }
  try {
    const saved = localStorage.getItem(STATE_KEY)
    if (saved) {
      const state = JSON.parse(saved) as State
      if (state.walls?.length) {
        return { ...fallback, ...state, walls: state.walls.map((wall) => ({ ...DEFAULT_INPUT, ...wall })), active: Math.min(state.active ?? 0, state.walls.length - 1) }
      }
    }
    // Staršia verzia kalkulačky mala jednu stenu.
    const old = localStorage.getItem('rigtrack.led')
    if (old) return { ...fallback, walls: [{ ...DEFAULT_INPUT, ...(JSON.parse(old) as Partial<LedInput>), id: newId(), name: 'Stena 1' }] }
  } catch {
    // Poškodené nastavenie – začne sa odznova.
  }
  return fallback
}

const panelKey = (wall: Wall) => (wall.panelEquipmentId ? `eq:${wall.panelEquipmentId}` : `name:${wall.panel.name}`)

/** LED kalkulačka: viac stien, panely a hliník zo skladu, subdodávateľ, procesor a rozloženie do vstupov. */
export function LedCalculatorPage() {
  const company = useCompany().active
  const companyId = company?.companyId ?? ''
  const canSeeStock = Boolean(company && can(company, 'equipment.view'))
  const equipment = useQuery({ queryKey: equipmentKeys.list(companyId), queryFn: () => fetchEquipmentList(companyId), enabled: canSeeStock })
  const partners = usePartners(companyId)
  const [state, setState] = useState<State>(loadState)
  useEffect(() => {
    try {
      localStorage.setItem(STATE_KEY, JSON.stringify(state))
    } catch {
      // Bez úložiska sa nastavenie len nezapamätá.
    }
  }, [state])

  const items = equipment.data ?? []
  const stockPanels: StockPanel[] = items
    .filter((item) => item.attributes.ledPanel && item.status !== 'retired')
    .map((item) => ({ id: item.id, name: item.name, quantity: item.quantity, panel: { name: item.name, ...item.attributes.ledPanel! } }))
  const stockProcessors = items.filter((item) => item.attributes.ledProcessor && item.status !== 'retired')
  const trussStock = new Map<number, number>()
  for (const item of items) {
    const length = item.attributes.lengthM
    if (item.kind === 'truss' && length && item.status !== 'retired') trussStock.set(length, (trussStock.get(length) ?? 0) + item.quantity)
  }
  const stockTruss = state.stockTruss && trussStock.size > 0
  const effective = (wall: Wall): LedInput => (stockTruss ? { ...wall, trussLengths: [...trussStock.keys()] } : wall)

  const wall = state.walls[state.active]
  const setWall = (patch: Partial<Wall>) =>
    setState((current) => ({ ...current, walls: current.walls.map((item, index) => (index === current.active ? { ...item, ...patch } : item)) }))
  const results = state.walls.map((item) => ({ wall: item, result: calculateLed(effective(item)) }))

  // Panely spolu podľa druhu oproti skladu.
  const panelNeeds = new Map<string, { label: string; need: number; have: number | null }>()
  for (const { wall: item, result } of results) {
    const key = panelKey(item)
    const stock = stockPanels.find((panel) => panel.id === item.panelEquipmentId)
    const entry = panelNeeds.get(key) ?? { label: item.panel.name, need: 0, have: stock ? stock.quantity : null }
    entry.need += result.panels
    panelNeeds.set(key, entry)
  }
  // Hliník spolu podľa dĺžky oproti skladu.
  const trussNeeds = new Map<number, number>()
  for (const { result } of results) for (const need of result.truss?.needs ?? []) trussNeeds.set(need.lengthM, (trussNeeds.get(need.lengthM) ?? 0) + need.count)

  // Kým človek procesor nevyberie, použije sa prvý z techniky.
  const processorChoice = state.processor === 'preset:2' && stockProcessors[0] ? stockProcessors[0].id : state.processor
  const processorItem = stockProcessors.find((item) => item.id === processorChoice)
  const processor: Processor = processorItem
    ? { name: processorItem.name, ...processorItem.attributes.ledProcessor! }
    : (PROCESSOR_PRESETS[Number(processorChoice.replace('preset:', ''))] ?? PROCESSOR_PRESETS[2])
  const plan = planProcessors(
    results.map(({ wall: item, result }) => ({ name: item.name, columns: result.columns, rows: result.rows, panelPxW: item.panel.pxW, panelPxH: item.panel.pxH })),
    processor,
  )
  const totals = results.reduce(
    (sum, { result }) => ({ panels: sum.panels + result.panels, area: sum.area + result.areaM2, maxW: sum.maxW + result.power.maxW, kg: sum.kg + result.screenKg }),
    { panels: 0, area: 0, maxW: 0, kg: 0 },
  )

  return (
    <>
      <PageHeader title="LED kalkulačka" description="Panely, m², rozlíšenie, prúd, hliník, rigging a procesor – aj pre viac stien naraz" />

      <div className="mb-4 flex flex-wrap items-center gap-2" role="tablist" aria-label="Steny">
        {state.walls.map((item, index) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={index === state.active}
            onClick={() => setState({ ...state, active: index })}
            className={cn('h-9 rounded-lg border px-3 text-sm font-medium', index === state.active ? 'bg-primary text-primary-foreground' : 'bg-surface hover:bg-muted')}
          >
            {item.name}
          </button>
        ))}
        {state.walls.length < 8 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setState({ ...state, walls: [...state.walls, { ...wall, id: newId(), name: `Stena ${state.walls.length + 1}` }], active: state.walls.length })}
          >
            <Plus className="size-4" aria-hidden />
            Ďalšia stena
          </Button>
        )}
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <Field label="Názov steny" className="w-56" maxLength={40} value={wall.name} onChange={(e) => setWall({ name: e.target.value })} />
        {state.walls.length > 1 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setState({ ...state, walls: state.walls.filter((_, index) => index !== state.active), active: Math.max(0, state.active - 1) })}
          >
            <Trash2 className="size-4" aria-hidden />
            Odstrániť stenu
          </Button>
        )}
        {trussStock.size > 0 && (
          <label className="flex items-center gap-2 pb-2 text-sm">
            <input type="checkbox" className="size-4" checked={state.stockTruss} onChange={(e) => setState({ ...state, stockTruss: e.target.checked })} />
            Hliník podľa dielov v technike
          </label>
        )}
      </div>

      <WallEditor
        key={wall.id}
        input={wall}
        effective={effective(wall)}
        name={wall.name}
        set={(patch) => setWall(patch)}
        stockPanels={stockPanels}
        panelEquipmentId={wall.panelEquipmentId}
        onStockPanel={(item) => setWall({ panelEquipmentId: item?.id })}
        stockTruss={stockTruss}
      />

      <h2 className="mt-8 mb-3 text-lg font-semibold">{state.walls.length > 1 ? `Spolu za ${state.walls.length} steny` : 'Materiál a zapojenie'}</h2>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Panely – máme / treba">
          {state.walls.length > 1 && (
            <p className="mb-2 text-sm">
              {totals.panels} panelov · {fmt(totals.area)} m² · {fmt(totals.maxW / 1000, 1)} kW max · {fmt(totals.kg, 1)} kg
            </p>
          )}
          <ul className="flex flex-col gap-3 text-sm">
            {[...panelNeeds.entries()].map(([key, entry]) => {
              const missing = entry.have === null ? entry.need : Math.max(0, entry.need - entry.have)
              return (
                <li key={key} className="flex flex-col gap-1">
                  <span className="flex justify-between gap-3">
                    <span className="font-medium">{entry.label}</span>
                    <span>
                      treba {entry.need} ks{entry.have !== null && ` · máme ${entry.have} ks`}
                    </span>
                  </span>
                  {missing > 0 && (
                    <span className="flex flex-wrap items-center gap-2">
                      <span className={entry.have === null ? 'text-muted-foreground' : 'text-destructive'}>
                        {entry.have === null ? 'nie je v našej technike' : `chýba ${missing} ks`} – od:
                      </span>
                      <SelectField
                        label="Subdodávateľ"
                        hideLabel
                        className="w-56"
                        value={state.suppliers[key] ?? ''}
                        onChange={(e) => setState({ ...state, suppliers: { ...state.suppliers, [key]: e.target.value } })}
                      >
                        <option value="">— vyberte subdodávateľa —</option>
                        {(partners.data ?? []).map((partner) => (
                          <option key={partner.id} value={partner.id}>
                            {partner.name}
                          </option>
                        ))}
                      </SelectField>
                    </span>
                  )}
                </li>
              )
            })}
          </ul>
          {stockPanels.length === 0 && canSeeStock && (
            <p className="mt-2 text-xs text-muted-foreground">Panely zo skladu: v technike zaškrtnite „LED panel“ a zadajte rozmer a pixely.</p>
          )}
        </Card>

        {trussNeeds.size > 0 && (
          <Card title="Hliník – máme / treba">
            <dl className="divide-y text-sm">
              {[...trussNeeds.entries()]
                .sort((a, b) => b[0] - a[0])
                .map(([length, need]) => {
                  const have = trussStock.get(length)
                  const short = (have !== undefined && need > have) || (have === undefined && trussStock.size > 0)
                  return (
                    <div key={length} className="flex justify-between gap-4 py-1.5">
                      <dt>{fmt(length)} m</dt>
                      <dd className={cn('font-medium', short && 'text-destructive')}>
                        treba {need} ks{have !== undefined ? ` · máme ${have}` : trussStock.size > 0 ? ' · nemáme' : ''}
                      </dd>
                    </div>
                  )
                })}
            </dl>
            {trussStock.size === 0 && canSeeStock && (
              <p className="mt-2 text-xs text-muted-foreground">Hliník zo skladu: technika druhu „Stage – hliník / truss“ s dĺžkou dielu a počtom kusov.</p>
            )}
          </Card>
        )}

        <Card title="Procesor a zapojenie">
          <SelectField label="Procesor" value={processorChoice} onChange={(e) => setState({ ...state, processor: e.target.value })}>
            {stockProcessors.length > 0 && (
              <optgroup label="Z našej techniky">
                {stockProcessors.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.attributes.ledProcessor!.outputs} výstupov, {item.quantity} ks)
                  </option>
                ))}
              </optgroup>
            )}
            <optgroup label="Typické">
              {PROCESSOR_PRESETS.map((preset, index) => (
                <option key={preset.name} value={`preset:${index}`}>
                  {preset.name}
                </option>
              ))}
            </optgroup>
          </SelectField>
          <div className="mt-3">
            <Rows
              rows={[
                ['Porty (výstupy) spolu', `${plan.ports}`],
                [
                  'Procesorov treba',
                  <span key="processors" className={processorItem && plan.processors > processorItem.quantity ? 'text-destructive' : undefined}>
                    {plan.processors}
                    {processorItem && ` · máme ${processorItem.quantity}`}
                  </span>,
                ],
                [
                  `Vstupov ${processor.inputW}×${processor.inputH}`,
                  <span key="inputs" className={plan.inputsShort ? 'text-destructive' : undefined}>
                    {plan.canvases} (procesor má {processor.inputs})
                  </span>,
                ],
              ]}
            />
          </div>
          {plan.inputsShort && <p className="mt-2 text-sm text-destructive">Obraz sa nezmestí do vstupov – zvážte škálovanie, väčší procesor alebo ďalší procesor.</p>}
          <details className="mt-3">
            <summary className="cursor-pointer text-sm font-medium">Zapojenie portov</summary>
            <ul className="mt-2 flex flex-col gap-1 text-sm">
              {plan.runs.map((run) => (
                <li key={run.port}>
                  <span className="font-medium">Port {run.port}</span> · {run.wall}: {run.fromColumn === run.toColumn ? `stĺpec ${run.fromColumn}` : `stĺpce ${run.fromColumn}–${run.toColumn}`} ·{' '}
                  {run.panels} panelov · {fmt(run.pixels, 0)} px
                </li>
              ))}
            </ul>
          </details>
        </Card>

        <Card title={`Rozloženie do vstupov (${processor.inputW}×${processor.inputH})`}>
          <CanvasDiagram placements={plan.placements} canvases={plan.canvases} inputW={processor.inputW} inputH={processor.inputH} walls={state.walls.map((item) => item.name)} />
          <p className="mt-2 text-xs text-muted-foreground">
            Steny sú v obraze po radoch od najvyššej; čo sa do jedného vstupu nezmestí, ide na ďalší (napr. HDMI 2 ako druhý obraz). Polohy (x, y) nastavte rovnako v Novastar.
          </p>
          <ul className="mt-2 text-sm">
            {plan.placements.map((place) => (
              <li key={place.wall}>
                {place.wall}: vstup {place.canvas + 1}
                {place.tilesX * place.tilesY > 1
                  ? `–${place.canvas + place.tilesX * place.tilesY} (rozdelená na ${place.tilesX}×${place.tilesY})`
                  : `, x ${place.x}, y ${place.y}, ${place.w}×${place.h} px`}
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  )
}
