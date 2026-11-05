import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { savePalletTypes, warehouseKeys } from './api'
import { PALLET_COLORS, PALLET_MATERIAL_LABELS, type PalletMaterial, type PalletType } from './model'
import { tx, tf } from '@/lib/i18n'

const input = 'h-9 rounded-lg border bg-surface px-2 text-sm'

/** Typy paliet firmy: názov, rozmer a materiál (drevená hnedá, plastová čierna). Z nich sa pridávajú palety v pláne. */
export function PalletTypesSettings({ companyId, types, disabled }: { companyId: string; types: PalletType[]; disabled: boolean }) {
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState(types)
  const [prev, setPrev] = useState(types)
  // Po uložení (nové dáta zo servera) prevziať aktuálny stav.
  if (prev !== types) {
    setPrev(types)
    setDraft(types)
  }
  const save = useMutation({
    mutationFn: (next: PalletType[]) => savePalletTypes(companyId, next),
    onSettled: () => queryClient.invalidateQueries({ queryKey: warehouseKeys.plan(companyId) }),
  })
  const set = (index: number, patch: Partial<PalletType>) => setDraft(draft.map((item, i) => (i === index ? { ...item, ...patch } : item)))
  const valid = draft.every((item) => item.name.trim() && item.length >= 20 && item.length <= 1000 && item.width >= 20 && item.width <= 1000)
  const changed = JSON.stringify(draft) !== JSON.stringify(types)

  return (
    <div>
      <h3 className="mb-1 font-medium">{tx('Typy paliet (')}{draft.length})</h3>
      <p className="mb-2 text-sm text-muted-foreground">{tx('Palety, ktoré používate. V Sklade → Upraviť plán ich pridáte na zem; drevená je v pláne hnedá, plastová čierna.')}</p>
      <ul className="flex flex-col gap-2">
        {draft.map((item, index) => (
          <li key={item.id} className="flex flex-wrap items-center gap-2 rounded-xl border bg-surface px-3 py-2 text-sm">
            <input
              type="color"
              aria-label={`Farba palety ${item.name}`}
              title={tx('Farba v pláne (inak podľa materiálu)')}
              className="h-9 w-10 shrink-0 cursor-pointer rounded-lg border bg-surface p-0.5"
              value={item.color ?? PALLET_COLORS[item.material].fill}
              onChange={(e) => set(index, { color: e.target.value })}
            />
            <input aria-label={tx('Názov palety')} className={`${input} w-44`} maxLength={40} value={item.name} onChange={(e) => set(index, { name: e.target.value })} />
            <input aria-label={tx('Dĺžka (cm)')} type="number" min={20} max={1000} className={`${input} w-20 tabular-nums`} value={item.length} onChange={(e) => set(index, { length: Number(e.target.value) })} />
            ×
            <input aria-label={tx('Šírka (cm)')} type="number" min={20} max={1000} className={`${input} w-20 tabular-nums`} value={item.width} onChange={(e) => set(index, { width: Number(e.target.value) })} />{tx('cm')}<select aria-label={tx('Materiál')} className={input} value={item.material} onChange={(e) => set(index, { material: e.target.value as PalletMaterial })}>
              {(Object.keys(PALLET_MATERIAL_LABELS) as PalletMaterial[]).map((material) => (
                <option key={material} value={material}>
                  {tx(PALLET_MATERIAL_LABELS[material])}
                </option>
              ))}
            </select>
            <Button size="sm" variant="ghost" className="ml-auto size-8 p-0" aria-label={tf('Zmazať {0}', item.name)} onClick={() => setDraft(draft.filter((_, i) => i !== index))}>
              <Trash2 className="size-4" aria-hidden />
            </Button>
          </li>
        ))}
      </ul>
      <div className="mt-2 flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={draft.length >= 30}
          onClick={() => setDraft([...draft, { id: crypto.randomUUID(), name: tx('Nová paleta'), length: 120, width: 80, material: 'wood' }])}
        >
          <Plus className="size-4" aria-hidden />{tx('Nový typ palety')}</Button>
        {changed && (
          <Button size="sm" disabled={disabled || !valid || save.isPending} onClick={() => save.mutate(draft.map((item) => ({ ...item, name: item.name.trim(), length: Math.round(item.length), width: Math.round(item.width) })))}>
            {save.isPending ? tx('Ukladám…') : tx('Uložiť typy paliet')}
          </Button>
        )}
      </div>
      {save.isError && (
        <p role="alert" className="mt-1 text-sm text-destructive">
          {save.error.message}
        </p>
      )}
    </div>
  )
}
