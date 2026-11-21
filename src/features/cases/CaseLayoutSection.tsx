import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { LayoutGrid, Wand2, X } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { SelectField } from '@/components/ui/field'
import { getSupabase } from '@/lib/supabase/client'
import { isMissingColumn } from '@/lib/supabase/errors'
import { tf, tx } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { autoFill, MAX_SIDE, placeables, placeIn, readLayout, removeFrom, resizeLayout, setNote, unplaced, withoutGone, type CaseLayout } from './layout'

type Piece = { id: string; name: string; quantity: number; trackUnits: boolean; unitIds: number[] }

const layoutKey = (companyId: string, caseId: string) => ['company', companyId, 'cases', caseId, 'layout'] as const

/** Rozloženie case; undefined = stĺpec ešte nie je (migrácia 0186), null = bez priehradok. */
async function fetchLayout(companyId: string, caseId: string): Promise<CaseLayout | null | undefined> {
  const { data, error } = await getSupabase().from('cases').select('layout').eq('company_id', companyId).eq('id', caseId).maybeSingle()
  if (isMissingColumn(error, 'layout')) return undefined
  if (error) throw error
  return readLayout((data as { layout?: unknown } | null)?.layout)
}

async function saveLayout(companyId: string, caseId: string, layout: CaseLayout | null) {
  const { data, error } = await getSupabase().from('cases').update({ layout: layout ?? {} }).eq('company_id', companyId).eq('id', caseId).select('id')
  if (error) throw error
  if (data.length === 0) throw new Error('Not updated')
}

/**
 * Priehradky v case: mriežka (napr. 2 × 3, ako pri case na šesť svetiel) a čo je v ktorej priehradke.
 * Ťuknutím na priehradku sa do nej pridá technika z case; „Rozložiť“ dá nezaradené kusy po jednom do prázdnych.
 */
export function CaseLayoutSection({ companyId, caseId, content, canEdit }: { companyId: string; caseId: string; content: Piece[]; canEdit: boolean }) {
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: layoutKey(companyId, caseId), queryFn: () => fetchLayout(companyId, caseId), retry: false })
  const [selected, setSelected] = useState<number | null>(null)
  const [size, setSize] = useState({ rows: 2, cols: 3 })
  const [resizing, setResizing] = useState(false)
  const save = useMutation({
    mutationFn: (layout: CaseLayout | null) => saveLayout(companyId, caseId, layout),
    onMutate: (layout) => queryClient.setQueryData(layoutKey(companyId, caseId), layout),
    onSettled: () => queryClient.invalidateQueries({ queryKey: layoutKey(companyId, caseId) }),
  })
  if (query.isPending || query.isError || query.data === undefined) return null
  const stored = query.data
  if (!stored && !canEdit) return null
  const layout = stored ? withoutGone(stored, content) : null
  const labels = new Map(placeables(content).map((item) => [`${item.equipmentId}#${item.unit ?? ''}`, item.label]))
  const labelOf = (item: { equipmentId: string; unit: number | null }) => labels.get(`${item.equipmentId}#${item.unit ?? ''}`) ?? tx('Technika')
  const free = layout ? unplaced(layout, content) : []

  const sizePicker = (
    <div className="flex flex-wrap items-end gap-2">
      <SelectField label={tx('Riadky')} value={String(size.rows)} onChange={(changed) => setSize({ ...size, rows: Number(changed.target.value) })}>
        {Array.from({ length: MAX_SIDE }, (_, index) => <option key={index} value={index + 1}>{index + 1}</option>)}
      </SelectField>
      <SelectField label={tx('Stĺpce')} value={String(size.cols)} onChange={(changed) => setSize({ ...size, cols: Number(changed.target.value) })}>
        {Array.from({ length: MAX_SIDE }, (_, index) => <option key={index} value={index + 1}>{index + 1}</option>)}
      </SelectField>
      <Button
        size="sm"
        disabled={save.isPending}
        onClick={() => {
          save.mutate(resizeLayout(layout, size.rows, size.cols))
          setResizing(false)
          setSelected(null)
        }}
      >
        {layout ? tx('Zmeniť') : tx('Rozdeliť')}
      </Button>
      {layout && <Button size="sm" variant="ghost" onClick={() => setResizing(false)}>{tx('Zrušiť')}</Button>}
    </div>
  )

  return (
    <section className="mb-6" aria-labelledby="layout-heading">
      <h2 id="layout-heading" className="mb-2 flex items-center gap-2 text-lg font-semibold">
        <LayoutGrid className="size-5" aria-hidden />{tx('Priehradky')}
      </h2>
      {!layout ? (
        <div className="flex flex-col gap-3 rounded-xl border border-dashed bg-surface p-4">
          <p className="text-sm text-muted-foreground">{tx('Má case priehradky? Rozdeľte ho na mriežku a zapíšte, čo je kde – pri balení aj kontrole hneď vidno, kam čo patrí.')}</p>
          {sizePicker}
        </div>
      ) : (
        <div className="flex flex-col gap-3 rounded-xl border bg-surface p-4">
          <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${layout.cols}, minmax(0, 1fr))` }}>
            {layout.cells.map((cell, index) => (
              <button
                key={index}
                type="button"
                disabled={!canEdit}
                aria-pressed={selected === index}
                aria-label={tf('Priehradka {0}', index + 1)}
                onClick={() => setSelected(selected === index ? null : index)}
                className={cn(
                  'flex min-h-20 flex-col items-start gap-1 rounded-lg border p-2 text-left text-xs disabled:cursor-default',
                  selected === index ? 'border-accent bg-accent/10 ring-2 ring-accent' : cell.items.length > 0 ? 'bg-background' : 'border-dashed bg-muted/40',
                )}
              >
                <span className="font-semibold text-muted-foreground">{index + 1}</span>
                {cell.items.map((item) => (
                  <span key={`${item.equipmentId}${item.unit}`} className="font-medium break-words">{labelOf(item)}</span>
                ))}
                {cell.note && <span className="text-muted-foreground italic">{cell.note}</span>}
                {cell.items.length === 0 && !cell.note && <span className="text-muted-foreground">{tx('prázdna')}</span>}
              </button>
            ))}
          </div>

          {canEdit && selected !== null && layout.cells[selected] && (
            <div className="flex flex-col gap-2 rounded-lg border p-3">
              <p className="text-sm font-medium">{tf('Priehradka {0}', selected + 1)}</p>
              {layout.cells[selected].items.length > 0 && (
                <ul className="flex flex-wrap gap-2">
                  {layout.cells[selected].items.map((item) => (
                    <li key={`${item.equipmentId}${item.unit}`} className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-sm">
                      {labelOf(item)}
                      <button type="button" aria-label={tf('Vybrať z priehradky: {0}', labelOf(item))} onClick={() => save.mutate(removeFrom(layout, selected, item))}>
                        <X className="size-3.5" aria-hidden />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <SelectField
                label={tx('Pridať do priehradky')}
                value=""
                onChange={(changed) => {
                  const item = placeables(content).find((candidate) => `${candidate.equipmentId}#${candidate.unit ?? ''}` === changed.target.value)
                  if (item) save.mutate(placeIn(layout, selected, item))
                }}
              >
                <option value="">{content.length === 0 ? tx('— v case nie je technika —') : tx('— vyberte —')}</option>
                {free.length > 0 && (
                  <optgroup label={tx('Nezaradené')}>
                    {free.map((item) => <option key={`${item.equipmentId}#${item.unit ?? ''}`} value={`${item.equipmentId}#${item.unit ?? ''}`}>{item.label}</option>)}
                  </optgroup>
                )}
                <optgroup label={tx('Presunúť z inej priehradky')}>
                  {placeables(content)
                    .filter((item) => !free.some((other) => other.equipmentId === item.equipmentId && other.unit === item.unit))
                    .map((item) => <option key={`${item.equipmentId}#${item.unit ?? ''}`} value={`${item.equipmentId}#${item.unit ?? ''}`}>{item.label}</option>)}
                </optgroup>
              </SelectField>
              <label className="flex flex-col gap-1 text-sm">
                {tx('Poznámka (napr. káble, napájanie)')}
                <input
                  key={selected}
                  maxLength={120}
                  className="h-9 rounded-lg border bg-background px-2"
                  defaultValue={layout.cells[selected].note}
                  onBlur={(blurred) => blurred.target.value !== layout.cells[selected].note && save.mutate(setNote(layout, selected, blurred.target.value))}
                />
              </label>
            </div>
          )}

          {free.length > 0 && (
            <p className="text-sm text-muted-foreground">
              {tf('Nezaradené ({0}): ', free.length)}{free.map((item) => item.label).join(', ')}
            </p>
          )}
          {canEdit && (
            <div className="flex flex-wrap gap-2">
              {free.length > 0 && layout.cells.some((cell) => cell.items.length === 0) && (
                <Button size="sm" variant="outline" disabled={save.isPending} onClick={() => save.mutate(autoFill(layout, content))}>
                  <Wand2 className="size-4" aria-hidden />{tx('Rozložiť nezaradené do prázdnych')}
                </Button>
              )}
              {!resizing && (
                <Button size="sm" variant="ghost" onClick={() => (setSize({ rows: layout.rows, cols: layout.cols }), setResizing(true))}>{tx('Zmeniť mriežku')}</Button>
              )}
              <Button size="sm" variant="ghost" disabled={save.isPending} onClick={() => window.confirm(tx('Zrušiť priehradky? Zapísané rozloženie sa zabudne.')) && (save.mutate(null), setSelected(null))}>
                {tx('Zrušiť priehradky')}
              </Button>
            </div>
          )}
          {resizing && sizePicker}
          {save.isError && <p className="text-sm text-destructive">{tx('Nepodarilo sa uložiť.')}</p>}
        </div>
      )}
    </section>
  )
}
