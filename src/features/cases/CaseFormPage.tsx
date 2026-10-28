import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useId, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ErrorBlock, LoadingBlock } from '@/components/feedback/QueryState'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button, LinkButton } from '@/components/ui/button'
import { Field, SelectField, TextareaField } from '@/components/ui/field'
import { useCompany } from '@/features/companies/company-context'
import { asOptionalNumber, type Lookup } from '@/features/equipment/model'
import { useEquipmentLookups } from '@/features/equipment/useEquipmentLookups'
import { can } from '@/lib/permissions'
import { OwnerSelect } from '@/features/staff/OwnerSelect'
import { saveCase, syncCaseGroup } from './api'
import { useCheckLevels, levelDays } from '@/features/checks/levels'
import { CASE_KIND_LABELS, CASE_KINDS, kindWord, caseSchema, CHECK_PRIORITIES, CHECK_PRIORITY_LABELS, LABEL_CATEGORIES, type Case, type CaseFormValues } from './model'
import { addCaseTemplate, caseTemplateKeys, describeTemplate, fetchCaseTemplates, numberedCaseNames, type CaseTemplate } from './templates'
import { useCases } from './useCases'

type FormProps = {
  companyId: string
  current: Case | null
  locations: Lookup[]
  labelCategories: string[]
  templates: CaseTemplate[]
  /** Názvy existujúcich cases: podľa nich sa číslujú nové. */
  caseNames: string[]
  canManageTemplates: boolean
}

function CaseForm({ companyId, current, locations, labelCategories, templates, caseNames, canManageTemplates }: FormProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const locationListId = useId()
  const categoryListId = useId()
  const [templateId, setTemplateId] = useState('')
  const [copies, setCopies] = useState(1)
  const [searchParams] = useSearchParams()
  const checkDays = useCheckLevels(companyId).days
  const ownerPreset = searchParams.get('owner') ?? ''
  // ?group=id1,id2 – úprava celej sady cases naraz (zo zoznamu cases).
  const groupIds = (searchParams.get('group') ?? '').split(',').filter(Boolean)

  const {
    register,
    getValues,
    setValue,
    control,
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
      owner: current?.ownerStaffId ?? ownerPreset,
      checkPriority: current?.checkPriority ?? 'normal',
      oldNumbers: current?.oldNumbers ?? '',
      kind: current?.kind ?? (searchParams.get('kind') === 'rack' ? 'rack' : searchParams.get('kind') === 'bag' ? 'bag' : 'case'),
      rackUnits: current?.rackUnits ?? undefined,
    },
  })
  const kind = useWatch({ control, name: 'kind' }) ?? 'case'

  const save = useMutation({
    mutationFn: async (values: CaseFormValues) => {
      if (current && groupIds.length > 1) {
        const id = await saveCase({ companyId, id: current.id, values, locations })
        await syncCaseGroup(companyId, id, groupIds)
        return [id]
      }
      if (current || copies <= 1) return [await saveCase({ companyId, id: current?.id ?? null, values, locations })]
      return createMany(values)
    },
    onSuccess: async (ids: string[]) => {
      await afterSave(ids)
    },
    onError: (error: { code?: string; message?: string }) => {
      if (error.code === '23505' && error.message?.includes('inventory_number')) {
        setError('inventoryNumber', { message: 'Toto označenie už má iný case' }, { shouldFocus: true })
      }
    },
  })

  async function afterSave(ids: string[]) {
    // Uloženie mohlo založiť nové umiestnenie, preto celý strom firmy.
    await queryClient.invalidateQueries({ queryKey: ['company', companyId] })
    navigate(groupIds.length > 1 ? `/cases/group?ids=${groupIds.join(',')}` : ids.length === 1 ? `/cases/${ids[0]}` : '/cases', { replace: true })
  }

  async function createMany(values: CaseFormValues) {
    // Viac kusov naraz: rovnaké údaje, názvy s poradovým číslom. Označenie musí byť jedinečné, preto ho dostane len prvý.
    const ids: string[] = []
    for (const [index, name] of numberedCaseNames(values.name, copies, caseNames).entries()) {
      ids.push(await saveCase({ companyId, id: null, values: { ...values, name, inventoryNumber: index === 0 ? values.inventoryNumber : '' }, locations }))
    }
    return ids
  }

  // Šablóna prepíše rozmery, hmotnosť a kategóriu; názov navrhne len do prázdneho poľa.
  const applyTemplate = (id: string) => {
    setTemplateId(id)
    const template = templates.find((item) => item.id === id)
    if (!template) return
    for (const key of ['weightKg', 'widthCm', 'lengthCm', 'depthCm'] as const) setValue(key, template[key] ?? undefined, { shouldDirty: true })
    if (template.labelCategory) setValue('labelCategory', template.labelCategory, { shouldDirty: true })
    if (!getValues('name').trim()) setValue('name', numberedCaseNames(template.name, 1, caseNames)[0], { shouldDirty: true })
  }

  const saveTemplate = useMutation({
    mutationFn: (name: string) => {
      const values = getValues()
      const size = (value: number | undefined) => (typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null)
      return addCaseTemplate(companyId, {
        name,
        labelCategory: values.labelCategory,
        weightKg: size(values.weightKg),
        widthCm: size(values.widthCm),
        lengthCm: size(values.lengthCm),
        depthCm: size(values.depthCm),
      })
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: caseTemplateKeys.list(companyId) }),
  })

  return (
    <form onSubmit={handleSubmit((values) => save.mutate(values))} noValidate className="flex flex-col gap-4">
      {current && groupIds.length > 1 && (
        <p role="status" className="rounded-xl border border-accent/40 bg-accent/10 p-4 text-sm">
          <strong>Úprava všetkých {groupIds.length} cases v sade.</strong> Rozmery, hmotnosť, kategória na štítku, case / rack (U),
          priorita kontroly, vlastník a poznámka sa po uložení prenesú do všetkých. Názov, číslo, umiestnenie a fotky ostanú pri
          každom vlastné.
        </p>
      )}
      {!current && (
        <div className="grid gap-4 rounded-xl border border-accent/40 bg-accent/10 p-4 sm:grid-cols-[1fr_10rem]">
          {templates.length > 0 ? (
            <SelectField label="Šablóna case" value={templateId} onChange={(event) => applyTemplate(event.target.value)}>
              <option value="">— bez šablóny —</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                  {describeTemplate(template) && ` (${describeTemplate(template)})`}
                </option>
              ))}
            </SelectField>
          ) : (
            <p className="self-end text-sm text-muted-foreground">Viac rovnakých case naraz – zadajte počet. Šablónu (rozmery, hmotnosť) si uložíte dole.</p>
          )}
          <Field
            label="Koľko case vytvoriť"
            type="number"
            inputMode="numeric"
            min={1}
            max={50}
            step={1}
            value={copies}
            onChange={(event) => setCopies(Math.min(Math.max(Math.trunc(Number(event.target.value)) || 1, 1), 50))}
          />
          <p className="text-sm text-muted-foreground sm:col-span-2">
            {templates.length > 0 && 'Šablóna doplní rozmery, hmotnosť a kategóriu. '}
            {copies > 1 && `Vznikne ${copies} case s názvami „${numberedCaseNames(getValues('name') || 'Case', copies, caseNames)[0]}“ a ďalej podľa poradia. `}
          </p>
        </div>
      )}
      <div className="flex flex-wrap items-end gap-3">
        <div role="radiogroup" aria-label="Case alebo rack" className="flex gap-1 rounded-lg bg-muted p-1">
          {CASE_KINDS.map((value) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={kind === value}
              onClick={() => setValue('kind', value, { shouldDirty: true })}
              className={kind === value ? 'h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground' : 'h-9 rounded-md px-4 text-sm font-medium hover:bg-surface'}
            >
              {CASE_KIND_LABELS[value]}
            </button>
          ))}
        </div>
        {kind === 'rack' && (
          <Field
            label="Výška (U)"
            type="number"
            inputMode="numeric"
            min={1}
            max={60}
            step={1}
            placeholder="napr. 12"
            className="w-32"
            error={errors.rackUnits?.message}
            {...register('rackUnits', asOptionalNumber)}
          />
        )}
      </div>
      <Field label="Názov *" autoFocus={!current} error={errors.name?.message} {...register('name')} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Označenie / číslo"
          autoComplete="off"
          error={errors.inventoryNumber?.message}
          {...register('inventoryNumber')}
        />
        <Field
          label="Staré čísla (nepovinné)"
          placeholder="napr. 17, A-4 – podľa nich ho nájdete v Sklade"
          autoComplete="off"
          error={errors.oldNumbers?.message}
          {...register('oldNumbers')}
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
        <OwnerSelect companyId={companyId} error={errors.owner?.message} {...register('owner')} />
        <SelectField label="Priorita kontroly" error={errors.checkPriority?.message} {...register('checkPriority')}>
          {CHECK_PRIORITIES.map((priority) => (
            <option key={priority} value={priority}>
              {CHECK_PRIORITY_LABELS[priority]}
              {levelDays(priority, checkDays) !== null ? ` – kontrolovať aspoň raz za ${levelDays(priority, checkDays)} dní` : ' – nekontroluje sa'}
            </option>
          ))}
        </SelectField>
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

      {saveTemplate.isSuccess && <p className="text-sm text-muted-foreground">Šablóna je uložená. Nájdete ju pri zakladaní nového case.</p>}
      {saveTemplate.isError && (
        <p role="alert" className="text-sm text-destructive">
          {(saveTemplate.error as { code?: string }).code === '23505' ? 'Šablóna s týmto názvom už existuje.' : 'Šablónu sa nepodarilo uložiť.'}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? 'Ukladám…' : !current && copies > 1 ? `Vytvoriť ${copies} cases` : 'Uložiť'}
        </Button>
        <LinkButton to={current ? (groupIds.length > 1 ? `/cases/group?ids=${groupIds.join(',')}` : `/cases/${current.id}`) : '/cases'} variant="outline">
          Zrušiť
        </LinkButton>
        {canManageTemplates && (
          <Button
            variant="ghost"
            className="ml-auto"
            disabled={saveTemplate.isPending}
            onClick={() => {
              const name = window.prompt('Názov šablóny (typ case, bez poradového čísla):', getValues('name').replace(/\s+\d+$/, ''))
              if (name?.trim()) saveTemplate.mutate(name.trim())
            }}
          >
            Uložiť rozmery ako šablónu
          </Button>
        )}
      </div>
    </form>
  )
}

export function CaseFormPage() {
  const { id } = useParams()
  const company = useCompany().active!
  const lookups = useEquipmentLookups(company.companyId)
  const cases = useCases(company.companyId)
  // Šablóny sú doplnok: bez nich (alebo pred migráciou) sa case zakladá ako doteraz.
  const templates = useQuery({ queryKey: caseTemplateKeys.list(company.companyId), queryFn: () => fetchCaseTemplates(company.companyId) })
  const current = id ? cases.data?.find((c) => c.id === id) : null
  // Ponuka: bežné kategórie a tie, ktoré už firma na iných cases použila.
  const labelCategories = [...new Set([...LABEL_CATEGORIES, ...(cases.data ?? []).map((c) => c.labelCategory).filter(Boolean)])]

  let body
  if (!can(company, 'cases.edit')) {
    body = <ErrorBlock message="Na úpravu cases nemáte oprávnenie." />
  } else if (lookups.isPending || cases.isPending) {
    body = <LoadingBlock />
  } else if (lookups.isError || cases.isError) {
    body = <ErrorBlock message="Údaje sa nepodarilo načítať." onRetry={() => void cases.refetch()} />
  } else if (id && !current) {
    body = <ErrorBlock message="Tento case neexistuje alebo k nemu nemáte prístup." />
  } else {
    body = (
      <CaseForm
        key={id ?? 'new'}
        companyId={company.companyId}
        current={current ?? null}
        locations={lookups.locations}
        labelCategories={labelCategories}
        templates={templates.data ?? []}
        caseNames={cases.data.map((item) => item.name)}
        canManageTemplates={can(company, 'lookups.manage')}
      />
    )
  }

  return (
    <>
      <PageHeader title={id ? `Úprava – ${kindWord(current?.kind)}` : 'Nový case / rack / taška'} />
      {body}
    </>
  )
}
