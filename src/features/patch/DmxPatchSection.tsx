import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BookmarkPlus, Lightbulb, Plus, Printer, Trash2, Wand2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { CollapsibleSection } from '@/components/layout/CollapsibleSection'
import { Button, LinkButton } from '@/components/ui/button'
import { Field, SelectField } from '@/components/ui/field'
import { equipmentKeys, fetchEquipmentList } from '@/features/equipment/api'
import { isLighting, type Equipment } from '@/features/equipment/model'
import type { CompanyEvent } from '@/features/events/model'
import { cn } from '@/lib/utils'
import { addressesFromEquipment, dmxConflicts, dmxFromEquipment, EMPTY_DMX, fillAddresses, lastAddress, nextDmxAddress, type DmxFields, type DmxLine } from './dmx'
import { deleteDmxLine, dmxKeys, saveDmxLine, savePatchTemplate, useDmxPatch, usePatchTemplates, writeDmxPatch } from './dmxApi'

function DmxForm({ initial, lights, onSave, onCancel, onDelete, saving }: {
  initial: DmxFields
  lights: Equipment[]
  onSave: (fields: DmxFields) => void
  onCancel: () => void
  onDelete?: () => void
  saving: boolean
}) {
  const [fields, setFields] = useState<DmxFields>(initial)
  const set = (patch: Partial<DmxFields>) => setFields((value) => ({ ...value, ...patch }))
  const item = lights.find((light) => light.id === fields.equipmentId)
  const modes = item?.attributes.dmxModes ?? []
  const num = (value: string, max = 512) => (value === '' ? null : Math.max(1, Math.min(max, Math.round(Number(value)))))
  function submit(event: FormEvent) {
    event.preventDefault()
    onSave(fields)
  }
  return (
    <form onSubmit={submit} className="grid grid-cols-2 gap-2 rounded-xl border bg-surface p-3 sm:grid-cols-6">
      <Field label="Linka" maxLength={20} value={fields.universe} onChange={(e) => set({ universe: e.target.value })} />
      <Field label="Adresa" type="number" inputMode="numeric" min={1} max={512} value={fields.address ?? ''} onChange={(e) => set({ address: num(e.target.value) })} />
      <Field label="Kanálov" type="number" inputMode="numeric" min={1} max={512} value={fields.channels} onChange={(e) => set({ channels: num(e.target.value) ?? 1 })} />
      <Field label="Názov" className="sm:col-span-3" placeholder="napr. Beam #3, Wash ľavý" maxLength={80} autoFocus value={fields.name} onChange={(e) => set({ name: e.target.value })} />
      <SelectField
        label="Svetlo z techniky"
        className="sm:col-span-3"
        value={fields.equipmentId ?? ''}
        onChange={(e) => {
          const light = lights.find((candidate) => candidate.id === e.target.value)
          const mode = light?.attributes.dmxModes?.[0]
          set({ equipmentId: e.target.value || null, ...(light && !fields.name ? { name: light.name } : {}), ...(mode ? { mode: mode.name || `${mode.channels} ch`, channels: mode.channels } : {}) })
        }}
      >
        <option value="">— nepovinné —</option>
        {lights.map((light) => (
          <option key={light.id} value={light.id}>
            {light.name}
          </option>
        ))}
      </SelectField>
      {modes.length > 0 ? (
        <SelectField
          label="Mód"
          value={fields.mode}
          onChange={(e) => {
            const mode = modes.find((value) => (value.name || `${value.channels} ch`) === e.target.value)
            set({ mode: e.target.value, ...(mode ? { channels: mode.channels } : {}) })
          }}
        >
          <option value="">—</option>
          {modes.map((mode) => (
            <option key={mode.name + mode.channels} value={mode.name || `${mode.channels} ch`}>
              {mode.name || `${mode.channels} ch`} ({mode.channels} ch)
            </option>
          ))}
        </SelectField>
      ) : (
        <Field label="Mód" maxLength={40} value={fields.mode} onChange={(e) => set({ mode: e.target.value })} />
      )}
      <Field label="Kus (#)" type="number" inputMode="numeric" min={1} value={fields.unit ?? ''} onChange={(e) => set({ unit: num(e.target.value, 100000) })} />
      <Field label="Poznámka" className="col-span-2 sm:col-span-6" maxLength={200} value={fields.note} onChange={(e) => set({ note: e.target.value })} />
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

/** DMX patch list eventu: linky a adresy svetiel, kontrola prekrytia, načítanie zo svetiel eventu alebo zo šablóny, tlač. */
export function DmxPatchSection({ companyId, event, canEdit }: { companyId: string; event: CompanyEvent; canEdit: boolean }) {
  const queryClient = useQueryClient()
  const patch = useDmxPatch(companyId, event.id)
  const templates = usePatchTemplates(companyId)
  const equipment = useQuery({ queryKey: equipmentKeys.list(companyId), queryFn: () => fetchEquipmentList(companyId) })
  const [editing, setEditing] = useState<string | null>(null)
  const [templateId, setTemplateId] = useState('')
  const refresh = () => queryClient.invalidateQueries({ queryKey: dmxKeys.ofEvent(companyId, event.id) })
  const save = useMutation({
    mutationFn: ({ id, fields }: { id: string | null; fields: DmxFields }) => saveDmxLine(companyId, event.id, id, fields),
    onSuccess: () => setEditing(null),
    onSettled: refresh,
  })
  const remove = useMutation({ mutationFn: deleteDmxLine, onSuccess: () => setEditing(null), onSettled: refresh })
  const load = useMutation({ mutationFn: ({ lines, replace }: { lines: DmxFields[]; replace: boolean }) => writeDmxPatch(companyId, event.id, lines, replace), onSettled: refresh })
  const saveTemplate = useMutation({
    mutationFn: (name: string) => savePatchTemplate(companyId, null, { kind: 'dmx', name, lines: (patch.data ?? []).map(({ id: _omit, ...fields }) => (void _omit, fields)) }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: dmxKeys.templates(companyId) }),
  })
  // Bez migrácie 0104 sa sekcia neukáže.
  if (patch.isError || !patch.data) return null

  const lines = patch.data
  const items = equipment.data ?? []
  const lights = items.filter((item) => item.status !== 'retired' && (isLighting(item.kind, '') || item.attributes.dmxModes?.length)).sort((a, b) => a.name.localeCompare(b.name, 'sk'))
  const conflicts = dmxConflicts(lines)
  const fromEvent = dmxFromEquipment(event.equipment, items)
  // Adresy zapísané pri technike (napr. až po vytvorení patch listu).
  const plain = lines.map(({ id: _omit, ...fields }) => (void _omit, fields))
  const fromGear = addressesFromEquipment(plain, items)
  const dmxTemplates = (templates.data ?? []).filter((template) => template.kind === 'dmx')
  const form = (line: DmxLine | null) => (
    <DmxForm
      initial={line ?? { ...EMPTY_DMX, universe: lines[lines.length - 1]?.universe ?? '1', address: nextDmxAddress(lines, lines[lines.length - 1]?.universe ?? '1') }}
      lights={lights}
      saving={save.isPending}
      onSave={(fields) => save.mutate({ id: line?.id ?? null, fields })}
      onCancel={() => setEditing(null)}
      onDelete={line ? () => remove.mutate(line.id) : undefined}
    />
  )
  const confirmReplace = () => lines.length === 0 || window.confirm('Nahradiť doterajší DMX patch list?')

  return (
    <CollapsibleSection
      id="event.dmx"
      title={`DMX patch list (${lines.length})`}
      actions={
        lines.length > 0 && (
          <LinkButton to={`/events/${event.id}/dmx`} variant="outline" size="sm">
            <Printer className="size-4" aria-hidden />
            Tlačiť
          </LinkButton>
        )
      }
    >
      {conflicts.size > 0 && <p className="mb-2 text-sm text-destructive">Niektoré adresy sa na tej istej linke prekrývajú alebo presahujú 512 (označené červenou).</p>}
      {lines.length > 0 && (
        <ul className="mb-3 divide-y overflow-hidden rounded-xl border bg-surface text-sm">
          {lines.map((line) =>
            editing === line.id ? (
              <li key={line.id} className="p-2">
                {form(line)}
              </li>
            ) : (
              <li key={line.id}>
                <button type="button" disabled={!canEdit} onClick={() => setEditing(line.id)} className="flex w-full items-center gap-3 px-3 py-2 text-left enabled:hover:bg-muted">
                  <span className={cn('w-24 shrink-0 font-mono font-semibold', conflicts.has(line.id) && 'text-destructive')}>
                    {line.universe || '–'}.{line.address ? String(line.address).padStart(3, '0') : '???'}
                    {line.address && line.channels > 1 && <span className="font-normal text-muted-foreground">–{String(lastAddress(line)).padStart(3, '0')}</span>}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{line.name || '—'}</span>
                    <span className="block truncate text-muted-foreground">{[line.mode && `mód ${line.mode}`, `${line.channels} ch`, line.note].filter(Boolean).join(' · ')}</span>
                  </span>
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
            Pridať svetlo
          </Button>
          {fromEvent.length > 0 && (
            <Button variant="outline" size="sm" disabled={load.isPending} onClick={() => confirmReplace() && load.mutate({ lines: fillAddresses(fromEvent), replace: true })}>
              <Lightbulb className="size-4" aria-hidden />
              Zo svetiel eventu ({fromEvent.length})
            </Button>
          )}
          {fromGear.changed > 0 && (
            <Button variant="outline" size="sm" disabled={load.isPending} onClick={() => load.mutate({ lines: fromGear.lines, replace: true })}>
              <Lightbulb className="size-4" aria-hidden />
              Prevziať adresy z techniky ({fromGear.changed})
            </Button>
          )}
          {lines.some((line) => !line.address) && (
            <Button variant="outline" size="sm" disabled={load.isPending} onClick={() => load.mutate({ lines: fillAddresses(fromGear.lines), replace: true })}>
              <Wand2 className="size-4" aria-hidden />
              Doplniť chýbajúce adresy
            </Button>
          )}
          {dmxTemplates.length > 0 && (
            <>
              <SelectField label="Šablóna" hideLabel className="w-52" value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
                <option value="">Zo šablóny…</option>
                {dmxTemplates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name} ({template.lines.length})
                  </option>
                ))}
              </SelectField>
              {templateId && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={load.isPending}
                  onClick={() => {
                    const template = dmxTemplates.find((item) => item.id === templateId)
                    if (template && confirmReplace()) load.mutate({ lines: template.lines as DmxFields[], replace: true })
                    setTemplateId('')
                  }}
                >
                  Načítať
                </Button>
              )}
            </>
          )}
          {lines.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              disabled={saveTemplate.isPending}
              onClick={() => {
                const name = window.prompt('Názov šablóny DMX patch listu:', event.name)
                if (name?.trim()) saveTemplate.mutate(name.trim())
              }}
            >
              <BookmarkPlus className="size-4" aria-hidden />
              Uložiť ako šablónu
            </Button>
          )}
        </div>
      )}
      {saveTemplate.isSuccess && <p className="mt-2 text-sm text-muted-foreground">Šablóna je uložená (Patch listy).</p>}
      {(save.isError || remove.isError || load.isError || saveTemplate.isError) && <p className="mt-2 text-sm text-destructive">Zmena sa nepodarila.</p>}
    </CollapsibleSection>
  )
}
