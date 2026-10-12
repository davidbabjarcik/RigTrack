import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2 } from 'lucide-react'
import { useId, useState } from 'react'
import { useFieldArray, useForm, useWatch } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { ErrorBlock, LoadingBlock } from '@/components/feedback/QueryState'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button, LinkButton } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { useCompany } from '@/features/companies/company-context'
import { canDeleteInventory, canEditInventory } from '@/lib/permissions'
import { createCableSet } from './api'
import { cableColorKeys, fetchCableColors, saveCableColor, type CableColor } from './cableColors'
import { LengthColorField, type ColorEdit } from './LengthColorField'
import { cableName, cableSetSchema, COMMON_CONNECTORS, type CableSetValues, type Lookup } from './model'
import { useEquipmentLookups } from './useEquipmentLookups'

// Nevyplnený riadok: polia ostanú prázdne a validácia si vypýta čísla.
const EMPTY_ROW = { lengthM: undefined, quantity: undefined } as unknown as CableSetValues['rows'][number]

type FormProps = {
  companyId: string
  categories: Lookup[]
  locations: Lookup[]
  colors: CableColor[]
  canEditColors: boolean
}

function CableSetForm({ companyId, categories, locations, colors, canEditColors }: FormProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const connectorListId = useId()
  const categoryListId = useId()
  const locationListId = useId()

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<CableSetValues>({
    resolver: zodResolver(cableSetSchema),
    defaultValues: { namePrefix: '', connector: '', category: '', location: '', rows: [EMPTY_ROW, EMPTY_ROW, EMPTY_ROW] },
  })
  const { fields, append, remove } = useFieldArray({ control, name: 'rows' })
  const namePrefix = useWatch({ control, name: 'namePrefix' })
  const rows = useWatch({ control, name: 'rows' })

  // Neuložené farby dĺžok podľa dĺžky; uložia sa spolu s káblami.
  const [colorEdits, setColorEdits] = useState<Record<number, ColorEdit>>({})

  const save = useMutation({
    mutationFn: async (values: CableSetValues) => {
      for (const row of values.rows) {
        const edit = colorEdits[row.lengthM]
        if (edit) await saveCableColor(companyId, { lengthM: row.lengthM, ...edit })
      }
      await createCableSet({ companyId, values, categories, locations })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['company', companyId] })
      navigate('/equipment', { replace: true })
    },
  })

  return (
    <form onSubmit={handleSubmit((values) => save.mutate(values))} noValidate className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Jeden typ kábla vo viacerých dĺžkach. Za každú dĺžku vznikne jedna položka techniky s počtom kusov, napr. „XLR kábel 5 m“
        × 20.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Názov bez dĺžky *"
          autoFocus
          placeholder="napr. XLR kábel alebo powerCON prepojovací"
          error={errors.namePrefix?.message}
          {...register('namePrefix')}
        />
        <Field
          label="Konektor / typ"
          list={connectorListId}
          autoComplete="off"
          placeholder="napr. XLR"
          error={errors.connector?.message}
          {...register('connector')}
        />
        <datalist id={connectorListId}>
          {COMMON_CONNECTORS.map((connector) => (
            <option key={connector} value={connector} />
          ))}
        </datalist>
        <Field
          label="Kategória"
          list={categoryListId}
          autoComplete="off"
          placeholder="Vyberte alebo napíšte novú"
          error={errors.category?.message}
          {...register('category')}
        />
        <datalist id={categoryListId}>
          {categories.map((category) => (
            <option key={category.id} value={category.name} />
          ))}
        </datalist>
        <Field
          label="Umiestnenie"
          list={locationListId}
          autoComplete="off"
          placeholder="Vyberte alebo napíšte nové"
          error={errors.location?.message}
          {...register('location')}
        />
        <datalist id={locationListId}>
          {locations.map((location) => (
            <option key={location.id} value={location.name} />
          ))}
        </datalist>
      </div>

      <h2 className="mt-2 text-sm font-medium text-muted-foreground">Dĺžky</h2>
      <ul className="flex flex-col gap-3">
        {fields.map((field, index) => {
          const length = rows[index]?.lengthM
          return (
            <li key={field.id} className="rounded-xl border bg-surface p-4">
              <div className="flex items-end gap-3">
                <Field
                  label="Dĺžka (m)"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.1"
                  className="flex-1"
                  error={errors.rows?.[index]?.lengthM?.message}
                  {...register(`rows.${index}.lengthM`, { valueAsNumber: true })}
                />
                <Field
                  label="Počet kusov"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  step={1}
                  className="flex-1"
                  error={errors.rows?.[index]?.quantity?.message}
                  {...register(`rows.${index}.quantity`, { valueAsNumber: true })}
                />
                <Button
                  variant="ghost"
                  aria-label={`Odstrániť dĺžku ${index + 1}`}
                  disabled={fields.length === 1}
                  onClick={() => remove(index)}
                >
                  <Trash2 className="size-4" aria-hidden />
                </Button>
              </div>
              {namePrefix.trim() && Number.isFinite(length) && length > 0 && (
                <p className="mt-2 text-sm text-muted-foreground">Vznikne: {cableName(namePrefix.trim(), length)}</p>
              )}
              <div className="mt-3">
                <LengthColorField
                  lengthM={length}
                  existing={colors}
                  edit={colorEdits[length]}
                  onEdit={(edit) => setColorEdits((current) => ({ ...current, [length]: edit }))}
                  canEdit={canEditColors}
                />
              </div>
            </li>
          )
        })}
      </ul>
      {errors.rows?.root?.message && (
        <p role="alert" className="text-sm text-destructive">
          {errors.rows.root.message}
        </p>
      )}

      <div>
        <Button variant="outline" onClick={() => append(EMPTY_ROW)}>
          <Plus className="size-4" aria-hidden />
          Pridať dĺžku
        </Button>
      </div>

      {save.isError && (
        <p role="alert" className="text-sm text-destructive">
          Uloženie zlyhalo, nič sa nezapísalo. Skúste to znova.
        </p>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? 'Ukladám…' : 'Vytvoriť káble'}
        </Button>
        <LinkButton to="/equipment" variant="outline">
          Zrušiť
        </LinkButton>
      </div>
    </form>
  )
}

export function CableSetPage() {
  const company = useCompany().active!
  const lookups = useEquipmentLookups(company.companyId)
  const colors = useQuery({ queryKey: cableColorKeys.list(company.companyId), queryFn: () => fetchCableColors(company.companyId) })

  let body
  if (!canEditInventory(company.role)) {
    body = <ErrorBlock message="Na pridávanie techniky nemáte oprávnenie." />
  } else if (lookups.isPending) {
    body = <LoadingBlock />
  } else if (lookups.isError) {
    body = <ErrorBlock message="Údaje sa nepodarilo načítať." />
  } else {
    body = (
      <CableSetForm
        companyId={company.companyId}
        categories={lookups.categories}
        locations={lookups.locations}
        colors={colors.data ?? []}
        canEditColors={canDeleteInventory(company.role)}
      />
    )
  }

  return (
    <>
      <PageHeader title="Sada káblov" />
      {body}
    </>
  )
}
