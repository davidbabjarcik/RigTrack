import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Copy, RotateCcw, RotateCw, Save, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ErrorBlock, LoadingBlock } from '@/components/feedback/QueryState'
import { Button } from '@/components/ui/button'
import { Field, SelectField } from '@/components/ui/field'
import { useCompany } from '@/features/companies/company-context'
import { useEvents } from '@/features/events/useEvents'
import { usePatch } from '@/features/patch/api'
import type { PatchLine } from '@/features/patch/model'
import { tf, tx } from '@/lib/i18n'
import { saveStagePlot, stagePlotKeys, useStagePlot } from './api'
import { clampItem, EMPTY_PLOT, KIND_INFO, newItem, snap, STAGE_KINDS, type StageItem, type StageKind, type StagePlot } from './model'
import { StagePlotSvg } from './StagePlotSvg'

type Draft = Pick<StagePlot, 'widthM' | 'depthM' | 'items' | 'note'>

function Editor({ eventId, eventName, initial, lines }: { eventId: string; eventName: string; initial: StagePlot; lines: PatchLine[] }) {
  const queryClient = useQueryClient()
  const companyId = useCompany().active!.companyId
  const [draft, setDraft] = useState<Draft>({ widthM: initial.widthM, depthM: initial.depthM, items: initial.items, note: initial.note })
  const [version, setVersion] = useState(initial.version)
  const [selected, setSelected] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)
  const svg = useRef<SVGSVGElement | null>(null)
  const drag = useRef<{ id: string; dx: number; dy: number; pointer: number } | null>(null)
  const channelName = (channel: number) => lines.find((line) => line.channel === channel)?.name
  const current = draft.items.find((item) => item.id === selected) ?? null

  const change = (next: (draft: Draft) => Draft) => {
    setDraft(next)
    setDirty(true)
  }
  const updateItem = (id: string, patch: Partial<StageItem>) => change((value) => ({ ...value, items: value.items.map((item) => (item.id === id ? clampItem({ ...item, ...patch }, value) : item)) }))
  const add = (kind: StageKind) => {
    const item = newItem(kind, draft)
    change((value) => ({ ...value, items: [...value.items, item] }))
    setSelected(item.id)
  }
  const remove = (id: string) => {
    change((value) => ({ ...value, items: value.items.filter((item) => item.id !== id) }))
    setSelected(null)
  }
  const duplicate = (item: StageItem) => {
    const copy = { ...item, id: newItem(item.kind, draft).id, x: snap(item.x + 0.5), y: snap(item.y + 0.3), channel: null }
    change((value) => ({ ...value, items: [...value.items, clampItem(copy, value)] }))
    setSelected(copy.id)
  }

  const toMeters = (event: { clientX: number; clientY: number }) => {
    const matrix = svg.current?.getScreenCTM()
    if (!matrix) return null
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse())
    return { x: point.x, y: point.y }
  }
  const startDrag = (id: string, event: ReactPointerEvent<SVGGElement>) => {
    const item = draft.items.find((value) => value.id === id)
    const point = toMeters(event)
    setSelected(id)
    if (!item || !point) return
    event.preventDefault()
    drag.current = { id, dx: point.x - item.x, dy: point.y - item.y, pointer: event.pointerId }
    svg.current?.setPointerCapture(event.pointerId)
  }
  useEffect(() => {
    const element = svg.current
    if (!element) return
    const move = (event: PointerEvent) => {
      const state = drag.current
      if (!state || state.pointer !== event.pointerId) return
      const point = toMeters(event)
      if (point) updateItem(state.id, { x: point.x - state.dx, y: point.y - state.dy })
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
  // Klávesnica: šípky posúvajú (Shift = 25 cm), R otáča, Delete maže.
  useEffect(() => {
    const keys = (event: KeyboardEvent) => {
      if (!current || (event.target as HTMLElement).closest('input, textarea, select')) return
      const step = event.shiftKey ? 0.25 : 0.05
      const moves: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }
      if (moves[event.key]) {
        event.preventDefault()
        updateItem(current.id, { x: current.x + moves[event.key][0], y: current.y + moves[event.key][1] })
      } else if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault()
        remove(current.id)
      } else if (event.key.toLowerCase() === 'r') {
        updateItem(current.id, { rot: (current.rot + (event.shiftKey ? 345 : 15)) % 360 })
      }
    }
    window.addEventListener('keydown', keys)
    return () => window.removeEventListener('keydown', keys)
  })
  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const save = useMutation({
    mutationFn: () => saveStagePlot(eventId, version, draft),
    onSuccess: async (next) => {
      setVersion(next)
      setDirty(false)
      await queryClient.invalidateQueries({ queryKey: stagePlotKeys.ofEvent(companyId, eventId) })
      await queryClient.invalidateQueries({ queryKey: ['company', companyId, 'doc-shares'] })
    },
  })
  const usedChannels = new Set(draft.items.map((item) => item.channel).filter(Boolean))

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Link to={`/events/${eventId}?tab=gear`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" aria-hidden />{eventName}
        </Link>
        <h1 className="w-full text-xl font-semibold">{tx('Stage plán')}</h1>
        <p className="text-sm text-muted-foreground">{tf('Verzia {0}', version)}{dirty ? ` · ${tx('neuložené zmeny')}` : ''}</p>
        <Button size="sm" className="ml-auto" disabled={save.isPending || !dirty} onClick={() => save.mutate()}>
          <Save className="size-4" aria-hidden />{tx('Uložiť')}
        </Button>
      </div>
      {save.isError && <p role="alert" className="text-sm text-destructive">{save.error.message || tx('Plán sa nepodarilo uložiť.')}</p>}

      <div className="grid gap-4 lg:grid-cols-[1fr_18rem]">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-1.5" aria-label={tx('Pridať na pódium')}>
            {STAGE_KINDS.map((kind) => (
              <Button key={kind} size="sm" variant="outline" onClick={() => add(kind)}>
                + {tx(KIND_INFO[kind].label)}
              </Button>
            ))}
          </div>
          <div className="rounded-xl border bg-surface p-2 text-foreground">
            <StagePlotSvg
              svgRef={svg}
              widthM={draft.widthM}
              depthM={draft.depthM}
              items={draft.items}
              channelName={channelName}
              selectedId={selected}
              onItemPointerDown={startDrag}
              onBackgroundPointerDown={() => setSelected(null)}
              className="h-auto w-full select-none"
              title={tx('Stage plán – pohľad zhora, publikum dole')}
            />
          </div>
          <p className="text-xs text-muted-foreground">{tx('Ťahajte položky myšou alebo prstom. Vybranú položku posúvajú šípky (so Shiftom o 25 cm), R ju otočí o 15°, Delete ju zmaže. Mriežka má 1 m.')}</p>
        </div>

        <aside className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-2 rounded-xl border bg-surface p-3">
            <Field label={tx('Šírka pódia (m)')} type="number" inputMode="decimal" min={2} max={40} step={0.5} value={draft.widthM} onChange={(e) => change((value) => ({ ...value, widthM: Math.min(40, Math.max(2, Number(e.target.value) || 2)) }))} />
            <Field label={tx('Hĺbka pódia (m)')} type="number" inputMode="decimal" min={2} max={30} step={0.5} value={draft.depthM} onChange={(e) => change((value) => ({ ...value, depthM: Math.min(30, Math.max(2, Number(e.target.value) || 2)) }))} />
            <Field label={tx('Poznámka k plánu')} className="col-span-2" maxLength={500} value={draft.note} onChange={(e) => change((value) => ({ ...value, note: e.target.value }))} />
          </div>
          {current ? (
            <div className="flex flex-col gap-2 rounded-xl border bg-surface p-3" aria-label={tx('Vybraná položka')}>
              <p className="font-medium">{tx(KIND_INFO[current.kind].label)}</p>
              <Field label={tx('Popis')} maxLength={40} value={current.label} placeholder={current.channel ? channelName(current.channel) : ''} onChange={(e) => updateItem(current.id, { label: e.target.value })} />
              <SelectField label={tx('Kanál z input listu')} value={current.channel ?? ''} onChange={(e) => updateItem(current.id, { channel: e.target.value ? Number(e.target.value) : null })}>
                <option value="">—</option>
                {lines.map((line) => (
                  <option key={line.id} value={line.channel}>
                    {`${line.channel} – ${line.name || '?'}${usedChannels.has(line.channel) && line.channel !== current.channel ? ' ✓' : ''}`}
                  </option>
                ))}
              </SelectField>
              <div className="grid grid-cols-2 gap-2">
                <Field label={tx('Šírka (m)')} type="number" inputMode="decimal" min={0.1} max={20} step={0.05} value={current.w} onChange={(e) => updateItem(current.id, { w: Math.min(20, Math.max(0.1, Number(e.target.value) || 0.1)) })} />
                <Field label={tx('Hĺbka (m)')} type="number" inputMode="decimal" min={0.1} max={20} step={0.05} value={current.d} onChange={(e) => updateItem(current.id, { d: Math.min(20, Math.max(0.1, Number(e.target.value) || 0.1)) })} />
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Button size="sm" variant="outline" aria-label={tx('Otočiť doľava')} onClick={() => updateItem(current.id, { rot: (current.rot + 345) % 360 })}>
                  <RotateCcw className="size-4" aria-hidden />
                </Button>
                <Button size="sm" variant="outline" aria-label={tx('Otočiť doprava')} onClick={() => updateItem(current.id, { rot: (current.rot + 15) % 360 })}>
                  <RotateCw className="size-4" aria-hidden />
                </Button>
                <Button size="sm" variant="outline" onClick={() => updateItem(current.id, { rot: (current.rot + 90) % 360 })}>90°</Button>
                <Button size="sm" variant="outline" aria-label={tx('Duplikovať')} onClick={() => duplicate(current)}>
                  <Copy className="size-4" aria-hidden />
                </Button>
                <Button size="sm" variant="ghost" className="ml-auto" onClick={() => remove(current.id)}>
                  <Trash2 className="size-4" aria-hidden />{tx('Odstrániť')}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">{tf('Stred: {0} m zľava, {1} m od zadnej steny · otočenie {2}°', current.x.toLocaleString('sk-SK'), current.y.toLocaleString('sk-SK'), current.rot)}</p>
            </div>
          ) : (
            <p className="rounded-xl border border-dashed p-3 text-sm text-muted-foreground">{tx('Kliknite na položku na pódiu – tu nastavíte popis, kanál z input listu, rozmer a otočenie.')}</p>
          )}
          {lines.length === 0 && <p className="text-sm text-muted-foreground">{tx('Akcia zatiaľ nemá input list – kanály k položkám pridáte, keď ho vyplníte.')}</p>}
        </aside>
      </div>
    </div>
  )
}

/** Editor stage plánu akcie (/events/:id/stage-plot). */
export function StagePlotEditorPage() {
  const { id = '' } = useParams()
  const companyId = useCompany().active!.companyId
  const events = useEvents(companyId)
  const plot = useStagePlot(companyId, id)
  const patch = usePatch(companyId, id)
  if (events.isPending || plot.isPending || patch.isPending) return <LoadingBlock />
  const event = events.data?.find((item) => item.id === id)
  if (!event) return <ErrorBlock message={tx('Tento event neexistuje alebo k nemu nemáte prístup.')} />
  if (plot.isError) return <ErrorBlock message={tx('Stage plán sa nepodarilo načítať (migrácia 0199).')} />
  const initial = plot.data ?? EMPTY_PLOT
  return <Editor key={initial.version} eventId={id} eventName={event.name} initial={initial} lines={patch.data ?? []} />
}
