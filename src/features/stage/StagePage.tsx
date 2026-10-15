import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, CheckCircle2, Info, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ErrorBlock, LoadingBlock } from '@/components/feedback/QueryState'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button, LinkButton } from '@/components/ui/button'
import { Field, SelectField } from '@/components/ui/field'
import { useCompany } from '@/features/companies/company-context'
import { equipmentKeys, fetchEquipmentList } from '@/features/equipment/api'
import { addEventEquipment, eventKeys, setEventEquipmentQuantity } from '@/features/events/api'
import { isLive } from '@/features/events/model'
import { useEvents } from '@/features/events/useEvents'
import { formatDate, todayIso } from '@/lib/format'
import { can } from '@/lib/permissions'
import { cn } from '@/lib/utils'
import { fetchStageConfig, stageKeys } from './api'
import {
  MAX_STAGE_M,
  planStage,
  quantitiesByEquipment,
  SIDE_LABELS,
  sideLength,
  SIDES,
  type Orientation,
  type Segment,
  type Side,
  type Stairs,
  type StagePlan,
  type StageRequest,
} from './model'
import { PartIcon, type PartKind } from './PartIcon'
import { DevNotice } from '@/components/feedback/DevNotice'

const PX = 44
const GROUP_ICONS: Record<string, PartKind> = {
  Dosky: 'deck',
  Nohy: 'leg',
  Lišty: 'lath',
  Plachta: 'skirt',
  Zábradlie: 'railing',
  Výstuhy: 'diagonal',
  Schody: 'stairs',
  Príslušenstvo: 'accessory',
}

/**
 * Pôdorys pódia zhora: predná hrana (k publiku) dole. Pero dosiek je naznačené hrubšou čiarou
 * na zadnej a pravej hrane každej dosky; lišty zelenou, plachta prerušovane, zábradlie modrou, schody pred hranou.
 */
export function StageDrawing({ request, plan, mainId }: { request: StageRequest; plan: StagePlan; mainId: string }) {
  const { widthM: w, depthM: d } = request
  const longest = Math.max(0, ...plan.stairs.map((item) => item.steps * item.stepDepthM))
  const pad = 28 + longest * PX
  const width = w * PX + pad * 2
  const height = d * PX + pad * 2
  const X = (m: number) => pad + m * PX
  const Y = (m: number) => pad + (d - m) * PX
  // Úsek hrany ako čiara; posun von z pódia, aby sa plachta a zábradlie neprekrývali s doskami.
  const line = (segment: Segment, shift: number) => {
    const { side, fromM, toM } = segment
    if (side === 'front') return [X(fromM), Y(0) + shift, X(toM), Y(0) + shift]
    if (side === 'back') return [X(fromM), Y(d) - shift, X(toM), Y(d) - shift]
    if (side === 'left') return [X(0) - shift, Y(fromM), X(0) - shift, Y(toM)]
    return [X(w) + shift, Y(fromM), X(w) + shift, Y(toM)]
  }
  const stairRect = (item: StagePlan['stairs'][number]) => {
    const length = item.steps * item.stepDepthM * PX
    const along = item.widthM * PX
    if (item.side === 'front') return { x: X(item.positionM), y: Y(0), width: along, height: length, horizontal: false }
    if (item.side === 'back') return { x: X(item.positionM), y: Y(d) - length, width: along, height: length, horizontal: false }
    if (item.side === 'left') return { x: X(0) - length, y: Y(item.positionM + item.widthM), width: length, height: along, horizontal: true }
    return { x: X(w), y: Y(item.positionM + item.widthM), width: length, height: along, horizontal: true }
  }
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full max-w-xl" role="img" aria-label={`Pôdorys pódia ${w} × ${d} m`}>
      {plan.decks.map((deck, index) => {
        const x = X(deck.x) + 1.5
        const y = Y(deck.y + deck.d) + 1.5
        const dw = deck.w * PX - 3
        const dh = deck.d * PX - 3
        return (
          <g key={index}>
            <rect x={x} y={y} width={dw} height={dh} rx={3} className={deck.typeId !== mainId ? 'fill-amber-200 stroke-amber-600 dark:fill-amber-900' : 'fill-muted stroke-foreground/50'} strokeWidth={1.5} />
            {/* pero: vzadu (hore) a vpravo */}
            <path d={`M${x + 3} ${y + 3} H${x + dw - 3} V${y + dh - 3}`} className="fill-none stroke-yellow-600" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
          </g>
        )
      })}
      {plan.stairs.map((item, index) => {
        const rect = stairRect(item)
        return (
          <g key={`st-${index}`}>
            {Array.from({ length: item.steps }, (_, step) => {
              const part = rect.horizontal ? rect.width / item.steps : rect.height / item.steps
              return rect.horizontal ? (
                <rect key={step} x={rect.x + step * part} y={rect.y} width={part} height={rect.height} className="fill-yellow-200 stroke-yellow-700 dark:fill-yellow-900" strokeWidth={1} />
              ) : (
                <rect key={step} x={rect.x} y={rect.y + step * part} width={rect.width} height={part} className="fill-yellow-200 stroke-yellow-700 dark:fill-yellow-900" strokeWidth={1} />
              )
            })}
          </g>
        )
      })}
      {plan.lathEdges.map((segment, index) => {
        const [x1, y1, x2, y2] = line(segment, 13)
        // Každá lišta zvlášť, s medzerou: vidno, že ide na jednu dosku.
        const gap = 2
        const horizontal = y1 === y2
        return (
          <line
            key={`l-${index}`}
            x1={horizontal ? x1 + gap : x1}
            y1={horizontal ? y1 : y1 - gap}
            x2={horizontal ? x2 - gap : x2}
            y2={horizontal ? y2 : y2 + gap}
            className="stroke-emerald-500"
            strokeWidth={3}
          />
        )
      })}
      {plan.skirtSegments.map((segment, index) => {
        const [x1, y1, x2, y2] = line(segment, 0)
        return <line key={`s-${index}`} x1={x1} y1={y1} x2={x2} y2={y2} className="stroke-rose-500" strokeWidth={4} strokeDasharray="6 4" />
      })}
      {plan.railingSegments.map((segment, index) => {
        const [x1, y1, x2, y2] = line(segment, 7)
        return <line key={`r-${index}`} x1={x1} y1={y1} x2={x2} y2={y2} className="stroke-sky-600" strokeWidth={5} strokeLinecap="round" />
      })}
      <text x={width / 2} y={height - 6} textAnchor="middle" className="fill-muted-foreground text-[11px]">
        predná strana (publikum) · {w} m
      </text>
      <text x={10} y={height / 2} textAnchor="middle" transform={`rotate(-90 10 ${height / 2})`} className="fill-muted-foreground text-[11px]">
        {d} m
      </text>
    </svg>
  )
}

function SideChoice({ label, sides, onChange }: { label: string; sides: Side[]; onChange: (sides: Side[]) => void }) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-sm font-medium">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {SIDES.map((side) => {
          const on = sides.includes(side)
          return (
            <button
              key={side}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(on ? sides.filter((item) => item !== side) : [...sides, side])}
              className={cn('h-9 rounded-lg border px-3 text-sm font-medium', on ? 'bg-primary text-primary-foreground' : 'bg-surface hover:bg-muted')}
            >
              {SIDE_LABELS[side]}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}

/** Rozmer po 0,5 m, od 1 m do maxima. */
const clampSize = (value: number) => (Number.isFinite(value) ? Math.min(MAX_STAGE_M, Math.max(1, Math.round(value * 2) / 2)) : 1)

/** Kalkulačka pódia Nivtec: dosky, nohy, schody, plachty, zábradlie, výstuhy a príslušenstvo; pridanie na event. */
export function StagePage() {
  const company = useCompany().active!
  const companyId = company.companyId
  const queryClient = useQueryClient()
  const [params] = useSearchParams()
  const config = useQuery({ queryKey: stageKeys.config(companyId), queryFn: () => fetchStageConfig(companyId) })
  const equipment = useQuery({ queryKey: equipmentKeys.list(companyId), queryFn: () => fetchEquipmentList(companyId) })
  const events = useEvents(companyId)

  const [widthM, setWidth] = useState(6)
  const [depthM, setDepth] = useState(4)
  const [height, setHeight] = useState<number | null>(null)
  const [orientation, setOrientation] = useState<Orientation>('auto')
  const [skirt, setSkirt] = useState(false)
  const [skirtSides, setSkirtSides] = useState<Side[]>(['front', 'left', 'right'])
  const [railing, setRailing] = useState(false)
  const [railingSides, setRailingSides] = useState<Side[]>(['back', 'left', 'right'])
  const [stairs, setStairs] = useState<Stairs[]>([])
  const [laths, setLaths] = useState(false)
  const [lathSides, setLathSides] = useState<Side[]>(['front', 'left', 'right'])
  const [extraDecks, setExtraDecks] = useState<{ deckId: string; count: number }[]>([])
  const [stairsToTop, setStairsToTop] = useState(false)
  const [stairsRailingSides, setStairsRailingSides] = useState(0)
  const [eventId, setEventId] = useState(params.get('event') ?? '')

  const today = todayIso()
  const upcoming = (events.data ?? []).filter((event) => isLive(event) && event.endsOn >= today).sort((a, b) => a.startsOn.localeCompare(b.startsOn))
  const heights = [...new Set((config.data?.legs ?? []).map((leg) => leg.heightCm))].sort((a, b) => a - b)
  const heightCm = height ?? heights.find((value) => value >= 60) ?? heights[0] ?? 60

  const request: StageRequest = {
    widthM: clampSize(widthM),
    depthM: clampSize(depthM),
    heightCm,
    orientation,
    skirtSides: skirt ? skirtSides : [],
    railingSides: railing ? railingSides : [],
    lathSides: laths ? lathSides : [],
    stairs,
    extraDecks,
    stairsToTop,
    stairsRailingSides,
  }
  const plan = config.data ? planStage(request, config.data) : null
  const owned = (equipmentId: string) => equipment.data?.find((item) => item.id === equipmentId)
  const totals = plan ? quantitiesByEquipment(plan.lines) : new Map<string, number>()
  const target = upcoming.find((event) => event.id === eventId)

  const addToEvent = useMutation({
    mutationFn: async () => {
      if (!target) return
      for (const [equipmentId, quantity] of totals) {
        if (!target.equipment.some((item) => item.equipmentId === equipmentId)) await addEventEquipment(companyId, target.id, equipmentId)
        await setEventEquipmentQuantity(target.id, equipmentId, quantity)
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: eventKeys.list(companyId) }),
  })

  if (config.isPending || equipment.isPending) return <LoadingBlock />
  if (config.isError) return <ErrorBlock message="Nastavenie pódia sa nepodarilo načítať. Ak ste ešte nespustili migráciu 0039, urobte to." />
  if (!plan) return null

  const unassigned = plan.lines.some((line) => !line.equipmentId)
  const stepDeck = config.data.decks.find((item) => item.id === config.data.stairs.stepDeckId)
  const stepWidth = stepDeck ? Math.max(stepDeck.widthM, stepDeck.depthM) : 1
  const triangles = config.data.decks.filter((item) => item.triangle)
  const groups = [...new Set(plan.lines.map((line) => line.group))]

  return (
    <>
      <PageHeader
        title="Pódium"
        description={`Kalkulačka pódia ${config.data.name}`}
        action={
          can(company, 'lookups.manage') && (
            <LinkButton to="/settings?tab=stage" variant="outline">
              Nastavenie Nivtec
            </LinkButton>
          )
        }
      />
      <DevNotice className="mb-4" />

      <div className="grid gap-6 lg:grid-cols-[22rem_1fr]">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Šírka (m)" type="number" min={1} max={MAX_STAGE_M} step={0.5} value={widthM} onChange={(event) => setWidth(Number(event.target.value))} />
            <Field label="Hĺbka (m)" type="number" min={1} max={MAX_STAGE_M} step={0.5} value={depthM} onChange={(event) => setDepth(Number(event.target.value))} />
          </div>
          {heights.length > 0 ? (
            <SelectField label="Výška pódia" value={heightCm} onChange={(event) => setHeight(Number(event.target.value))}>
              {heights.map((value) => (
                <option key={value} value={value}>
                  {value} cm
                </option>
              ))}
            </SelectField>
          ) : (
            <Field label="Výška pódia (cm)" type="number" min={1} value={heightCm} onChange={(event) => setHeight(Number(event.target.value))} />
          )}
          <SelectField label="Otočenie dosiek" value={orientation} onChange={(event) => setOrientation(event.target.value as Orientation)}>
            <option value="auto">Automaticky (najmenej dosiek 1 × 1)</option>
            <option value="wide">Dlhšou stranou dopredu</option>
            <option value="deep">Dlhšou stranou dozadu</option>
          </SelectField>

          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" className="size-4" checked={laths} onChange={(event) => setLaths(event.target.checked)} />
            Chcem lišty na okraje
          </label>
          {laths && <SideChoice label="Lišty na stranách (vzadu a vpravo na pero, vpredu a vľavo na drážku)" sides={lathSides} onChange={setLathSides} />}
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" className="size-4" checked={skirt} onChange={(event) => setSkirt(event.target.checked)} />
            Chcem plachtu
          </label>
          {skirt && <SideChoice label="Plachta na stranách" sides={skirtSides} onChange={setSkirtSides} />}
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" className="size-4" checked={railing} onChange={(event) => setRailing(event.target.checked)} />
            Chcem zábradlie
          </label>
          {railing && <SideChoice label="Zábradlie na stranách" sides={railingSides} onChange={setRailingSides} />}

          <fieldset className="flex flex-col gap-2 rounded-xl border p-3">
            <legend className="px-1 text-sm font-medium">
              Schody{stepDeck ? ` (stupne ${stepDeck.label || `${stepDeck.widthM} × ${stepDeck.depthM} m`})` : ''}
            </legend>
            {stairs.map((item, index) => (
              <div key={index} className="grid grid-cols-[1fr_6rem_auto] items-end gap-2">
                <SelectField
                  label="Strana"
                  value={item.side}
                  onChange={(event) => setStairs(stairs.map((other, i) => (i === index ? { ...other, side: event.target.value as Side, positionM: 0 } : other)))}
                >
                  {SIDES.map((side) => (
                    <option key={side} value={side}>
                      {SIDE_LABELS[side]}
                    </option>
                  ))}
                </SelectField>
                <Field
                  label={item.side === 'front' || item.side === 'back' ? 'Od ľava (m)' : 'Od predu (m)'}
                  type="number"
                  min={0}
                  max={sideLength(item.side, request.widthM, request.depthM) - stepWidth}
                  step={0.5}
                  value={item.positionM}
                  onChange={(event) => setStairs(stairs.map((other, i) => (i === index ? { ...other, positionM: Number(event.target.value) || 0 } : other)))}
                />
                <Button variant="ghost" aria-label={`Odobrať schody ${index + 1}`} onClick={() => setStairs(stairs.filter((_, i) => i !== index))}>
                  <Trash2 className="size-4" aria-hidden />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" className="self-start" onClick={() => setStairs([...stairs, { side: 'front', positionM: 0 }])}>
              <Plus className="size-4" aria-hidden />
              Pridať schody
            </Button>
            {stairs.length > 0 && (
              <>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" className="size-4" checked={stairsToTop} onChange={(event) => setStairsToTop(event.target.checked)} />
                  Posledný stupeň na úrovni pódia (inak o 20 cm nižšie)
                </label>
                <SelectField label="Zábradlie na schodoch" value={stairsRailingSides} onChange={(event) => setStairsRailingSides(Number(event.target.value))}>
                  <option value={0}>bez zábradlia</option>
                  <option value={1}>z jednej strany</option>
                  <option value={2}>z oboch strán</option>
                </SelectField>
              </>
            )}
          </fieldset>

          {triangles.length > 0 && (
            <fieldset className="flex flex-col gap-2 rounded-xl border p-3">
              <legend className="px-1 text-sm font-medium">Dosky navyše (trojuholníky a pod.)</legend>
              {extraDecks.map((extra, index) => (
                <div key={index} className="grid grid-cols-[1fr_5rem_auto] items-end gap-2">
                  <SelectField
                    label="Doska"
                    value={extra.deckId}
                    onChange={(event) => setExtraDecks(extraDecks.map((other, i) => (i === index ? { ...other, deckId: event.target.value } : other)))}
                  >
                    {triangles.map((deck) => (
                      <option key={deck.id} value={deck.id}>
                        {deck.label}
                      </option>
                    ))}
                  </SelectField>
                  <Field
                    label="Počet"
                    type="number"
                    min={1}
                    value={extra.count}
                    onChange={(event) => setExtraDecks(extraDecks.map((other, i) => (i === index ? { ...other, count: Math.max(0, Math.floor(Number(event.target.value) || 0)) } : other)))}
                  />
                  <Button variant="ghost" aria-label={`Odobrať dosku navyše ${index + 1}`} onClick={() => setExtraDecks(extraDecks.filter((_, i) => i !== index))}>
                    <Trash2 className="size-4" aria-hidden />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" className="self-start" onClick={() => setExtraDecks([...extraDecks, { deckId: triangles[0].id, count: 1 }])}>
                <Plus className="size-4" aria-hidden />
                Pridať dosku navyše
              </Button>
            </fieldset>
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <div className="rounded-xl border bg-surface p-3">
            <StageDrawing request={request} plan={plan} mainId={config.data.decks.find((item) => !item.triangle)?.id ?? ''} />
            <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>
                {request.widthM} × {request.depthM} m = {request.widthM * request.depthM} m², výška {heightCm} cm
              </span>
              <span className="text-yellow-700 dark:text-yellow-300">━ pero dosky</span>
              <span className="text-amber-700 dark:text-amber-300">■ menšia doska</span>
              {plan.lathEdges.length > 0 && <span className="text-emerald-600">━ lišty</span>}
              {plan.skirtMeters > 0 && <span className="text-rose-600">- - plachta {plan.skirtMeters} m</span>}
              {plan.railingMeters > 0 && <span className="text-sky-700 dark:text-sky-300">━ zábradlie {plan.railingMeters} m</span>}
            </p>
          </div>

          <ul className="flex flex-col gap-1 rounded-xl border border-yellow-400/50 bg-yellow-100/50 p-3 text-sm dark:bg-yellow-950/30">
            {plan.tips.map((tip) => (
              <li key={tip} className="flex items-start gap-2">
                <Info className="mt-0.5 size-4 shrink-0 text-yellow-700 dark:text-yellow-300" aria-hidden />
                {tip}
              </li>
            ))}
          </ul>

          {plan.warnings.map((warning) => (
            <p key={warning} role="alert" className="flex items-start gap-2 rounded-xl border border-amber-400/50 bg-amber-100/60 p-3 text-sm dark:bg-amber-950/40">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden />
              {warning}
            </p>
          ))}

          <div className="overflow-x-auto rounded-xl border bg-surface">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="px-4 py-2 font-medium">Diel</th>
                  <th className="px-4 py-2 text-right font-medium">Treba</th>
                  <th className="px-4 py-2 text-right font-medium">Máme</th>
                </tr>
              </thead>
              {groups.map((group) => (
                <tbody key={group} className="divide-y border-b last:border-b-0">
                  <tr className="bg-muted/50">
                    <th colSpan={3} className="px-4 py-1.5 text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                      <span className="inline-flex items-center gap-2">
                        <PartIcon kind={GROUP_ICONS[group] ?? 'accessory'} className="size-5" />
                        {group}
                      </span>
                    </th>
                  </tr>
                  {plan.lines
                    .filter((line) => line.group === group)
                    .map((line) => {
                      const item = line.equipmentId ? owned(line.equipmentId) : undefined
                      const need = line.equipmentId ? (totals.get(line.equipmentId) ?? line.quantity) : line.quantity
                      const short = item ? item.quantity < need : false
                      return (
                        <tr key={line.key}>
                          <td className="px-4 py-2">
                            <span className="font-medium">{line.label}</span>
                            {item && (
                              <Link to={`/equipment/${item.id}`} className="block text-xs text-muted-foreground hover:underline">
                                {item.name}
                              </Link>
                            )}
                          </td>
                          <td className="px-4 py-2 text-right font-semibold tabular-nums">{line.quantity}</td>
                          <td className={cn('px-4 py-2 text-right tabular-nums', short && 'font-semibold text-destructive')}>
                            {item ? (
                              <span className="inline-flex items-center gap-1">
                                {item.quantity}
                                {!short && <CheckCircle2 className="size-4 text-emerald-600" aria-label="stačí" />}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                </tbody>
              ))}
            </table>
          </div>
          {unassigned && (
            <p className="text-sm text-muted-foreground">
              Diely bez techniky sa len rátajú. Priraďte ich v Nastaveniach → Nivtec, potom ich kalkulačka skontroluje a pridá na event.
            </p>
          )}

          {can(company, 'events.edit') && totals.size > 0 && (
            <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-surface p-4">
              <SelectField label="Pridať diely na event" className="min-w-56 flex-1" value={eventId} onChange={(event) => setEventId(event.target.value)}>
                <option value="">— vyberte event —</option>
                {upcoming.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.name} ({formatDate(event.startsOn)})
                  </option>
                ))}
              </SelectField>
              <Button
                disabled={!target || addToEvent.isPending}
                onClick={() => {
                  if (window.confirm(`Pridať diely pódia na event „${target!.name}“? Počty techniky, ktorá už na evente je, sa nastavia na vypočítané.`)) addToEvent.mutate()
                }}
              >
                {addToEvent.isPending ? 'Pridávam…' : 'Pridať na event'}
              </Button>
              {addToEvent.isSuccess && target && (
                <p role="status" className="w-full text-sm">
                  Pridané.{' '}
                  <Link to={`/events/${target.id}`} className="font-medium text-accent hover:underline">
                    Otvoriť event
                  </Link>
                </p>
              )}
              {addToEvent.isError && (
                <p role="alert" className="w-full text-sm text-destructive">
                  Pridanie zlyhalo. Možno už nie je dosť voľných kusov v termíne eventu.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
