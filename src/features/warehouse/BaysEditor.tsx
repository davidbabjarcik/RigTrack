import { Copy, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { cleanBays, MAX_BAY_LEVELS, MAX_BAYS, PALLET_CM, type RackBay } from './model'

type Props = { bays: RackBay[]; saving: boolean; onSave: (bays: RackBay[]) => void; onCancel: () => void }

const input = 'h-9 w-20 rounded-lg border bg-surface px-2 text-sm tabular-nums'

/** Úprava polí regála: šírka poľa, police zdola nahor (výška, palety), pridať / kopírovať / odstrániť pole. */
export function BaysEditor({ bays, saving, onSave, onCancel }: Props) {
  const [draft, setDraft] = useState<RackBay[]>(bays)
  const setBay = (index: number, bay: RackBay) => setDraft(draft.map((item, i) => (i === index ? bay : item)))
  const num = (value: string) => Number(value.replace(',', '.'))

  return (
    <div className="mt-3 flex flex-col gap-3 rounded-xl border bg-surface p-4">
      <p className="text-sm text-muted-foreground">
        Pole je časť regála medzi dvoma stojkami. Každé pole môže mať iný počet políc a každá polica inú výšku (svetlá výška od nosníka po
        nosník). Police sú zdola nahor; palety sú europalety {PALLET_CM} cm spredu.
      </p>
      <div className="grid gap-3 lg:grid-cols-2">
        {draft.map((bay, index) => (
          <fieldset key={index} className="rounded-lg border p-3">
            <legend className="px-1 text-sm font-medium">Pole {index + 1}</legend>
            <div className="mb-2 flex flex-wrap items-center gap-2 text-sm">
              <label className="flex items-center gap-2">
                Šírka
                <input type="number" min={20} max={2000} className={input} value={bay.widthCm} onChange={(e) => setBay(index, { ...bay, widthCm: num(e.target.value) })} />
                cm
              </label>
              <span className="text-muted-foreground">
                = {Math.floor(bay.widthCm / PALLET_CM)} palety + {bay.widthCm - Math.floor(bay.widthCm / PALLET_CM) * PALLET_CM} cm
              </span>
            </div>
            <ol className="flex flex-col-reverse gap-1.5">
              {bay.levels.map((level, levelIndex) => (
                <li key={levelIndex} className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="w-20 text-muted-foreground">{levelIndex + 1}. polica{levelIndex === 0 ? ' (dole)' : ''}</span>
                  <label className="flex items-center gap-1">
                    <span className="sr-only">Výška police {levelIndex + 1}</span>
                    <input
                      type="number"
                      min={5}
                      max={1000}
                      className={input}
                      value={level.heightCm}
                      onChange={(e) => setBay(index, { ...bay, levels: bay.levels.map((item, i) => (i === levelIndex ? { ...item, heightCm: num(e.target.value) } : item)) })}
                    />
                    cm
                  </label>
                  <label className="flex items-center gap-1">
                    <input
                      type="number"
                      min={0}
                      max={20}
                      className="h-9 w-14 rounded-lg border bg-surface px-2 text-sm tabular-nums"
                      value={level.pallets ?? 0}
                      onChange={(e) => setBay(index, { ...bay, levels: bay.levels.map((item, i) => (i === levelIndex ? { ...item, pallets: num(e.target.value) } : item)) })}
                    />
                    paliet
                  </label>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="size-8 p-0"
                    aria-label={`Odstrániť ${levelIndex + 1}. policu`}
                    disabled={bay.levels.length <= 1}
                    onClick={() => setBay(index, { ...bay, levels: bay.levels.filter((_, i) => i !== levelIndex) })}
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </Button>
                </li>
              ))}
            </ol>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={bay.levels.length >= MAX_BAY_LEVELS}
                onClick={() => setBay(index, { ...bay, levels: [...bay.levels, { heightCm: bay.levels.at(-1)?.heightCm ?? 100 }] })}
              >
                <Plus className="size-4" aria-hidden />
                Polica hore
              </Button>
              <Button size="sm" variant="outline" disabled={draft.length >= MAX_BAYS} onClick={() => setDraft([...draft.slice(0, index + 1), structuredClone(bay), ...draft.slice(index + 1)])}>
                <Copy className="size-4" aria-hidden />
                Kopírovať pole
              </Button>
              <Button size="sm" variant="ghost" disabled={draft.length <= 1} onClick={() => setDraft(draft.filter((_, i) => i !== index))}>
                <Trash2 className="size-4" aria-hidden />
                Odstrániť pole
              </Button>
            </div>
          </fieldset>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" disabled={draft.length >= MAX_BAYS} onClick={() => setDraft([...draft, { widthCm: 267, levels: [{ heightCm: 150 }, { heightCm: 120 }, { heightCm: 120 }] }])}>
          <Plus className="size-4" aria-hidden />
          Pridať pole
        </Button>
        <span className="flex-1" />
        <Button size="sm" variant="ghost" onClick={onCancel}>
          Zrušiť
        </Button>
        <Button size="sm" disabled={saving} onClick={() => onSave(cleanBays(draft))}>
          {saving ? 'Ukladám…' : 'Uložiť polia'}
        </Button>
      </div>
    </div>
  )
}
