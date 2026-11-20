import { Camera, Loader2, Plus, Trash2, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { useCompany } from '@/features/companies/company-context'
import { tf, tx } from '@/lib/i18n'
import { Swatch } from './DmxChannelTable'
import { guessColor, NAMED_COLORS } from './dmxChannels'
import type { EquipmentFormValues } from './model'
import { storeCompanyPhoto } from './photo'
import { usePhotoThumbs } from './usePhotoThumbs'

/** Fotka farby alebo obrázok gobo: náhľad, nahratie a odobratie. */
function SlotImage({ path, thumbs, label, onChange }: { path?: string; thumbs: Record<string, string>; label: string; onChange: (path: string) => void }) {
  const companyId = useCompany().active!.companyId
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  const upload = async (file: File) => {
    setBusy(true)
    setFailed(false)
    try {
      onChange(await storeCompanyPhoto(companyId, 'dmx-slot', file, { thumb: true }))
    } catch {
      setFailed(true)
    } finally {
      setBusy(false)
    }
  }
  const url = path ? thumbs[path] : undefined
  return (
    <span className="relative shrink-0">
      <button
        type="button"
        aria-label={path ? tf('{0} – zmeniť obrázok', label) : tf('{0} – nahrať obrázok', label)}
        title={failed ? tx('Obrázok sa nepodarilo nahrať.') : undefined}
        className={`flex size-10 items-center justify-center overflow-hidden rounded-lg border bg-surface text-muted-foreground hover:bg-muted ${failed ? 'border-destructive' : ''}`}
        disabled={busy}
        onClick={() => input.current?.click()}
      >
        {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : url ? <img src={url} alt="" className="size-full object-cover" /> : <Camera className="size-4" aria-hidden />}
      </button>
      {path && !busy && (
        <button
          type="button"
          aria-label={tf('{0} – odobrať obrázok', label)}
          className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full border bg-surface text-muted-foreground hover:text-foreground"
          onClick={() => onChange('')}
        >
          <X className="size-3" aria-hidden />
        </button>
      )}
      <input
        ref={input}
        type="file"
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ''
          if (file) void upload(file)
        }}
      />
    </span>
  )
}

/** Farby na farebnom koliesku: farba z palety alebo fotka, názov a DMX hodnota. */
export function ColorSlotsEditor() {
  const companyId = useCompany().active!.companyId
  const { control, register, setValue, getValues } = useFormContext<EquipmentFormValues>()
  const list = useFieldArray({ control, name: 'wheelColors' })
  const colors = useWatch({ control, name: 'wheelColors' }) ?? []
  const thumbs = usePhotoThumbs(companyId, colors.map((color) => color?.image ?? ''))
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-muted-foreground">{tx('Farby na koliesku: farbu vyberte z palety alebo nahrajte fotku, k nej DMX hodnotu (napr. 10–19).')}</p>
      {list.fields.length > 0 && (
        <ol className="flex flex-col gap-2">
          {list.fields.map((field, index) => (
            <li key={field.id} className="flex items-center gap-2">
              <SlotImage
                path={colors[index]?.image}
                thumbs={thumbs}
                label={tf('Farba {0}', index + 1)}
                onChange={(path) => setValue(`wheelColors.${index}.image`, path || undefined, { shouldDirty: true })}
              />
              <input
                type="color"
                aria-label={tf('Farba {0}', index + 1)}
                className="h-10 w-10 shrink-0 cursor-pointer rounded-lg border bg-surface p-1"
                value={colors[index]?.hex ?? '#ffffff'}
                onChange={(event) => setValue(`wheelColors.${index}.hex`, event.target.value.toLowerCase(), { shouldDirty: true })}
              />
              <input
                aria-label={tf('Názov farby {0}', index + 1)}
                placeholder={tx('napr. Tmavomodrá, CTO')}
                maxLength={40}
                className="h-10 min-w-0 flex-1 rounded-lg border bg-background px-2 text-sm"
                {...register(`wheelColors.${index}.name`, {
                  // Pri písaní názvu sa farba doplní sama, kým ju nikto nezmenil ručne (biela = predvolená).
                  onChange: (event) => {
                    const hex = guessColor(event.target.value)
                    if (hex && getValues(`wheelColors.${index}.hex`) === '#ffffff') setValue(`wheelColors.${index}.hex`, hex, { shouldDirty: true })
                  },
                })}
              />
              <input
                aria-label={tf('DMX hodnota farby {0}', index + 1)}
                placeholder={tx('DMX')}
                maxLength={20}
                className="h-10 w-16 shrink-0 rounded-lg border bg-background px-2 text-sm sm:w-20"
                {...register(`wheelColors.${index}.dmx`)}
              />
              <Button variant="ghost" size="sm" aria-label={tf('Odobrať farbu {0}', index + 1)} onClick={() => list.remove(index)}>
                <Trash2 className="size-4" aria-hidden />
              </Button>
            </li>
          ))}
        </ol>
      )}
      <div className="flex flex-wrap gap-1.5">
        <Button variant="outline" size="sm" onClick={() => list.append({ name: '', hex: '#ffffff', dmx: '' })}>
          <Plus className="size-4" aria-hidden />
          {tx('Pridať farbu')}
        </Button>
        {NAMED_COLORS.map((color) => (
          <button
            key={color.name}
            type="button"
            className="inline-flex h-8 items-center gap-1.5 rounded-full border bg-surface px-2.5 text-xs hover:bg-muted"
            onClick={() => list.append({ name: tx(color.name), hex: color.hex, dmx: '' })}
          >
            <Swatch hex={color.hex} className="size-3" />
            {tx(color.name)}
          </button>
        ))}
      </div>
    </div>
  )
}

/** Gobá na koliesku: obrázok, názov a DMX hodnota. `wheel` oddelí gobá pri svetle s viacerými gobo kolieskami. */
export function GoboSlotsEditor({ wheel, first }: { wheel: string; first: boolean }) {
  const companyId = useCompany().active!.companyId
  const { control, register, setValue } = useFormContext<EquipmentFormValues>()
  const list = useFieldArray({ control, name: 'gobos' })
  const gobos = useWatch({ control, name: 'gobos' }) ?? []
  const thumbs = usePhotoThumbs(companyId, gobos.map((gobo) => gobo?.image ?? ''))
  // Gobá bez kolieska patria prvému gobo kanálu.
  const mine = (index: number) => {
    const owner = gobos[index]?.wheel?.trim()
    return owner ? owner.toLowerCase() === wheel.trim().toLowerCase() : first
  }
  const shown = list.fields.map((field, index) => ({ field, index })).filter(({ index }) => mine(index))
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-muted-foreground">{tx('Gobá na koliesku: nahrajte obrázok (fotka alebo z návodu), pomenujte ho a pridajte DMX hodnotu.')}</p>
      {shown.length > 0 && (
        <ol className="flex flex-col gap-2">
          {shown.map(({ field, index }, order) => (
            <li key={field.id} className="flex items-center gap-2">
              <SlotImage
                path={gobos[index]?.image}
                thumbs={thumbs}
                label={tf('Gobo {0}', order + 1)}
                onChange={(path) => setValue(`gobos.${index}.image`, path || undefined, { shouldDirty: true })}
              />
              <input
                aria-label={tf('Názov gobo {0}', order + 1)}
                placeholder={tx('napr. Hviezda, Bodky')}
                maxLength={40}
                className="h-10 min-w-0 flex-1 rounded-lg border bg-background px-2 text-sm"
                {...register(`gobos.${index}.name`)}
              />
              <input
                aria-label={tf('DMX hodnota gobo {0}', order + 1)}
                placeholder={tx('DMX')}
                maxLength={20}
                className="h-10 w-16 shrink-0 rounded-lg border bg-background px-2 text-sm sm:w-20"
                {...register(`gobos.${index}.dmx`)}
              />
              <Button variant="ghost" size="sm" aria-label={tf('Odobrať gobo {0}', order + 1)} onClick={() => list.remove(index)}>
                <Trash2 className="size-4" aria-hidden />
              </Button>
            </li>
          ))}
        </ol>
      )}
      <Button variant="outline" size="sm" className="self-start" onClick={() => list.append({ name: '', dmx: '', ...(first ? {} : { wheel }) })}>
        <Plus className="size-4" aria-hidden />
        {tx('Pridať gobo')}
      </Button>
    </div>
  )
}
