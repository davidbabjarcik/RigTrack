import { ExternalLink, Plus, Trash2 } from 'lucide-react'
import { useController, useFieldArray, type Control, type FieldErrors, type UseFormRegister } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Field, SelectField } from '@/components/ui/field'
import { asOptionalNumber, LINK_TAG_LABELS, LINK_TAGS, parseUnitIds, unitRange, type EquipmentFormValues } from './model'

/** Najviac kusov, pri ktorých formulár ukáže dátum nákupu zvlášť. */
const MAX_UNIT_DATES = 200

type Props = {
  control: Control<EquipmentFormValues>
  register: UseFormRegister<EquipmentFormValues>
  errors: FieldErrors<EquipmentFormValues>
  trackUnits: boolean
  unitIdsText: string
  quantity: number
}

/** Dátum nákupu (celá položka aj po kusoch) a odkazy na návody, fixtúry, firmvér. */
export function PurchaseLinksFields({ control, register, errors, trackUnits, unitIdsText, quantity }: Props) {
  const links = useFieldArray({ control, name: 'links' })
  const unitDates = useController({ control, name: 'unitPurchases' })
  const units = trackUnits ? (parseUnitIds(unitIdsText).length > 0 ? parseUnitIds(unitIdsText) : unitRange(Number.isFinite(quantity) ? quantity : 0)) : []
  const dates = unitDates.field.value ?? []
  const dateOf = (unit: number) => dates.find((item) => item.unit === unit)?.date ?? ''
  const setDate = (unit: number, date: string) => unitDates.field.onChange([...dates.filter((item) => item.unit !== unit), { unit, date }])

  return (
    <>
      <fieldset className="rounded-xl border bg-surface p-4">
        <legend className="px-1 text-sm font-medium text-muted-foreground">Nákup (nepovinné)</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Dátum nákupu" type="date" error={errors.purchasedOn?.message} {...register('purchasedOn')} />
          <Field
            label="Nákupná cena za kus (€)"
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            error={errors.purchasePrice?.message}
            {...register('purchasePrice', asOptionalNumber)}
          />
        </div>
        {units.length > 0 && (
          <details className="mt-3">
            <summary className="cursor-pointer text-sm font-medium">Dátum nákupu po kusoch ({dates.filter((item) => item.date && units.includes(item.unit)).length} z {units.length})</summary>
            <p className="mt-1 text-xs text-muted-foreground">Vyplňte len kusy kúpené inokedy; ostatné majú dátum celej položky.</p>
            <ul className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {units.slice(0, MAX_UNIT_DATES).map((unit) => (
                <li key={unit} className="flex items-center gap-2">
                  <span className="w-12 shrink-0 text-sm font-medium">#{unit}</span>
                  <Field label={`Dátum nákupu kusu #${unit}`} hideLabel type="date" className="flex-1" value={dateOf(unit)} onChange={(event) => setDate(unit, event.target.value)} />
                </li>
              ))}
            </ul>
          </details>
        )}
      </fieldset>

      <fieldset className="rounded-xl border bg-surface p-4">
        <legend className="px-1 text-sm font-medium text-muted-foreground">Odkazy – návody, fixtúry (nepovinné)</legend>
        {links.fields.length === 0 && <p className="mb-2 text-sm text-muted-foreground">Napr. návod od výrobcu, fixtúra pre Capture / GDTF, firmvér alebo Google Disk.</p>}
        <ul className="flex flex-col gap-3">
          {links.fields.map((field, index) => (
            <li key={field.id} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[10rem_1fr_1fr_auto] sm:items-end sm:border-0 sm:p-0">
              <SelectField label="Druh" hideLabel={index > 0} {...register(`links.${index}.tag`)}>
                {LINK_TAGS.map((tag) => (
                  <option key={tag} value={tag}>
                    {LINK_TAG_LABELS[tag]}
                  </option>
                ))}
              </SelectField>
              <Field label="Názov" hideLabel={index > 0} placeholder="napr. Návod EN" maxLength={120} error={errors.links?.[index]?.title?.message} {...register(`links.${index}.title`)} />
              <Field label="Odkaz" hideLabel={index > 0} type="url" placeholder="https://…" error={errors.links?.[index]?.url?.message} {...register(`links.${index}.url`)} />
              <Button variant="ghost" aria-label={`Odobrať odkaz ${index + 1}`} onClick={() => links.remove(index)}>
                <Trash2 className="size-4" aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
        {errors.links?.message && (
          <p role="alert" className="mt-1.5 text-sm text-destructive">
            {errors.links.message}
          </p>
        )}
        <Button variant="outline" size="sm" className="mt-2" onClick={() => links.append({ tag: 'manual', title: '', url: '' })}>
          <Plus className="size-4" aria-hidden />
          Pridať odkaz
        </Button>
      </fieldset>
    </>
  )
}

/** Zoznam odkazov v detaile techniky. */
export function EquipmentLinks({ links }: { links: { title: string; url: string; tag: keyof typeof LINK_TAG_LABELS }[] }) {
  if (links.length === 0) return null
  return (
    <ul className="flex flex-col gap-1.5">
      {links.map((link, index) => (
        <li key={index}>
          <a href={link.url} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1.5 text-accent hover:underline">
            <ExternalLink className="size-4 shrink-0" aria-hidden />
            <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-foreground">{LINK_TAG_LABELS[link.tag] ?? link.tag}</span>
            <span className="break-all">{link.title || link.url.replace(/^https?:\/\//, '')}</span>
          </a>
        </li>
      ))}
    </ul>
  )
}
