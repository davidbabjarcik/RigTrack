import { useQuery } from '@tanstack/react-query'
import { Lock, Plus, Trash2, Wand2 } from 'lucide-react'
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { equipmentKeys, fetchEquipmentList } from './api'
import { suggestPresetSlots, type EquipmentFormValues } from './model'
import { tx, tf } from '@/lib/i18n'

const SPEAKER_TYPES = ['line_array', 'speaker', 'monitor', 'subwoofer']

/** Digitálny zosilňovač: počet presetov a zapísané presety (číslo, názov, reprobox, poznámka). */
export function AmpPresetsFields({ companyId }: { companyId: string }) {
  const { register, control, setValue, formState: { errors } } = useFormContext<EquipmentFormValues>()
  const presets = useFieldArray({ control, name: 'ampPresets' })
  const manufacturer = useWatch({ control, name: 'manufacturer' }) ?? ''
  const model = useWatch({ control, name: 'model' }) ?? ''
  const slots = useWatch({ control, name: 'ampPresetSlots' })
  const rows = useWatch({ control, name: 'ampPresets' }) ?? []
  const equipment = useQuery({ queryKey: equipmentKeys.list(companyId), queryFn: () => fetchEquipmentList(companyId) })
  const speakers = (equipment.data ?? [])
    .filter((item) => item.kind === 'audio' && SPEAKER_TYPES.includes(item.attributes.audioType ?? ''))
    .sort((a, b) => a.name.localeCompare(b.name, 'sk'))
  const suggestion = suggestPresetSlots(manufacturer, model)
  const usedSlots = new Set(rows.map((row) => row.slot))
  const nextSlot = () => {
    for (let slot = 1; slot <= (slots ?? 999); slot++) if (!usedSlots.has(slot)) return slot
    return (slots ?? 0) + 1
  }
  const full = slots !== undefined && rows.length >= slots

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-3 sm:col-span-2">
      <div className="flex flex-wrap items-end gap-3">
        <Field label={tx('Počet presetov')} type="number" inputMode="numeric" min={1} className="w-40" error={errors.ampPresetSlots?.message} {...register('ampPresetSlots', { setValueAs: (value) => (value === '' || value === null ? undefined : Number(value)) })} />
        {suggestion && slots !== suggestion.slots && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setValue('ampPresetSlots', suggestion.slots, { shouldDirty: true })
              // Výrobný preset (napr. č. 1) sa zapíše ako zamknutý.
              if (suggestion.factorySlot && !rows.some((row) => row.slot === suggestion.factorySlot)) {
                presets.prepend({ slot: suggestion.factorySlot, name: 'Factory default', speakerId: '', note: tx('výrobný – nedá sa prepísať'), locked: true })
              }
            }}
          >
            <Wand2 className="size-4" aria-hidden />{tx('Podľa modelu:')}{' '}{suggestion.slots}{' '}{tx('presetov')}{suggestion.factorySlot ? tf(', č. {0} výrobný', suggestion.factorySlot) : ''}
          </Button>
        )}
        <Field
          label={tx('ID zosilňovača')}
          placeholder={tx('napr. 101 (HiQnet / ID v sieti); viac kusov: #1: 101, #2: 102')}
          className="min-w-56 flex-1"
          autoComplete="off"
          error={errors.ampDeviceId?.message}
          {...register('ampDeviceId')}
        />
        <span className="pb-2.5 text-sm text-muted-foreground">{tx('Zapísané')}{' '}{rows.length}
          {slots ? ` z ${slots}` : ''}
        </span>
      </div>

      {presets.fields.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[36rem] text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground">
                <th className="w-16 pb-1 font-medium">Č.</th>
                <th className="pb-1 font-medium">{tx('Názov presetu')}</th>
                <th className="pb-1 font-medium">{tx('Pre reprobox')}</th>
                <th className="pb-1 font-medium">{tx('Poznámka')}</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {presets.fields.map((field, index) => {
                const locked = rows[index]?.locked
                return (
                  <tr key={field.id}>
                    <td className="pr-1 pb-1">
                      <span className="flex items-center gap-1">
                        <input
                          aria-label={tf('Číslo presetu {0}', index + 1)}
                          type="number"
                          min={1}
                          className="h-8 w-14 rounded-md border bg-background px-1.5 text-right"
                          {...register(`ampPresets.${index}.slot`, { valueAsNumber: true })}
                        />
                        {locked && <Lock className="size-3.5 text-muted-foreground" aria-label={tx('výrobný preset')} />}
                      </span>
                    </td>
                    <td className="pr-1 pb-1">
                      <input aria-label={tf('Názov presetu {0}', index + 1)} maxLength={80} className="h-8 w-full rounded-md border bg-background px-2" placeholder={tx('napr. Top – full range')} {...register(`ampPresets.${index}.name`)} />
                    </td>
                    <td className="pr-1 pb-1">
                      <select aria-label={`Reprobox presetu ${index + 1}`} className="h-8 w-full rounded-md border bg-background px-1.5" {...register(`ampPresets.${index}.speakerId`)}>
                        <option value="">—</option>
                        {speakers.map((speaker) => (
                          <option key={speaker.id} value={speaker.id}>
                            {speaker.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="pr-1 pb-1">
                      <input aria-label={tf('Poznámka presetu {0}', index + 1)} maxLength={200} className="h-8 w-full rounded-md border bg-background px-2" {...register(`ampPresets.${index}.note`)} />
                    </td>
                    <td className="pb-1 text-right">
                      <button type="button" aria-label={tf('Odobrať preset {0}', index + 1)} className="rounded p-1 text-muted-foreground hover:bg-muted" onClick={() => presets.remove(index)}>
                        <Trash2 className="size-4" aria-hidden />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      <Button variant="outline" size="sm" className="self-start" disabled={full} onClick={() => presets.append({ slot: nextSlot(), name: '', speakerId: '', note: '', locked: false })}>
        <Plus className="size-4" aria-hidden />
        {full ? tx('Všetky presety sú obsadené') : tx('Pridať preset')}
      </Button>
      <p className="text-xs text-muted-foreground">{tx('Preset prepojený s reproboxom uvidíte aj v detaile reproboxu.')}</p>
    </div>
  )
}
