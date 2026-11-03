import { Plus, Trash2 } from 'lucide-react'
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form'
import { useCompany } from '@/features/companies/company-context'
import { useCapsules } from '@/features/capsules/api'
import { Button } from '@/components/ui/button'
import { capsuleLabel, TRANSMITTER_KINDS, TRANSMITTER_LABELS, wirelessSuggestion, type EquipmentFormValues } from './model'

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

/** Návrh názvu a modelu z prijímača, vysielačov a kapsúl – použije sa až tlačidlom (nič sa neprepíše samo). */
export function WirelessSuggestion() {
  const { control, setValue } = useFormContext<EquipmentFormValues>()
  const companyId = useCompany().active!.companyId
  const capsules = useCapsules(companyId)
  const [manufacturer = '', receiver = '', transmitters = [], capsuleIds = [], name = '', model = ''] = useWatch({
    control,
    name: ['manufacturer', 'wirelessRx', 'wirelessTxs', 'capsuleIds', 'name', 'model'],
  })
  const capsuleNames = (capsuleIds ?? []).map((id) => capsules.data?.find((capsule) => capsule.id === id)).filter((capsule) => capsule !== undefined).map(capsuleLabel)
  const suggestion = wirelessSuggestion({ manufacturer: manufacturer ?? '', receiver: receiver ?? '', transmitters: (transmitters ?? []).filter((tx) => tx?.kind), capsules: capsuleNames })
  const nameDiffers = suggestion.name && suggestion.name !== (name ?? '').trim()
  const modelDiffers = suggestion.model && suggestion.model !== (model ?? '').trim()
  if (!nameDiffers && !modelDiffers) return null
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed p-3 text-sm sm:col-span-2">
      <span className="text-muted-foreground">Návrh:</span>
      {nameDiffers && (
        <Button variant="outline" size="sm" title="Použiť ako názov" onClick={() => setValue('name', suggestion.name, { shouldDirty: true, shouldValidate: true })}>
          Názov: {suggestion.name}
        </Button>
      )}
      {modelDiffers && (
        <Button variant="outline" size="sm" title="Použiť ako model" onClick={() => setValue('model', suggestion.model, { shouldDirty: true })}>
          Model: {suggestion.model}
        </Button>
      )}
      <span className="text-xs text-muted-foreground">klik = použiť, inak sa nič nezmení (výrobcu vyplňte nižšie)</span>
    </div>
  )
}
