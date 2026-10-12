import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useId } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router-dom'
import { ErrorBlock, LoadingBlock } from '@/components/feedback/QueryState'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button, LinkButton } from '@/components/ui/button'
import { Field, TextareaField } from '@/components/ui/field'
import { useCompany } from '@/features/companies/company-context'
import { asOptionalNumber, type Lookup } from '@/features/equipment/model'
import { useEquipmentLookups } from '@/features/equipment/useEquipmentLookups'
import { canEditInventory } from '@/lib/permissions'
import { saveCase } from './api'
import { caseSchema, LABEL_CATEGORIES, type Case, type CaseFormValues } from './model'
import { useCases } from './useCases'

type FormProps = { companyId: string; current: Case | null; locations: Lookup[]; labelCategories: string[] }

function CaseForm({ companyId, current, locations, labelCategories }: FormProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const locationListId = useId()
  const categoryListId = useId()

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<CaseFormValues>({
    resolver: zodResolver(caseSchema),
    defaultValues: {
      name: current?.name ?? '',
      inventoryNumber: current?.inventoryNumber ?? '',
      location: locations.find((l) => l.id === current?.locationId)?.name ?? '',
      labelNumber: current?.labelNumber ?? '',
      labelCategory: current?.labelCategory ?? '',
      weightKg: current?.weightKg ?? undefined,
      widthCm: current?.widthCm ?? undefined,
      lengthCm: current?.lengthCm ?? undefined,
      depthCm: current?.depthCm ?? undefined,
      note: current?.note ?? '',
    },
  })

  const save = useMutation({
    mutationFn: (values: CaseFormValues) => saveCase({ companyId, id: current?.id ?? null, values, locations }),
    onSuccess: async (id) => {
      // Uloženie mohlo založiť nové umiestnenie, preto celý strom firmy.
      await queryClient.invalidateQueries({ queryKey: ['company', companyId] })
      navigate(`/cases/${id}`, { replace: true })
    },
    onError: (error: { code?: string; message?: string }) => {
      if (error.code === '23505' && error.message?.includes('inventory_number')) {
        setError('inventoryNumber', { message: 'Toto označenie už má iný case' }, { shouldFocus: true })
      }
    },
  })

  return (
    <form onSubmit={handleSubmit((values) => save.mutate(values))} noValidate className="flex flex-col gap-4">
      <Field label="Názov *" autoFocus={!current} error={errors.name?.message} {...register('name')} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Označenie / číslo"
          autoComplete="off"
          error={errors.inventoryNumber?.message}
          {...register('inventoryNumber')}
        />
        <Field
          label="Umiestnenie"
          list={locationListId}
          placeholder="Vyberte alebo napíšte nové"
          autoComplete="off"
          error={errors.location?.message}
          {...register('location')}
        />
        <datalist id={locationListId}>
          {locations.map((location) => (
            <option key={location.id} value={location.name} />
          ))}
        </datalist>
        <Field
          label="Číslo case na štítku"
          placeholder="napr. 1 alebo 2, ak je sada vo viacerých cases"
          autoComplete="off"
          error={errors.labelNumber?.message}
          {...register('labelNumber')}
        />
        <Field
          label="Kategória na štítku"
          list={categoryListId}
          placeholder="napr. Sound, Light, Cables"
          autoComplete="off"
          error={errors.labelCategory?.message}
          {...register('labelCategory')}
        />
        <datalist id={categoryListId}>
          {labelCategories.map((category) => (
            <option key={category} value={category} />
          ))}
        </datalist>
        <Field
          label="Hmotnosť (kg)"
          type="number"
          inputMode="decimal"
          min={0}
          step="0.1"
          error={errors.weightKg?.message}
          {...register('weightKg', asOptionalNumber)}
        />
      </div>
      <fieldset className="rounded-xl border bg-surface p-4">
        <legend className="px-1 text-sm font-medium text-muted-foreground">Vonkajšie rozmery (cm)</legend>
        <div className="grid grid-cols-3 gap-3">
          <Field
            label="Šírka"
            type="number"
            inputMode="decimal"
            min={0}
            step="0.1"
            error={errors.widthCm?.message}
            {...register('widthCm', asOptionalNumber)}
          />
          <Field
            label="Dĺžka"
            type="number"
            inputMode="decimal"
            min={0}
            step="0.1"
            error={errors.lengthCm?.message}
            {...register('lengthCm', asOptionalNumber)}
          />
          <Field
            label="Hĺbka"
            type="number"
            inputMode="decimal"
            min={0}
            step="0.1"
            error={errors.depthCm?.message}
            {...register('depthCm', asOptionalNumber)}
          />
        </div>
      </fieldset>
      <TextareaField label="Poznámka" error={errors.note?.message} {...register('note')} />

      {save.isError && !errors.inventoryNumber && (
        <p role="alert" className="text-sm text-destructive">
          Uloženie zlyhalo. Skontrolujte pripojenie a skúste to znova.
        </p>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? 'Ukladám…' : 'Uložiť'}
        </Button>
        <LinkButton to={current ? `/cases/${current.id}` : '/cases'} variant="outline">
          Zrušiť
        </LinkButton>
      </div>
    </form>
  )
}

export function CaseFormPage() {
  const { id } = useParams()
  const company = useCompany().active!
  const lookups = useEquipmentLookups(company.companyId)
  const cases = useCases(company.companyId)
  const current = id ? cases.data?.find((c) => c.id === id) : null
  // Ponuka: bežné kategórie a tie, ktoré už firma na iných cases použila.
  const labelCategories = [...new Set([...LABEL_CATEGORIES, ...(cases.data ?? []).map((c) => c.labelCategory).filter(Boolean)])]

  let body
  if (!canEditInventory(company.role)) {
    body = <ErrorBlock message="Na úpravu cases nemáte oprávnenie." />
  } else if (lookups.isPending || cases.isPending) {
    body = <LoadingBlock />
  } else if (lookups.isError || cases.isError) {
    body = <ErrorBlock message="Údaje sa nepodarilo načítať." onRetry={() => void cases.refetch()} />
  } else if (id && !current) {
    body = <ErrorBlock message="Tento case neexistuje alebo k nemu nemáte prístup." />
  } else {
    body = <CaseForm key={id ?? 'new'} companyId={company.companyId} current={current ?? null} locations={lookups.locations} labelCategories={labelCategories} />
  }

  return (
    <>
      <PageHeader title={id ? 'Úprava case' : 'Nový case'} />
      {body}
    </>
  )
}
