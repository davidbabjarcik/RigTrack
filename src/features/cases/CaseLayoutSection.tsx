import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { LayoutGrid, Plus, Wand2, X } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Field, SelectField } from '@/components/ui/field'
import { fetchLayout, layoutKey, saveLayout } from './layoutApi'
import { tf, tx } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import {
  addSection,
  autoFill,
  editSection,
  MAX_SECTIONS,
  MAX_SIDE,
  placeables,
  placeIn,
  removeFrom,
  removeSection,
  setNote,
  unplaced,
  withoutGone,
  type CaseLayout,
  type Where,
} from './layout'

type Piece = { id: string; name: string; quantity: number; trackUnits: boolean; unitIds: number[] }

const keyOf = (item: { equipmentId: string; unit: number | null }) => `${item.equipmentId}#${item.unit ?? ''}`

/** Názov a mriežka časti (nová časť aj úprava). */
function SectionForm({ start, submitLabel, onSubmit, onCancel }: { start: { name: string; rows: number; cols: number }; submitLabel: string; onSubmit: (value: { name: string; rows: number; cols: number }) => void; onCancel?: () => void }) {
  const [value, setValue] = useState(start)
  const sides = Array.from({ length: MAX_SIDE }, (_, index) => index + 1)
  return (
    <div className="flex flex-wrap items-end gap-2">
      <Field label={tx('Názov (napr. Šuplík 1 – SM 58)')} className="min-w-48 flex-1" maxLength={80} value={value.name} onChange={(changed) => setValue({ ...value, name: changed.target.value })} />
      <SelectField label={tx('Riadky')} value={String(value.rows)} onChange={(changed) => setValue({ ...value, rows: Number(changed.target.value) })}>
        {sides.map((side) => <option key={side} value={side}>{side}</option>)}
      </SelectField>
      <SelectField label={tx('Stĺpce')} value={String(value.cols)} onChange={(changed) => setValue({ ...value, cols: Number(changed.target.value) })}>
        {sides.map((side) => <option key={side} value={side}>{side}</option>)}
      </SelectField>
      <Button size="sm" onClick={() => onSubmit(value)}>{submitLabel}</Button>
      {onCancel && <Button size="sm" variant="ghost" onClick={onCancel}>{tx('Zrušiť')}</Button>}
    </div>
  )
}

/**
 * Rozloženie v case: časti (šuplíky, priehradky) s mriežkou a čo je kde. Technika po kusoch sa rozkladá po kusoch,
 * ostatná s počtom (napr. 6 z 10 SM58 v jednom šuplíku). Pri šuplíku s molitanom stačí mriežka 1 × 1 ako zoznam.
 */
export function CaseLayoutSection({ companyId, caseId, content, canEdit }: { companyId: string; caseId: string; content: Piece[]; canEdit: boolean }) {
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: layoutKey(companyId, caseId), queryFn: () => fetchLayout(companyId, caseId), retry: false })
  const [selected, setSelected] = useState<Where | null>(null)
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<number | null>(null)
  const [count, setCount] = useState('')
  const save = useMutation({
    mutationFn: (layout: CaseLayout | null) => saveLayout(companyId, caseId, layout),
    onMutate: (layout) => queryClient.setQueryData(layoutKey(companyId, caseId), layout),
    onSettled: () => queryClient.invalidateQueries({ queryKey: layoutKey(companyId, caseId) }),
  })
  if (query.isPending || query.isError || query.data === undefined) return null
  if (!query.data && !canEdit) return null
  const layout = query.data ? withoutGone(query.data, content) : null
  const all = placeables(content)
  const free = layout ? unplaced(layout, content) : []
  const labelOf = (item: { equipmentId: string; unit: number | null; count: number }) => {
    const piece = all.find((other) => keyOf(other) === keyOf(item))
    if (!piece) return tx('Technika')
    return piece.unit === null ? `${item.count || piece.quantity}× ${piece.label}` : piece.label
  }
  const cell = selected && layout ? layout.sections[selected.section]?.cells[selected.cell] : undefined

  const addForm = (
    <SectionForm
      start={{ name: layout ? tf('Šuplík {0}', layout.sections.length + 1) : tx('Priehradky'), rows: layout ? 1 : 2, cols: layout ? 1 : 3 }}
      submitLabel={tx('Pridať časť')}
      onSubmit={(value) => {
        save.mutate(addSection(layout, value.name, value.rows, value.cols))
        setAdding(false)
      }}
      onCancel={layout ? () => setAdding(false) : undefined}
    />
  )

  return (
    <section className="mb-6" aria-labelledby="layout-heading">
      <h2 id="layout-heading" className="mb-2 flex items-center gap-2 text-lg font-semibold">
        <LayoutGrid className="size-5" aria-hidden />{tx('Rozloženie v case')}
      </h2>
      {!layout ? (
        <div className="flex flex-col gap-3 rounded-xl border border-dashed bg-surface p-4">
          <p className="text-sm text-muted-foreground">
            {tx('Zapíšte, čo je kde – priehradky (napr. 2 × 3) alebo šuplíky. Šuplík s molitanom stačí ako 1 × 1 so zoznamom, čo v ňom je.')}
          </p>
          {addForm}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {layout.sections.map((section, s) => (
            <div key={s} className="flex flex-col gap-2 rounded-xl border bg-surface p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-medium">{section.name}</h3>
                {canEdit && editing !== s && (
                  <div className="flex flex-wrap gap-1">
                    {free.length > 0 && section.cells.some((other) => other.items.length === 0) && (
                      <Button size="sm" variant="outline" disabled={save.isPending} onClick={() => save.mutate(autoFill(layout, s, content))}>
                        <Wand2 className="size-4" aria-hidden />{tx('Rozložiť nezaradené')}
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => setEditing(s)}>{tx('Upraviť')}</Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label={tf('Odstrániť časť {0}', section.name)}
                      disabled={save.isPending}
                      onClick={() => window.confirm(tf('Odstrániť „{0}“? Rozloženie v nej sa zabudne.', section.name)) && (save.mutate(removeSection(layout, s)), setSelected(null))}
                    >
                      <X className="size-4" aria-hidden />
                    </Button>
                  </div>
                )}
              </div>
              {editing === s && (
                <SectionForm
                  start={{ name: section.name, rows: section.rows, cols: section.cols }}
                  submitLabel={tx('Uložiť')}
                  onSubmit={(value) => {
                    save.mutate(editSection(layout, s, value.name, value.rows, value.cols))
                    setEditing(null)
                    setSelected(null)
                  }}
                  onCancel={() => setEditing(null)}
                />
              )}
              <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${section.cols}, minmax(0, 1fr))` }}>
                {section.cells.map((slot, c) => {
                  const active = selected?.section === s && selected.cell === c
                  const single = section.cells.length === 1
                  return (
                    <button
                      key={c}
                      type="button"
                      disabled={!canEdit}
                      aria-pressed={active}
                      aria-label={single ? section.name : tf('{0} – priehradka {1}', section.name, c + 1)}
                      onClick={() => {
                        setSelected(active ? null : { section: s, cell: c })
                        setCount('')
                      }}
                      className={cn(
                        'flex min-h-16 flex-col items-start gap-1 rounded-lg border p-2 text-left text-xs disabled:cursor-default',
                        active ? 'border-accent bg-accent/10 ring-2 ring-accent' : slot.items.length > 0 ? 'bg-background' : 'border-dashed bg-muted/40',
                      )}
                    >
                      {!single && <span className="font-semibold text-muted-foreground">{c + 1}</span>}
                      {slot.items.map((item) => (
                        <span key={keyOf(item)} className="font-medium break-words">{labelOf(item)}</span>
                      ))}
                      {slot.note && <span className="text-muted-foreground italic">{slot.note}</span>}
                      {slot.items.length === 0 && !slot.note && <span className="text-muted-foreground">{canEdit ? tx('prázdna – ťuknite a pridajte') : tx('prázdna')}</span>}
                    </button>
                  )
                })}
              </div>

              {canEdit && cell && selected?.section === s && (
                <div className="flex flex-col gap-2 rounded-lg border p-3">
                  {cell.items.length > 0 && (
                    <ul className="flex flex-wrap gap-2">
                      {cell.items.map((item) => (
                        <li key={keyOf(item)} className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-sm">
                          {labelOf(item)}
                          <button type="button" aria-label={tf('Vybrať: {0}', labelOf(item))} onClick={() => save.mutate(removeFrom(layout, selected, item))}>
                            <X className="size-3.5" aria-hidden />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="flex flex-wrap items-end gap-2">
                    <SelectField
                      label={tx('Pridať sem')}
                      className="min-w-48 flex-1"
                      value=""
                      onChange={(changed) => {
                        const item = all.find((candidate) => keyOf(candidate) === changed.target.value)
                        if (!item) return
                        const remaining = free.find((other) => keyOf(other) === keyOf(item))?.remaining ?? 0
                        const wanted = Math.floor(Number(count)) || remaining
                        save.mutate(placeIn(layout, selected, item, wanted))
                        setCount('')
                      }}
                    >
                      <option value="">{content.length === 0 ? tx('— v case nie je technika —') : tx('— vyberte —')}</option>
                      {free.length > 0 && (
                        <optgroup label={tx('Nezaradené')}>
                          {free.map((item) => (
                            <option key={keyOf(item)} value={keyOf(item)}>{item.unit === null ? tf('{0} (zostáva {1} ks)', item.label, item.remaining) : item.label}</option>
                          ))}
                        </optgroup>
                      )}
                      <optgroup label={tx('Presunúť sem (kusy)')}>
                        {all.filter((item) => item.unit !== null && !free.some((other) => keyOf(other) === keyOf(item))).map((item) => (
                          <option key={keyOf(item)} value={keyOf(item)}>{item.label}</option>
                        ))}
                      </optgroup>
                    </SelectField>
                    <Field label={tx('Počet (prázdne = všetko, čo zostáva)')} className="w-48" inputMode="numeric" value={count} onChange={(changed) => setCount(changed.target.value.replace(/\D/g, ''))} />
                  </div>
                  <label className="flex flex-col gap-1 text-sm">
                    {tx('Poznámka (napr. káble, držiaky)')}
                    <input
                      key={`${selected.section}-${selected.cell}`}
                      maxLength={120}
                      className="h-9 rounded-lg border bg-background px-2"
                      defaultValue={cell.note}
                      onBlur={(blurred) => blurred.target.value !== cell.note && save.mutate(setNote(layout, selected, blurred.target.value))}
                    />
                  </label>
                </div>
              )}
            </div>
          ))}

          {free.length > 0 && (
            <p className="text-sm text-muted-foreground">
              {tf('Nezaradené ({0}): ', free.length)}
              {free.map((item) => (item.unit === null ? `${item.remaining}× ${item.label}` : item.label)).join(', ')}
            </p>
          )}
          {canEdit && layout.sections.length < MAX_SECTIONS && (
            <div className="rounded-xl border border-dashed p-3">
              {adding ? addForm : (
                <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
                  <Plus className="size-4" aria-hidden />{tx('Pridať časť (šuplík, priehradky)')}
                </Button>
              )}
            </div>
          )}
        </div>
      )}
      {save.isError && <p className="mt-2 text-sm text-destructive">{tx('Nepodarilo sa uložiť.')}</p>}
    </section>
  )
}
