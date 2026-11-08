import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, TriangleAlert, X, Zap } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { CollapsibleSection } from '@/components/layout/CollapsibleSection'
import { Button } from '@/components/ui/button'
import { SelectField } from '@/components/ui/field'
import { equipmentKeys, fetchEquipmentList } from '@/features/equipment/api'
import type { Equipment } from '@/features/equipment/model'
import { usePartners } from '@/features/partners/api'
import { cn } from '@/lib/utils'
import { tf, tx } from '@/lib/i18n'
import { eventPhases, supplyOf } from './eventPower'
import { POWER_LABELS, POWER_TYPES, type CompanyEvent, type PowerType } from './model'
import {
  adviseFeed,
  dimmerAdvice,
  generatorAdvice,
  overAssigned,
  socapexAdvice,
  splitPhases,
  unassigned,
  ZONE_KIND_LABELS,
  ZONE_KINDS,
  ZONE_PRESETS,
  zoneLoads,
  type FeedChoice,
  type Generator,
  type PowerPlan,
  type PowerZone,
  type ZoneKind,
} from './powerPlan'
import { powerPlanKeys, savePowerPlan, usePowerPlan } from './powerPlanApi'

const fmt = (value: number, digits = 1) => value.toLocaleString('sk-SK', { maximumFractionDigits: digits })
const kw = (watts: number) => `${fmt(watts / 1000)} kW`
const newId = () => crypto.randomUUID()
const inputClass = 'h-11 rounded-lg border bg-background px-3'

type Props = { companyId: string; event: CompanyEvent; canEdit: boolean }

/** Elektrika eventu: rýchle rozfázovanie celej techniky, alebo plán po miestach s odporúčanými prívodmi. */
export function EventPowerSection({ companyId, event, canEdit }: Props) {
  const equipment = useQuery({ queryKey: equipmentKeys.list(companyId), queryFn: () => fetchEquipmentList(companyId) })
  const saved = usePowerPlan(companyId, event.id)
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState<PowerPlan | null>(null)
  const save = useMutation({
    mutationFn: (plan: PowerPlan) => savePowerPlan(companyId, event.id, plan),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: powerPlanKeys.ofEvent(companyId, event.id) }),
  })
  // Zmeny sa uložia samé chvíľu po poslednej úprave.
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current)
  }, [])
  const plan: PowerPlan = draft ?? saved.data ?? { zones: [], generators: [] }
  const change = (next: PowerPlan) => {
    setDraft(next)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => save.mutate(next), 800)
  }

  if (!equipment.data || (event.equipment.length === 0 && plan.zones.length === 0 && plan.generators.length === 0)) return null
  const all = equipment.data
  const migrated = !saved.isError
  const zoned = plan.zones.length > 0

  return (
    <CollapsibleSection id="event.power" title={zoned ? tf('Elektrika – {0} miest', plan.zones.length) : tx('Elektrika – fázy')}>
      {zoned ? (
        <ZonesPlan companyId={companyId} event={event} equipment={all} plan={plan} canEdit={canEdit} onChange={change} />
      ) : (
        <QuickPhases event={event} equipment={all} />
      )}
      {canEdit && migrated && !zoned && (
        <AddZones
          intro={tx('Rozdeľte techniku podľa miest (strecha, rampy, pódium, zvuk…) – ku každému miestu sa odporučí prívod a pri svetlách bez DMX aj dimmer.')}
          onAdd={(zone) => change({ ...plan, zones: [...plan.zones, zone] })}
        />
      )}
      {!zoned && (plan.generators.length > 0 || (canEdit && migrated)) && (
        <Generators companyId={companyId} plan={plan} phases={eventPhases(event.equipment, all, 3).phases.map((phase) => phase.watts)} canEdit={canEdit} onChange={change} />
      )}
      {save.isError && <p role="alert" className="mt-2 text-sm text-destructive">{tx('Plán elektriky sa nepodarilo uložiť.')}</p>}
      {!migrated && <p className="mt-2 text-xs text-muted-foreground">{tx('Plán po miestach a elektrocentrály budú dostupné po aktualizácii databázy.')}</p>}
    </CollapsibleSection>
  )
}

/** Celá technika eventu na L1–L3 (bez miest), s možnosťou skúsiť inú prípojku. */
function QuickPhases({ event, equipment }: { event: CompanyEvent; equipment: Equipment[] }) {
  const [power, setPower] = useState<PowerType | ''>(event.power)
  const supply = supplyOf(power, event.powerCount)
  const [phaseCount, setPhaseCount] = useState<1 | 2 | 3>(supply?.phases ?? 3)
  const [existingKw, setExistingKw] = useState([0, 0, 0])
  const plan = eventPhases(event.equipment, equipment, phaseCount, existingKw.map((value) => value * 1000))
  if (plan.totalWatts === 0 && plan.unknown.length === 0) return null
  const highest = Math.max(...plan.phases.map((phase) => phase.watts))

  return (
    <div>
      <p className="mb-3 text-sm font-medium">{tf('Spolu {0}', kw(plan.totalWatts))}</p>
      <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SelectField
          label={tx('Prípojka')}
          value={power}
          onChange={(e) => {
            const next = e.target.value as PowerType | ''
            setPower(next)
            setPhaseCount(supplyOf(next, event.powerCount)?.phases ?? 3)
          }}
        >
          <option value="">{tx('— neuvedená —')}</option>
          {POWER_TYPES.map((type) => (
            <option key={type} value={type}>
              {tx(POWER_LABELS[type])}
            </option>
          ))}
        </SelectField>
        <SelectField label={tx('Fázy')} value={phaseCount} onChange={(e) => setPhaseCount(Number(e.target.value) as 1 | 2 | 3)}>
          <option value={3}>{tx('3 fázy (L1–L3)')}</option>
          <option value={2}>{tx('2 fázy')}</option>
          <option value={1}>{tx('1 fáza')}</option>
        </SelectField>
        {([0, 1, 2] as const).slice(0, phaseCount).map((index) => (
          <label key={index} className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">{tx('Iné na L')}{index + 1}{' '}{tx('(kW)')}</span>
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step="0.1"
              placeholder="0"
              className={inputClass}
              value={existingKw[index] || ''}
              onChange={(e) => {
                const next = [...existingKw]
                next[index] = Number.isFinite(e.target.valueAsNumber) ? Math.max(0, e.target.valueAsNumber) : 0
                setExistingKw(next)
              }}
            />
          </label>
        ))}
      </div>
      <ul className="flex flex-col gap-3 text-sm">
        {plan.phases.map((phase) => {
          const over = supply && phase.amps > supply.amps
          return (
            <li key={phase.phase} className="rounded-xl border bg-surface p-3">
              <span className="flex justify-between gap-3">
                <span className="font-medium">L{phase.phase}</span>
                <span className={cn(over && 'font-medium text-destructive')}>
                  {fmt(phase.watts / 1000)}{' '}{tx('kW ·')}{' '}{fmt(phase.amps)} A{supply && ` z ${supply.amps} A`}
                </span>
              </span>
              <PhaseBar value={phase.watts} max={highest} over={Boolean(over)} />
              <span className="mt-1 block text-muted-foreground">{phase.items.map((item) => `${item.count}× ${item.name}`).join(', ') || tx('nič z techniky')}</span>
            </li>
          )
        })}
      </ul>
      <p className="mt-2 text-sm">{tx('Nevyváženosť:')}{' '}<span className={cn('font-medium', plan.imbalance > 20 && 'text-accent')}>{plan.imbalance} %</span>
        {power && <span className="text-muted-foreground">{' '}{tx('· prípojka:')}{' '}{tx(POWER_LABELS[power])}{event.powerCount && event.powerCount > 1 ? ` × ${event.powerCount}` : ''}</span>}
        {power !== event.power && <span className="text-accent">{' '}{tx('(iná ako v evente)')}</span>}
      </p>
      {plan.unknown.length > 0 && (
        <p className="mt-2 text-sm text-muted-foreground">{tx('Bez zadaného výkonu (nerátajú sa):')}{' '}{plan.unknown.join(', ')}{tx('. Výkon doplňte v Technike.')}</p>
      )}
      <p className="mt-1 text-xs text-muted-foreground">{tx('Ráta sa s maximálnym príkonom každého kusu techniky na evente.')}</p>
    </div>
  )
}

function PhaseBar({ value, max, over }: { value: number; max: number; over: boolean }) {
  return (
    <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
      <span className={cn('block h-full rounded-full', over ? 'bg-destructive' : 'bg-accent')} style={{ width: `${max > 0 ? (value / max) * 100 : 0}%` }} />
    </span>
  )
}

/** Pridanie miesta: bežné miesta jedným ťuknutím alebo vlastný názov. */
function AddZones({ intro, existing = [], onAdd }: { intro?: string; existing?: string[]; onAdd: (zone: PowerZone) => void }) {
  const [name, setName] = useState('')
  const [kind, setKind] = useState<ZoneKind>('light')
  const add = (zoneName: string, zoneKind: ZoneKind) => onAdd({ id: newId(), name: zoneName, kind: zoneKind, items: [], extraKw: 0 })
  return (
    <div className="mt-4 rounded-xl border border-dashed p-3">
      {intro && <p className="mb-2 text-sm text-muted-foreground">{intro}</p>}
      <div className="flex flex-wrap gap-2">
        {ZONE_PRESETS.filter((preset) => !existing.includes(preset.name)).map((preset) => (
          <Button key={preset.name} variant="outline" size="sm" onClick={() => add(tx(preset.name), preset.kind)}>
            <Plus className="size-4" aria-hidden />{tx(preset.name)}
          </Button>
        ))}
      </div>
      <form
        className="mt-3 flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          if (!name.trim()) return
          add(name.trim().slice(0, 80), kind)
          setName('')
        }}
      >
        <label className="flex min-w-40 flex-1 flex-col gap-1.5 text-sm">
          <span className="font-medium">{tx('Vlastné miesto')}</span>
          <input className={inputClass} value={name} maxLength={80} placeholder={tx('napr. Stan pre VIP')} onChange={(e) => setName(e.target.value)} />
        </label>
        <SelectField label={tx('Druh')} value={kind} onChange={(e) => setKind(e.target.value as ZoneKind)}>
          {ZONE_KINDS.map((value) => (
            <option key={value} value={value}>{tx(ZONE_KIND_LABELS[value])}</option>
          ))}
        </SelectField>
        <Button type="submit" variant="outline" disabled={!name.trim()}>{tx('Pridať')}</Button>
      </form>
    </div>
  )
}

/** Plán po miestach: každé miesto s technikou, fázami a odporúčaným prívodom; nakoniec celý event. */
function ZonesPlan({ companyId, event, equipment, plan, canEdit, onChange }: { companyId: string; event: CompanyEvent; equipment: Equipment[]; plan: PowerPlan; canEdit: boolean; onChange: (plan: PowerPlan) => void }) {
  const free = unassigned(event.equipment, plan.zones, equipment)
  const doubled = overAssigned(event.equipment, plan.zones)
  const nameOf = (id: string) => equipment.find((item) => item.id === id)?.name ?? tx('Technika')
  const setZone = (zone: PowerZone) => onChange({ ...plan, zones: plan.zones.map((other) => (other.id === zone.id ? zone : other)) })
  const allLoads = [...plan.zones.flatMap((zone) => zoneLoads(zone, equipment).loads), ...zoneLoads({ items: free, extraKw: 0 }, equipment).loads]
  const phases = splitPhases(allLoads, 3)
  const total = allLoads.reduce((sum, load) => sum + load.watts, 0)
  const advice = adviseFeed(allLoads)
  const supply = supplyOf(event.power, event.powerCount)

  return (
    <div className="flex flex-col gap-3">
      {plan.zones.map((zone) => (
        <ZoneCard
          key={zone.id}
          zone={zone}
          equipment={equipment}
          free={free}
          canEdit={canEdit}
          onChange={setZone}
          onRemove={() => onChange({ ...plan, zones: plan.zones.filter((other) => other.id !== zone.id) })}
        />
      ))}

      {free.length > 0 && (
        <div className="rounded-xl border border-dashed p-3 text-sm">
          <p className="font-medium">{tx('Nezaradené do miesta (rátajú sa do celku):')}</p>
          <p className="mt-1 text-muted-foreground">{free.map((line) => `${line.quantity}× ${nameOf(line.equipmentId)}`).join(', ')}</p>
        </div>
      )}
      {doubled.length > 0 && (
        <p className="flex items-center gap-2 text-sm text-destructive">
          <TriangleAlert className="size-4 shrink-0" aria-hidden />
          {tx('Viac kusov v miestach, než je na evente:')}{' '}{doubled.map(nameOf).join(', ')}
        </p>
      )}

      {canEdit && <AddZones existing={plan.zones.map((zone) => zone.name)} onAdd={(zone) => onChange({ ...plan, zones: [...plan.zones, zone] })} />}

      <div className="rounded-xl border bg-surface p-3 text-sm">
        <p className="flex items-center gap-2 font-medium">
          <Zap className="size-4 text-accent" aria-hidden />{tf('Celý event: {0}', kw(total))}
        </p>
        <Phases phases={phases} limitAmps={supply?.amps ?? null} />
        <FeedTable advice={advice} />
        {event.power && (
          <p className="mt-2 text-muted-foreground">
            {tx('Prípojka v evente:')}{' '}{tx(POWER_LABELS[event.power])}{event.powerCount && event.powerCount > 1 ? ` × ${event.powerCount}` : ''}
            {supply && Math.max(...phases) / 230 > supply.amps && <span className="font-medium text-destructive">{' '}{tx('– nestačí')}</span>}
          </p>
        )}
      </div>
      <Generators companyId={companyId} plan={plan} phases={phases} canEdit={canEdit} onChange={onChange} />
    </div>
  )
}

function Phases({ phases, limitAmps }: { phases: number[]; limitAmps: number | null }) {
  const highest = Math.max(...phases)
  return (
    <ul className="mt-2 grid gap-2 sm:grid-cols-3">
      {phases.map((watts, index) => {
        const amps = watts / 230
        const over = limitAmps !== null && amps > limitAmps
        return (
          <li key={index}>
            <span className={cn('flex justify-between gap-2', over && 'font-medium text-destructive')}>
              <span>L{index + 1}</span>
              <span>{kw(watts)}{' · '}{fmt(amps)} A</span>
            </span>
            <PhaseBar value={watts} max={highest} over={over} />
          </li>
        )
      })}
    </ul>
  )
}

const choiceText = (choice: FeedChoice) => (choice ? `${tx(choice.feed.label)} (${choice.usage} %)` : tx('nestačí'))

/** Minimálny (do 100 %) a optimálny (do 80 %) prívod, jednofázovo aj trojfázovo. */
function FeedTable({ advice }: { advice: ReturnType<typeof adviseFeed> }) {
  return (
    <table className="mt-3 w-full text-left text-sm">
      <thead className="text-xs text-muted-foreground">
        <tr>
          <th className="py-1 pr-2 font-medium">{tx('Prívod')}</th>
          <th className="py-1 pr-2 font-medium">{tx('Minimálny')}</th>
          <th className="py-1 font-medium">{tx('Optimálny (rezerva 20 %)')}</th>
        </tr>
      </thead>
      <tbody>
        <tr className="border-t">
          <td className="py-1 pr-2">{tx('1 fáza (230 V)')}</td>
          <td className="py-1 pr-2">{choiceText(advice.onePhase.minimum)}</td>
          <td className="py-1 font-medium">{choiceText(advice.onePhase.optimal)}</td>
        </tr>
        <tr className="border-t">
          <td className="py-1 pr-2">{tx('3 fázy (400 V)')}</td>
          <td className="py-1 pr-2">{choiceText(advice.threePhase.minimum)}</td>
          <td className="py-1 font-medium">{choiceText(advice.threePhase.optimal)}</td>
        </tr>
      </tbody>
    </table>
  )
}

function ZoneCard({ zone, equipment, free, canEdit, onChange, onRemove }: {
  zone: PowerZone
  equipment: Equipment[]
  free: { equipmentId: string; quantity: number }[]
  canEdit: boolean
  onChange: (zone: PowerZone) => void
  onRemove: () => void
}) {
  const { loads, unknown } = zoneLoads(zone, equipment)
  const total = loads.reduce((sum, load) => sum + load.watts, 0)
  const advice = adviseFeed(loads)
  const socapex = zone.kind === 'light' ? socapexAdvice(loads.filter((load) => !load.dimmed)) : null
  const dimmer = dimmerAdvice(loads)
  const nameOf = (id: string) => equipment.find((item) => item.id === id)?.name ?? tx('Technika')
  const setItem = (equipmentId: string, quantity: number) =>
    onChange({ ...zone, items: quantity > 0 ? zone.items.map((item) => (item.equipmentId === equipmentId ? { ...item, quantity } : item)) : zone.items.filter((item) => item.equipmentId !== equipmentId) })

  return (
    <div className="rounded-xl border bg-surface p-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        {canEdit ? (
          <input
            aria-label={tx('Názov miesta')}
            className="h-10 min-w-0 flex-1 rounded-lg border bg-background px-3 font-medium"
            value={zone.name}
            maxLength={80}
            onChange={(e) => onChange({ ...zone, name: e.target.value })}
          />
        ) : (
          <span className="flex-1 font-medium">{zone.name}</span>
        )}
        <span className="text-muted-foreground">{tx(ZONE_KIND_LABELS[zone.kind])}{' · '}<span className="font-medium text-foreground">{kw(total)}</span></span>
        {canEdit && (
          <Button variant="ghost" size="sm" aria-label={tf('Odstrániť miesto: {0}', zone.name)} onClick={onRemove}>
            <Trash2 className="size-4" aria-hidden />
          </Button>
        )}
      </div>

      <ul className="mt-2 flex flex-col gap-1">
        {zone.items.map((item) => (
          <li key={item.equipmentId} className="flex items-center gap-2">
            {canEdit ? (
              <input
                type="number"
                inputMode="numeric"
                min={0}
                aria-label={tf('Počet: {0}', nameOf(item.equipmentId))}
                className="h-9 w-16 rounded-lg border bg-background px-2"
                value={item.quantity}
                onChange={(e) => setItem(item.equipmentId, Math.max(0, Math.floor(e.target.valueAsNumber || 0)))}
              />
            ) : (
              <span className="w-10 font-medium">{item.quantity}×</span>
            )}
            <span className="min-w-0 flex-1 truncate">{nameOf(item.equipmentId)}</span>
            {canEdit && (
              <Button variant="ghost" size="sm" aria-label={tf('Odobrať z miesta: {0}', nameOf(item.equipmentId))} onClick={() => setItem(item.equipmentId, 0)}>
                <X className="size-4" aria-hidden />
              </Button>
            )}
          </li>
        ))}
        {zone.items.length === 0 && <li className="text-muted-foreground">{tx('Zatiaľ bez techniky.')}</li>}
      </ul>

      {canEdit && (
        <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_10rem]">
          {free.length > 0 ? (
            <SelectField
              label={tx('Pridať techniku z eventu')}
              value=""
              onChange={(e) => {
                const line = free.find((candidate) => candidate.equipmentId === e.target.value)
                if (!line) return
                const existing = zone.items.find((item) => item.equipmentId === line.equipmentId)
                onChange({
                  ...zone,
                  items: existing
                    ? zone.items.map((item) => (item.equipmentId === line.equipmentId ? { ...item, quantity: item.quantity + line.quantity } : item))
                    : [...zone.items, { equipmentId: line.equipmentId, quantity: line.quantity }],
                })
              }}
            >
              <option value="">{tx('— vyberte —')}</option>
              {free.map((line) => (
                <option key={line.equipmentId} value={line.equipmentId}>{`${line.quantity}× ${nameOf(line.equipmentId)}`}</option>
              ))}
            </SelectField>
          ) : (
            <span />
          )}
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">{tx('Ďalší odber (kW)')}</span>
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step="0.1"
              placeholder="0"
              className={inputClass}
              value={zone.extraKw || ''}
              onChange={(e) => onChange({ ...zone, extraKw: Number.isFinite(e.target.valueAsNumber) ? Math.min(Math.max(0, e.target.valueAsNumber), 2000) : 0 })}
            />
          </label>
        </div>
      )}

      {total > 0 && (
        <>
          <Phases phases={advice.threePhase.phases} limitAmps={null} />
          <FeedTable advice={advice} />
        </>
      )}
      {socapex && (
        <p className="mt-2">{tf('Socapex: {0} okruhov po 16 A', socapex.circuits)}{socapex.cables > 1 ? tf(' – {0} káble po 6 okruhoch', socapex.cables) : tx(' – stačí 1 kábel (6 okruhov)')}</p>
      )}
      {dimmer && (
        <p className="mt-2 rounded-lg bg-accent/10 p-2">
          <span className="font-medium">{tf('Externý dimmer {0} V', dimmer.voltage)}</span>
          {': '}{tf('{0} kanálov, {1}', dimmer.channels, kw(dimmer.watts))}
          {dimmer.bigChannels > 0 && tf(' (z toho {0} × 5 kW kanál)', dimmer.bigChannels)}
          {' · '}{tx('prívod')}{' '}{tx(dimmer.feed.label)}{' '}({dimmer.usage} %)
        </p>
      )}
      {unknown.length > 0 && <p className="mt-2 text-muted-foreground">{tx('Bez zadaného výkonu (nerátajú sa):')}{' '}{unknown.join(', ')}</p>}
    </div>
  )
}

/** Elektrocentrály na evente – vlastné aj požičané od inej firmy – a koľko kVA treba. */
function Generators({ companyId, plan, phases, canEdit, onChange }: { companyId: string; plan: PowerPlan; phases: number[]; canEdit: boolean; onChange: (plan: PowerPlan) => void }) {
  const partners = usePartners(companyId)
  const advice = generatorAdvice(phases)
  const totalKva = plan.generators.reduce((sum, generator) => sum + generator.kva, 0)
  const setGenerator = (generator: Generator) => onChange({ ...plan, generators: plan.generators.map((other) => (other.id === generator.id ? generator : other)) })
  if (!canEdit && plan.generators.length === 0) return null

  return (
    <div className="mt-3 rounded-xl border bg-surface p-3 text-sm">
      <p className="font-medium">{tx('Elektrocentrály')}</p>
      {advice && (
        <p className="mt-1 text-muted-foreground">
          {tf('Ak by išlo všetko z centrály: minimálne {0} kVA, optimálne {1} kVA', advice.minimumSize, advice.optimalSize)}
          {' '}{tx('(ráta sa z najviac zaťaženej fázy).')}
        </p>
      )}
      {plan.generators.length > 0 && (
        <ul className="mt-2 flex flex-col gap-2">
          {plan.generators.map((generator) => (
            <li key={generator.id} className="grid gap-2 rounded-lg border p-2 sm:grid-cols-[1fr_6rem_1fr_auto]">
              {canEdit ? (
                <>
                  <input aria-label={tx('Názov centrály')} className={inputClass} value={generator.name} maxLength={80} placeholder={tx('napr. Centrála 60 kVA')} onChange={(e) => setGenerator({ ...generator, name: e.target.value })} />
                  <input
                    aria-label={tx('Výkon (kVA)')}
                    type="number"
                    inputMode="decimal"
                    min={0}
                    className={inputClass}
                    placeholder="kVA"
                    value={generator.kva || ''}
                    onChange={(e) => setGenerator({ ...generator, kva: Number.isFinite(e.target.valueAsNumber) ? Math.min(Math.max(0, e.target.valueAsNumber), 5000) : 0 })}
                  />
                  <select
                    aria-label={tx('Od koho')}
                    className={inputClass}
                    value={generator.partnerId ?? (generator.supplier ? 'other' : '')}
                    onChange={(e) => {
                      const partner = partners.data?.find((item) => item.id === e.target.value)
                      setGenerator({ ...generator, partnerId: partner?.id ?? null, supplier: partner?.name ?? (e.target.value === 'other' ? generator.supplier || tx('iná firma') : '') })
                    }}
                  >
                    <option value="">{tx('Vlastná')}</option>
                    {(partners.data ?? []).map((partner) => (
                      <option key={partner.id} value={partner.id}>{tf('Požičaná: {0}', partner.name)}</option>
                    ))}
                    <option value="other">{tx('Požičaná: iná firma')}</option>
                  </select>
                  <Button variant="ghost" size="sm" aria-label={tf('Odstrániť centrálu: {0}', generator.name || 'centrála')} onClick={() => onChange({ ...plan, generators: plan.generators.filter((other) => other.id !== generator.id) })}>
                    <Trash2 className="size-4" aria-hidden />
                  </Button>
                  {generator.partnerId === null && generator.supplier && (
                    <input aria-label={tx('Názov firmy')} className={cn(inputClass, 'sm:col-span-2')} value={generator.supplier} maxLength={120} onChange={(e) => setGenerator({ ...generator, supplier: e.target.value })} />
                  )}
                  <input aria-label={tx('Poznámka')} className={cn(inputClass, 'sm:col-span-2')} value={generator.note} maxLength={200} placeholder={tx('poznámka: palivo, kto dovezie, kontakt…')} onChange={(e) => setGenerator({ ...generator, note: e.target.value })} />
                </>
              ) : (
                <span className="sm:col-span-4">
                  <span className="font-medium">{generator.name || tx('Centrála')}</span>{' · '}{fmt(generator.kva)} kVA{' · '}
                  {generator.supplier ? tf('požičaná: {0}', generator.supplier) : tx('vlastná')}
                  {generator.note && <span className="block text-muted-foreground">{generator.note}</span>}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
      {plan.generators.length > 0 && advice && (
        <p className={cn('mt-2 font-medium', totalKva < advice.minimumKva ? 'text-destructive' : totalKva < advice.optimalKva ? 'text-accent' : 'text-emerald-700 dark:text-emerald-400')}>
          {tf('Spolu {0} kVA', fmt(totalKva))}{' – '}
          {totalKva < advice.minimumKva ? tx('nestačí') : totalKva < advice.optimalKva ? tx('stačí bez rezervy') : tx('stačí aj s rezervou')}
        </p>
      )}
      {canEdit && (
        <Button className="mt-2" variant="outline" size="sm" onClick={() => onChange({ ...plan, generators: [...plan.generators, { id: newId(), name: '', kva: advice?.optimalSize ?? 0, supplier: '', partnerId: null, note: '' }] })}>
          <Plus className="size-4" aria-hidden />{tx('Pridať elektrocentrálu')}
        </Button>
      )}
    </div>
  )
}
