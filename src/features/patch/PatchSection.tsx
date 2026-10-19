import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Copy, Plus, Printer, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { CollapsibleSection } from '@/components/layout/CollapsibleSection'
import { Button, LinkButton } from '@/components/ui/button'
import { Field, SelectField } from '@/components/ui/field'
import { useCapsules } from '@/features/capsules/api'
import { equipmentKeys, fetchEquipmentList } from '@/features/equipment/api'
import type { Equipment } from '@/features/equipment/model'
import type { CompanyEvent } from '@/features/events/model'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import { copyPatch, deletePatchLine, patchKeys, savePatchLine, usePatch } from './api'
import {
  CONNECTOR_LABELS,
  CONNECTORS,
  describeSource,
  duplicateChannels,
  nextLine,
  PATCH_SOURCE_LABELS,
  PATCH_SOURCES,
  STAND_LABELS,
  STANDS,
  type PatchFields,
  type PatchLine,
  type PatchSource,
} from './model'

/** Ktorá technika sa ponúkne pri zdroji: mikrofóny, bezdrôtové systémy, DI boxy (keď typ nie je zadaný, všetok zvuk). */
function equipmentFor(source: PatchSource, items: Equipment[]) {
  if (source === 'di') {
    const di = items.filter((item) => item.status !== 'retired' && (item.attributes.cableType === 'di' || item.attributes.audioType === 'di'))
    if (di.length > 0) return di
  }
  const audio = items.filter((item) => item.kind === 'audio' && item.status !== 'retired')
  const types = source === 'wireless' ? ['wireless', 'iem'] : source === 'di' ? ['di'] : ['microphone']
  const typed = audio.filter(
    (item) =>
      (item.attributes.audioType && types.includes(item.attributes.audioType)) ||
      // Bezdrôtový mikrofón zadaný ako „Mikrofón – bezdrôtový“.
      (source === 'wireless' && item.attributes.audioType === 'microphone' && item.attributes.micKind === 'wireless'),
  )
  return typed.length > 0 ? typed : audio
}

function LineForm({ initial, equipment, capsules, onSave, onCancel, onDelete, saving }: {
  initial: PatchFields
  equipment: Equipment[]
  capsules: { id: string; name: string; manufacturer: string }[]
  onSave: (fields: PatchFields) => void
  onCancel: () => void
  onDelete?: () => void
  saving: boolean
}) {
  const [fields, setFields] = useState<PatchFields>(initial)
  const set = (patch: Partial<PatchFields>) => setFields((value) => ({ ...value, ...patch }))
  const options = equipmentFor(fields.source, equipment)
  // Kapsule, ktoré pasujú na vybraný bezdrôtový mikrofón, sú v zozname prvé.
  const fitting = equipment.find((item) => item.id === fields.equipmentId)?.attributes.capsuleIds ?? []
  function submit(event: FormEvent) {
    event.preventDefault()
    if (fields.channel >= 1) onSave(fields)
  }
  const num = (value: string) => (value === '' ? null : Math.max(1, Math.min(512, Math.round(Number(value)))))
  return (
    <form onSubmit={submit} className="grid grid-cols-2 gap-2 rounded-xl border bg-surface p-3 sm:grid-cols-6">
      <Field label="Kanál" type="number" inputMode="numeric" min={1} max={512} value={fields.channel} onChange={(e) => set({ channel: num(e.target.value) ?? 1 })} />
      <Field label="Čo ide na kanál" className="sm:col-span-2" placeholder="napr. Kick In, Spev 1" maxLength={80} autoFocus value={fields.name} onChange={(e) => set({ name: e.target.value })} />
      <Field label="Stagebox" placeholder="SB1" maxLength={40} value={fields.stagebox} onChange={(e) => set({ stagebox: e.target.value })} />
      <Field label="Vstup" type="number" inputMode="numeric" min={1} value={fields.stageboxInput ?? ''} onChange={(e) => set({ stageboxInput: num(e.target.value) })} />
      <SelectField label="Zdroj" value={fields.source} onChange={(e) => set({ source: e.target.value as PatchSource, equipmentId: null, capsuleId: null })}>
        {PATCH_SOURCES.map((source) => (
          <option key={source} value={source}>
            {PATCH_SOURCE_LABELS[source]}
          </option>
        ))}
      </SelectField>
      {fields.source === 'port' ? (
        <SelectField label="Konektor" value={fields.connector} onChange={(e) => set({ connector: e.target.value as PatchFields['connector'] })}>
          <option value="">— vyberte —</option>
          {CONNECTORS.map((connector) => (
            <option key={connector} value={connector}>
              {CONNECTOR_LABELS[connector]}
            </option>
          ))}
        </SelectField>
      ) : (
        fields.source !== 'other' && (
          <SelectField
            label={fields.source === 'wireless' ? 'Bezdrôtový systém' : fields.source === 'di' ? 'DI box' : 'Mikrofón'}
            className="sm:col-span-2"
            value={fields.equipmentId ?? ''}
            onChange={(e) => {
              const item = equipment.find((candidate) => candidate.id === e.target.value)
              // Kondenzátorový mikrofón potrebuje phantom.
              set({ equipmentId: e.target.value || null, ...(item?.attributes.micType === 'condenser' ? { phantom: true } : {}) })
            }}
          >
            <option value="">— z techniky (nepovinné) —</option>
            {options.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </SelectField>
        )
      )}
      {fields.source === 'wireless' && (
        <SelectField label="Kapsula" value={fields.capsuleId ?? ''} onChange={(e) => set({ capsuleId: e.target.value || null })}>
          <option value="">— bez kapsuly —</option>
          {[...capsules]
            .sort((a, b) => Number(fitting.includes(b.id)) - Number(fitting.includes(a.id)))
            .map((capsule) => (
              <option key={capsule.id} value={capsule.id}>
                {[capsule.manufacturer, capsule.name].filter(Boolean).join(' ')}
                {fitting.includes(capsule.id) ? ' ✓' : ''}
              </option>
            ))}
        </SelectField>
      )}
      <SelectField label="Stojan" value={fields.stand} onChange={(e) => set({ stand: e.target.value as PatchFields['stand'] })}>
        <option value="">—</option>
        {STANDS.map((stand) => (
          <option key={stand} value={stand}>
            {STAND_LABELS[stand]}
          </option>
        ))}
      </SelectField>
      <label className="flex items-end gap-2 pb-3 text-sm">
        <input type="checkbox" className="size-4" checked={fields.phantom} onChange={(e) => set({ phantom: e.target.checked })} />
        Phantom 48 V
      </label>
      <Field label="Poznámka" className="col-span-2 sm:col-span-3" maxLength={200} value={fields.note} onChange={(e) => set({ note: e.target.value })} />
      <div className="col-span-2 flex flex-wrap gap-2 sm:col-span-6">
        <Button type="submit" size="sm" disabled={saving}>
          Uložiť
        </Button>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Zrušiť
        </Button>
        {onDelete && (
          <Button variant="ghost" size="sm" className="ml-auto" onClick={onDelete}>
            <Trash2 className="size-4" aria-hidden />
            Odstrániť
          </Button>
        )}
      </div>
    </form>
  )
}

/** Patch list zvuku pri evente: kanály, stageboxy, mikrofóny / kapsule / porty, tlač do PDF. */
export function PatchSection({ companyId, event, events, canEdit }: { companyId: string; event: CompanyEvent; events: CompanyEvent[]; canEdit: boolean }) {
  const queryClient = useQueryClient()
  const key = patchKeys.ofEvent(companyId, event.id)
  const patch = usePatch(companyId, event.id)
  const equipment = useQuery({ queryKey: equipmentKeys.list(companyId), queryFn: () => fetchEquipmentList(companyId) })
  const capsules = useCapsules(companyId)
  const [editing, setEditing] = useState<string | null>(null)
  const [copyFrom, setCopyFrom] = useState('')
  const refresh = () => queryClient.invalidateQueries({ queryKey: key })
  const save = useMutation({
    mutationFn: ({ id, fields }: { id: string | null; fields: PatchFields }) => savePatchLine(companyId, event.id, id, fields),
    onSuccess: () => setEditing(null),
    onSettled: refresh,
  })
  const remove = useMutation({ mutationFn: deletePatchLine, onSuccess: () => setEditing(null), onSettled: refresh })
  const copy = useMutation({ mutationFn: () => copyPatch(companyId, copyFrom, event.id), onSuccess: () => setCopyFrom(''), onSettled: refresh })
  // Bez migrácie 0066 sa sekcia neukáže.
  if (patch.isError || !patch.data) return null

  const lines = patch.data
  const items = equipment.data ?? []
  const equipmentName = (id: string) => items.find((item) => item.id === id)?.name
  const capsuleName = (id: string) => {
    const capsule = capsules.data?.find((item) => item.id === id)
    return capsule ? [capsule.manufacturer, capsule.name].filter(Boolean).join(' ') : undefined
  }
  const duplicates = duplicateChannels(lines)
  const otherEvents = events.filter((item) => item.id !== event.id).sort((a, b) => b.startsOn.localeCompare(a.startsOn)).slice(0, 50)
  const form = (line: PatchLine | null) => (
    <LineForm
      initial={line ?? nextLine(lines)}
      equipment={items}
      capsules={capsules.data ?? []}
      saving={save.isPending}
      onSave={(fields) => save.mutate({ id: line?.id ?? null, fields })}
      onCancel={() => setEditing(null)}
      onDelete={line ? () => remove.mutate(line.id) : undefined}
    />
  )

  return (
    <CollapsibleSection
      id="event.patch"
      title={`Patch list zvuku (${lines.length})`}
      actions={
        lines.length > 0 && (
          <LinkButton to={`/events/${event.id}/patch`} variant="outline" size="sm">
            <Printer className="size-4" aria-hidden />
            Tlačiť
          </LinkButton>
        )
      }
    >
      {duplicates.size > 0 && <p className="mb-2 text-sm text-destructive">Kanál {[...duplicates].join(', ')} je v patch liste viackrát.</p>}
      {lines.length > 0 && (
        <ul className="mb-3 divide-y overflow-hidden rounded-xl border bg-surface text-sm">
          {lines.map((line) =>
            editing === line.id ? (
              <li key={line.id} className="p-2">
                {form(line)}
              </li>
            ) : (
              <li key={line.id}>
                <button
                  type="button"
                  disabled={!canEdit}
                  onClick={() => setEditing(line.id)}
                  className="flex w-full items-center gap-3 px-3 py-2 text-left enabled:hover:bg-muted"
                >
                  <span className={cn('w-8 shrink-0 text-right font-mono font-semibold', duplicates.has(line.channel) && 'text-destructive')}>{line.channel}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{line.name || '—'}</span>
                    <span className="block truncate text-muted-foreground">
                      {[describeSource(line, equipmentName, capsuleName), line.stand && STAND_LABELS[line.stand], line.phantom && '48 V', line.note].filter(Boolean).join(' · ')}
                    </span>
                  </span>
                  <span className="shrink-0 font-mono text-muted-foreground">{[line.stagebox, line.stageboxInput].filter((value) => value !== null && value !== '').join('/')}</span>
                </button>
              </li>
            ),
          )}
        </ul>
      )}
      {canEdit && editing === 'new' && <div className="mb-3">{form(null)}</div>}
      {canEdit && editing !== 'new' && (
        <div className="flex flex-wrap items-end gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditing('new')}>
            <Plus className="size-4" aria-hidden />
            Pridať kanál
          </Button>
          {otherEvents.length > 0 && (
            <>
              <SelectField label="Načítať z eventu" hideLabel className="w-56" value={copyFrom} onChange={(e) => setCopyFrom(e.target.value)}>
                <option value="">Načítať patch z eventu…</option>
                {otherEvents.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({formatDate(item.startsOn)})
                  </option>
                ))}
              </SelectField>
              {copyFrom && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={copy.isPending}
                  onClick={() => (lines.length === 0 || window.confirm('Nahradiť doterajší patch list patch listom z vybraného eventu?')) && copy.mutate()}
                >
                  <Copy className="size-4" aria-hidden />
                  Načítať
                </Button>
              )}
            </>
          )}
        </div>
      )}
      {(save.isError || remove.isError || copy.isError) && <p className="mt-2 text-sm text-destructive">Zmena sa nepodarila.</p>}
    </CollapsibleSection>
  )
}
