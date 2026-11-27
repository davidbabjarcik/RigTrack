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
import { RackStats } from './RackStats'
import { freePlace, newSlot, overlaps, rackSummary, rackWarnings, slotInfo, type FitSlot, type Sources } from './fit'
import { ACCESSORIES, ACCESSORY_LABELS, SLOT_WIDTH_LABELS, SLOT_WIDTHS, type Accessory, type RackDesign, type SlotWidth } from './model'
import { kindColor, targetAt, type DropTarget } from './gridUtils'
import { RackGrid } from './RackGrid'
import { catalogMatch, RACK_CATEGORIES, rackCategory, withCatalog, type RackCategory } from './library'
import { cableFor, compatible, estimateLength, fromStored, portsResolver, toStored, type RackLink, type SlotPorts } from './links'
import { RackLinks, SlotConnections } from './RackLinks'

type Candidate = { id: string; name: string; detail: string; kind: string; category: RackCategory | 'accessory'; maker: string; attributes: EquipmentAttributes; source: { equipmentId?: string; unit?: number | null; catalogId?: string; accessory?: Accessory }; used: boolean }
type Doc = { slots: FitSlot[]; links: RackLink[] }

let counter = 0
const nextKey = () => `n${Date.now().toString(36)}${(counter++).toString(36)}`

function Editor({ companyId, rack, initial }: { companyId: string; rack: RackDesign; initial: FitSlot[] }) {
  const queryClient = useQueryClient()
  const equipment = useQuery({ queryKey: equipmentKeys.list(companyId), queryFn: () => fetchEquipmentList(companyId) })
  const catalog = useCatalog()
  // Osadenie a prepojenia spolu (späť / znova vracia oboje).
  const [history, setHistory] = useState<{ past: Doc[]; present: Doc; future: Doc[] }>(() => ({ past: [], present: { slots: initial, links: fromStored(rack.links, initial, (index) => `l${index}`) }, future: [] }))
  const slots = history.present.slots
  const links = history.present.links
  const [saved, setSaved] = useState(history.present)
  const [version, setVersion] = useState(rack.version)
  const [side, setSide] = useState<'front' | 'rear'>('front')
  const [selected, setSelected] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<RackCategory | 'all'>('all')
  const [maker, setMaker] = useState('')
  const [tab, setTab] = useState<'library' | 'accessories'>('library')
  const gridRef = useRef<HTMLDivElement | null>(null)
  const [panelDrag, setPanelDrag] = useState<{ candidate: Candidate; hover: DropTarget | null } | null>(null)
  const dirty = JSON.stringify(history.present) !== JSON.stringify(saved)

  const sources: Sources = useMemo(() => ({ equipment: equipment.data ?? [], catalog: catalog.data ?? [] }), [equipment.data, catalog.data])
  // Zmena osadenia: prepojenia na odobrané sloty zmiznú.
  const commit = useCallback(
    (next: FitSlot[], nextLinks?: RackLink[]) =>
      setHistory((current) => {
        const keys = new Set(next.map((slot) => slot.key))
        const kept = (nextLinks ?? current.present.links).filter((link) => keys.has(link.from) && keys.has(link.to))
        return { past: [...current.past, current.present].slice(-100), present: { slots: next, links: kept }, future: [] }
      }),
    [],
  )
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
    mutationFn: () => saveSlots(rack.id, version, slots.map(({ key: _key, ...slot }) => (void _key, slot)), toStored(links, slots)),
    onSuccess: async (next) => {
      setVersion(next)
      setSaved({ slots, links })
      await queryClient.invalidateQueries({ queryKey: rackKeys.list(companyId) })
      await queryClient.invalidateQueries({ queryKey: rackKeys.slots(companyId, rack.id) })
    },
  })

  const describe = (slot: FitSlot) => slotInfo(slot, sources)
  const resolve: SlotPorts = portsResolver(describe)
  const connect = (fromKey: string, fromPort: string, toKey: string, toPort: string) => {
    const a = slots.find((slot) => slot.key === fromKey)
    const b = slots.find((slot) => slot.key === toKey)
    const pa = a && resolve(a).ports.find((port) => port.id === fromPort)
    const pb = b && resolve(b).ports.find((port) => port.id === toPort)
    if (!a || !b || !pa || !pb || !compatible(pa, pb)) return
    commit(slots, [...links, { key: nextKey(), from: fromKey, fromPort, to: toKey, toPort, cable: cableFor(pa, pb), lengthM: estimateLength(a, b), label: '' }])
  }
  const updateLink = (key: string, patch: Partial<RackLink>) => commit(slots, links.map((link) => (link.key === key ? { ...link, ...patch } : link)))
  const removeLink = (key: string) => commit(slots, links.filter((link) => link.key !== key))
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
  // Knižnica: navrchu technika firmy (Môj materiál), pod ňou modely z databázy techniky s výškou v U.
  const catalogData = catalog.data ?? []
  const usedPieces = new Set(slots.map((slot) => `${slot.equipmentId}|${slot.unit ?? ''}`))
  const detailOf = (attributes: EquipmentAttributes) =>
    [
      attributes.rackU ? `${attributes.rackU} U` : tx('U nezadané'),
      attributes.rackWidth && attributes.rackWidth !== 'full' ? tx(SLOT_WIDTH_LABELS[attributes.rackWidth]) : '',
      attributes.weightKg !== undefined ? `${String(attributes.weightKg).replace('.', ',')} kg` : '',
      attributes.powerW !== undefined ? `${attributes.powerW} W` : '',
    ]
      .filter(Boolean)
      .join(' · ')
  const stockAll: Candidate[] = (equipment.data ?? [])
    .filter((item) => !['sold', 'retired', 'archived'].includes(item.status))
    .map((item) => ({ item, attributes: withCatalog(item.attributes, catalogMatch(item, catalogData)) }))
    .filter(({ item, attributes }) => attributes.rackU !== undefined || ['audio', 'video', 'it', 'dj', 'appliance', 'light'].includes(item.kind))
    .filter(({ item }) => matches([item.name, item.manufacturer, item.model].join(' ')))
    .sort((a, b) => Number(b.attributes.rackU !== undefined) - Number(a.attributes.rackU !== undefined) || a.item.name.localeCompare(b.item.name, 'sk'))
    .flatMap(({ item, attributes }): Candidate[] => {
      const base = { kind: item.kind, category: rackCategory(item.kind, attributes), maker: item.manufacturer.trim(), attributes }
      if (item.trackUnits && item.unitIds.length > 0) {
        return item.unitIds.slice(0, 40).map((unit) => ({ ...base, id: `${item.id}#${unit}`, name: `${item.name} #${unit}`, detail: detailOf(attributes), source: { equipmentId: item.id, unit }, used: usedPieces.has(`${item.id}|${unit}`) }))
      }
      return [{ ...base, id: item.id, name: item.name, detail: [detailOf(attributes), item.quantity > 1 ? `${item.quantity} ks` : ''].filter(Boolean).join(' · '), source: { equipmentId: item.id }, used: !item.quantity || slots.filter((slot) => slot.equipmentId === item.id).length >= item.quantity }]
    })
  const modelsAll: Candidate[] = catalogData
    .filter((entry) => entry.attributes.rackU !== undefined && matches(`${entry.manufacturer} ${entry.model}`))
    .map((entry) => ({
      id: entry.id,
      name: [entry.manufacturer, entry.model].filter(Boolean).join(' '),
      detail: [detailOf(entry.attributes), entry.verified ? '' : tx('neoverené')].filter(Boolean).join(' · '),
      kind: entry.kind,
      category: rackCategory(entry.kind, entry.attributes),
      maker: entry.manufacturer,
      attributes: entry.attributes,
      source: { catalogId: entry.id },
      used: false,
    }))
  const inCategory = (candidate: Candidate) => category === 'all' || candidate.category === category
  const byMaker = (candidate: Candidate) => !maker || candidate.maker.toLowerCase() === maker.toLowerCase()
  const counts = new Map<string, number>()
  for (const candidate of [...stockAll, ...modelsAll].filter(byMaker)) counts.set(candidate.category, (counts.get(candidate.category) ?? 0) + 1)
  const makers = [...new Map([...stockAll, ...modelsAll].filter(inCategory).filter((candidate) => candidate.maker).map((candidate) => [candidate.maker.toLowerCase(), candidate.maker])).values()].sort((a, b) => a.localeCompare(b, 'sk'))
  const stock = stockAll.filter(inCategory).filter(byMaker).slice(0, 80)
  const modelsMatching = modelsAll.filter(inCategory).filter(byMaker)
  const models = modelsMatching.slice(0, 60)
  const accessories: Candidate[] = ACCESSORIES.filter((accessory) => matches(ACCESSORY_LABELS[accessory])).map((accessory) => ({
    id: accessory,
    name: tx(ACCESSORY_LABELS[accessory]),
    detail: accessory === 'drawer' ? '2 U' : '1 U',
    kind: 'accessory',
    category: 'accessory',
    maker: '',
    attributes: { rackU: accessory === 'drawer' ? 2 : 1 },
    source: { accessory },
    used: false,
  }))

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
      <div className="lg:col-span-3">
        <RackStats summary={summary} />
      </div>
      {/* Panel: čo pridať */}
      <aside className="flex flex-col gap-2 rounded-xl border bg-surface p-3 lg:max-h-[calc(100dvh-8rem)] lg:overflow-y-auto" aria-label={tx('Pridať do racku')}>
        <div className="flex gap-1 rounded-lg bg-muted p-1 text-sm" role="tablist">
          {([['library', 'Knižnica'], ['accessories', 'Doplnky']] as const).map(([id, label]) => (
            <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={cn('flex-1 rounded-md px-2 py-1 font-medium', tab === id ? 'bg-surface shadow-sm' : 'text-muted-foreground')}>
              {tx(label)}
            </button>
          ))}
        </div>
        <label className="relative">
          <Search className="pointer-events-none absolute top-2.5 left-2 size-4 text-muted-foreground" aria-hidden />
          <input aria-label={tx('Hľadať zariadenie')} className="h-9 w-full rounded-lg border bg-background pr-2 pl-8 text-sm" placeholder={tx('Hľadať…')} value={search} onChange={(event) => setSearch(event.target.value)} />
        </label>
        {tab === 'library' && (
          <>
            <div className="flex flex-wrap gap-1" aria-label={tx('Kategória')}>
              {[{ id: 'all' as const, label: 'Všetko' }, ...RACK_CATEGORIES.filter((item) => counts.has(item.id) || item.id === category)].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={category === item.id}
                  onClick={() => {
                    setCategory(item.id)
                    setMaker('')
                  }}
                  className={cn('rounded-full border px-2 py-0.5 text-xs', category === item.id ? 'border-accent bg-accent/15 text-accent' : 'text-muted-foreground')}
                >
                  {tx(item.label)}
                </button>
              ))}
            </div>
            {makers.length > 1 && (
              <select aria-label={tx('Výrobca')} className="h-8 rounded-lg border bg-background px-2 text-sm" value={maker} onChange={(event) => setMaker(event.target.value)}>
                <option value="">{tx('Všetci výrobcovia')}</option>
                {makers.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            )}
          </>
        )}
        <p className="text-xs text-muted-foreground">{tx('Ťuknite na zariadenie (pridá sa na prvé voľné miesto) alebo ho potiahnite do racku.')}</p>
        {tab === 'library' ? (
          <>
            <h3 className="mt-1 text-xs font-semibold text-muted-foreground">{tx('Môj materiál')}</h3>
            <CandidateList list={stock} empty={tx('Z vašej techniky nič nezodpovedá.')} onAdd={add} onDrag={(candidate) => setPanelDrag({ candidate, hover: null })} />
            <h3 className="mt-2 text-xs font-semibold text-muted-foreground">{tx('Databáza techniky')}</h3>
            <CandidateList list={models} empty={tx('V databáze techniky nič s výškou v U nezodpovedá.')} onAdd={add} onDrag={(candidate) => setPanelDrag({ candidate, hover: null })} />
            {modelsMatching.length > models.length && <p className="text-xs text-muted-foreground">{tf('Zobrazených {0} z {1} – zúžte hľadanie.', models.length, modelsMatching.length)}</p>}
            {models.length > 0 && <p className="text-xs text-muted-foreground">{tx('Údaje z databázy sú podľa výrobcov; pri neoverených skontrolujte hmotnosť a príkon.')}</p>}
          </>
        ) : (
          <CandidateList list={accessories} empty={tx('Nič nezodpovedá.')} onAdd={add} onDrag={(candidate) => setPanelDrag({ candidate, hover: null })} />
        )}
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
            links={links}
            resolve={resolve}
          />
        </div>
        <p className="text-center text-xs text-muted-foreground">{tx('Presun: potiahnite zariadenie (na dotykovom displeji ho chvíľu podržte). Späť a znova aj Ctrl+Z / Ctrl+Y.')}</p>
        <RackLinks slots={slots} links={links} resolve={resolve} onChange={updateLink} onRemove={removeLink} />
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
        ) : null}
        {current ? (
          <SlotConnections slot={current} slots={slots} links={links} resolve={resolve} onConnect={connect} onRemove={removeLink} />
        ) : (
          <p className="rounded-xl border border-dashed bg-surface p-3 text-sm text-muted-foreground">{tx('Kliknite na zariadenie v racku – tu ho upravíte (šírka, výška, hmotnosť…).')}</p>
        )}
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

function CandidateList({ list, empty, onAdd, onDrag }: { list: Candidate[]; empty: string; onAdd: (candidate: Candidate) => void; onDrag: (candidate: Candidate) => void }) {
  return (
    <ul className="flex flex-col gap-1">
      {list.length === 0 && <li className="text-sm text-muted-foreground">{empty}</li>}
      {list.map((candidate) => (
        <li key={candidate.id}>
          <button
            type="button"
            disabled={candidate.used}
            onClick={() => onAdd(candidate)}
            onPointerDown={(event) => {
              if (candidate.used || event.pointerType !== 'mouse') return
              onDrag(candidate)
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
