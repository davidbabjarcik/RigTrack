import { Plus } from 'lucide-react'
import { useFormContext, useWatch } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { Field, SelectField } from '@/components/ui/field'
import { useCapsules } from '@/features/capsules/api'
import { cn } from '@/lib/utils'
import { asOptionalNumber, AUDIO_TYPE_LABELS, AUDIO_TYPES, PA_TYPES, STAND_TYPES, SUB_DESIGN_LABELS, hasBox, isAudio, type EquipmentFormValues } from './model'
import { AmpPresetsFields } from './AmpPresetsFields'
import { Group } from './FormGroup'

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
      <Group title="Zvuk">
        <SelectField label="Typ" error={errors.audioType?.message} {...register('audioType')}>
          <option value="">— nezadané —</option>
          <optgroup label="PA">
            {PA_TYPES.map((type) => (
              <option key={type} value={type}>
                {AUDIO_TYPE_LABELS[type]}
              </option>
            ))}
          </optgroup>
          <optgroup label="Stojany">
            {STAND_TYPES.map((type) => (
              <option key={type} value={type}>
                {AUDIO_TYPE_LABELS[type]}
              </option>
            ))}
          </optgroup>
          <optgroup label="Mikrofóny a ostatné">
            {AUDIO_TYPES.filter((type) => !(PA_TYPES as readonly string[]).includes(type) && !(STAND_TYPES as readonly string[]).includes(type) && (type !== 'di' || audioType === 'di')).map(
              (type) => (
                <option key={type} value={type}>
                  {AUDIO_TYPE_LABELS[type]}
                </option>
              ),
            )}
          </optgroup>
        </SelectField>
        {(audioType === 'amplifier' || audioType === 'processor' || (hasBox(audioType) && powered === 'active')) && (
          <Field label="Príkon zo siete (W)" type="number" inputMode="decimal" min={0} error={errors.powerW?.message} {...register('powerW', asOptionalNumber)} />
        )}
        {audioType === 'amplifier' && (
          <>
            <Field label="Výkon 2 Ω na kanál (W)" type="number" inputMode="numeric" min={0} placeholder="napr. 1800" error={errors.ampW2?.message} {...register('ampW2', asOptionalNumber)} />
            <Field label="Výkon 4 Ω na kanál (W)" type="number" inputMode="numeric" min={0} placeholder="napr. 2000" error={errors.ampW4?.message} {...register('ampW4', asOptionalNumber)} />
            <Field label="Výkon 8 Ω na kanál (W)" type="number" inputMode="numeric" min={0} placeholder="napr. 1250" error={errors.ampW8?.message} {...register('ampW8', asOptionalNumber)} />
            <Field label="Bridge 4 Ω (W)" type="number" inputMode="numeric" min={0} placeholder="napr. 3600" error={errors.ampBridge4?.message} {...register('ampBridge4', asOptionalNumber)} />
            <Field label="Bridge 8 Ω (W)" type="number" inputMode="numeric" min={0} placeholder="napr. 4000" error={errors.ampBridge8?.message} {...register('ampBridge8', asOptionalNumber)} />
            <Field label="Krajina výroby" placeholder="napr. Kórea, Čína" maxLength={60} {...register('madeIn')} />
            <SelectField label="Zosilňovač" {...register('ampKind')}>
              <option value="">— nezadané —</option>
              <option value="analog">Analógový</option>
              <option value="digital">Digitálny (DSP, presety)</option>
            </SelectField>
            {ampKind === 'digital' && <AmpPresetsFields companyId={companyId} />}
          </>
        )}
        {audioType === 'mixer' && (
          <>
            <SelectField label="Mixpult" error={errors.mixerKind?.message} {...register('mixerKind')}>
              <option value="">— nezadané —</option>
              <option value="analog">Analógový</option>
              <option value="digital">Digitálny</option>
            </SelectField>
            <Field label="Počet kanálov" type="number" inputMode="numeric" min={1} placeholder="napr. 32" error={errors.mixerChannels?.message} {...register('mixerChannels', asOptionalNumber)} />
            {mixerKind === 'digital' && <Field label="Karta" placeholder="napr. Dante, MADI, USB, AES50" maxLength={80} error={errors.mixerCard?.message} {...register('mixerCard')} />}
          </>
        )}
        {(audioType === 'wireless' || audioType === 'iem') && <Field label="Frekvenčný rozsah" placeholder="napr. G51 470–534 MHz" maxLength={60} {...register('rfRange')} />}
        {audioType === 'stagebox' && <Field label="Karta / protokol" placeholder="napr. Dante, AES50, MADI" maxLength={80} {...register('mixerCard')} />}
        {audioType === 'microphone' && (
          <>
            <SelectField label="Mikrofón" error={errors.micKind?.message} {...register('micKind')}>
              <option value="">— nezadané —</option>
              <option value="wired">Káblový</option>
              <option value="wireless">Bezdrôtový</option>
            </SelectField>
            <SelectField label="Typ mikrofónu" error={errors.micType?.message} {...register('micType')}>
              <option value="">— nezadané —</option>
              <option value="dynamic">Dynamický</option>
              <option value="condenser">Kondenzátorový (phantom 48 V)</option>
            </SelectField>
          </>
        )}
        {wirelessMic && (
          <fieldset className="sm:col-span-2">
            <legend className="mb-1.5 text-sm font-medium">Kapsule, ktoré pasujú</legend>
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
                <Plus className="size-4" aria-hidden />
                Nová kapsula
              </Link>
            </div>
            {capsules.isError && <p className="mt-1 text-xs text-muted-foreground">Kapsule sa nedajú načítať (migrácia 0060).</p>}
          </fieldset>
        )}
        {hasBox(audioType) && (
          <fieldset className="grid grid-cols-2 items-end gap-3 sm:col-span-2 sm:grid-cols-4">
            <legend className="mb-1 text-sm font-medium">{AUDIO_TYPE_LABELS[audioType as keyof typeof AUDIO_TYPE_LABELS]}</legend>
            <SelectField label="Aktívny / pasívny" {...register('powered')}>
              <option value="">—</option>
              <option value="active">Aktívny</option>
              <option value="passive">Pasívny</option>
            </SelectField>
            {audioType === 'subwoofer' && (
              <SelectField label="Konštrukcia" {...register('subDesign')}>
                <option value="">—</option>
                {(Object.keys(SUB_DESIGN_LABELS) as (keyof typeof SUB_DESIGN_LABELS)[]).map((design) => (
                  <option key={design} value={design}>
                    {SUB_DESIGN_LABELS[design]}
                  </option>
                ))}
              </SelectField>
            )}
            <Field label="Výkon continuous / RMS (W)" type="number" inputMode="decimal" min={0} error={errors.rmsW?.message} {...register('rmsW', asOptionalNumber)} />
            <Field label="Výkon program (W)" type="number" inputMode="decimal" min={0} error={errors.programW?.message} {...register('programW', asOptionalNumber)} />
            <Field label="Výkon peak (W)" type="number" inputMode="decimal" min={0} error={errors.peakW?.message} {...register('peakW', asOptionalNumber)} />
            <Field label="Impedancia (Ω)" type="number" inputMode="decimal" min={0} placeholder="8" error={errors.impedanceOhm?.message} {...register('impedanceOhm', asOptionalNumber)} />
            <Field label="LF driver (woofer)" placeholder={audioType === 'subwoofer' ? 'napr. 2× 18″' : 'napr. 1× 15″ JBL 2265H'} maxLength={40} {...register('woofer')} />
            {audioType !== 'subwoofer' && <Field label="HF driver" placeholder="napr. JBL 2452H, 1,5″ výstup" maxLength={80} {...register('hfDriver')} />}
            <Field label="Max SPL continuous (dB)" type="number" inputMode="decimal" min={0} error={errors.maxSplDb?.message} {...register('maxSplDb', asOptionalNumber)} />
            <Field label="Max SPL peak (dB)" type="number" inputMode="decimal" min={0} error={errors.maxSplPeakDb?.message} {...register('maxSplPeakDb', asOptionalNumber)} />
            <Field label="Citlivosť 1 W / 1 m (dB)" type="number" inputMode="decimal" min={0} error={errors.sensitivityDb?.message} {...register('sensitivityDb', asOptionalNumber)} />
            <Field label="Frekvenčný rozsah (−10 dB)" placeholder="napr. 60 Hz – 20 kHz" maxLength={40} {...register('freqRange')} />
            <Field label="Frekvenčná odozva (±3 dB)" placeholder="napr. 70 Hz – 20 kHz" maxLength={40} {...register('freqResponse')} />
            {audioType !== 'subwoofer' && <Field label="Vyžarovací uhol" placeholder="napr. 50° × 90°" maxLength={40} {...register('coverage')} />}
            <Field label="Výhybka" placeholder="napr. 1,1 kHz" maxLength={40} {...register('crossover')} />
            <label className="flex items-end gap-2 pb-3 text-sm">
              <input type="checkbox" className="size-4" {...register('biamp')} />
              Dá sa na bi-amp
            </label>
            <Field label="Konektory" placeholder="napr. XLR, speakON NL4, powerCON" maxLength={80} {...register('connectors')} />
            <label className="flex items-end gap-2 pb-3 text-sm">
              <input type="checkbox" className="size-4" {...register('poleMount')} />
              Hniezdo na stojan (35 mm)
            </label>
          </fieldset>
        )}
        {hasBox(audioType) && (
          <fieldset className="sm:col-span-2">
            <legend className="mb-1 text-sm font-medium">Rozmery boxu (cm)</legend>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Šírka" type="number" inputMode="decimal" min={0} error={errors.boxWidthCm?.message} {...register('boxWidthCm', asOptionalNumber)} />
              <Field label="Hĺbka" type="number" inputMode="decimal" min={0} error={errors.boxDepthCm?.message} {...register('boxDepthCm', asOptionalNumber)} />
              <Field label="Výška" type="number" inputMode="decimal" min={0} error={errors.boxHeightCm?.message} {...register('boxHeightCm', asOptionalNumber)} />
            </div>
            {audioType === 'subwoofer' && (
              <Field
                label="Vlastný delay subu (ms)"
                className="mt-3 sm:w-64"
                type="number"
                inputMode="decimal"
                min={0}
                step="0.1"
                placeholder="napr. hornový / slimák"
                error={errors.subDelayMs?.message}
                {...register('subDelayMs', asOptionalNumber)}
              />
            )}
            <p className="mt-1 text-xs text-muted-foreground">Použije sa v delay kalkulačke (rozostup subov, cardioid, šírka radu).</p>
          </fieldset>
        )}
      </Group>
    </>
  )
}
