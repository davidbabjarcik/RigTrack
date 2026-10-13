import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ErrorBlock, LoadingBlock } from '@/components/feedback/QueryState'
import { Button, LinkButton } from '@/components/ui/button'
import { Field, SelectField } from '@/components/ui/field'
import { collectAttachmentFiles } from '@/features/attachments/api'
import { Attachments } from '@/features/attachments/Attachments'
import { useCompany } from '@/features/companies/company-context'
import { LoadDiagram } from '@/features/loading/LoadDiagram'
import { ObstacleLegend } from '@/features/loading/ObstacleLegend'
import { cargoSpaceOf } from '@/features/loading/sources'
import { asOptionalNumber, formatNumber } from '@/features/equipment/model'
import { formatDate, formatMoney, todayIso } from '@/lib/format'
import { can } from '@/lib/permissions'
import { addVehicleRecord, deleteVehicle, deleteVehicleRecord, fetchVehicleRecords, vehicleKeys } from './api'
import { DeadlineLine } from './DeadlineBadge'
import {
  fuelConsumption,
  RECORD_KIND_LABELS,
  RECORD_KINDS,
  recordSchema,
  totalCost,
  VEHICLE_STATUS_LABELS,
  vehicleDeadlines,
  type RecordFormValues,
} from './model'
import { useVehicles } from './useVehicles'
import { VehiclePhoto } from './VehiclePhoto'

function RecordForm({ companyId, vehicleId, onDone }: { companyId: string; vehicleId: string; onDone: () => void }) {
  const queryClient = useQueryClient()
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<RecordFormValues>({
    resolver: zodResolver(recordSchema),
    defaultValues: { kind: 'fuel', happenedOn: todayIso(), odometerKm: undefined, cost: undefined, liters: undefined, description: '' },
  })
  const kind = useWatch({ control, name: 'kind' })

  const add = useMutation({
    mutationFn: (values: RecordFormValues) => addVehicleRecord(companyId, vehicleId, values),
    onSuccess: async () => {
      // Záznam môže posunúť tachometer vozidla, preto celý zoznam vozidiel (prefix pokrýva aj záznamy).
      await queryClient.invalidateQueries({ queryKey: vehicleKeys.list(companyId) })
      onDone()
    },
  })

  return (
    <form
      onSubmit={handleSubmit((values) => add.mutate(values))}
      noValidate
      className="mb-4 flex flex-col gap-3 rounded-xl border bg-surface p-4"
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <SelectField label="Druh záznamu" error={errors.kind?.message} {...register('kind')}>
          {RECORD_KINDS.map((value) => (
            <option key={value} value={value}>
              {RECORD_KIND_LABELS[value]}
            </option>
          ))}
        </SelectField>
        <Field label="Dátum" type="date" error={errors.happenedOn?.message} {...register('happenedOn')} />
        <Field
          label="Stav tachometra (km)"
          type="number"
          inputMode="numeric"
          min={0}
          step={1}
          error={errors.odometerKm?.message}
          {...register('odometerKm', asOptionalNumber)}
        />
        <Field
          label="Cena (€)"
          type="number"
          inputMode="decimal"
          min={0}
          step="0.01"
          error={errors.cost?.message}
          {...register('cost', asOptionalNumber)}
        />
        {kind === 'fuel' && (
          <Field
            label="Natankované (l)"
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            error={errors.liters?.message}
            {...register('liters', asOptionalNumber)}
          />
        )}
      </div>
      <Field label="Popis" placeholder="napr. čo sa robilo, kde" error={errors.description?.message} {...register('description')} />
      {add.isError && (
        <p role="alert" className="text-sm text-destructive">
          Záznam sa nepodarilo uložiť.
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={add.isPending}>
          {add.isPending ? 'Ukladám…' : 'Uložiť záznam'}
        </Button>
        <Button variant="ghost" size="sm" onClick={onDone}>
          Zrušiť
        </Button>
      </div>
    </form>
  )
}

export function VehicleDetailPage() {
  const { id = '' } = useParams()
  const company = useCompany().active!
  const companyId = company.companyId
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [adding, setAdding] = useState(false)

  const vehicles = useVehicles(companyId)
  const records = useQuery({
    queryKey: vehicleKeys.records(companyId, id),
    queryFn: () => fetchVehicleRecords(companyId, id),
  })

  const remove = useMutation({
    mutationFn: async () => {
      const removeFiles = await collectAttachmentFiles(companyId, 'vehicle', id)
      await deleteVehicle(companyId, id)
      await removeFiles()
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: vehicleKeys.list(companyId) })
      navigate('/vehicles', { replace: true })
    },
  })
  const removeRecord = useMutation({
    mutationFn: (recordId: string) => deleteVehicleRecord(companyId, recordId),
    onSettled: () => queryClient.invalidateQueries({ queryKey: vehicleKeys.records(companyId, id) }),
  })

  const back = (
    <Link to="/vehicles" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
      <ArrowLeft className="size-4" aria-hidden />
      Vozidlá
    </Link>
  )

  if (vehicles.isPending) return <LoadingBlock />
  if (vehicles.isError) return <ErrorBlock message="Vozidlo sa nepodarilo načítať." onRetry={() => void vehicles.refetch()} />
  const vehicle = vehicles.data.find((candidate) => candidate.id === id)
  if (!vehicle) {
    return (
      <>
        {back}
        <ErrorBlock message="Toto vozidlo neexistuje alebo k nemu nemáte prístup." />
      </>
    )
  }

  const deadlines = vehicleDeadlines(vehicle, todayIso())
  const consumption = fuelConsumption(records.data ?? [])
  const facts: [string, string][] = [
    ['Stav', VEHICLE_STATUS_LABELS[vehicle.status]],
    ['VIN', vehicle.vin],
    ['Vodič', vehicle.driver],
    ['Tachometer', vehicle.odometerKm !== null ? `${vehicle.odometerKm.toLocaleString('sk-SK')} km` : ''],
    ['Priemerná spotreba', consumption !== null ? `${formatNumber(consumption)} l/100 km` : ''],
    ['Náklady spolu', records.data && records.data.length > 0 ? formatMoney(totalCost(records.data), 'EUR') : ''],
  ]

  const space = cargoSpaceOf(vehicle)

  return (
    <>
      {back}
      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight break-words">{vehicle.plate}</h1>
          {vehicle.model && <p className="mt-1 text-muted-foreground">{vehicle.model}</p>}
        </div>
        <div className="flex gap-2">
          {can(company, 'vehicles.edit') && (
            <LinkButton to={`/vehicles/${id}/edit`} variant="outline" size="sm">
              <Pencil className="size-4" aria-hidden />
              Upraviť
            </LinkButton>
          )}
          {can(company, 'vehicles.delete') && (
            <Button
              variant="destructive"
              size="sm"
              disabled={remove.isPending}
              onClick={() => {
                if (window.confirm(`Naozaj odstrániť vozidlo ${vehicle.plate} aj so všetkými záznamami?`)) remove.mutate()
              }}
            >
              <Trash2 className="size-4" aria-hidden />
              Odstrániť
            </Button>
          )}
        </div>
      </header>

      <VehiclePhoto
        companyId={company.companyId}
        vehicleId={vehicle.id}
        name={vehicle.plate}
        photoPath={vehicle.photoPath}
        canEdit={can(company, 'vehicles.edit')}
      />

      {space && (
        <section className="mb-6" aria-labelledby="cargo-heading">
          <h2 id="cargo-heading" className="mb-2 text-sm font-medium text-muted-foreground">
            Nákladný priestor
          </h2>
          <div className="rounded-xl border bg-surface p-4">
            <p className="mb-3 font-medium">
              {space.length} × {space.width} × {space.height} cm
              {vehicle.payloadKg !== null && ` · nosnosť ${vehicle.payloadKg} kg`}
              {space.obstacles.length > 0 && ` · prekážok: ${space.obstacles.length}`}
            </p>
            <div className="mb-1 flex justify-between text-xs text-muted-foreground">
              <span>← dvere</span>
              <span>kabína →</span>
            </div>
            <LoadDiagram space={space} />
            <ObstacleLegend obstacles={space.obstacles} />
            <p className="mt-2 text-sm text-muted-foreground">Pohľad zhora, ľavá stena je hore; farebné šrafované plochy sú miesta, kam sa nakladať nedá.</p>
          </div>
        </section>
      )}

      {(remove.isError || removeRecord.isError) && (
        <p role="alert" className="mb-4 text-sm text-destructive">
          Zmena sa nepodarila.
        </p>
      )}

      <section className="mb-6">
        <h2 className="mb-2 text-sm font-medium text-muted-foreground">Termíny</h2>
        {deadlines.length === 0 ? (
          <p className="rounded-xl border border-dashed bg-surface p-4 text-sm text-muted-foreground">
            Žiadne termíny nie sú zadané. Doplníte ich v úprave vozidla.
          </p>
        ) : (
          <ul className="divide-y overflow-hidden rounded-xl border bg-surface">
            {deadlines.map((deadline) => (
              <li key={deadline.key} className="px-4 py-3">
                <DeadlineLine deadline={deadline} className="font-medium" />
              </li>
            ))}
          </ul>
        )}
      </section>

      <dl className="mb-6 divide-y overflow-hidden rounded-xl border bg-surface">
        {facts
          .filter(([, value]) => value)
          .map(([label, value]) => (
            <div key={label} className="flex justify-between gap-4 px-4 py-3">
              <dt className="text-sm text-muted-foreground">{label}</dt>
              <dd className="text-right font-medium break-words">{value}</dd>
            </div>
          ))}
      </dl>

      {vehicle.note && <p className="mb-6 rounded-xl border bg-surface p-4 whitespace-pre-wrap">{vehicle.note}</p>}

      <Attachments
        companyId={companyId}
        entity="vehicle"
        entityId={id}
        canEdit={can(company, 'vehicles.edit')}
        title="Dokumenty"
        empty="Žiadne dokumenty. Sem patrí technický preukaz, poistné zmluvy a faktúry."
      />

      <section aria-labelledby="records-heading">
        <div className="mb-2 flex items-center justify-between gap-3">
          <h2 id="records-heading" className="text-sm font-medium text-muted-foreground">
            Záznamy o prevádzke
          </h2>
          {can(company, 'vehicles.log') && !adding && (
            <Button variant="outline" size="sm" onClick={() => setAdding(true)}>
              <Plus className="size-4" aria-hidden />
              Pridať záznam
            </Button>
          )}
        </div>

        {adding && <RecordForm companyId={companyId} vehicleId={id} onDone={() => setAdding(false)} />}

        {records.isPending ? (
          <LoadingBlock />
        ) : records.isError ? (
          <ErrorBlock message="Záznamy sa nepodarilo načítať." onRetry={() => void records.refetch()} />
        ) : records.data.length === 0 ? (
          <p className="rounded-xl border border-dashed bg-surface px-6 py-10 text-center text-sm text-muted-foreground">
            Zatiaľ žiadne záznamy. Pridajte tankovanie, servis alebo opravu.
          </p>
        ) : (
          <ul className="divide-y overflow-hidden rounded-xl border bg-surface">
            {records.data.map((record) => {
              const details = [
                formatDate(record.happenedOn),
                record.odometerKm !== null && `${record.odometerKm.toLocaleString('sk-SK')} km`,
                record.liters !== null && `${formatNumber(record.liters)} l`,
              ].filter(Boolean)
              return (
                <li key={record.id} className="flex items-start gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{RECORD_KIND_LABELS[record.kind]}</p>
                    <p className="text-sm text-muted-foreground">{details.join(' · ')}</p>
                    {record.description && <p className="mt-1 text-sm whitespace-pre-wrap">{record.description}</p>}
                  </div>
                  {record.cost !== null && <p className="shrink-0 font-medium">{formatMoney(record.cost, 'EUR')}</p>}
                  {can(company, 'vehicles.edit') && (
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Odstrániť záznam: ${RECORD_KIND_LABELS[record.kind]} ${formatDate(record.happenedOn)}`}
                      disabled={removeRecord.isPending}
                      onClick={() => {
                        if (window.confirm('Odstrániť tento záznam?')) removeRecord.mutate(record.id)
                      }}
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </Button>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </>
  )
}
