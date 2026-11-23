import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Cable, Save, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ErrorBlock, LoadingBlock } from '@/components/feedback/QueryState'
import { Button } from '@/components/ui/button'
import { Field, SelectField } from '@/components/ui/field'
import { useCompany } from '@/features/companies/company-context'
import { equipmentKeys, fetchEquipmentList } from '@/features/equipment/api'
import type { CompanyEvent } from '@/features/events/model'
import { useEvents } from '@/features/events/useEvents'
import { fetchRacks, rackKeys } from '@/features/racks/api'
import { tf, tx } from '@/lib/i18n'
import { saveSynoptic, synopticKeys, useSynoptic } from './api'
import { bounds, EMPTY_SYNOPTIC, grid, newLink, newNode, NODE_KIND_LABELS, NODE_KINDS, SIGNAL_LABELS, SIGNALS, synopticWarnings, type NodeKind, type Signal, type SynLink, type SynNode, type Synoptic } from './model'
import { SynopticSvg } from './SynopticSvg'

type Draft = Pick<Synoptic, 'nodes' | 'links' | 'note'>

function Editor({ event, initial }: { event: CompanyEvent; initial: Synoptic }) {
  const queryClient = useQueryClient()
  const companyId = useCompany().active!.companyId
  const equipment = useQuery({ queryKey: equipmentKeys.list(companyId), queryFn: () => fetchEquipmentList(companyId) })
  const racks = useQuery({ queryKey: rackKeys.list(companyId), queryFn: () => fetchRacks(companyId) })
  const [draft, setDraft] = useState<Draft>({ nodes: initial.nodes, links: initial.links, note: initial.note })
  const [version, setVersion] = useState(initial.version)
  const [selected, setSelected] = useState<string | null>(null)
  const [connectFrom, setConnectFrom] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)
  const svg = useRef<SVGSVGElement | null>(null)
  const drag = useRef<{ id: string; dx: number; dy: number; pointer: number } | null>(null)
  const names = Object.fromEntries((equipment.data ?? []).map((item) => [item.id, item.name]))
  const eventItems = event.equipment.map((line) => (equipment.data ?? []).find((item) => item.id === line.equipmentId)).filter((item): item is NonNullable<typeof item> => Boolean(item))
  const eventRacks = (racks.data ?? []).filter((rack) => rack.eventId === event.id)
  const node = draft.nodes.find((item) => item.id === selected) ?? null
  const link = draft.links.find((item) => item.id === selected) ?? null
  // Plocha editora: aspoň 1200 × 700, rastie s kresbou (mierka sa pri ťahaní nemení).
  const box = bounds(draft.nodes)
  const area = { width: Math.max(1200, box.x + box.width + 200), height: Math.max(700, box.y + box.height + 150) }

  const change = (next: (value: Draft) => Draft) => {
    setDraft(next)
    setDirty(true)
  }
  const addNode = (kind: NodeKind, fields: Partial<SynNode> = {}) => {
    const created = newNode(kind, draft.nodes, fields)
    change((value) => ({ ...value, nodes: [...value.nodes, created] }))
    setSelected(created.id)
  }
  const updateNode = (id: string, patch: Partial<SynNode>) => change((value) => ({ ...value, nodes: value.nodes.map((item) => (item.id === id ? { ...item, ...patch } : item)) }))
  const updateLink = (id: string, patch: Partial<SynLink>) => change((value) => ({ ...value, links: value.links.map((item) => (item.id === id ? { ...item, ...patch } : item)) }))
  const removeSelected = () => {
    if (!selected) return
    change((value) => ({ ...value, nodes: value.nodes.filter((item) => item.id !== selected), links: value.links.filter((item) => item.id !== selected && item.from !== selected && item.to !== selected) }))
    setSelected(null)
  }

  const toPoint = (pointer: { clientX: number; clientY: number }) => {
    const matrix = svg.current?.getScreenCTM()
    return matrix ? new DOMPoint(pointer.clientX, pointer.clientY).matrixTransform(matrix.inverse()) : null
  }
  const onNodePointerDown = (id: string, pointer: ReactPointerEvent<SVGGElement>) => {
    if (connectFrom && connectFrom !== id) {
      const created = newLink(connectFrom, id)
      change((value) => ({ ...value, links: [...value.links, created] }))
      setConnectFrom(null)
      setSelected(created.id)
      return
    }
    setSelected(id)
    const item = draft.nodes.find((value) => value.id === id)
    const point = toPoint(pointer)
    if (!item || !point) return
    pointer.preventDefault()
    drag.current = { id, dx: point.x - item.x, dy: point.y - item.y, pointer: pointer.pointerId }
    svg.current?.setPointerCapture(pointer.pointerId)
  }
  useEffect(() => {
    const element = svg.current
    if (!element) return
    const move = (pointer: PointerEvent) => {
      const state = drag.current
      if (!state || state.pointer !== pointer.pointerId) return
      const point = toPoint(pointer)
      if (point) updateNode(state.id, { x: Math.max(0, grid(point.x - state.dx)), y: Math.max(0, grid(point.y - state.dy)) })
    }
    const end = () => {
      drag.current = null
    }
    element.addEventListener('pointermove', move)
    element.addEventListener('pointerup', end)
    element.addEventListener('pointercancel', end)
    return () => {
      element.removeEventListener('pointermove', move)
      element.removeEventListener('pointerup', end)
      element.removeEventListener('pointercancel', end)
    }
  })
  useEffect(() => {
    if (!dirty) return
    const warn = (unload: BeforeUnloadEvent) => unload.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const save = useMutation({
    mutationFn: () => saveSynoptic(event.id, version, draft),
    onSuccess: async (next) => {
      setVersion(next)
      setDirty(false)
      await queryClient.invalidateQueries({ queryKey: synopticKeys.ofEvent(companyId, event.id) })
    },
  })
  const warnings = synopticWarnings(draft)
  const nodeName = (id: string) => {
    const item = draft.nodes.find((value) => value.id === id)
    return item ? item.label || tx(NODE_KIND_LABELS[item.kind]) : '?'
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Link to={`/events/${event.id}?tab=gear`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" aria-hidden />{event.name}
        </Link>
        <h1 className="w-full text-xl font-semibold">{tx('Synoptika')}</h1>
        <p className="text-sm text-muted-foreground">{tf('Verzia {0}', version)}{dirty ? ` · ${tx('neuložené zmeny')}` : ''}</p>
        <Button size="sm" className="ml-auto" disabled={save.isPending || !dirty} onClick={() => save.mutate()}>
          <Save className="size-4" aria-hidden />{tx('Uložiť')}
        </Button>
      </div>
      {save.isError && <p role="alert" className="text-sm text-destructive">{save.error.message || tx('Synoptiku sa nepodarilo uložiť.')}</p>}

      <div className="grid gap-4 lg:grid-cols-[1fr_19rem]">
        <div className="flex min-w-0 flex-col gap-3">
          <div className="flex flex-wrap gap-1.5" aria-label={tx('Pridať uzol')}>
            {NODE_KINDS.map((kind) => (
              <Button key={kind} size="sm" variant="outline" onClick={() => addNode(kind)}>
                + {tx(NODE_KIND_LABELS[kind])}
              </Button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {eventItems.length > 0 && (
              <SelectField label={tx('Pridať z techniky akcie')} className="min-w-56" value="" onChange={(e) => { const item = eventItems.find((value) => value.id === e.target.value); if (item) addNode(item.kind === 'light' ? 'light' : 'other', { label: item.name.slice(0, 60), equipment_id: item.id }) }}>
                <option value="">—</option>
                {eventItems.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </SelectField>
            )}
            {eventRacks.length > 0 && (
              <SelectField label={tx('Pridať rack akcie')} className="min-w-56" value="" onChange={(e) => { const rack = eventRacks.find((value) => value.id === e.target.value); if (rack) addNode('rack', { label: rack.name.slice(0, 60), detail: `${rack.units} U`, rack_id: rack.id }) }}>
                <option value="">—</option>
                {eventRacks.map((rack) => (
                  <option key={rack.id} value={rack.id}>{rack.name}</option>
                ))}
              </SelectField>
            )}
          </div>
          {connectFrom && <p role="status" className="text-sm text-accent">{tf('Kliknite na uzol, do ktorého vedie kábel z „{0}“.', nodeName(connectFrom))}</p>}
          <div className="overflow-auto rounded-xl border bg-surface text-foreground">
            <SynopticSvg
              svgRef={svg}
              nodes={draft.nodes}
              links={draft.links}
              names={names}
              selected={selected}
              connectFrom={connectFrom}
              area={area}
              onNodePointerDown={onNodePointerDown}
              onLinkClick={(id) => setSelected(id)}
              onBackground={() => {
                setSelected(null)
                setConnectFrom(null)
              }}
              className="h-auto min-w-[48rem] select-none"
            />
          </div>
          {warnings.length > 0 && (
            <ul className="text-sm text-amber-800 dark:text-amber-300">
              {warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          )}
          <p className="text-xs text-muted-foreground">{tx('Uzly ťahajte myšou alebo prstom. Prepojenie: vyberte uzol, „Prepojiť s…“ a kliknite na cieľ. Kliknutím na čiaru upravíte kábel a dĺžku.')}</p>
        </div>

        <aside className="flex flex-col gap-3">
          {node && (
            <div className="flex flex-col gap-2 rounded-xl border bg-surface p-3" aria-label={tx('Vybraný uzol')}>
              <SelectField label={tx('Druh')} value={node.kind} onChange={(e) => updateNode(node.id, { kind: e.target.value as NodeKind })}>
                {NODE_KINDS.map((kind) => (
                  <option key={kind} value={kind}>{tx(NODE_KIND_LABELS[kind])}</option>
                ))}
              </SelectField>
              <Field label={tx('Názov')} maxLength={60} value={node.label} onChange={(e) => updateNode(node.id, { label: e.target.value })} />
              <Field label={tx('Detail (napr. model, umiestnenie)')} maxLength={80} value={node.detail} onChange={(e) => updateNode(node.id, { detail: e.target.value })} />
              <div className="flex flex-wrap gap-1.5">
                <Button size="sm" onClick={() => setConnectFrom(node.id)}>
                  <Cable className="size-4" aria-hidden />{tx('Prepojiť s…')}
                </Button>
                <Button size="sm" variant="ghost" className="ml-auto" onClick={removeSelected}>
                  <Trash2 className="size-4" aria-hidden />{tx('Odstrániť')}
                </Button>
              </div>
            </div>
          )}
          {link && (
            <div className="flex flex-col gap-2 rounded-xl border bg-surface p-3" aria-label={tx('Vybrané prepojenie')}>
              <p className="font-medium">{`${nodeName(link.from)} → ${nodeName(link.to)}`}</p>
              <SelectField label={tx('Signál')} value={link.signal} onChange={(e) => updateLink(link.id, { signal: e.target.value as Signal })}>
                {SIGNALS.map((signal) => (
                  <option key={signal} value={signal}>{tx(SIGNAL_LABELS[signal])}</option>
                ))}
              </SelectField>
              <Field label={tx('Kábel')} maxLength={40} placeholder={tx('napr. XLR, CAT6, multipár 16/4')} value={link.cable} onChange={(e) => updateLink(link.id, { cable: e.target.value })} />
              <div className="grid grid-cols-2 gap-2">
                <Field label={tx('Dĺžka (m)')} type="number" inputMode="decimal" min={0} max={5000} step={0.5} value={link.length_m ?? ''} onChange={(e) => updateLink(link.id, { length_m: e.target.value === '' ? null : Math.min(5000, Math.max(0, Number(e.target.value))) })} />
                <Field label={tx('Počet')} type="number" inputMode="numeric" min={1} max={99} value={link.count} onChange={(e) => updateLink(link.id, { count: Math.min(99, Math.max(1, Number(e.target.value) || 1)) })} />
              </div>
              <Field label={tx('Popis')} maxLength={60} placeholder={tx('napr. ch 1–16')} value={link.label} onChange={(e) => updateLink(link.id, { label: e.target.value })} />
              <div className="flex flex-wrap gap-1.5">
                <Button size="sm" variant="outline" onClick={() => updateLink(link.id, { from: link.to, to: link.from })}>{tx('Otočiť smer')}</Button>
                <Button size="sm" variant="ghost" className="ml-auto" onClick={removeSelected}>
                  <Trash2 className="size-4" aria-hidden />{tx('Odstrániť')}
                </Button>
              </div>
            </div>
          )}
          {!node && !link && <p className="rounded-xl border border-dashed p-3 text-sm text-muted-foreground">{tx('Kliknite na uzol alebo prepojenie – tu ich upravíte.')}</p>}
          <Field label={tx('Poznámka')} maxLength={500} value={draft.note} onChange={(e) => change((value) => ({ ...value, note: e.target.value }))} />
        </aside>
      </div>
    </div>
  )
}

/** Editor synoptiky akcie (/events/:id/synoptic). */
export function SynopticEditorPage() {
  const { id = '' } = useParams()
  const companyId = useCompany().active!.companyId
  const events = useEvents(companyId)
  const synoptic = useSynoptic(companyId, id)
  if (events.isPending || synoptic.isPending) return <LoadingBlock />
  const event = events.data?.find((item) => item.id === id)
  if (!event) return <ErrorBlock message={tx('Tento event neexistuje alebo k nemu nemáte prístup.')} />
  if (synoptic.isError) return <ErrorBlock message={tx('Synoptiku sa nepodarilo načítať (migrácia 0200).')} />
  const initial = synoptic.data ?? EMPTY_SYNOPTIC
  return <Editor key={initial.version} event={event} initial={initial} />
}
