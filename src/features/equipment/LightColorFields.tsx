import { Plus, Trash2, Wand2 } from 'lucide-react'
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { tf, tx } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { Swatch } from './DmxChannelTable'
import { COLOR_PART_HEX, COLOR_PART_LABELS, COLOR_PARTS, colorMixName, colorsFromChannels, guessColor, NAMED_COLORS, type ColorPart } from './dmxChannels'
import { asOptionalNumber, type EquipmentFormValues } from './model'

/** Farby svetla: zložky miešania (RGBW, CMY…) a farebné koliesko s počtom a názvami farieb. */
export function LightColorFields() {
  const {
    register,
    control,
    setValue,
    getValues,
    formState: { errors },
  } = useFormContext<EquipmentFormValues>()
  const parts = useWatch({ control, name: 'colorParts' }) ?? []
  const wheelOn = useWatch({ control, name: 'colorWheel' })
  const colors = useWatch({ control, name: 'wheelColors' }) ?? []
  const modes = useWatch({ control, name: 'dmxModes' }) ?? []
  const wheel = useFieldArray({ control, name: 'wheelColors' })
  const guess = colorsFromChannels(modes)
  const canGuess = guess.parts.length > 0 || guess.wheel

  const togglePart = (part: ColorPart) => {
    const next = parts.includes(part) ? parts.filter((item) => item !== part) : [...parts, part]
    setValue('colorParts', COLOR_PARTS.filter((item) => next.includes(item)), { shouldDirty: true })
  }
  const applyGuess = () => {
    if (guess.parts.length > 0) setValue('colorParts', guess.parts, { shouldDirty: true })
    if (guess.wheel) setValue('colorWheel', true, { shouldDirty: true })
  }

  return (
    <fieldset className="sm:col-span-2">
      <legend className="mb-1.5 text-sm font-medium">{tx('Farby')}</legend>
      <p className="mb-2 text-xs text-muted-foreground">{tx('Z čoho svetlo mieša farby (napr. RGBW) a či má farebné koliesko. Svetlo môže mať oboje.')}</p>
      <div role="group" aria-label={tx('Miešanie farieb')} className="flex flex-wrap gap-2">
        {COLOR_PARTS.map((part) => {
          const on = parts.includes(part)
          return (
            <button
              key={part}
              type="button"
              aria-pressed={on}
              title={tx(COLOR_PART_LABELS[part])}
              onClick={() => togglePart(part)}
              className={cn('inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-sm', on ? 'border-accent bg-accent/10 font-medium' : 'bg-surface text-muted-foreground hover:bg-muted')}
            >
              <Swatch hex={COLOR_PART_HEX[part]} className="size-3" />
              {part}
            </button>
          )
        })}
      </div>
      <p className="mt-1.5 text-sm text-muted-foreground">
        {parts.length > 0 ? tf('Miešanie: {0}', colorMixName(parts)) : tx('Bez miešania farieb')}
        {canGuess && (
          <button type="button" className="ml-2 inline-flex items-center gap-1 text-accent hover:underline" onClick={applyGuess}>
            <Wand2 className="size-3.5" aria-hidden />{tx('Doplniť podľa DMX kanálov')}</button>
        )}
      </p>

      <label className="mt-3 flex items-center gap-2 text-sm">
        <input type="checkbox" className="size-4" {...register('colorWheel')} />
        {tx('Má farebné koliesko')}
      </label>
      {wheelOn && (
        <div className="mt-2 rounded-xl border bg-muted/30 p-3">
          <Field
            label={tx('Koľko farieb je na koliesku')}
            type="number"
            inputMode="numeric"
            min={1}
            max={60}
            className="w-56"
            placeholder={colors.length ? String(colors.length) : tx('napr. 8')}
            error={errors.wheelSlots?.message}
            {...register('wheelSlots', asOptionalNumber)}
          />
          <p className="mt-3 mb-1.5 text-sm font-medium">{tx('Farby na koliesku (nepovinné)')}</p>
          {wheel.fields.length > 0 && (
            <ol className="flex flex-col gap-2">
              {wheel.fields.map((field, index) => (
                <li key={field.id} className="flex items-start gap-2">
                  <span className="mt-2.5 w-6 shrink-0 text-right font-mono text-sm text-muted-foreground tabular-nums">{index + 1}</span>
                  <input
                    type="color"
                    aria-label={tf('Farba {0}', index + 1)}
                    className="h-10 w-12 shrink-0 cursor-pointer rounded-lg border bg-surface p-1"
                    value={colors[index]?.hex ?? '#ffffff'}
                    onChange={(event) => setValue(`wheelColors.${index}.hex`, event.target.value.toLowerCase(), { shouldDirty: true })}
                  />
                  <Field
                    label={tf('Názov farby {0}', index + 1)}
                    hideLabel
                    placeholder={tx('napr. Tmavomodrá, CTO, Congo blue')}
                    maxLength={40}
                    className="min-w-0 flex-1"
                    error={errors.wheelColors?.[index]?.name?.message}
                    {...register(`wheelColors.${index}.name`, {
                      // Pri písaní názvu sa farba doplní sama, kým ju nikto nezmenil ručne (biela = predvolená).
                      onChange: (event) => {
                        const hex = guessColor(event.target.value)
                        if (hex && getValues(`wheelColors.${index}.hex`) === '#ffffff') setValue(`wheelColors.${index}.hex`, hex, { shouldDirty: true })
                      },
                    })}
                  />
                  <Button variant="ghost" aria-label={tf('Odobrať farbu {0}', index + 1)} onClick={() => wheel.remove(index)}>
                    <Trash2 className="size-4" aria-hidden />
                  </Button>
                </li>
              ))}
            </ol>
          )}
          {errors.wheelColors?.message && <p role="alert" className="mt-1 text-sm text-destructive">{errors.wheelColors.message}</p>}
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Button variant="outline" size="sm" onClick={() => wheel.append({ name: '', hex: '#ffffff' })}>
              <Plus className="size-4" aria-hidden />{tx('Pridať farbu')}</Button>
            {NAMED_COLORS.map((color) => (
              <button
                key={color.name}
                type="button"
                className="inline-flex h-8 items-center gap-1.5 rounded-full border bg-surface px-2.5 text-xs hover:bg-muted"
                onClick={() => wheel.append({ name: tx(color.name), hex: color.hex })}
              >
                <Swatch hex={color.hex} className="size-3" />
                {tx(color.name)}
              </button>
            ))}
          </div>
        </div>
      )}
    </fieldset>
  )
}
