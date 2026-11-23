import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, ArrowLeft, Copy, Info, Plus, Redo2, Save, Search, Trash2, Undo2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ErrorBlock, LoadingBlock } from '@/components/feedback/QueryState'
import { Button } from '@/components/ui/button'
import { useCompany } from '@/features/companies/company-context'
import { equipmentKeys, fetchEquipmentList } from '@/features/equipment/api'
import { useCatalog } from '@/features/equipment/catalog'
import type { EquipmentAttributes } from '@/features/equipment/model'
import { tf, tx } from '@/lib/i18n'
import { can } from '@/lib/permissions'
import { cn } from '@/lib/utils'
import { fetchRacks, fetchSlots, rackKeys, saveSlots } from './api'
import { freePlace, newSlot, overlaps, rackSummary, rackWarnings, slotInfo, type FitSlot, type Sources } from './fit'
import { ACCESSORIES, ACCESSORY_LABELS, SLOT_WIDTH_LABELS, SLOT_WIDTHS, type Accessory, type RackDesign, type SlotWidth } from './model'
import { kindColor, targetAt, type DropTarget } from './gridUtils'
import { RackGrid } from './RackGrid'

const FILTERS = [
  { id: 'all', label: 'Všetko', kinds: [] as string[] },
  { id: 'audio', label: 'Zvuk', kinds: ['audio', 'dj'] },
  { id: 'light', label: 'Svetlo', kinds: ['light'] },
  { id: 'video', label: 'Video', kinds: ['video'] },
  { id: 'power', label: 'Napájanie', kinds: ['appliance'] },
  { id: 'network', label: 'Sieť', kinds: ['it'] },
] as const

type Candidate = { id: string; name: string; detail: string; kind: string; attributes: EquipmentAttributes; source: { equipmentId?: string; unit?: number | null; catalogId?: string; accessory?: Accessory }; used: boolean }

let counter = 0
const nextKey = () => `n${Date.now().toString(36)}${(counter++).toString(36)}`

function Editor({ companyId, rack, initial }: { companyId: string; rack: RackDesign; initial: FitSlot[] }) {
  const queryClient = useQueryClient()
  const equipment = useQuery({ queryKey: equipmentKeys.list(companyId), queryFn: () => fetchEquipmentList(companyId) })
  const catalog = useCatalog()
  const [history, setHistory] = useState<{ past: FitSlot[][]; present: FitSlot[]; future: FitSlot[][] }>({ past: [], present: initial, future: [] })
  const slots = history.present
  const [saved, setSaved] = useState(initial)
  const [version, setVersion] = useState(rack.version)
  const [side, setSide] = useState<'front' | 'rear'>('front')
  const [selected, setSelected] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['id']>('all')
  const [tab, setTab] = useState<'stock' | 'catalog' | 'accessories'>('stock')
  const gridRef = useRef<HTMLDivElement | null>(null)
  const [panelDrag, setPanelDrag] = useState<{ candidate: Candidate; hover: DropTarget | null } | null>(null)
  const dirty = JSON.stringify(slots) !== JSON.stringify(saved)

  const sources: Sources = useMemo(() => ({ equipment: equipment.data ?? [], catalog: catalog.data ?? [] }), [equipment.data, catalog.data])
  const commit = useCallback((next: FitSlot[]) => setHistory((current) => ({ past: [...current.past, current.present].slice(-100), present: next, future: [] })), [])
  const undo = () => setHistory((current) => (current.past.length === 0 ? current : { past: current.past.slice(0, -1), present: current.past[current.past.length - 1], future: [current.present, ...current.future] }))
  const redo = () => setHistory((current) => (current.future.length === 0 ? current : { past: [...current.past, current.present], present: current.future[0], future: current.future.slice(1) }))

  useEffect(() => {
    const keys = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || (event.target as HTMLElement).tagName === 'INPUT') return
      if (event.key.toLowerCase() === 'z' && !event.shiftKey) {
        event.preventDefault()
        undo()
      }
      if (event.key.toLowerCase() === 'y' || (event.key.toLowerCase() === 'z' && event.shiftKey)) {
        event.preventDefault()
        redo()
      }
    }
    window.addEventListener('keydown', keys)
    return () => window.removeEventListener('keydown', keys)
  }, [])
  // Neuložené zmeny: prehliadač sa opýta pred zatvorením.
  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const save = useMutation({
    mutationFn: () => saveSlots(rack.id, version, slots.map(({ key: _key, ...slot }) => (void _key, slot))),
    onSuccess: async (next) => {
      setVersion(next)
      setSaved(slots)
      await queryClient.invalidateQueries({ queryKey: rackKeys.list(companyId) })
      await queryClient.invalidateQueries({ queryKey: rackKeys.slots(companyId, rack.id) })
    },
  })

  const describe = (slot: FitSlot) => slotInfo(slot, sources)
  const warnings = rackWarnings(rack, slots, sources)
  const summary = rackSummary(rack, slots, sources)
  const flagged = new Set(warnings.filter((warning) => warning.level === 'warn').flatMap((warning) => warning.keys))
  const current = slots.find((slot) => slot.key === selected)

  // Kandidáti do racku: technika zo skladu (po kusoch), modely z databázy s výškou v U a doplnky.
  const words = search.trim().toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').split(/\s+/).filter(Boolean)
  const matches = (text: string) => {
    const normal = text.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')
    return words.every((word) => normal.includes(word))
  }
  const kinds = FILTERS.find((item) => item.id === filter)!.kinds as readonly string[]
  const usedPieces = new Set(slots.map((slot) => `${slot.equipmentId}|${slot.unit ?? ''}`))
  const stock: Candidate[] = (equipment.data ?? [])
    .filter((item) => !['sold', 'retired', 'archived'].includes(item.status) && (item.attributes.rackU !== undefined || ['audio', 'video', 'it', 'dj', 'appliance', 'light'].includes(item.kind)))
    .filter((item) => kinds.length === 0 || kinds.includes(item.kind))
    .filter((item) => matches([item.name, item.manufacturer, item.model].join(' ')))
    .sort((a, b) => Number(b.attributes.rackU !== undefined) - Number(a.attributes.rackU !== undefined) || a.name.localeCompare(b.name, 'sk'))
    .flatMap((item): Candidate[] => {
      const detail = [item.attributes.rackU ? `${item.attributes.rackU} U` : tx('U nezadané'), item.attributes.rackWidth && item.attributes.rackWidth !== 'full' ? tx(SLOT_WIDTH_LABELS[item.attributes.rackWidth]) : ''].filter(Boolean).join(' · ')
      if (item.trackUnits && item.unitIds.length > 0) {
        return item.unitIds.slice(0, 40).map((unit) => ({ id: `${item.id}#${unit}`, name: `${item.name} #${unit}`, detail, kind: item.kind, attributes: item.attributes, source: { equipmentId: item.id, unit }, used: usedPieces.has(`${item.id}|${unit}`) }))
      }
      return [{ id: item.id, name: item.name, detail: [detail, item.quantity > 1 ? `${item.quantity} ks` : ''].filter(Boolean).join(' · '), kind: item.kind, attributes: item.attributes, source: { equipmentId: item.id }, used: !item.quantity || slots.filter((slot) => slot.equipmentId === item.id).length >= item.quantity }]
    })
    .slice(0, 80)
  const models: Candidate[] = (catalog.data ?? [])
    .filter((entry) => entry.attributes.rackU !== undefined && (kinds.length === 0 || kinds.includes(entry.kind)) && matches(`${entry.manufacturer} ${entry.model}`))
    .slice(0, 60)
    .map((entry) => ({ id: entry.id, name: [entry.manufacturer, entry.model].filter(Boolean).join(' '), detail: `${entry.attributes.rackU} U`, kind: entry.kind, attributes: entry.attributes, source: { catalogId: entry.id }, used: false }))
  const accessories: Candidate[] = ACCESSORIES.filter((accessory) => matches(ACCESSORY_LABELS[accessory])).map((accessory) => ({
    id: accessory,
    name: tx(ACCESSORY_LABELS[accessory]),
    detail: accessory === 'drawer' ? '2 U' : '1 U',
    kind: 'accessory',
    attributes: { rackU: accessory === 'drawer' ? 2 : 1 },
    source: { accessory },
    used: false,
  }))
  const list = tab === 'stock' ? stock : tab === 'catalog' ? models : accessories

  const add = (candidate: Candidate, at?: DropTarget) => {
    const slot = newSlot(nextKey(), candidate.source, candidate.attributes, { side, bottomU: at?.bottomU ?? 1, col: at?.col })
    const place = at && !slots.some((other) => overlaps({ ...slot, ...at }, other)) ? at : freePlace(slot, slots, rack.units)
    if (!place) return window.alert(tx('V racku nie je voľné miesto pre toto zariadenie.'))
    commit([...slots, { ...slot, ...place }])
    setSelected(slot.key)
  }
  const update = (key: string, patch: Partial<FitSlot>) => commit(slots.map((slot) => (slot.key === key ? { ...slot, ...patch } : slot)))
  const duplicate = (slot: FitSlot) => {
    // Kus zo skladu sa nekopíruje ako ten istý kus (#3) – kópia je len model bez konkrétneho čísla.
    const copy = { ...slot, key: nextKey(), unit: null }
    const place = freePlace(copy, slots, rack.units)
    if (!place) return window.alert(tx('V racku nie je voľné miesto pre kópiu.'))
    commit([...slots, { ...copy, ...place }])
    setSelected(copy.key)
  }

  // Ťahanie z panela do racku (myšou): pustenie nad rackom pridá zariadenie na to miesto.
  const addRef = useRef(add)
  useEffect(() => {
    addRef.current = add
  })
  useEffect(() => {
    if (!panelDrag) return
    const attributes = panelDrag.candidate.attributes
    let hover: DropTarget | null = null
    const move = (event: PointerEvent) => {
      const rect = gridRef.current?.getBoundingClientRect()
      hover = rect ? targetAt(rect, event.clientX, event.clientY, rack.units, Math.max(1, attributes.rackU ?? 1), attributes.rackWidth ?? 'full') : null
      setPanelDrag((current) => (current ? { ...current, hover } : current))
    }
    const up = () => {
      if (hover) addRef.current(panelDrag.candidate, hover)
      setPanelDrag(null)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
    }
    // Nové počúvanie len pri začatí ťahania (nie pri každom pohybe).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panelDrag?.candidate, rack.units])

  return (
    <div className="grid gap-4 lg:grid-cols-[18rem_1fr_18rem]">
      {/* Panel: čo pridať */}
      <aside className="flex flex-col gap-2 rounded-xl border bg-surface p-3 lg:max-h-[calc(100dvh-8rem)] lg:overflow-y-auto" aria-label={tx('Pridať do racku')}>
        <div className="flex gap-1 rounded-lg bg-muted p-1 text-sm" role="tablist">
          {([['stock', 'Sklad'], ['catalog', 'Databáza'], ['accessories', 'Doplnky']] as const).map(([id, label]) => (
            <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={cn('flex-1 rounded-md px-2 py-1 font-medium', tab === id ? 'bg-surface shadow-sm' : 'text-muted-foreground')}>
              {tx(label)}
            </button>
          ))}
        </div>
        <label className="relative">
          <Search className="pointer-events-none absolute top-2.5 left-2 size-4 text-muted-foreground" aria-hidden />
          <input aria-label={tx('Hľadať zariadenie')} className="h-9 w-full rounded-lg border bg-background pr-2 pl-8 text-sm" placeholder={tx('Hľadať…')} value={search} onChange={(event) => setSearch(event.target.value)} />
        </label>
        {tab !== 'accessories' && (
          <div className="flex flex-wrap gap-1">
            {FILTERS.map((item) => (
              <button key={item.id} type="button" aria-pressed={filter === item.id} onClick={() => setFilter(item.id)} className={cn('rounded-full border px-2 py-0.5 text-xs', filter === item.id ? 'border-accent bg-accent/15 text-accent' : 'text-muted-foreground')}>
                {tx(item.label)}
              </button>
            ))}
          </div>
        )}
        <p className="text-xs text-muted-foreground">{tx('Ťuknite na zariadenie (pridá sa na prvé voľné miesto) alebo ho potiahnite do racku.')}</p>
        <ul className="flex flex-col gap-1">
          {list.length === 0 && <li className="text-sm text-muted-foreground">{tab === 'catalog' ? tx('V databáze techniky nič s výškou v U nezodpovedá.') : tx('Nič nezodpovedá.')}</li>}
          {list.map((candidate) => (
            <li key={candidate.id}>
              <button
                type="button"
                disabled={candidate.used}
                onClick={() => add(candidate)}
                onPointerDown={(event) => {
                  if (candidate.used || event.pointerType !== 'mouse') return
                  setPanelDrag({ candidate, hover: null })
                }}
                className={cn('flex w-full items-center gap-2 rounded-lg border-l-4 px-2 py-1.5 text-left text-sm hover:bg-muted disabled:opacity-40', kindColor(candidate.kind).split(' ')[0])}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{candidate.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">{candidate.used ? tx('už v racku') : candidate.detail}</span>
                </span>
                <Plus className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      </aside>

      {/* Rack */}
      <section className="flex flex-col gap-3" aria-label={tx('Rack')}>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1 rounded-lg bg-muted p-1 text-sm" role="tablist" aria-label={tx('Strana')}>
            {(['front', 'rear'] as const).map((value) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={side === value}
                onClick={() => {
                  setSide(value)
                  setSelected(null)
                }} className={cn('rounded-md px-3 py-1 font-medium', side === value ? 'bg-surface shadow-sm' : 'text-muted-foreground')}>
                {value === 'front' ? tx('Predok') : tx('Zadok')}
              </button>
            ))}
          </div>
          <Button size="sm" variant="ghost" aria-label={tx('Späť')} disabled={history.past.length === 0} onClick={undo}>
            <Undo2 className="size-4" aria-hidden />
          </Button>
          <Button size="sm" variant="ghost" aria-label={tx('Znova')} disabled={history.future.length === 0} onClick={redo}>
            <Redo2 className="size-4" aria-hidden />
          </Button>
          <span className="flex-1" />
          <Button size="sm" disabled={!dirty || save.isPending} onClick={() => save.mutate()}>
            <Save className="size-4" aria-hidden />
            {save.isPending ? tx('Ukladám…') : dirty ? tx('Uložiť') : tf('Uložené (verzia {0})', version)}
          </Button>
        </div>
        {save.isError && <p role="alert" className="text-sm text-destructive">{/niekto iný/.test(String((save.error as Error)?.message)) ? tx('Rack medzitým uložil niekto iný. Obnovte stránku (vaše zmeny sa stratia).') : tx('Rack sa nepodarilo uložiť.')}</p>}
        <div className="mx-auto w-full max-w-xl">
          <RackGrid
            units={rack.units}
            slots={slots}
            side={side}
            selected={selected}
            flagged={flagged}
            describe={describe}
            onSelect={setSelected}
            onMove={(key, target) => update(key, target)}
            gridRef={gridRef}
            hover={panelDrag?.hover ?? null}
            preview={panelDrag ? { heightU: Math.max(1, panelDrag.candidate.attributes.rackU ?? 1), width: panelDrag.candidate.attributes.rackWidth ?? 'full' } : null}
          />
        </div>
        <p className="text-center text-xs text-muted-foreground">{tx('Presun: potiahnite zariadenie (na dotykovom displeji ho chvíľu podržte). Späť a znova aj Ctrl+Z / Ctrl+Y.')}</p>
      </section>

      {/* Vybrané zariadenie, súhrn a varovania */}
      <aside className="flex flex-col gap-3">
        {current ? (
          <SlotInspector
            slot={current}
            units={rack.units}
            info={describe(current)}
            onChange={(patch) => update(current.key, patch)}
            onDuplicate={() => duplicate(current)}
            onRemove={() => {
              commit(slots.filter((slot) => slot.key !== current.key))
              setSelected(null)
            }}
          />
        ) : (
          <p className="rounded-xl border border-dashed bg-surface p-3 text-sm text-muted-foreground">{tx('Kliknite na zariadenie v racku – tu ho upravíte (šírka, výška, hmotnosť…).')}</p>
        )}
        <div className="rounded-xl border bg-surface p-3 text-sm">
          <p className="mb-1 font-medium">{tx('Súhrn')}</p>
          <ul className="grid grid-cols-2 gap-x-3 gap-y-1">
            <li>{tf('Obsadené {0} U', summary.usedU)}</li>
            <li>{tf('Voľné {0} U', summary.freeU)}</li>
            <li>{tf('Obsah {0} kg', summary.contentsKg)}</li>
            <li>{tf('Spolu {0} kg', summary.totalKg)}</li>
            <li>{tf('Príkon {0} W', summary.powerW)}</li>
            <li>{tf('Položiek {0}', summary.items)}</li>
          </ul>
        </div>
        {warnings.length > 0 && (
          <ul className="flex flex-col gap-1 text-sm" aria-label={tx('Varovania')}>
            {warnings.map((warning, index) => (
              <li key={index}>
                <button
                  type="button"
                  className={cn('flex w-full items-start gap-2 rounded-lg border p-2 text-left', warning.level === 'warn' ? 'border-amber-400 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200' : 'text-muted-foreground')}
                  onClick={() => {
                    const first = slots.find((slot) => slot.key === warning.keys[0])
                    if (!first) return
                    setSide(first.side)
                    setSelected(first.key)
                  }}
                >
                  {warning.level === 'warn' ? <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden /> : <Info className="mt-0.5 size-4 shrink-0" aria-hidden />}
                  {warning.text}
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>
    </div>
  )
}

const numberOrNull = (value: string) => (value.trim() === '' ? null : Number(value.replace(',', '.')))

function SlotInspector({ slot, units, info, onChange, onDuplicate, onRemove }: { slot: FitSlot; units: number; info: ReturnType<typeof slotInfo>; onChange: (patch: Partial<FitSlot>) => void; onDuplicate: () => void; onRemove: () => void }) {
  const field = 'h-9 w-full rounded-lg border bg-background px-2'
  return (
    <div className="flex flex-col gap-2 rounded-xl border bg-surface p-3 text-sm" aria-label={tx('Vybrané zariadenie')}>
      <p className="font-medium break-words">{info.name}</p>
      {info.subtitle && <p className="-mt-2 text-xs text-muted-foreground">{info.subtitle}</p>}
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1">
          {tx('Spodná U')}
          <input className={field} type="number" min={1} max={units} value={slot.bottomU} onChange={(event) => Number.isFinite(event.target.valueAsNumber) && onChange({ bottomU: Math.min(units, Math.max(1, event.target.valueAsNumber)) })} />
        </label>
        <label className="flex flex-col gap-1">
          {tx('Výška (U)')}
          <input className={field} type="number" min={1} max={48} value={slot.heightU} onChange={(event) => Number.isFinite(event.target.valueAsNumber) && onChange({ heightU: Math.min(48, Math.max(1, event.target.valueAsNumber)) })} />
        </label>
        <label className="flex flex-col gap-1">
          {tx('Šírka')}
          <select className={field} value={slot.width} onChange={(event) => onChange({ width: event.target.value as SlotWidth, col: 0 })}>
            {SLOT_WIDTHS.map((width) => (
              <option key={width} value={width}>
                {tx(SLOT_WIDTH_LABELS[width])}
              </option>
            ))}
          </select>
        </label>
        {slot.width !== 'full' && (
          <label className="flex flex-col gap-1">
            {tx('Poloha')}
            <select className={field} value={slot.col} onChange={(event) => onChange({ col: Number(event.target.value) })}>
              {(slot.width === 'half' ? [tx('vľavo'), tx('vpravo')] : [tx('vľavo'), tx('v strede'), tx('vpravo')]).map((label, index) => (
                <option key={index} value={index}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="flex flex-col gap-1">
          {tx('Strana')}
          <select className={field} value={slot.side} onChange={(event) => onChange({ side: event.target.value as FitSlot['side'] })}>
            <option value="front">{tx('Predok')}</option>
            <option value="rear">{tx('Zadok')}</option>
          </select>
        </label>
      </div>
      <label className="flex flex-col gap-1">
        {tx('Vlastný popis')}
        <input className={field} maxLength={120} value={slot.label} placeholder={info.name} onChange={(event) => onChange({ label: event.target.value })} />
      </label>
      <p className="text-xs text-muted-foreground">{tx('Hmotnosť, príkon a hĺbka sa berú z techniky; tu ich môžete zadať ručne.')}</p>
      <div className="grid grid-cols-3 gap-2">
        <label className="flex flex-col gap-1">
          kg
          <input className={field} inputMode="decimal" placeholder={info.weightKg !== null ? String(info.weightKg) : '—'} value={slot.weightKg ?? ''} onChange={(event) => onChange({ weightKg: numberOrNull(event.target.value) })} />
        </label>
        <label className="flex flex-col gap-1">
          W
          <input className={field} inputMode="numeric" placeholder={info.powerW !== null ? String(info.powerW) : '—'} value={slot.powerW ?? ''} onChange={(event) => onChange({ powerW: numberOrNull(event.target.value) })} />
        </label>
        <label className="flex flex-col gap-1">
          mm
          <input className={field} inputMode="numeric" placeholder={info.depthMm !== null ? String(info.depthMm) : '—'} value={slot.depthMm ?? ''} onChange={(event) => onChange({ depthMm: numberOrNull(event.target.value) })} />
        </label>
      </div>
      <label className="flex items-center gap-2">
        <input type="checkbox" className="size-4" checked={info.rearSupport} onChange={(event) => onChange({ rearSupport: event.target.checked })} />
        {tx('Potrebuje zadné uchytenie')}
      </label>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={onDuplicate}>
          <Copy className="size-4" aria-hidden />
          {tx('Duplikovať')}
        </Button>
        <Button size="sm" variant="ghost" onClick={onRemove}>
          <Trash2 className="size-4" aria-hidden />
          {tx('Odobrať')}
        </Button>
      </div>
    </div>
  )
}

/** Editor osadenia racku (/racks/:id/fit). */
export function RackEditorPage() {
  const { id = '' } = useParams()
  const company = useCompany().active!
  const companyId = company.companyId
  const racks = useQuery({ queryKey: rackKeys.list(companyId), queryFn: () => fetchRacks(companyId) })
  const slots = useQuery({ queryKey: rackKeys.slots(companyId, id), queryFn: () => fetchSlots(companyId, id), enabled: Boolean(id) })
  const rack = racks.data?.find((item) => item.id === id)

  let body
  if (!can(company, 'racks.edit')) body = <ErrorBlock message={tx('Na úpravu rackov nemáte oprávnenie.')} />
  else if (racks.isPending || slots.isPending) body = <LoadingBlock />
  else if (!rack || slots.isError) body = <ErrorBlock message={tx('Tento rack neexistuje alebo k nemu nemáte prístup.')} />
  else body = <Editor key={`${rack.id}-${rack.version}`} companyId={companyId} rack={rack} initial={slots.data.map(({ id: key, ...slot }) => ({ ...slot, key }))} />

  return (
    <>
      <Link to={`/racks/${id}`} className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden />
        {tx('Späť na rack')}
      </Link>
      <h1 className="mb-3 text-2xl font-semibold tracking-tight break-words">{rack ? tf('Osadenie – {0}', rack.name) : tx('Osadenie racku')}</h1>
      {body}
    </>
  )
}
