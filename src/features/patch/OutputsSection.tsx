import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { CollapsibleSection } from '@/components/layout/CollapsibleSection'
import { Button } from '@/components/ui/button'
import { Field, SelectField } from '@/components/ui/field'
import { isGone, type Equipment } from '@/features/equipment/model'
import { tf, tx } from '@/lib/i18n'
import { deleteOutput, OUTPUT_KIND_LABELS, OUTPUT_KINDS, outputKeys, saveOutput, type OutputFields, type OutputLine } from './outputs'

const EMPTY: OutputFields = { number: 1, name: '', kind: 'wedge', mix: '', destination: '', equipmentId: null, stereo: false, note: '' }

function OutputForm({ initial, equipment, onSave, onCancel, onDelete, saving }: { initial: OutputFields; equipment: Equipment[]; onSave: (fields: OutputFields) => void; onCancel: () => void; onDelete?: () => void; saving: boolean }) {
  const [fields, setFields] = useState(initial)
  const set = (patch: Partial<OutputFields>) => setFields((current) => ({ ...current, ...patch }))
  // Monitory, IEM vysielače, repro – zvuková technika.
  const options = equipment.filter((item) => item.kind === 'audio' && !isGone(item.status))
  function submit(event: FormEvent) {
    event.preventDefault()
    if (fields.number >= 1) onSave(fields)
  }
  return (
    <form onSubmit={submit} className="grid grid-cols-2 gap-2 rounded-xl border bg-surface p-3 sm:grid-cols-6">
      <Field label={tx('Výstup')} type="number" inputMode="numeric" min={1} max={128} value={fields.number} onChange={(e) => set({ number: Math.min(128, Math.max(1, Number(e.target.value) || 1)) })} />
      <Field label={tx('Názov')} className="sm:col-span-2" maxLength={80} autoFocus placeholder={tx('napr. Wedge spevák, IEM bicie')} value={fields.name} onChange={(e) => set({ name: e.target.value })} />
      <SelectField label={tx('Druh')} value={fields.kind} onChange={(e) => set({ kind: e.target.value as OutputFields['kind'] })}>
        {OUTPUT_KINDS.map((kind) => (
          <option key={kind} value={kind}>
            {tx(OUTPUT_KIND_LABELS[kind])}
          </option>
        ))}
      </SelectField>
      <Field label={tx('Mix / bus')} maxLength={40} placeholder={tx('Mix 1')} value={fields.mix} onChange={(e) => set({ mix: e.target.value })} />
      <Field label={tx('Cieľ (výstup stageboxu)')} maxLength={60} placeholder={tx('SB1 OUT 1')} value={fields.destination} onChange={(e) => set({ destination: e.target.value })} />
      <SelectField label={tx('Technika (nepovinné)')} className="sm:col-span-2" value={fields.equipmentId ?? ''} onChange={(e) => set({ equipmentId: e.target.value || null })}>
        <option value="">—</option>
        {options.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name}
          </option>
        ))}
      </SelectField>
      <label className="flex items-end gap-2 pb-3 text-sm">
        <input type="checkbox" className="size-4" checked={fields.stereo} onChange={(e) => set({ stereo: e.target.checked })} />
        {tx('Stereo')}
      </label>
      <Field label={tx('Poznámka')} className="col-span-2 sm:col-span-3" maxLength={200} value={fields.note} onChange={(e) => set({ note: e.target.value })} />
      <div className="col-span-2 flex flex-wrap gap-2 sm:col-span-6">
        <Button type="submit" size="sm" disabled={saving}>{tx('Uložiť')}</Button>
        <Button variant="ghost" size="sm" onClick={onCancel}>{tx('Zrušiť')}</Button>
        {onDelete && (
          <Button variant="ghost" size="sm" className="ml-auto" onClick={onDelete}>
            <Trash2 className="size-4" aria-hidden />
            {tx('Odstrániť')}
          </Button>
        )}
      </div>
    </form>
  )
}

/** Output list akcie: monitory, IEM, PA, nahrávanie… s mixom a cieľom. */
export function OutputsSection({ companyId, eventId, outputs, equipment, canEdit }: { companyId: string; eventId: string; outputs: OutputLine[]; equipment: Equipment[]; canEdit: boolean }) {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState<string | null>(null)
  const refresh = () => queryClient.invalidateQueries({ queryKey: outputKeys.ofEvent(companyId, eventId) })
  const save = useMutation({ mutationFn: ({ id, fields }: { id: string | null; fields: OutputFields }) => saveOutput(companyId, eventId, id, fields), onSuccess: () => setEditing(null), onSettled: refresh })
  const remove = useMutation({ mutationFn: deleteOutput, onSuccess: () => setEditing(null), onSettled: refresh })
  const name = (id: string | null) => (id ? equipment.find((item) => item.id === id)?.name : undefined)
  const next = (): OutputFields => {
    const last = [...outputs].sort((a, b) => a.number - b.number).at(-1)
    return last ? { ...EMPTY, number: Math.min(128, last.number + 1), kind: last.kind } : EMPTY
  }
  const form = (output: OutputLine | null) => (
    <OutputForm
      initial={output ?? next()}
      equipment={equipment}
      saving={save.isPending}
      onSave={(fields) => save.mutate({ id: output?.id ?? null, fields })}
      onCancel={() => setEditing(null)}
      onDelete={output ? () => remove.mutate(output.id) : undefined}
    />
  )
  return (
    <CollapsibleSection id="event.outputs" title={tf('Výstupy – monitory, PA, nahrávanie ({0})', outputs.length)}>
      {outputs.length > 0 && (
        <ul className="mb-3 divide-y overflow-hidden rounded-xl border bg-surface text-sm">
          {outputs.map((output) =>
            editing === output.id ? (
              <li key={output.id} className="p-2">
                {form(output)}
              </li>
            ) : (
              <li key={output.id}>
                <button type="button" disabled={!canEdit} onClick={() => setEditing(output.id)} className="flex w-full items-center gap-3 px-3 py-2 text-left enabled:hover:bg-muted">
                  <span className="w-8 shrink-0 text-right font-mono font-semibold">{output.number}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{output.name || '—'}</span>
                    <span className="block truncate text-muted-foreground">
                      {[tx(OUTPUT_KIND_LABELS[output.kind]), output.mix, output.stereo && 'stereo', name(output.equipmentId), output.note].filter(Boolean).join(' · ')}
                    </span>
                  </span>
                  <span className="shrink-0 font-mono text-muted-foreground">{output.destination}</span>
                </button>
              </li>
            ),
          )}
        </ul>
      )}
      {canEdit && editing === 'new' && <div className="mb-3">{form(null)}</div>}
      {canEdit && editing !== 'new' && (
        <Button variant="outline" size="sm" onClick={() => setEditing('new')}>
          <Plus className="size-4" aria-hidden />
          {tx('Pridať výstup')}
        </Button>
      )}
      {(save.isError || remove.isError) && <p className="mt-2 text-sm text-destructive">{tx('Zmena sa nepodarila.')}</p>}
    </CollapsibleSection>
  )
}
