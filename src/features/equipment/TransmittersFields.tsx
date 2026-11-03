import { Plus, Trash2 } from 'lucide-react'
import { useFieldArray, useFormContext } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { TRANSMITTER_KINDS, TRANSMITTER_LABELS, type EquipmentFormValues } from './model'

/** Vysielače bezdrôtového systému: ručné aj bodypacky, každý s modelom a počtom; systém môže byť aj bez vysielača. */
export function TransmittersFields() {
  const { control, register } = useFormContext<EquipmentFormValues>()
  const transmitters = useFieldArray({ control, name: 'wirelessTxs' })

  return (
    <fieldset className="sm:col-span-2">
      <legend className="mb-1.5 text-sm font-medium">Vysielače</legend>
      {transmitters.fields.length === 0 && <p className="mb-2 text-sm text-muted-foreground">Bez vysielača (len prijímač).</p>}
      <ul className="mb-2 flex flex-col gap-2">
        {transmitters.fields.map((field, index) => (
          <li key={field.id} className="flex flex-wrap items-center gap-2">
            <select aria-label={`Druh vysielača ${index + 1}`} className="h-10 rounded-lg border bg-background px-2 text-sm" {...register(`wirelessTxs.${index}.kind`)}>
              {TRANSMITTER_KINDS.map((kind) => (
                <option key={kind} value={kind}>
                  {TRANSMITTER_LABELS[kind]}
                </option>
              ))}
            </select>
            <input
              aria-label={`Model vysielača ${index + 1}`}
              className="h-10 min-w-40 flex-1 rounded-lg border bg-background px-3 text-sm"
              placeholder="model, napr. MTH410"
              maxLength={60}
              {...register(`wirelessTxs.${index}.model`)}
            />
            <label className="flex items-center gap-1 text-sm">
              <input
                aria-label={`Počet vysielačov ${index + 1}`}
                type="number"
                min={1}
                max={100}
                className="h-10 w-16 rounded-lg border bg-background px-2 tabular-nums"
                {...register(`wirelessTxs.${index}.count`, { valueAsNumber: true })}
              />
              ks
            </label>
            <Button variant="ghost" size="sm" className="size-9 p-0" aria-label={`Odobrať vysielač ${index + 1}`} onClick={() => transmitters.remove(index)}>
              <Trash2 className="size-4" aria-hidden />
            </Button>
          </li>
        ))}
      </ul>
      <Button variant="outline" size="sm" disabled={transmitters.fields.length >= 20} onClick={() => transmitters.append({ kind: transmitters.fields.length === 0 ? 'handheld' : 'bodypack', model: '', count: 1 })}>
        <Plus className="size-4" aria-hidden />
        Pridať vysielač
      </Button>
    </fieldset>
  )
}
