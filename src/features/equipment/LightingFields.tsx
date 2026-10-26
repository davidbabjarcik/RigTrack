import { Plus, Trash2 } from 'lucide-react'
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form'
import { ampsAt230 } from '@/features/labels/tape'
import { DmxNodeFields } from './DmxNodeFields'
import { Button } from '@/components/ui/button'
import { Field, SelectField } from '@/components/ui/field'
import { asOptionalNumber, CAPTURE_MATCH_LABELS, CAPTURE_MATCHES, LIGHT_SOURCE_LABELS, LIGHT_SOURCES, LIGHT_TYPE_GROUPS, LIGHT_TYPE_LABELS, type EquipmentFormValues } from './model'
import { Group } from './FormGroup'

/** Časť formulára Svetlo: typ, zdroj, výkon, DMX módy, Capture a prevádzkové hodiny. */
export function LightingFields() {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<EquipmentFormValues>()
  // Časť Svetlo sa ukáže pri druhu Svetlo aj pri kategórii, ktorá je o svetlách.
  const dmxModes = useFieldArray({ control, name: 'dmxModes' })
  const captureMatch = useWatch({ control, name: 'captureMatch' })
  const lightType = useWatch({ control, name: 'lightType' })
  const lightSource = useWatch({ control, name: 'lightSource' })
  const powerW = useWatch({ control, name: 'powerW' })
  const dipSwitches = useWatch({ control, name: 'dipSwitches' })
  const lightAccessory = Boolean(lightType && lightType.startsWith('acc_'))
  return (
    <>
      <Group title="Svetlo">
        <SelectField label="Typ svetla" error={errors.lightType?.message} {...register('lightType')}>
          <option value="">— nezadané —</option>
          {LIGHT_TYPE_GROUPS.map((group) => (
            <optgroup key={group.label} label={group.label}>
              {group.types.map((type) => (
                <option key={type} value={type}>
                  {LIGHT_TYPE_LABELS[type]}
                </option>
              ))}
            </optgroup>
          ))}
        </SelectField>
        {!lightAccessory && (
          <div>
            <Field label="Príkon (W)" type="number" inputMode="decimal" min={0} placeholder="max. príkon zo štítku / návodu" error={errors.powerW?.message} {...register('powerW', asOptionalNumber)} />
            {/* Stačí watty zo štítku svetla; prúd pri 230 V sa dopočíta (napr. na rozvádzač a štítok). */}
            <p className="mt-1 text-xs text-muted-foreground">{powerW ? `≈ ${String(ampsAt230(powerW)).replace('.', ',')} A pri 230 V` : 'Stačí watty – ampéry sa dopočítajú.'}</p>
          </div>
        )}
        {lightType === 'acc_converter' && <DmxNodeFields />}
        {!lightAccessory && (
          <div className="grid gap-2 sm:grid-cols-2">
            {/* Adresa cez DIP prepínače (staršie a lacnejšie svetlá) – podľa nich appka ukáže, ktoré prepínače zapnúť. */}
            <SelectField label="DMX adresa sa nastavuje" {...register('dipSwitches', { setValueAs: (value) => (value === '' || value === undefined ? undefined : Number(value)) })}>
              <option value="">displejom / v menu</option>
              {[8, 9, 10, 12].map((count) => (
                <option key={count} value={count}>
                  DIP prepínačmi ({count})
                </option>
              ))}
            </SelectField>
            {dipSwitches ? <Field label="DIP – poznámka" placeholder="napr. 10. prepínač = mód" maxLength={80} error={errors.dipNote?.message} {...register('dipNote')} /> : <span />}
          </div>
        )}
        {!lightAccessory && (
          <SelectField label="Zdroj svetla" error={errors.lightSource?.message} {...register('lightSource')}>
            <option value="">— neuvedené —</option>
            {LIGHT_SOURCES.map((source) => (
              <option key={source} value={source}>
                {LIGHT_SOURCE_LABELS[source]}
              </option>
            ))}
          </SelectField>
        )}
        {!lightAccessory && (
          <fieldset className="sm:col-span-2">
            <legend className="mb-1.5 text-sm font-medium">DMX módy</legend>
            {dmxModes.fields.length === 0 && <p className="mb-2 text-sm text-muted-foreground">Napríklad Basic 8 ch, Standard 16 ch, Extended 24 ch.</p>}
            <ul className="flex flex-col gap-2">
              {dmxModes.fields.map((field, index) => (
                <li key={field.id} className="flex items-end gap-2">
                  <Field
                    label="Názov módu"
                    hideLabel={index > 0}
                    placeholder="napr. Standard"
                    maxLength={40}
                    className="flex-1"
                    error={errors.dmxModes?.[index]?.name?.message}
                    {...register(`dmxModes.${index}.name`)}
                  />
                  <Field
                    label="Kanály"
                    hideLabel={index > 0}
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={512}
                    step={1}
                    className="w-24"
                    error={errors.dmxModes?.[index]?.channels?.message}
                    {...register(`dmxModes.${index}.channels`, {
                      valueAsNumber: true,
                    })}
                  />
                  <Button variant="ghost" aria-label={`Odobrať mód ${index + 1}`} onClick={() => dmxModes.remove(index)}>
                    <Trash2 className="size-4" aria-hidden />
                  </Button>
                </li>
              ))}
            </ul>
            {errors.dmxModes?.message && (
              <p role="alert" className="mt-1.5 text-sm text-destructive">
                {errors.dmxModes.message}
              </p>
            )}
            <Button variant="outline" size="sm" className="mt-2" onClick={() => dmxModes.append({ name: '', channels: Number.NaN })}>
              <Plus className="size-4" aria-hidden />
              Pridať mód
            </Button>
          </fieldset>
        )}
        <Field label="Kópia čoho" placeholder="napr. Robe Spiider, Clay Paky Sharpy" maxLength={120} error={errors.cloneOf?.message} {...register('cloneOf')} />
        <SelectField label="Sedí s fixtúrou v Capture?" error={errors.captureMatch?.message} {...register('captureMatch')}>
          <option value="">— nezistené —</option>
          {CAPTURE_MATCHES.map((match) => (
            <option key={match} value={match}>
              {CAPTURE_MATCH_LABELS[match]}
            </option>
          ))}
        </SelectField>
        {(lightSource === 'discharge' || lightSource === 'halogen') && !lightAccessory && (
          <>
            <Field label={lightSource === 'discharge' ? 'Výbojka naposledy menená' : 'Žiarovka naposledy menená'} type="date" error={errors.lampChangedOn?.message} {...register('lampChangedOn')} />
            <Field
              label="Stav počítadla pri výmene (h)"
              type="number"
              inputMode="decimal"
              min={0}
              placeholder="nepovinné"
              error={errors.lampChangedHours?.message}
              {...register('lampChangedHours', asOptionalNumber)}
            />
          </>
        )}
        {captureMatch && captureMatch !== 'yes' && (
          <Field
            label="Prečo nesedí / čo nesedí"
            className="sm:col-span-2"
            placeholder="napr. iné poradie kanálov, chýba zoom, použiť fixtúru Spiider Mode 2"
            maxLength={500}
            error={errors.captureNote?.message}
            {...register('captureNote')}
          />
        )}
      </Group>
    </>
  )
}
