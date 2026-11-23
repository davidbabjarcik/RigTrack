import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Check, MapPin, Route, Save, Search, Trash2, Undo2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ErrorBlock, LoadingBlock } from '@/components/feedback/QueryState'
import { Button } from '@/components/ui/button'
import { Field, SelectField } from '@/components/ui/field'
import { useCompany } from '@/features/companies/company-context'
import { equipmentKeys, fetchEquipmentList } from '@/features/equipment/api'
import { geocode } from '@/features/events/geo'
import type { CompanyEvent } from '@/features/events/model'
import { useEvents } from '@/features/events/useEvents'
import { tf, tx } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { saveSitePlan, siteKeys, useSitePlan } from './api'
import { cableNeeds } from './cables'
import { MapCanvas } from './MapCanvas'
import { DEFAULT_VIEW, MARKER_KINDS, MARKER_LABELS, ROUTE_KINDS, ROUTE_LABELS, uid, type MarkerKind, type RouteKind, type SitePlan } from './model'

type Draft = Pick<SitePlan, 'view' | 'markers' | 'routes' | 'note'>
type Mode = { type: 'pan' } | { type: 'marker'; kind: MarkerKind } | { type: 'route'; kind: RouteKind; points: [number, number][] }

function Editor({ event, initial }: { event: CompanyEvent; initial: SitePlan | null }) {
  const queryClient = useQueryClient()
  const companyId = useCompany().active!.companyId
  const equipment = useQuery({ queryKey: equipmentKeys.list(companyId), queryFn: () => fetchEquipmentList(companyId) })
  const [draft, setDraft] = useState<Draft>(initial ?? { view: DEFAULT_VIEW, markers: [], routes: [], note: '' })
  const [version, setVersion] = useState(initial?.version ?? 0)
  const [dirty, setDirty] = useState(false)
  const [mode, setMode] = useState<Mode>({ type: 'pan' })
  const [selected, setSelected] = useState<string | null>(null)
  const [search, setSearch] = useState(event.venue)
  const [searchError, setSearchError] = useState('')
  const change = (next: (value: Draft) => Draft) => {
    setDraft(next)
    setDirty(true)
  }
  const cables = (equipment.data ?? []).filter((item) => item.kind === 'cable')
  const needs = cableNeeds(draft.routes, cables)
  const marker = draft.markers.find((item) => item.id === selected) ?? null
  const route = draft.routes.find((item) => item.id === selected) ?? null

  useEffect(() => {
    if (!dirty) return
    const warn = (unload: BeforeUnloadEvent) => unload.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const find = useMutation({
    mutationFn: () => geocode(search),
    onSuccess: (point) => {
      if (!point) return setSearchError(tx('Adresa sa nenašla.'))
      setSearchError('')
      change((value) => ({ ...value, view: { lat: point.lat, lon: point.lon, zoom: 18 } }))
    },
    onError: () => setSearchError(tx('Vyhľadávanie adresy teraz nefunguje.')),
  })
  const finishRoute = () => {
    if (mode.type !== 'route') return
    if (mode.points.length >= 2) {
      const created = { id: uid('r'), kind: mode.kind, label: '', equipment_id: null, slack_pct: 10, points: mode.points }
      change((value) => ({ ...value, routes: [...value.routes, created] }))
      setSelected(created.id)
    }
    setMode({ type: 'pan' })
  }
  const save = useMutation({
    mutationFn: () => saveSitePlan(event.id, version, draft),
    onSuccess: async (next) => {
      setVersion(next)
      setDirty(false)
      await queryClient.invalidateQueries({ queryKey: siteKeys.ofEvent(companyId, event.id) })
    },
  })

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Link to={`/events/${event.id}?tab=gear`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" aria-hidden />{event.name}
        </Link>
        <h1 className="w-full text-xl font-semibold">{tx('Site plán')}</h1>
        <p className="text-sm text-muted-foreground">{tf('Verzia {0}', version)}{dirty ? ` · ${tx('neuložené zmeny')}` : ''}</p>
        <Button size="sm" className="ml-auto" disabled={save.isPending || !dirty} onClick={() => save.mutate()}>
          <Save className="size-4" aria-hidden />{tx('Uložiť')}
        </Button>
      </div>
      {save.isError && <p role="alert" className="text-sm text-destructive">{save.error.message || tx('Site plán sa nepodarilo uložiť.')}</p>}

      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(submit) => {
          submit.preventDefault()
          if (search.trim()) find.mutate()
        }}
      >
        <Field label={tx('Nájsť miesto na mape')} className="min-w-56 flex-1" maxLength={200} value={search} onChange={(e) => setSearch(e.target.value)} />
        <Button type="submit" size="sm" variant="outline" className="mb-0.5" disabled={find.isPending || !search.trim()}>
          <Search className="size-4" aria-hidden />{tx('Hľadať')}
        </Button>
      </form>
      {searchError && <p role="alert" className="text-sm text-destructive">{searchError}</p>}

      <div className="grid gap-4 lg:grid-cols-[1fr_19rem]">
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex flex-wrap gap-1.5">
            <SelectField label={tx('Pridať značku')} className="min-w-44" value={mode.type === 'marker' ? mode.kind : ''} onChange={(e) => setMode(e.target.value ? { type: 'marker', kind: e.target.value as MarkerKind } : { type: 'pan' })}>
              <option value="">—</option>
              {MARKER_KINDS.map((kind) => (
                <option key={kind} value={kind}>{tx(MARKER_LABELS[kind])}</option>
              ))}
            </SelectField>
            <SelectField label={tx('Nakresliť trasu kábla')} className="min-w-44" value={mode.type === 'route' ? mode.kind : ''} onChange={(e) => setMode(e.target.value ? { type: 'route', kind: e.target.value as RouteKind, points: [] } : { type: 'pan' })}>
              <option value="">—</option>
              {ROUTE_KINDS.map((kind) => (
                <option key={kind} value={kind}>{tx(ROUTE_LABELS[kind])}</option>
              ))}
            </SelectField>
          </div>
          {mode.type === 'marker' && <p role="status" className="text-sm text-accent"><MapPin className="mr-1 inline size-4" aria-hidden />{tf('Kliknite na mapu – pridá sa „{0}“.', tx(MARKER_LABELS[mode.kind]))}</p>}
          {mode.type === 'route' && (
            <div role="status" className="flex flex-wrap items-center gap-2 text-sm text-accent">
              <Route className="size-4" aria-hidden />
              {tf('Klikajte body trasy po zemi ({0} bodov).', mode.points.length)}
              <Button size="sm" disabled={mode.points.length < 2} onClick={finishRoute}><Check className="size-4" aria-hidden />{tx('Hotovo')}</Button>
              <Button size="sm" variant="ghost" disabled={mode.points.length === 0} onClick={() => setMode({ ...mode, points: mode.points.slice(0, -1) })}><Undo2 className="size-4" aria-hidden />{tx('Späť')}</Button>
              <Button size="sm" variant="ghost" onClick={() => setMode({ type: 'pan' })}>{tx('Zrušiť')}</Button>
            </div>
          )}
          <MapCanvas
            view={draft.view}
            onViewChange={(view) => change((value) => ({ ...value, view }))}
            markers={draft.markers}
            routes={draft.routes}
            draft={mode.type === 'route' ? mode.points : undefined}
            selected={selected}
            height={520}
            onSelect={mode.type === 'pan' ? setSelected : undefined}
            onMarkerMove={mode.type === 'pan' ? (id, point) => change((value) => ({ ...value, markers: value.markers.map((item) => (item.id === id ? { ...item, lat: point.lat, lon: point.lon } : item)) })) : undefined}
            onMapClick={(point) => {
              if (mode.type === 'marker') {
                const created = { id: uid('m'), kind: mode.kind, lat: point.lat, lon: point.lon, label: mode.kind === 'label' ? tx('Popis') : '' }
                change((value) => ({ ...value, markers: [...value.markers, created] }))
                setSelected(created.id)
                setMode({ type: 'pan' })
              } else if (mode.type === 'route') {
                setMode({ ...mode, points: [...mode.points, [point.lat, point.lon]] })
              } else setSelected(null)
            }}
          />
          <p className="text-xs text-muted-foreground">{tx('Mapu posúvajte ťahaním, približujte tlačidlami +/−. Značky sa dajú ťahať. Dĺžky trás sa počítajú po zemi; rezerva pridá percentá na prevýšenie a ohyby.')}</p>
        </div>

        <aside className="flex flex-col gap-3">
          {marker && (
            <div className="flex flex-col gap-2 rounded-xl border bg-surface p-3" aria-label={tx('Vybraná značka')}>
              <SelectField label={tx('Druh')} value={marker.kind} onChange={(e) => change((value) => ({ ...value, markers: value.markers.map((item) => (item.id === marker.id ? { ...item, kind: e.target.value as MarkerKind } : item)) }))}>
                {MARKER_KINDS.map((kind) => (
                  <option key={kind} value={kind}>{tx(MARKER_LABELS[kind])}</option>
                ))}
              </SelectField>
              <Field label={tx('Popis')} maxLength={60} value={marker.label} onChange={(e) => change((value) => ({ ...value, markers: value.markers.map((item) => (item.id === marker.id ? { ...item, label: e.target.value } : item)) }))} />
              <Button size="sm" variant="ghost" onClick={() => { change((value) => ({ ...value, markers: value.markers.filter((item) => item.id !== marker.id) })); setSelected(null) }}>
                <Trash2 className="size-4" aria-hidden />{tx('Odstrániť')}
              </Button>
            </div>
          )}
          {route && (
            <div className="flex flex-col gap-2 rounded-xl border bg-surface p-3" aria-label={tx('Vybraná trasa')}>
              <SelectField label={tx('Druh')} value={route.kind} onChange={(e) => change((value) => ({ ...value, routes: value.routes.map((item) => (item.id === route.id ? { ...item, kind: e.target.value as RouteKind } : item)) }))}>
                {ROUTE_KINDS.map((kind) => (
                  <option key={kind} value={kind}>{tx(ROUTE_LABELS[kind])}</option>
                ))}
              </SelectField>
              <Field label={tx('Popis')} maxLength={60} placeholder={tx('napr. Rozvádzač → FOH')} value={route.label} onChange={(e) => change((value) => ({ ...value, routes: value.routes.map((item) => (item.id === route.id ? { ...item, label: e.target.value } : item)) }))} />
              <SelectField label={tx('Kábel z techniky')} value={route.equipment_id ?? ''} onChange={(e) => change((value) => ({ ...value, routes: value.routes.map((item) => (item.id === route.id ? { ...item, equipment_id: e.target.value || null } : item)) }))}>
                <option value="">—</option>
                {cables.map((item) => (
                  <option key={item.id} value={item.id}>{item.attributes.lengthM ? `${item.name} (${item.attributes.lengthM} m)` : item.name}</option>
                ))}
              </SelectField>
              <Field label={tx('Rezerva (%)')} type="number" min={0} max={100} value={route.slack_pct} onChange={(e) => change((value) => ({ ...value, routes: value.routes.map((item) => (item.id === route.id ? { ...item, slack_pct: Math.max(0, Math.min(100, Math.round(Number(e.target.value) || 0))) } : item)) }))} />
              <Button size="sm" variant="ghost" onClick={() => { change((value) => ({ ...value, routes: value.routes.filter((item) => item.id !== route.id) })); setSelected(null) }}>
                <Trash2 className="size-4" aria-hidden />{tx('Odstrániť')}
              </Button>
            </div>
          )}
          {needs.rows.length > 0 && (
            <div className="rounded-xl border bg-surface p-3 text-sm">
              <p className="mb-1 font-medium">{tf('Trasy káblov – spolu {0} m', needs.meters)}</p>
              <ul className="flex flex-col gap-1">
                {needs.rows.map((row) => (
                  <li key={row.route.id}>
                    <button type="button" className={cn('w-full text-left hover:underline', selected === row.route.id && 'font-semibold')} onClick={() => setSelected(row.route.id)}>
                      {[row.route.label || tx(ROUTE_LABELS[row.route.kind]), `${row.length.withSlack} m`, row.item ? (row.pieces ? `${row.pieces}× ${row.item.name}` : row.item.name) : ''].filter(Boolean).join(' · ')}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <Field label={tx('Poznámka')} maxLength={500} value={draft.note} onChange={(e) => change((value) => ({ ...value, note: e.target.value }))} />
        </aside>
      </div>
    </div>
  )
}

/** Editor site plánu akcie (/events/:id/site). */
export function SitePlanEditorPage() {
  const { id = '' } = useParams()
  const companyId = useCompany().active!.companyId
  const events = useEvents(companyId)
  const plan = useSitePlan(companyId, id)
  if (events.isPending || plan.isPending) return <LoadingBlock />
  const event = events.data?.find((item) => item.id === id)
  if (!event) return <ErrorBlock message={tx('Tento event neexistuje alebo k nemu nemáte prístup.')} />
  if (plan.isError) return <ErrorBlock message={tx('Site plán sa nepodarilo načítať (migrácia 0204).')} />
  return <Editor key={plan.data?.version ?? 0} event={event} initial={plan.data ?? null} />
}
