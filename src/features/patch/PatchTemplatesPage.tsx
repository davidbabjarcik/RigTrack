import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Cable, ChevronRight, Lightbulb, Plus, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { ErrorBlock, LoadingBlock } from '@/components/feedback/QueryState'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { useCompany } from '@/features/companies/company-context'
import { can } from '@/lib/permissions'
import { cn } from '@/lib/utils'
import { dmxConflicts, EMPTY_DMX, lastAddress, nextDmxAddress, type DmxFields } from './dmx'
import { deletePatchTemplate, dmxKeys, savePatchTemplate, usePatchTemplates, type PatchTemplate } from './dmxApi'
import { EMPTY_LINE, PATCH_SOURCE_LABELS, PATCH_SOURCES, type PatchFields, type PatchSource } from './model'

type Draft = { id: string | null; kind: 'sound' | 'dmx'; name: string; note: string; sound: PatchFields[]; dmx: DmxFields[] }

/** „1 kanál“, „3 kanály“, „7 kanálov“. */
const plural = (count: number, one: string, few: string, many: string) => `${count} ${count === 1 ? one : count >= 2 && count <= 4 ? few : many}`

const cell = 'h-9 w-full min-w-0 rounded-md border bg-background px-2 text-sm'

function SoundRows({ rows, onChange }: { rows: PatchFields[]; onChange: (rows: PatchFields[]) => void }) {
  const set = (index: number, patch: Partial<PatchFields>) => onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[40rem] text-sm">
        <thead>
          <tr className="text-left text-xs text-muted-foreground">
            <th className="w-16 pb-1">Kanál</th>
            <th className="pb-1">Čo</th>
            <th className="w-24 pb-1">Stagebox</th>
            <th className="w-20 pb-1">Vstup</th>
            <th className="w-40 pb-1">Zdroj</th>
            <th className="w-14 pb-1">48V</th>
            <th className="w-10" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              <td className="pr-1 pb-1">
                <input aria-label="Kanál" type="number" min={1} max={512} className={cell} value={row.channel} onChange={(e) => set(index, { channel: Math.max(1, Number(e.target.value) || 1) })} />
              </td>
              <td className="pr-1 pb-1">
                <input aria-label="Čo ide na kanál" maxLength={80} className={cell} value={row.name} onChange={(e) => set(index, { name: e.target.value })} />
              </td>
              <td className="pr-1 pb-1">
                <input aria-label="Stagebox" maxLength={40} className={cell} value={row.stagebox} onChange={(e) => set(index, { stagebox: e.target.value })} />
              </td>
              <td className="pr-1 pb-1">
                <input aria-label="Vstup" type="number" min={1} className={cell} value={row.stageboxInput ?? ''} onChange={(e) => set(index, { stageboxInput: e.target.value ? Number(e.target.value) : null })} />
              </td>
              <td className="pr-1 pb-1">
                <select aria-label="Zdroj" className={cell} value={row.source} onChange={(e) => set(index, { source: e.target.value as PatchSource })}>
                  {PATCH_SOURCES.map((source) => (
                    <option key={source} value={source}>
                      {PATCH_SOURCE_LABELS[source]}
                    </option>
                  ))}
                </select>
              </td>
              <td className="pb-1 text-center">
                <input aria-label="Phantom 48 V" type="checkbox" className="size-4" checked={row.phantom} onChange={(e) => set(index, { phantom: e.target.checked })} />
              </td>
              <td className="pb-1">
                <button type="button" aria-label="Odstrániť riadok" className="rounded p-1 text-muted-foreground hover:bg-muted" onClick={() => onChange(rows.filter((_, i) => i !== index))}>
                  <X className="size-4" aria-hidden />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <Button variant="outline" size="sm" className="mt-2" onClick={() => onChange([...rows, { ...EMPTY_LINE, channel: Math.max(0, ...rows.map((row) => row.channel)) + 1, equipmentId: null, capsuleId: null }])}>
        <Plus className="size-4" aria-hidden />
        Kanál
      </Button>
    </div>
  )
}

function DmxRows({ rows, onChange }: { rows: DmxFields[]; onChange: (rows: DmxFields[]) => void }) {
  const set = (index: number, patch: Partial<DmxFields>) => onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  const conflicts = dmxConflicts(rows.map((row, index) => ({ ...row, id: String(index) })))
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[36rem] text-sm">
        <thead>
          <tr className="text-left text-xs text-muted-foreground">
            <th className="w-20 pb-1">Linka</th>
            <th className="w-24 pb-1">Adresa</th>
            <th className="w-20 pb-1">Kanálov</th>
            <th className="pb-1">Svetlo</th>
            <th className="w-28 pb-1">Mód</th>
            <th className="w-10" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              <td className="pr-1 pb-1">
                <input aria-label="Linka" maxLength={20} className={cell} value={row.universe} onChange={(e) => set(index, { universe: e.target.value })} />
              </td>
              <td className="pr-1 pb-1">
                <input
                  aria-label="Adresa"
                  type="number"
                  min={1}
                  max={512}
                  className={cn(cell, conflicts.has(String(index)) && 'border-destructive text-destructive')}
                  value={row.address ?? ''}
                  title={row.address ? `do ${lastAddress(row)}` : undefined}
                  onChange={(e) => set(index, { address: e.target.value ? Number(e.target.value) : null })}
                />
              </td>
              <td className="pr-1 pb-1">
                <input aria-label="Kanálov" type="number" min={1} max={512} className={cell} value={row.channels} onChange={(e) => set(index, { channels: Math.max(1, Number(e.target.value) || 1) })} />
              </td>
              <td className="pr-1 pb-1">
                <input aria-label="Svetlo" maxLength={80} className={cell} value={row.name} onChange={(e) => set(index, { name: e.target.value })} />
              </td>
              <td className="pr-1 pb-1">
                <input aria-label="Mód" maxLength={40} className={cell} value={row.mode} onChange={(e) => set(index, { mode: e.target.value })} />
              </td>
              <td className="pb-1">
                <button type="button" aria-label="Odstrániť riadok" className="rounded p-1 text-muted-foreground hover:bg-muted" onClick={() => onChange(rows.filter((_, i) => i !== index))}>
                  <X className="size-4" aria-hidden />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {conflicts.size > 0 && <p className="mt-1 text-sm text-destructive">Červené adresy sa prekrývajú alebo presahujú 512.</p>}
      <Button
        variant="outline"
        size="sm"
        className="mt-2"
        onClick={() => {
          const last = rows[rows.length - 1]
          const universe = last?.universe ?? '1'
          onChange([...rows, { ...EMPTY_DMX, universe, channels: last?.channels ?? 1, mode: last?.mode ?? '', address: nextDmxAddress(rows, universe) }])
        }}
      >
        <Plus className="size-4" aria-hidden />
        Svetlo
      </Button>
    </div>
  )
}

/** Patch listy: šablóny zvuku (kanály) a DMX (svetlá s adresami), ktoré sa pri evente načítajú jedným klikom. */
export function PatchTemplatesPage() {
  const company = useCompany().active!
  const companyId = company.companyId
  const canEdit = can(company, 'events.edit')
  const queryClient = useQueryClient()
  const templates = usePatchTemplates(companyId)
  const [draft, setDraft] = useState<Draft | null>(null)
  const refresh = () => queryClient.invalidateQueries({ queryKey: dmxKeys.templates(companyId) })
  const save = useMutation({
    mutationFn: (value: Draft) => savePatchTemplate(companyId, value.id, { kind: value.kind, name: value.name, note: value.note, lines: value.kind === 'sound' ? value.sound : value.dmx }),
    onSuccess: () => setDraft(null),
    onSettled: refresh,
  })
  const remove = useMutation({ mutationFn: (id: string) => deletePatchTemplate(companyId, id), onSuccess: () => setDraft(null), onSettled: refresh })

  const open = (template: PatchTemplate) =>
    setDraft({
      id: template.id,
      kind: template.kind,
      name: template.name,
      note: template.note,
      sound: template.kind === 'sound' ? template.lines : [],
      dmx: template.kind === 'dmx' ? template.lines : [],
    })
  const create = (kind: 'sound' | 'dmx') =>
    setDraft({
      id: null,
      kind,
      name: '',
      note: '',
      sound: kind === 'sound' ? [{ ...EMPTY_LINE, channel: 1, equipmentId: null, capsuleId: null }] : [],
      dmx: kind === 'dmx' ? [{ ...EMPTY_DMX, address: 1 }] : [],
    })

  if (templates.isPending) return <LoadingBlock />
  if (templates.isError) return <ErrorBlock message="Patch listy zatiaľ nie sú dostupné – treba spustiť migráciu 0104." />

  const list = (kind: 'sound' | 'dmx') => templates.data.filter((template) => template.kind === kind)

  return (
    <>
      <PageHeader
        title="Patch listy"
        description="Šablóny patch listov zvuku a DMX – pri evente ich načítate jedným klikom"
        action={
          canEdit &&
          !draft && (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => create('sound')}>
                <Cable className="size-4" aria-hidden />
                Nový zvukový
              </Button>
              <Button variant="outline" onClick={() => create('dmx')}>
                <Lightbulb className="size-4" aria-hidden />
                Nový DMX
              </Button>
            </div>
          )
        }
      />

      {draft && (
        <section className="mb-6 flex flex-col gap-3 rounded-xl border border-accent/40 bg-surface p-4">
          <h2 className="font-medium">{draft.kind === 'sound' ? 'Šablóna zvukového patch listu' : 'Šablóna DMX patch listu'}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Názov *" placeholder={draft.kind === 'sound' ? 'napr. Kapela – základ' : 'napr. Stage – 8 beamov'} maxLength={80} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            <Field label="Poznámka" maxLength={300} value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} />
          </div>
          {draft.kind === 'sound' ? <SoundRows rows={draft.sound} onChange={(sound) => setDraft({ ...draft, sound })} /> : <DmxRows rows={draft.dmx} onChange={(dmx) => setDraft({ ...draft, dmx })} />}
          {(save.isError || remove.isError) && <p className="text-sm text-destructive">Nepodarilo sa uložiť.</p>}
          <div className="flex flex-wrap gap-2">
            <Button disabled={!draft.name.trim() || save.isPending} onClick={() => save.mutate(draft)}>
              {save.isPending ? 'Ukladám…' : 'Uložiť šablónu'}
            </Button>
            <Button variant="ghost" onClick={() => setDraft(null)}>
              Zrušiť
            </Button>
            {draft.id && (
              <Button variant="ghost" className="ml-auto" disabled={remove.isPending} onClick={() => window.confirm(`Zmazať šablónu „${draft.name}“?`) && remove.mutate(draft.id!)}>
                <Trash2 className="size-4" aria-hidden />
                Zmazať
              </Button>
            )}
          </div>
        </section>
      )}

      {(['sound', 'dmx'] as const).map((kind) => (
        <section key={kind} className="mb-6">
          <h2 className="mb-2 flex items-center gap-2 font-medium">
            {kind === 'sound' ? <Cable className="size-5 text-accent" aria-hidden /> : <Lightbulb className="size-5 text-accent" aria-hidden />}
            {kind === 'sound' ? 'Zvuk' : 'DMX'} ({list(kind).length})
          </h2>
          {list(kind).length === 0 ? (
            <p className="rounded-xl border border-dashed bg-surface px-4 py-6 text-center text-sm text-muted-foreground">
              Zatiaľ žiadna šablóna. Vytvorte ju tu, alebo pri evente „Uložiť ako šablónu“.
            </p>
          ) : (
            <ul className="divide-y overflow-hidden rounded-xl border bg-surface">
              {list(kind).map((template) => (
                <li key={template.id}>
                  <button type="button" disabled={!canEdit} onClick={() => open(template)} className="flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left enabled:hover:bg-muted">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{template.name}</span>
                      <span className="block truncate text-sm text-muted-foreground">
                        {[template.kind === 'sound' ? plural(template.lines.length, 'kanál', 'kanály', 'kanálov') : plural(template.lines.length, 'svetlo', 'svetlá', 'svetiel'), template.note].filter(Boolean).join(' · ')}
                      </span>
                    </span>
                    {canEdit && <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
      <p className="text-sm text-muted-foreground">Patch list konkrétneho eventu (zvuk aj DMX) je v detaile eventu; odtiaľ sa aj tlačí.</p>
    </>
  )
}
