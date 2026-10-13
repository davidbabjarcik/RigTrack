import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, Maximize2, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useFieldArray, useForm, useWatch } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router-dom'
import { ErrorBlock, LoadingBlock } from '@/components/feedback/QueryState'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button, LinkButton } from '@/components/ui/button'
import { Field, SelectField, TextareaField } from '@/components/ui/field'
import { useCompany } from '@/features/companies/company-context'
import { obstacleFill, obstacleLetter } from '@/features/loading/fills'
import { LoadDiagram } from '@/features/loading/LoadDiagram'
import type { CargoSpace } from '@/features/loading/model'
import { asOptionalNumber } from '@/features/equipment/model'
import { can } from '@/lib/permissions'
import { saveVehicle, vehicleKeys } from './api'
import { CargoEditor } from './CargoEditor'
import { DEADLINES, VEHICLE_STATUS_LABELS, VEHICLE_STATUSES, vehicleSchema, type CargoObstacle, type Vehicle, type VehicleFormValues } from './model'
import { useVehicles } from './useVehicles'

/** Nákladný priestor z rozpísaného formulára; nedopísané čísla sa berú ako nula. */
function previewSpace(length: number, width: number, obstacles: CargoObstacle[]): CargoSpace {
  const finite = (value: number) => (Number.isFinite(value) ? value : 0)
  return {
    id: 'preview',
    name: 'Nákladný priestor',
    payloadKg: null,
    length,
    width,
    height: 1,
    obstacles: obstacles.map((item) => ({ label: item.label, x: finite(item.x), y: finite(item.y), z: 0, length: finite(item.length), width: finite(item.width), height: 1 })),
  }
}

function VehicleForm({ companyId, current }: { companyId: string; current: Vehicle | null }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const {
    register,
    control,
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
      payloadKg: current?.payloadKg ?? undefined,
      cargoLengthCm: current?.cargoLengthCm ?? undefined,
      cargoWidthCm: current?.cargoWidthCm ?? undefined,
      cargoHeightCm: current?.cargoHeightCm ?? undefined,
      cargoObstacles: current?.cargoObstacles ?? [],
      note: current?.note ?? '',
    },
  })

  const obstacles = useFieldArray({ control, name: 'cargoObstacles' })
  // Editor kreslí podľa toho, čo je práve v poliach, nie podľa naposledy uloženého stavu.
  const cargoLength = useWatch({ control, name: 'cargoLengthCm' })
  const cargoWidth = useWatch({ control, name: 'cargoWidthCm' })
  const drawn = useWatch({ control, name: 'cargoObstacles' })
  const [drawing, setDrawing] = useState(false)
  const side = { type: 'number', inputMode: 'numeric', min: 0, step: 1 } as const

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

      <fieldset className="rounded-xl border bg-surface p-4">
        <legend className="px-1 text-sm font-medium text-muted-foreground">Nákladný priestor (nepovinné)</legend>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Nosnosť (kg)" {...side} error={errors.payloadKg?.message} {...register('payloadKg', asOptionalNumber)} />
          <Field label="Dĺžka (cm)" {...side} error={errors.cargoLengthCm?.message} {...register('cargoLengthCm', asOptionalNumber)} />
          <Field label="Šírka (cm)" {...side} error={errors.cargoWidthCm?.message} {...register('cargoWidthCm', asOptionalNumber)} />
          <Field label="Výška (cm)" {...side} error={errors.cargoHeightCm?.message} {...register('cargoHeightCm', asOptionalNumber)} />
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          Vnútorné rozmery, kam sa naozaj dá nakladať. Podľa nich a podľa rozmerov cases sa pri evente navrhne nakladanie a počet vozidiel.
        </p>

        <h3 className="mt-5 mb-1 text-sm font-medium">Kam sa nakladať nedá</h3>
        <p className="mb-3 text-sm text-muted-foreground">
          Podbehy kolies, prepážka, rezerva. Kliknutím na nákres otvoríte grafický editor na celú obrazovku, alebo ich zadajte číslami nižšie; oboje je to isté. Ľavá stena je tá,
          ktorú máte po ľavej ruke pri pohľade od zadných dverí dopredu. Výšku prekážky (predvolene 30 cm) upravte v poliach.
        </p>
        {cargoLength && cargoWidth && cargoLength > 0 && cargoWidth > 0 ? (
          <>
            <button
              type="button"
              onClick={() => setDrawing(true)}
              className="mb-4 block w-full max-w-xs rounded-lg text-left hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring"
            >
              <LoadDiagram space={previewSpace(cargoLength, cargoWidth, drawn ?? [])} />
              <span className="mt-1 flex items-center gap-1.5 text-sm font-medium text-accent">
                <Maximize2 className="size-4" aria-hidden />
                Otvoriť grafický editor
              </span>
            </button>
            {drawing && (
              <div
                role="dialog"
                aria-modal="true"
                aria-label="Grafický editor nákladného priestoru"
                className="fixed inset-0 z-50 flex flex-col gap-3 overflow-y-auto bg-background p-4"
                onKeyDown={(event) => {
                  if (event.key === 'Escape') setDrawing(false)
                }}
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold">Kam sa nakladať nedá</h3>
                  <Button autoFocus onClick={() => setDrawing(false)}>
                    <Check className="size-4" aria-hidden />
                    Hotovo
                  </Button>
                </div>
                <CargoEditor
                  length={cargoLength}
                  width={cargoWidth}
                  obstacles={drawn ?? []}
                  onChange={(index, obstacle) => obstacles.update(index, obstacle)}
                  onAdd={(obstacle) => obstacles.append(obstacle)}
                  onRemove={(index) => obstacles.remove(index)}
                />
                <p className="text-sm text-muted-foreground">
                  Zmeny sa prenesú do formulára; do databázy sa zapíšu až tlačidlom Uložiť. Výšku a názov prekážky doplníte v poliach formulára.
                </p>
              </div>
            )}
          </>
        ) : (
          <p className="mb-4 rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
            Nákres sa zobrazí, keď vyplníte dĺžku a šírku nákladného priestoru.
          </p>
        )}
        {obstacles.fields.length > 0 && (
          <ul className="flex flex-col gap-3">
            {obstacles.fields.map((field, index) => (
              <li
                key={field.id}
                className="grid grid-cols-2 items-end gap-3 rounded-lg border border-l-8 p-3 sm:grid-cols-4 lg:grid-cols-7"
                style={{ borderLeftColor: obstacleFill(index) }}
              >
                <Field
                  label={`${obstacleLetter(index)} – názov`}
                  placeholder="napr. ľavý podbeh"
                  className="col-span-2 sm:col-span-4 lg:col-span-1"
                  error={errors.cargoObstacles?.[index]?.label?.message}
                  {...register(`cargoObstacles.${index}.label`)}
                />
                {(
                  [
                    ['x', 'Od kabíny'],
                    ['y', 'Od ľavej steny'],
                    ['length', 'Dĺžka'],
                    ['width', 'Šírka'],
                    ['height', 'Výška'],
                  ] as const
                ).map(([key, label]) => (
                  <Field
                    key={key}
                    label={label}
                    {...side}
                    error={errors.cargoObstacles?.[index]?.[key]?.message}
                    {...register(`cargoObstacles.${index}.${key}`, { valueAsNumber: true })}
                  />
                ))}
                <Button variant="ghost" aria-label={`Odobrať prekážku ${obstacleLetter(index)}`} onClick={() => obstacles.remove(index)}>
                  <Trash2 className="size-4" aria-hidden />
                </Button>
              </li>
            ))}
          </ul>
        )}
        {errors.cargoObstacles?.message && (
          <p role="alert" className="mt-2 text-sm text-destructive">
            {errors.cargoObstacles.message}
          </p>
        )}
        <Button
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={() => obstacles.append({ label: '', x: 0, y: 0, length: 0, width: 0, height: 0 })}
        >
          <Plus className="size-4" aria-hidden />
          Pridať prekážku
        </Button>
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
  if (!can(company, 'vehicles.edit')) {
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
