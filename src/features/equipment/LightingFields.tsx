import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form'
import { ampsAt230 } from '@/features/labels/tape'
import { DmxChannelTable } from './DmxChannelTable'
import { DmxNodeFields } from './DmxNodeFields'
import { LightColorFields } from './LightColorFields'
import { Button } from '@/components/ui/button'
import { Field, SelectField } from '@/components/ui/field'
import { asOptionalNumber, CAPTURE_MATCH_LABELS, CAPTURE_MATCHES, LIGHT_SOURCE_LABELS, LIGHT_SOURCES, LIGHT_TYPE_GROUPS, LIGHT_TYPE_LABELS, type EquipmentFormValues } from './model'
import { Group } from './FormGroup'
import { tx, tf } from '@/lib/i18n'

/** Náhľad rozpisu kanálov pri písaní: ikonky, predvolené hodnoty a upozornenie, keď počet riadkov nesedí s módom. */
function MapPreview({ mode }: { mode: EquipmentFormValues['dmxModes'][number] | undefined }) {
  const map = (mode?.map ?? '').replace(/\s+$/, '')
  if (!mode || !map) return null
  const lines = map.split('\n').length
  const channels = Number(mode.channels)
  return (
    <details className="text-sm">
      <summary className="cursor-pointer text-accent">{tx('Náhľad rozpisu')}</summary>
      <div className="mt-2">
        <DmxChannelTable mode={{ name: mode.name, channels, map }} />
      </div>
      {channels > 0 && lines !== channels && (
        <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">{tf('Rozpis má {0} riadkov, mód {1} kanálov.', lines, channels)}</p>
      )}
    </details>
  )
}

/** Časť formulára Svetlo: typ, zdroj, výkon, DMX módy, farby, Capture a prevádzkové hodiny. */
export function LightingFields() {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<EquipmentFormValues>()
  // Časť Svetlo sa ukáže pri druhu Svetlo aj pri kategórii, ktorá je o svetlách.
  const dmxModes = useFieldArray({ control, name: 'dmxModes' })
  const modesValue = useWatch({ control, name: 'dmxModes' })
  const [openMaps, setOpenMaps] = useState<string[]>([])
  const captureMatch = useWatch({ control, name: 'captureMatch' })
  const lightType = useWatch({ control, name: 'lightType' })
  const lightSource = useWatch({ control, name: 'lightSource' })
  const powerW = useWatch({ control, name: 'powerW' })
  const dipSwitches = useWatch({ control, name: 'dipSwitches' })
  const lightAccessory = Boolean(lightType && lightType.startsWith('acc_'))
  return (
    <>
      <Group title={tx('Svetlo')}>
        <SelectField label={tx('Typ svetla')} error={errors.lightType?.message} {...register('lightType')}>
          <option value="">{tx('— nezadané —')}</option>
          {LIGHT_TYPE_GROUPS.map((group) => (
            <optgroup key={group.label} label={tx(group.label)}>
              {group.types.map((type) => (
                <option key={type} value={type}>
                  {tx(LIGHT_TYPE_LABELS[type])}
                </option>
              ))}
            </optgroup>
          ))}
        </SelectField>
        {!lightAccessory && (
          <div>
            <Field label={tx('Príkon (W)')} type="number" inputMode="decimal" min={0} placeholder={tx('max. príkon zo štítku / návodu')} error={errors.powerW?.message} {...register('powerW', asOptionalNumber)} />
            {/* Stačí watty zo štítku svetla; prúd pri 230 V sa dopočíta (napr. na rozvádzač a štítok). */}
            <p className="mt-1 text-xs text-muted-foreground">{powerW ? `≈ ${String(ampsAt230(powerW)).replace('.', ',')} A pri 230 V` : tx('Stačí watty – ampéry sa dopočítajú.')}</p>
          </div>
        )}
        {(lightType === 'acc_console' || lightType === 'acc_converter') && (
          <Field
            label={lightType === 'acc_console' ? tx('Verzia softvéru') : tx('Verzia firmvéru')}
            placeholder={lightType === 'acc_console' ? tx('napr. Titan v17.1, grandMA3 2.0') : tx('napr. v2.4')}
            maxLength={60}
            autoComplete="off"
            error={errors.softwareVersion?.message}
            {...register('softwareVersion')}
          />
        )}
        {lightType === 'acc_converter' && <DmxNodeFields />}
        {!lightAccessory && (
          <div className="grid gap-2 sm:grid-cols-2">
            {/* Adresa cez DIP prepínače (staršie a lacnejšie svetlá) – podľa nich appka ukáže, ktoré prepínače zapnúť. */}
            <SelectField label={tx('DMX adresa sa nastavuje')} {...register('dipSwitches', { setValueAs: (value) => (value === '' || value === undefined ? undefined : Number(value)) })}>
              <option value="">{tx('displejom / v menu')}</option>
              {[8, 9, 10, 12].map((count) => (
                <option key={count} value={count}>{tx('DIP prepínačmi (')}{count})
                </option>
              ))}
            </SelectField>
            {dipSwitches ? <Field label={tx('DIP – poznámka')} placeholder={tx('napr. 10. prepínač = mód')} maxLength={80} error={errors.dipNote?.message} {...register('dipNote')} /> : <span />}
          </div>
        )}
        {!lightAccessory && (
          <SelectField label={tx('Zdroj svetla')} error={errors.lightSource?.message} {...register('lightSource')}>
            <option value="">{tx('— neuvedené —')}</option>
            {LIGHT_SOURCES.map((source) => (
              <option key={source} value={source}>
                {tx(LIGHT_SOURCE_LABELS[source])}
              </option>
            ))}
          </SelectField>
        )}
        {!lightAccessory && (
          <label className="flex items-start gap-2 text-sm sm:col-span-2">
            <input type="checkbox" className="mt-0.5 size-4" {...register('externalDimmer')} />
            <span>
              {tx('Stmieva sa externým dimmerom (bez DMX, len 230 V)')}
              <span className="block text-xs text-muted-foreground">{tx('Napríklad halogénový fresnel, PAR alebo blinder. V elektrike eventu sa k nemu odporučí dimmer.')}</span>
            </span>
          </label>
        )}
        {!lightAccessory && (
          <fieldset className="sm:col-span-2">
            <legend className="mb-1.5 text-sm font-medium">{tx('DMX módy')}</legend>
            {dmxModes.fields.length === 0 && <p className="mb-2 text-sm text-muted-foreground">{tx('Napríklad Basic 8 ch, Standard 16 ch, Extended 24 ch.')}</p>}
            <ul className="flex flex-col gap-2">
              {dmxModes.fields.map((field, index) => (
                <li key={field.id} className="flex flex-wrap items-end gap-2">
                  <Field
                    label={tx('Názov módu')}
                    hideLabel={index > 0}
                    placeholder={tx('napr. Standard')}
                    maxLength={40}
                    className="flex-1"
                    error={errors.dmxModes?.[index]?.name?.message}
                    {...register(`dmxModes.${index}.name`)}
                  />
                  <Field
                    label={tx('Kanály')}
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
                  <Button variant="ghost" aria-label={tf('Odobrať mód {0}', index + 1)} onClick={() => dmxModes.remove(index)}>
                    <Trash2 className="size-4" aria-hidden />
                  </Button>
                  {/* Nepovinný rozpis: čo robí ktorý kanál v tomto móde. */}
                  {openMaps.includes(field.id) || (modesValue?.[index]?.map ?? '').trim() ? (
                    <div className="flex basis-full flex-col gap-2">
                      <label className="flex flex-col gap-1 text-sm">
                        <span className="font-medium">{tx('Kanály módu')}{' '}{modesValue?.[index]?.name || index + 1}{' '}{tx('– riadok = kanál')}</span>
                        <span className="text-xs text-muted-foreground">{tx('Za zvislú čiaru môžete dať predvolenú hodnotu, napr. „Pan | 50 %“ alebo „Shutter | Open“. Ikonka sa doplní podľa názvu.')}</span>
                        <textarea
                          rows={Math.min(12, Math.max(4, Number(modesValue?.[index]?.channels) || 4))}
                          placeholder={tx('Pan | 50 %\nPan fine\nTilt | 50 %\nTilt fine\nDimmer | 0 %\nShutter | Open\nColor Wheel\n…')}
                          className="rounded-lg border bg-surface px-3 py-2 font-mono text-sm"
                          {...register(`dmxModes.${index}.map`)}
                        />
                      </label>
                      <MapPreview mode={modesValue?.[index]} />
                    </div>
                  ) : (
                    <button type="button" className="basis-full text-left text-sm text-accent hover:underline" onClick={() => setOpenMaps([...openMaps, field.id])}>{tx('+ Rozpis kanálov (nepovinné) – čo robí ktorý kanál')}</button>
                  )}
                </li>
              ))}
            </ul>
            {errors.dmxModes?.message && (
              <p role="alert" className="mt-1.5 text-sm text-destructive">
                {errors.dmxModes.message}
              </p>
            )}
            <Button variant="outline" size="sm" className="mt-2" onClick={() => dmxModes.append({ name: '', channels: Number.NaN })}>
              <Plus className="size-4" aria-hidden />{tx('Pridať mód')}</Button>
          </fieldset>
        )}
        {!lightAccessory && <LightColorFields />}
        {/* Háky, klemy a iné príslušenstvo nie sú fixtúry – Capture ani „kópia čoho“ pri nich netreba. */}
        {!lightAccessory && (
          <>
            <Field label={tx('Kópia čoho')} placeholder={tx('napr. Robe Spiider, Clay Paky Sharpy')} maxLength={120} error={errors.cloneOf?.message} {...register('cloneOf')} />
            <SelectField label={tx('Sedí s fixtúrou v Capture?')} error={errors.captureMatch?.message} {...register('captureMatch')}>
              <option value="">{tx('— nezistené —')}</option>
              {CAPTURE_MATCHES.map((match) => (
                <option key={match} value={match}>
                  {tx(CAPTURE_MATCH_LABELS[match])}
                </option>
              ))}
            </SelectField>
          </>
        )}
        {(lightSource === 'discharge' || lightSource === 'halogen') && !lightAccessory && (
          <>
            <Field label={lightSource === 'discharge' ? tx('Výbojka naposledy menená') : tx('Žiarovka naposledy menená')} type="date" error={errors.lampChangedOn?.message} {...register('lampChangedOn')} />
            <Field
              label={tx('Stav počítadla pri výmene (h)')}
              type="number"
              inputMode="decimal"
              min={0}
              placeholder={tx('nepovinné')}
              error={errors.lampChangedHours?.message}
              {...register('lampChangedHours', asOptionalNumber)}
            />
          </>
        )}
        {!lightAccessory && captureMatch && captureMatch !== 'yes' && (
          <Field
            label={tx('Prečo nesedí / čo nesedí')}
            className="sm:col-span-2"
            placeholder={tx('napr. iné poradie kanálov, chýba zoom, použiť fixtúru Spiider Mode 2')}
            maxLength={500}
            error={errors.captureNote?.message}
            {...register('captureNote')}
          />
        )}
      </Group>
    </>
  )
}
