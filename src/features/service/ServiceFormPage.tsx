import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Trash2 } from 'lucide-react'
import { useForm, useWatch } from 'react-hook-form'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ErrorBlock, LoadingBlock } from '@/components/feedback/QueryState'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button, LinkButton } from '@/components/ui/button'
import { Field, SelectField, TextareaField } from '@/components/ui/field'
import { collectAttachmentFiles } from '@/features/attachments/api'
import { Attachments } from '@/features/attachments/Attachments'
import { useAuth } from '@/features/auth/auth-context'
import { useCompany } from '@/features/companies/company-context'
import { equipmentKeys, fetchEquipmentList } from '@/features/equipment/api'
import { asOptionalNumber, unitIdsOf, type Equipment } from '@/features/equipment/model'
import { UnitPicker } from '@/features/equipment/UnitPicker'
import { todayIso } from '@/lib/format'
import { can } from '@/lib/permissions'
import { deleteServiceRecord, saveServiceRecord } from './api'
import {
  SERVICE_KIND_LABELS,
  SERVICE_KINDS,
  SERVICE_STATUS_LABELS,
  SERVICE_STATUSES,
  serviceSchema,
  unitsInService,
  type ServiceFormValues,
  type ServiceRecord,
} from './model'
import { useServiceRecords } from './useServiceRecords'

type FormProps = {
  companyId: string
  current: ServiceRecord | null
  equipment: Equipment[]
  /** Všetky servisné záznamy firmy: z nich vieme, ktoré kusy už v servise sú. */
  records: ServiceRecord[]
  /** Technika predvybraná odkazom z jej detailu. */
  presetEquipmentId: string
  defaultTechnician: string
  canDelete: boolean
}

function ServiceForm({ companyId, current, equipment, records, presetEquipmentId, defaultTechnician, canDelete }: FormProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    setValue,
    control,
    formState: { errors },
  } = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      equipmentId: current?.equipmentId ?? presetEquipmentId,
      unitNumbers: current?.unitNumbers ?? [],
      quantity: current?.quantity ?? 1,
      kind: current?.kind ?? 'repair',
      status: current?.status ?? 'open',
      happenedOn: current?.happenedOn ?? todayIso(),
      problem: current?.problem ?? '',
      workDone: current?.workDone ?? '',
      hours: current?.hours ?? undefined,
      cost: current?.cost ?? undefined,
      technician: current?.technician ?? defaultTechnician,
    },
  })
  const equipmentId = current?.equipmentId ?? presetEquipmentId
  // Technika evidovaná po kusoch: pýtame sa, ktoré kusy idú do servisu. Ostatná: len koľko.
  const selectedId = useWatch({ control, name: 'equipmentId' })
  const selected = equipment.find((item) => item.id === selectedId)
  const pieces = selected?.quantity ?? 1
  const tracked = Boolean(selected?.trackUnits) && pieces > 1
  const chosen = useWatch({ control, name: 'unitNumbers' })
  const busy = unitsInService(records.filter((record) => record.equipmentId === selectedId && record.id !== current?.id)).get(selectedId) ?? []
  const units = [...new Set([...(tracked && selected ? unitIdsOf(selected) : []), ...chosen])].sort((a, b) => a - b)
  const backTo = equipmentId ? `/equipment/${equipmentId}` : '/service'

  // Záznam mení stav techniky a dátum jej posledného servisu, preto celý strom firmy.
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['company', companyId] })
  const save = useMutation({
    mutationFn: (values: ServiceFormValues) => saveServiceRecord(companyId, current?.id ?? null, values),
    onSuccess: async () => {
      await refresh()
      navigate(backTo, { replace: true })
    },
  })
  const remove = useMutation({
    mutationFn: async () => {
      const removeFiles = await collectAttachmentFiles(companyId, 'service', current!.id)
      await deleteServiceRecord(companyId, current!.id)
      await removeFiles()
    },
    onSuccess: async () => {
      await refresh()
      navigate(backTo, { replace: true })
    },
  })

  return (
    <form
      onSubmit={handleSubmit((values) => {
        if (values.status !== 'done' && tracked && values.unitNumbers.length === 0) {
          setError('unitNumbers', { message: 'Vyberte, ktoré kusy idú do servisu' })
          return
        }
        if (values.status !== 'done' && values.unitNumbers.length === 0 && values.quantity > Math.max(pieces, 1)) {
          setError('quantity', { message: `Táto technika má iba ${pieces} ks` })
          return
        }
        save.mutate(values)
      })}
      noValidate
      className="flex flex-col gap-4"
    >
      {current ? (
        <p className="rounded-xl border bg-surface p-4">
          <span className="text-sm text-muted-foreground">Technika: </span>
          <Link to={`/equipment/${current.equipmentId}`} className="font-medium text-accent hover:underline">
            {equipment.find((item) => item.id === current.equipmentId)?.name ?? 'Technika'}
          </Link>
        </p>
      ) : (
        <SelectField
          label="Technika *"
          error={errors.equipmentId?.message}
          {...register('equipmentId', {
            onChange: () => {
              setValue('unitNumbers', [])
              setValue('quantity', 1)
            },
          })}
        >
          <option value="">— vyberte —</option>
          {equipment.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
              {item.inventoryNumber && ` (${item.inventoryNumber})`}
            </option>
          ))}
        </SelectField>
      )}

      {units.length > 0 ? (
        <UnitPicker
          label={`Ktoré kusy (z ${pieces})`}
          units={units}
          chosen={chosen}
          taken={busy}
          takenHint="už sú v servise v inom zázname"
          error={errors.unitNumbers?.message}
          onChange={(next) => {
            clearErrors('unitNumbers')
            setValue('unitNumbers', next, { shouldDirty: true })
          }}
        />
      ) : (
        pieces > 1 && (
          <Field
            label={`Počet kusov v servise (z ${pieces})`}
            type="number"
            inputMode="numeric"
            min={1}
            max={pieces}
            step={1}
            className="sm:w-64"
            error={errors.quantity?.message}
            {...register('quantity', { valueAsNumber: true })}
          />
        )
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <SelectField label="Typ servisu" error={errors.kind?.message} {...register('kind')}>
          {SERVICE_KINDS.map((value) => (
            <option key={value} value={value}>
              {SERVICE_KIND_LABELS[value]}
            </option>
          ))}
        </SelectField>
        <SelectField label="Stav" error={errors.status?.message} {...register('status')}>
          {SERVICE_STATUSES.map((value) => (
            <option key={value} value={value}>
              {SERVICE_STATUS_LABELS[value]}
            </option>
          ))}
        </SelectField>
        <Field label="Dátum" type="date" error={errors.happenedOn?.message} {...register('happenedOn')} />
      </div>
      <p className="-mt-2 text-sm text-muted-foreground">
        Kým záznam nie je Hotové, zapísané kusy sú v servise. Stav „V servise“ dostane technika, až keď sú v servise všetky
        jej kusy. Po dokončení sa dátum zapíše ako jej posledný servis.
      </p>

      <TextareaField label="Popis problému" error={errors.problem?.message} {...register('problem')} />
      <TextareaField label="Vykonané úkony" error={errors.workDone?.message} {...register('workDone')} />

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Technik" error={errors.technician?.message} {...register('technician')} />
        <Field
          label="Čas práce (h)"
          type="number"
          inputMode="decimal"
          min={0}
          step="0.25"
          error={errors.hours?.message}
          {...register('hours', asOptionalNumber)}
        />
        <Field
          label="Náklady (€)"
          type="number"
          inputMode="decimal"
          min={0}
          step="0.01"
          error={errors.cost?.message}
          {...register('cost', asOptionalNumber)}
        />
      </div>

      {(save.isError || remove.isError) && (
        <p role="alert" className="text-sm text-destructive">
          Zmena sa nepodarila. Skúste to znova.
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? 'Ukladám…' : 'Uložiť'}
        </Button>
        <LinkButton to={backTo} variant="outline">
          Zrušiť
        </LinkButton>
        {current && canDelete && (
          <Button
            variant="destructive"
            className="ml-auto"
            disabled={remove.isPending}
            onClick={() => {
              if (window.confirm('Naozaj odstrániť tento servisný záznam?')) remove.mutate()
            }}
          >
            <Trash2 className="size-4" aria-hidden />
            Odstrániť
          </Button>
        )}
      </div>
    </form>
  )
}

export function ServiceFormPage() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const company = useCompany().active!
  const { session } = useAuth()
  const records = useServiceRecords(company.companyId)
  const equipment = useQuery({
    queryKey: equipmentKeys.list(company.companyId),
    queryFn: () => fetchEquipmentList(company.companyId),
  })
  const current = id ? records.data?.find((record) => record.id === id) : null
  const userName = (session?.user.user_metadata as { full_name?: string } | undefined)?.full_name ?? ''

  let body
  if (!can(company, 'service.edit')) {
    body = <ErrorBlock message="Na zápis servisu nemáte oprávnenie." />
  } else if (records.isPending || equipment.isPending) {
    body = <LoadingBlock />
  } else if (records.isError || equipment.isError) {
    body = <ErrorBlock message="Údaje sa nepodarilo načítať." onRetry={() => void records.refetch()} />
  } else if (id && !current) {
    body = <ErrorBlock message="Tento servisný záznam neexistuje alebo k nemu nemáte prístup." />
  } else {
    body = (
      <ServiceForm
        key={id ?? 'new'}
        companyId={company.companyId}
        current={current ?? null}
        equipment={equipment.data}
        records={records.data}
        presetEquipmentId={params.get('equipment') ?? ''}
        defaultTechnician={userName}
        canDelete={can(company, 'service.delete')}
      />
    )
  }

  return (
    <>
      <PageHeader title={id ? 'Servisný záznam' : 'Nový servisný záznam'} />
      {body}
      {current && (
        <div className="mt-8">
          <Attachments
            companyId={company.companyId}
            entity="service"
            entityId={current.id}
            canEdit={can(company, 'service.edit')}
            title="Prílohy"
            empty="Žiadne prílohy. Sem patria fotky poruchy, servisný protokol alebo faktúra."
          />
        </div>
      )}
      {!id && can(company, 'service.edit') && (
        <p className="mt-4 text-sm text-muted-foreground">Prílohy (fotky, PDF) pridáte po uložení záznamu.</p>
      )}
    </>
  )
}
