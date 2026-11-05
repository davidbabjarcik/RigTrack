import { Plus } from 'lucide-react'
import { useFormContext, useWatch } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { Field, SelectField } from '@/components/ui/field'
import { useCapsules } from '@/features/capsules/api'
import { cn } from '@/lib/utils'
import { asOptionalNumber, AUDIO_TYPE_LABELS, AUDIO_TYPES, PA_TYPES, STAND_TYPES, SUB_DESIGN_LABELS, hasBox, isAudio, type EquipmentFormValues } from './model'
import { AmpPresetsFields } from './AmpPresetsFields'
import { Group } from './FormGroup'
import { TransmittersFields, WirelessSuggestion } from './TransmittersFields'
import { tx } from '@/lib/i18n'

/** Časť formulára Zvuk: typ, reproboxy a suby, pulty, mikrofóny a kapsule, zosilňovače. */
export function AudioFields({ companyId }: { companyId: string }) {
  const {
    register,
    control,
    setValue,
    formState: { errors },
  } = useFormContext<EquipmentFormValues>()
  const kind = useWatch({ control, name: 'kind' })
  const categoryText = useWatch({ control, name: 'category' })
  // Časť Svetlo sa ukáže pri druhu Svetlo aj pri kategórii, ktorá je o svetlách.
  const audio = isAudio(kind, categoryText ?? '')
  const ampKind = useWatch({ control, name: 'ampKind' })
  const audioType = useWatch({ control, name: 'audioType' })
  const powered = useWatch({ control, name: 'powered' })
  const mixerKind = useWatch({ control, name: 'mixerKind' })
  const micKind = useWatch({ control, name: 'micKind' })
  const capsuleIds = useWatch({ control, name: 'capsuleIds' }) ?? []
  const capsules = useCapsules(companyId)
  const wirelessMic = audio && (audioType === 'wireless' || (audioType === 'microphone' && micKind === 'wireless'))
  return (
    <>
      <Group title={tx('Zvuk')}>
        <SelectField label={tx('Typ')} error={errors.audioType?.message} {...register('audioType')}>
          <option value="">{tx('— nezadané —')}</option>
          <optgroup label={tx('PA')}>
            {PA_TYPES.map((type) => (
              <option key={type} value={type}>
                {tx(AUDIO_TYPE_LABELS[type])}
              </option>
            ))}
          </optgroup>
          <optgroup label={tx('Stojany')}>
            {STAND_TYPES.map((type) => (
              <option key={type} value={type}>
                {tx(AUDIO_TYPE_LABELS[type])}
              </option>
            ))}
          </optgroup>
          <optgroup label={tx('Mikrofóny a ostatné')}>
            {AUDIO_TYPES.filter((type) => !(PA_TYPES as readonly string[]).includes(type) && !(STAND_TYPES as readonly string[]).includes(type) && (type !== 'di' || audioType === 'di')).map(
              (type) => (
                <option key={type} value={type}>
                  {tx(AUDIO_TYPE_LABELS[type])}
                </option>
              ),
            )}
          </optgroup>
        </SelectField>
        {(audioType === 'amplifier' || audioType === 'processor' || (hasBox(audioType) && powered === 'active')) && (
          <Field label={tx('Príkon zo siete (W)')} type="number" inputMode="decimal" min={0} error={errors.powerW?.message} {...register('powerW', asOptionalNumber)} />
        )}
        {audioType === 'amplifier' && (
          <>
            <Field label={tx('Výkon 2 Ω na kanál (W)')} type="number" inputMode="numeric" min={0} placeholder={tx('napr. 1800')} error={errors.ampW2?.message} {...register('ampW2', asOptionalNumber)} />
            <Field label={tx('Výkon 4 Ω na kanál (W)')} type="number" inputMode="numeric" min={0} placeholder={tx('napr. 2000')} error={errors.ampW4?.message} {...register('ampW4', asOptionalNumber)} />
            <Field label={tx('Výkon 8 Ω na kanál (W)')} type="number" inputMode="numeric" min={0} placeholder={tx('napr. 1250')} error={errors.ampW8?.message} {...register('ampW8', asOptionalNumber)} />
            <Field label={tx('Bridge 4 Ω (W)')} type="number" inputMode="numeric" min={0} placeholder={tx('napr. 3600')} error={errors.ampBridge4?.message} {...register('ampBridge4', asOptionalNumber)} />
            <Field label={tx('Bridge 8 Ω (W)')} type="number" inputMode="numeric" min={0} placeholder={tx('napr. 4000')} error={errors.ampBridge8?.message} {...register('ampBridge8', asOptionalNumber)} />
            <Field label={tx('Krajina výroby')} placeholder={tx('napr. Kórea, Čína')} maxLength={60} {...register('madeIn')} />
            <SelectField label={tx('Zosilňovač')} {...register('ampKind')}>
              <option value="">{tx('— nezadané —')}</option>
              <option value="analog">{tx('Analógový')}</option>
              <option value="digital">{tx('Digitálny (DSP, presety)')}</option>
            </SelectField>
            {ampKind === 'digital' && <AmpPresetsFields companyId={companyId} />}
          </>
        )}
        {audioType === 'mixer' && (
          <>
            <SelectField label={tx('Mixpult')} error={errors.mixerKind?.message} {...register('mixerKind')}>
              <option value="">{tx('— nezadané —')}</option>
              <option value="analog">{tx('Analógový')}</option>
              <option value="digital">{tx('Digitálny')}</option>
            </SelectField>
            <Field label={tx('Počet kanálov')} type="number" inputMode="numeric" min={1} placeholder={tx('napr. 32')} error={errors.mixerChannels?.message} {...register('mixerChannels', asOptionalNumber)} />
            {mixerKind === 'digital' && <Field label={tx('Karta')} placeholder={tx('napr. Dante, MADI, USB, AES50')} maxLength={80} error={errors.mixerCard?.message} {...register('mixerCard')} />}
          </>
        )}
        {(audioType === 'wireless' || audioType === 'iem') && <Field label={tx('Frekvenčný rozsah')} placeholder={tx('napr. G51 470–534 MHz')} maxLength={60} {...register('rfRange')} />}
        {audioType === 'wireless' && (
          <>
            <Field label={tx('Prijímač (model)')} placeholder={tx('napr. MRK960')} maxLength={60} {...register('wirelessRx')} />
            <TransmittersFields />
            <WirelessSuggestion />
          </>
        )}
        {audioType === 'stagebox' && <Field label={tx('Karta / protokol')} placeholder={tx('napr. Dante, AES50, MADI')} maxLength={80} {...register('mixerCard')} />}
        {audioType === 'microphone' && (
          <>
            <SelectField label={tx('Mikrofón')} error={errors.micKind?.message} {...register('micKind')}>
              <option value="">{tx('— nezadané —')}</option>
              <option value="wired">{tx('Káblový')}</option>
              <option value="wireless">{tx('Bezdrôtový')}</option>
            </SelectField>
            <SelectField label={tx('Typ mikrofónu')} error={errors.micType?.message} {...register('micType')}>
              <option value="">{tx('— nezadané —')}</option>
              <option value="dynamic">{tx('Dynamický')}</option>
              <option value="condenser">{tx('Kondenzátorový (phantom 48 V)')}</option>
            </SelectField>
          </>
        )}
        {wirelessMic && (
          <fieldset className="sm:col-span-2">
            <legend className="mb-1.5 text-sm font-medium">{tx('Kapsule, ktoré pasujú')}</legend>
            <div className="flex flex-wrap gap-2">
              {(capsules.data ?? []).map((capsule) => {
                const on = capsuleIds.includes(capsule.id)
                return (
                  <button
                    key={capsule.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setValue('capsuleIds', on ? capsuleIds.filter((id) => id !== capsule.id) : [...capsuleIds, capsule.id], { shouldDirty: true })}
                    className={cn('h-9 rounded-lg border px-3 text-sm font-medium', on ? 'bg-primary text-primary-foreground' : 'bg-surface hover:bg-muted')}
                  >
                    {[capsule.manufacturer, capsule.name].filter(Boolean).join(' ')}
                  </button>
                )
              })}
              <Link to="/equipment/capsules?new=1" target="_blank" className="inline-flex h-9 items-center gap-1 rounded-lg border border-dashed px-3 text-sm text-accent hover:bg-muted">
                <Plus className="size-4" aria-hidden />{tx('Nová kapsula')}</Link>
            </div>
            {capsules.isError && <p className="mt-1 text-xs text-muted-foreground">{tx('Kapsule sa nedajú načítať (migrácia 0060).')}</p>}
          </fieldset>
        )}
        {hasBox(audioType) && (
          <fieldset className="grid grid-cols-2 items-end gap-3 sm:col-span-2 sm:grid-cols-4">
            <legend className="mb-1 text-sm font-medium">{tx(AUDIO_TYPE_LABELS[audioType as keyof typeof AUDIO_TYPE_LABELS])}</legend>
            <SelectField label={tx('Aktívny / pasívny')} {...register('powered')}>
              <option value="">—</option>
              <option value="active">{tx('Aktívny')}</option>
              <option value="passive">{tx('Pasívny')}</option>
            </SelectField>
            {audioType === 'subwoofer' && (
              <SelectField label={tx('Konštrukcia')} {...register('subDesign')}>
                <option value="">—</option>
                {(Object.keys(SUB_DESIGN_LABELS) as (keyof typeof SUB_DESIGN_LABELS)[]).map((design) => (
                  <option key={design} value={design}>
                    {tx(SUB_DESIGN_LABELS[design])}
                  </option>
                ))}
              </SelectField>
            )}
            <Field label={tx('Výkon continuous / RMS (W)')} type="number" inputMode="decimal" min={0} error={errors.rmsW?.message} {...register('rmsW', asOptionalNumber)} />
            <Field label={tx('Výkon program (W)')} type="number" inputMode="decimal" min={0} error={errors.programW?.message} {...register('programW', asOptionalNumber)} />
            <Field label={tx('Výkon peak (W)')} type="number" inputMode="decimal" min={0} error={errors.peakW?.message} {...register('peakW', asOptionalNumber)} />
            <Field label={tx('Impedancia (Ω)')} type="number" inputMode="decimal" min={0} placeholder="8" error={errors.impedanceOhm?.message} {...register('impedanceOhm', asOptionalNumber)} />
            <Field label={tx('LF driver (woofer)')} placeholder={audioType === 'subwoofer' ? tx('napr. 2× 18″') : tx('napr. 1× 15″ JBL 2265H')} maxLength={40} {...register('woofer')} />
            {audioType !== 'subwoofer' && <Field label={tx('HF driver')} placeholder={tx('napr. JBL 2452H, 1,5″ výstup')} maxLength={80} {...register('hfDriver')} />}
            <Field label={tx('Max SPL continuous (dB)')} type="number" inputMode="decimal" min={0} error={errors.maxSplDb?.message} {...register('maxSplDb', asOptionalNumber)} />
            <Field label={tx('Max SPL peak (dB)')} type="number" inputMode="decimal" min={0} error={errors.maxSplPeakDb?.message} {...register('maxSplPeakDb', asOptionalNumber)} />
            <Field label={tx('Citlivosť 1 W / 1 m (dB)')} type="number" inputMode="decimal" min={0} error={errors.sensitivityDb?.message} {...register('sensitivityDb', asOptionalNumber)} />
            <Field label={tx('Frekvenčný rozsah (−10 dB)')} placeholder={tx('napr. 60 Hz – 20 kHz')} maxLength={40} {...register('freqRange')} />
            <Field label={tx('Frekvenčná odozva (±3 dB)')} placeholder={tx('napr. 70 Hz – 20 kHz')} maxLength={40} {...register('freqResponse')} />
            {audioType !== 'subwoofer' && <Field label={tx('Vyžarovací uhol')} placeholder={tx('napr. 50° × 90°')} maxLength={40} {...register('coverage')} />}
            <Field label={tx('Výhybka')} placeholder={tx('napr. 1,1 kHz')} maxLength={40} {...register('crossover')} />
            <label className="flex items-end gap-2 pb-3 text-sm">
              <input type="checkbox" className="size-4" {...register('biamp')} />{tx('Dá sa na bi-amp')}</label>
            <Field label={tx('Konektory')} placeholder={tx('napr. XLR, speakON NL4, powerCON')} maxLength={80} {...register('connectors')} />
            <label className="flex items-end gap-2 pb-3 text-sm">
              <input type="checkbox" className="size-4" {...register('poleMount')} />{tx('Hniezdo na stojan (35 mm)')}</label>
          </fieldset>
        )}
        {hasBox(audioType) && (
          <fieldset className="sm:col-span-2">
            <legend className="mb-1 text-sm font-medium">{tx('Rozmery boxu (cm)')}</legend>
            <div className="grid grid-cols-3 gap-3">
              <Field label={tx('Šírka')} type="number" inputMode="decimal" min={0} error={errors.boxWidthCm?.message} {...register('boxWidthCm', asOptionalNumber)} />
              <Field label={tx('Hĺbka')} type="number" inputMode="decimal" min={0} error={errors.boxDepthCm?.message} {...register('boxDepthCm', asOptionalNumber)} />
              <Field label={tx('Výška')} type="number" inputMode="decimal" min={0} error={errors.boxHeightCm?.message} {...register('boxHeightCm', asOptionalNumber)} />
            </div>
            {audioType === 'subwoofer' && (
              <Field
                label={tx('Vlastný delay subu (ms)')}
                className="mt-3 sm:w-64"
                type="number"
                inputMode="decimal"
                min={0}
                step="0.1"
                placeholder={tx('napr. hornový / slimák')}
                error={errors.subDelayMs?.message}
                {...register('subDelayMs', asOptionalNumber)}
              />
            )}
            <p className="mt-1 text-xs text-muted-foreground">{tx('Použije sa v delay kalkulačke (rozostup subov, cardioid, šírka radu).')}</p>
          </fieldset>
        )}
      </Group>
    </>
  )
}
