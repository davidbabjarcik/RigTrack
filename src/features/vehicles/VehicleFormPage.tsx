import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router-dom'
import { ErrorBlock, LoadingBlock } from '@/components/feedback/QueryState'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button, LinkButton } from '@/components/ui/button'
import { Field, SelectField, TextareaField } from '@/components/ui/field'
import { useCompany } from '@/features/companies/company-context'
import { asOptionalNumber } from '@/features/equipment/model'
import { canManageVehicles } from '@/lib/permissions'
import { saveVehicle, vehicleKeys } from './api'
import { DEADLINES, VEHICLE_STATUS_LABELS, VEHICLE_STATUSES, vehicleSchema, type Vehicle, type VehicleFormValues } from './model'
import { useVehicles } from './useVehicles'

function VehicleForm({ companyId, current }: { companyId: string; current: Vehicle | null }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<VehicleFormValues>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      plate: current?.plate ?? '',
      model: current?.model ?? '',
      vin: current?.vin ?? '',
      status: current?.status ?? 'active',
      driver: current?.driver ?? '',
      odometerKm: current?.odometerKm ?? undefined,
      stkUntil: current?.stkUntil ?? '',
      ekUntil: current?.ekUntil ?? '',
      vignetteUntil: current?.vignetteUntil ?? '',
      pzpUntil: current?.pzpUntil ?? '',
      cascoUntil: current?.cascoUntil ?? '',
      leasingUntil: current?.leasingUntil ?? '',
      note: current?.note ?? '',
    },
  })

  const save = useMutation({
    mutationFn: (values: VehicleFormValues) => saveVehicle(companyId, current?.id ?? null, values),
    onSuccess: async (id) => {
      await queryClient.invalidateQueries({ queryKey: vehicleKeys.list(companyId) })
      navigate(`/vehicles/${id}`, { replace: true })
    },
    onError: (error: { code?: string }) => {
      if (error.code === '23505') setError('plate', { message: 'Vozidlo s týmto EČV už existuje' }, { shouldFocus: true })
    },
  })

  return (
    <form onSubmit={handleSubmit((values) => save.mutate(values))} noValidate className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="EČV *"
          autoFocus={!current}
          autoCapitalize="characters"
          autoComplete="off"
          placeholder="napr. SP123AB"
          error={errors.plate?.message}
          {...register('plate')}
        />
        <Field label="Značka a model" placeholder="napr. VW Crafter" error={errors.model?.message} {...register('model')} />
        <Field label="VIN" autoComplete="off" autoCapitalize="characters" error={errors.vin?.message} {...register('vin')} />
        <SelectField label="Stav" error={errors.status?.message} {...register('status')}>
          {VEHICLE_STATUSES.map((status) => (
            <option key={status} value={status}>
              {VEHICLE_STATUS_LABELS[status]}
            </option>
          ))}
        </SelectField>
        <Field label="Vodič / komu je pridelené" error={errors.driver?.message} {...register('driver')} />
        <Field
          label="Stav tachometra (km)"
          type="number"
          inputMode="numeric"
          min={0}
          step={1}
          error={errors.odometerKm?.message}
          {...register('odometerKm', asOptionalNumber)}
        />
      </div>

      <fieldset className="rounded-xl border bg-surface p-4">
        <legend className="px-1 text-sm font-medium text-muted-foreground">Platnosť do</legend>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {DEADLINES.map(({ key, label }) => (
            <Field key={key} label={label} type="date" error={errors[key]?.message} {...register(key)} />
          ))}
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          Vyplňte len to, čo sa vozidla týka. Termín sa začne pripomínať 30 dní vopred na Prehľade.
        </p>
      </fieldset>

      <TextareaField label="Poznámka" error={errors.note?.message} {...register('note')} />

      {save.isError && !errors.plate && (
        <p role="alert" className="text-sm text-destructive">
          Uloženie zlyhalo. Skúste to znova.
        </p>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? 'Ukladám…' : 'Uložiť'}
        </Button>
        <LinkButton to={current ? `/vehicles/${current.id}` : '/vehicles'} variant="outline">
          Zrušiť
        </LinkButton>
      </div>
    </form>
  )
}

export function VehicleFormPage() {
  const { id } = useParams()
  const company = useCompany().active!
  const vehicles = useVehicles(company.companyId)
  const current = id ? vehicles.data?.find((vehicle) => vehicle.id === id) : null

  let body
  if (!canManageVehicles(company.role)) {
    body = <ErrorBlock message="Vozidlá môže upravovať iba admin a skladník." />
  } else if (vehicles.isPending) {
    body = <LoadingBlock />
  } else if (vehicles.isError) {
    body = <ErrorBlock message="Údaje sa nepodarilo načítať." onRetry={() => void vehicles.refetch()} />
  } else if (id && !current) {
    body = <ErrorBlock message="Toto vozidlo neexistuje alebo k nemu nemáte prístup." />
  } else {
    body = <VehicleForm key={id ?? 'new'} companyId={company.companyId} current={current ?? null} />
  }

  return (
    <>
      <PageHeader title={id ? 'Úprava vozidla' : 'Nové vozidlo'} />
      {body}
    </>
  )
}
