import { ExternalLink, Plus, Trash2 } from 'lucide-react'
import { useFieldArray, type Control, type FieldErrors, type UseFormRegister } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Field, SelectField } from '@/components/ui/field'
import { asOptionalNumber, LINK_TAG_LABELS, LINK_TAGS, type EquipmentFormValues } from './model'

type Props = {
  control: Control<EquipmentFormValues>
  register: UseFormRegister<EquipmentFormValues>
  errors: FieldErrors<EquipmentFormValues>
  /** Evidencia po kusoch: dátum nákupu je pri kusoch, tu ostáva len cena. */
  perUnit?: boolean
}

/** Dátum a cena nákupu a odkazy na návody, fixtúry, firmvér. */
export function PurchaseLinksFields({ control, register, errors, perUnit = false }: Props) {
  const links = useFieldArray({ control, name: 'links' })
  return (
    <>
      <fieldset className="rounded-xl border bg-surface p-4">
        <legend className="px-1 text-sm font-medium text-muted-foreground">Nákup (nepovinné)</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {!perUnit && <Field label="Dátum nákupu" type="date" error={errors.purchasedOn?.message} {...register('purchasedOn')} />}
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
