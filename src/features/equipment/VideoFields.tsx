import { useFormContext, useWatch } from 'react-hook-form'
import { Field, SelectField } from '@/components/ui/field'
import { asOptionalNumber, VIDEO_TYPE_LABELS, VIDEO_TYPES, CAMERA_SENSOR_LABELS, CAMERA_SENSORS, PROCESSOR_CONTROL_LABELS, PROCESSOR_CONTROLS, type EquipmentFormValues } from './model'

/** Časť formulára Video: LED panely, procesory, obrazovky, kamery a statívy. */
export function VideoFields() {
  const {
    register,
    control,
    setValue,
    formState: { errors },
  } = useFormContext<EquipmentFormValues>()
  // Časť Svetlo sa ukáže pri druhu Svetlo aj pri kategórii, ktorá je o svetlách.
  const isLedPanel = useWatch({ control, name: 'isLedPanel' })
  const isLedProcessor = useWatch({ control, name: 'isLedProcessor' })
  const isDisplay = useWatch({ control, name: 'isDisplay' })
  const videoType = useWatch({ control, name: 'videoType' })
  const displayType = useWatch({ control, name: 'displayType' })
  return (
    <>
      <fieldset className="rounded-xl border bg-surface p-4">
        <legend className="px-1 text-sm font-medium text-muted-foreground">Video</legend>
        <SelectField
          label="Typ"
          className="sm:w-72"
          value={isLedPanel ? 'led_panel' : isLedProcessor ? 'led_processor' : isDisplay ? (displayType ?? 'tv') : (videoType ?? '')}
          onChange={(e) => {
            const value = e.target.value
            const opts = { shouldDirty: true }
            setValue('videoType', (VIDEO_TYPES as readonly string[]).includes(value) ? (value as (typeof VIDEO_TYPES)[number]) : '', opts)
            setValue('isLedPanel', value === 'led_panel', opts)
            setValue('isLedProcessor', value === 'led_processor', opts)
            setValue('isDisplay', value === 'tv' || value === 'monitor' || value === 'projector', opts)
            if (value === 'tv' || value === 'monitor' || value === 'projector') setValue('displayType', value, opts)
          }}
        >
          <option value="">— nezadané —</option>
          <option value="led_panel">LED panel</option>
          <option value="led_processor">LED procesor (napr. Novastar)</option>
          <option value="tv">TV</option>
          <option value="monitor">Monitor</option>
          <option value="projector">Projektor</option>
          {VIDEO_TYPES.map((type) => (
            <option key={type} value={type}>
              {VIDEO_TYPE_LABELS[type]}
            </option>
          ))}
        </SelectField>
        {videoType === 'camera' && !isLedPanel && !isLedProcessor && !isDisplay && (
          <div className="mt-3 grid grid-cols-2 items-end gap-3 sm:grid-cols-4">
            <SelectField label="Snímač / typ" {...register('cameraSensor')}>
              <option value="">— nezadané —</option>
              {CAMERA_SENSORS.map((sensor) => (
                <option key={sensor} value={sensor}>
                  {CAMERA_SENSOR_LABELS[sensor]}
                </option>
              ))}
            </SelectField>
            <label className="flex items-center gap-2 pb-3 text-sm">
              <input type="checkbox" className="size-4" {...register('hdmiOut')} />
              Má HDMI výstup
            </label>
          </div>
        )}
        {isLedPanel && (
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Field
              label="Pixel pitch (mm)"
              type="number"
              inputMode="decimal"
              min={0}
              step="0.1"
              placeholder="napr. 3,9"
              error={errors.ledPitchMm?.message}
              {...register('ledPitchMm', asOptionalNumber)}
            />
            <Field label="Šírka (mm) *" type="number" inputMode="decimal" min={1} error={errors.ledWidthMm?.message} {...register('ledWidthMm', asOptionalNumber)} />
            <Field label="Výška (mm) *" type="number" inputMode="decimal" min={1} error={errors.ledHeightMm?.message} {...register('ledHeightMm', asOptionalNumber)} />
            <Field label="Pixely šírka" type="number" inputMode="numeric" min={1} error={errors.ledPxW?.message} {...register('ledPxW', asOptionalNumber)} />
            <Field label="Pixely výška" type="number" inputMode="numeric" min={1} error={errors.ledPxH?.message} {...register('ledPxH', asOptionalNumber)} />
            <Field label="Váha (kg)" type="number" inputMode="decimal" min={0} error={errors.ledWeightKg?.message} {...register('ledWeightKg', asOptionalNumber)} />
            <Field label="Príkon max (W)" type="number" inputMode="decimal" min={0} error={errors.ledMaxW?.message} {...register('ledMaxW', asOptionalNumber)} />
            <Field label="Príkon priemer (W)" type="number" inputMode="decimal" min={0} error={errors.ledAvgW?.message} {...register('ledAvgW', asOptionalNumber)} />
            <p className="col-span-2 self-end text-xs text-muted-foreground sm:col-span-4">Pixely sa dopočítajú z rozmeru a pitchu, ak ich nevyplníte. Počet kusov = koľko panelov máme.</p>
          </div>
        )}
        {isDisplay && (
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
            <Field label="Rozlíšenie šírka (px)" type="number" inputMode="numeric" placeholder="1920" error={errors.displayResW?.message} {...register('displayResW', asOptionalNumber)} />
            <Field label="Rozlíšenie výška (px)" type="number" inputMode="numeric" placeholder="1080" error={errors.displayResH?.message} {...register('displayResH', asOptionalNumber)} />
            <Field label="Uhlopriečka (palce)" type="number" inputMode="decimal" placeholder="55" error={errors.displayDiagonalIn?.message} {...register('displayDiagonalIn', asOptionalNumber)} />
            {displayType === 'projector' && (
              <Field label="Svietivosť (lm)" type="number" inputMode="numeric" placeholder="10000" error={errors.displayLumens?.message} {...register('displayLumens', asOptionalNumber)} />
            )}
          </div>
        )}
        {isLedProcessor && (
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
            <Field label="Výstupy (CH) *" type="number" inputMode="numeric" min={1} placeholder="napr. 4" error={errors.procOutputs?.message} {...register('procOutputs', asOptionalNumber)} />
            <Field label="Čip / platforma" placeholder="napr. Novastar, Linsn" maxLength={60} error={errors.procChip?.message} {...register('procChip')} />
            <SelectField label="Ovládanie" error={errors.procControl?.message} {...register('procControl')}>
              <option value="">— neuvedené —</option>
              {PROCESSOR_CONTROLS.map((control) => (
                <option key={control} value={control}>
                  {PROCESSOR_CONTROL_LABELS[control]}
                </option>
              ))}
            </SelectField>
            <Field label="HDMI (ks)" type="number" inputMode="numeric" min={0} {...register('procHdmi', asOptionalNumber)} />
            <Field label="DVI (ks)" type="number" inputMode="numeric" min={0} {...register('procDvi', asOptionalNumber)} />
            <Field label="SDI (ks)" type="number" inputMode="numeric" min={0} {...register('procSdi', asOptionalNumber)} />
            <Field label="DisplayPort (ks)" type="number" inputMode="numeric" min={0} {...register('procDp', asOptionalNumber)} />
            <Field label="VGA (ks)" type="number" inputMode="numeric" min={0} {...register('procVga', asOptionalNumber)} />
            <Field label="Pixelov na výstup" type="number" inputMode="numeric" placeholder="650000" error={errors.procPixels?.message} {...register('procPixels', asOptionalNumber)} />
            <Field label="Vstup šírka (px)" type="number" inputMode="numeric" placeholder="1920" error={errors.procInputW?.message} {...register('procInputW', asOptionalNumber)} />
            <Field label="Vstup výška (px)" type="number" inputMode="numeric" placeholder="1080" error={errors.procInputH?.message} {...register('procInputH', asOptionalNumber)} />
          </div>
        )}
      </fieldset>
    </>
  )
}
