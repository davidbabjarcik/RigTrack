import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ErrorBlock, LoadingBlock } from '@/components/feedback/QueryState'
import { Button, LinkButton } from '@/components/ui/button'
import { useCases } from '@/features/cases/useCases'
import { useCompany } from '@/features/companies/company-context'
import { PurchaseHistory } from '@/features/orders/PurchaseHistory'
import { EquipmentServiceHistory } from '@/features/service/EquipmentServiceHistory'
import { formatUnits, piecesInService, unitsInService } from '@/features/service/model'
import { useServiceRecords } from '@/features/service/useServiceRecords'
import { UnitsOverview } from '@/features/usage/UnitsOverview'
import { UsageHistory } from '@/features/usage/UsageHistory'
import { formatDate, formatMoney, todayIso } from '@/lib/format'
import { can } from '@/lib/permissions'
import { deleteEquipment, equipmentKeys, fetchEquipment } from './api'
import { EquipmentPhoto } from './EquipmentPhoto'
import { describeAttributes, describeUnitIds, KIND_LABELS, needsRestock, serviceState, unitIdsOf } from './model'
import { OperatingHours } from './OperatingHours'
import { QuantityStepper } from './QuantityStepper'
import { StatusBadge } from './StatusBadge'
import { useEquipmentLookups } from './useEquipmentLookups'

export function EquipmentDetailPage() {
  const { id = '' } = useParams()
  const company = useCompany().active!
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { categories, locations } = useEquipmentLookups(company.companyId)
  const cases = useCases(company.companyId)
  const serviceRecords = useServiceRecords(company.companyId)
  const item = useQuery({
    queryKey: equipmentKeys.detail(company.companyId, id),
    queryFn: () => fetchEquipment(company.companyId, id),
  })

  const remove = useMutation({
    mutationFn: () => deleteEquipment(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: equipmentKeys.list(company.companyId) })
      navigate('/equipment', { replace: true })
    },
  })

  const back = (
    <Link to="/equipment" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
      <ArrowLeft className="size-4" aria-hidden />
      Technika
    </Link>
  )

  if (item.isPending) return <LoadingBlock />
  if (item.isError) return <ErrorBlock message="Techniku sa nepodarilo načítať." onRetry={() => void item.refetch()} />
  if (!item.data) {
    return (
      <>
        {back}
        <ErrorBlock message="Táto technika neexistuje alebo k nej nemáte prístup." />
      </>
    )
  }

  const equipment = item.data
  const inCase = cases.data?.find((c) => c.id === equipment.caseId)
  const inService = piecesInService(serviceRecords.data ?? []).get(equipment.id) ?? 0
  const unitsOut = unitsInService(serviceRecords.data ?? []).get(equipment.id) ?? []
  const service = serviceState(equipment, todayIso())
  const serviceText: ReactNode =
    service.state === 'none' ? undefined : service.state === 'unknown' ? (
      `každých ${equipment.serviceIntervalMonths} mes. · servis ešte nie je zapísaný`
    ) : (
      <span className={service.state === 'overdue' ? 'text-destructive' : service.state === 'soon' ? 'text-accent' : undefined}>
        {formatDate(service.dueOn)}
        {service.state === 'overdue' && ' · po termíne'}
        {service.state === 'soon' && ' · do 30 dní'}
      </span>
    )
  const rows: [string, ReactNode][] = [
    ['Druh', [KIND_LABELS[equipment.kind], ...describeAttributes(equipment)].join(' · ')],
    ['Kategória', categories.find((c) => c.id === equipment.categoryId)?.name],
    ['DMX módy', equipment.attributes.dmxModes?.map((mode) => `${mode.name} ${mode.channels} ch`).join(' · ')],
    ['Umiestnenie', locations.find((l) => l.id === equipment.locationId)?.name],
    [
      'Case',
      inCase && (
        <Link to={`/cases/${inCase.id}`} className="text-accent hover:underline">
          {inCase.name}
        </Link>
      ),
    ],
    [
      'Počet kusov',
      <span key="quantity" className="inline-flex flex-wrap items-center justify-end gap-x-3 gap-y-1">
        {needsRestock(equipment) && <span className="text-sm font-normal text-destructive">treba dokúpiť</span>}
        <QuantityStepper
          companyId={company.companyId}
          equipmentId={equipment.id}
          quantity={equipment.quantity}
          canEdit={can(company, 'equipment.edit')}
        />
      </span>,
    ],
    [
      'V servise',
      inService > 0 ? [unitsOut.length > 0 && `kus ${formatUnits(unitsOut)}`, `${inService} z ${equipment.quantity} ks`].filter(Boolean).join(' · ') : undefined,
    ],
    ['Evidencia', equipment.quantity > 1 ? (equipment.trackUnits ? `po kusoch (${describeUnitIds(unitIdsOf(equipment))})` : 'len počet kusov') : undefined],
    ['Cena prenájmu', equipment.rentalPrice !== null ? `${formatMoney(equipment.rentalPrice, 'EUR')} za kus a deň` : undefined],
    ['Upozorniť pri počte', equipment.minQuantity !== null ? `${equipment.minQuantity} ks a menej` : undefined],
    ['Výrobca', equipment.manufacturer],
    ['Model', equipment.model],
    ['Sériové číslo', equipment.serialNumber],
    ['Inventárne číslo', equipment.inventoryNumber],
    ['MAC adresa', equipment.macAddress],
    ['IP adresa', equipment.ipAddress],
    ['Posledný servis', equipment.lastServiceOn && formatDate(equipment.lastServiceOn)],
    ['Ďalší servis', serviceText],
    ['Naposledy upravené', new Date(equipment.updatedAt).toLocaleString('sk-SK', { dateStyle: 'medium', timeStyle: 'short' })],
  ]

  return (
    <>
      {back}
      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight break-words">{equipment.name}</h1>
          <div className="mt-2">
            <StatusBadge status={equipment.status} />
          </div>
        </div>
        <div className="flex gap-2">
          {can(company, 'equipment.edit') && (
            <LinkButton to={`/equipment/${equipment.id}/edit`} variant="outline" size="sm">
              <Pencil className="size-4" aria-hidden />
              Upraviť
            </LinkButton>
          )}
          {can(company, 'equipment.delete') && (
            <Button
              variant="destructive"
              size="sm"
              disabled={remove.isPending}
              onClick={() => {
                if (window.confirm(`Presunúť „${equipment.name}“ do koša? Admin ju odtiaľ 30 dní vie obnoviť.`)) remove.mutate()
              }}
            >
              <Trash2 className="size-4" aria-hidden />
              Odstrániť
            </Button>
          )}
        </div>
      </header>

      {remove.isError && (
        <p role="alert" className="mb-4 text-sm text-destructive">
          Techniku sa nepodarilo odstrániť.
        </p>
      )}

      <EquipmentPhoto
        companyId={company.companyId}
        equipmentId={equipment.id}
        name={equipment.name}
        photoPath={equipment.photoPath}
        canEdit={can(company, 'equipment.edit')}
      />

      <dl className="divide-y overflow-hidden rounded-xl border bg-surface">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4 px-4 py-3">
            <dt className="text-sm text-muted-foreground">{label}</dt>
            <dd className="text-right font-medium break-words">{value || '—'}</dd>
          </div>
        ))}
      </dl>

      {equipment.trackUnits && equipment.quantity > 1 && <UnitsOverview companyId={company.companyId} equipment={equipment} />}

      <OperatingHours companyId={company.companyId} equipment={equipment} canEdit={can(company, 'equipment.edit')} />

      <EquipmentServiceHistory companyId={company.companyId} equipmentId={equipment.id} canEdit={can(company, 'service.edit')} />

      <UsageHistory companyId={company.companyId} equipmentIds={[equipment.id]} />

      {can(company, 'orders.view') && <PurchaseHistory companyId={company.companyId} equipmentId={equipment.id} />}

      {equipment.note && (
        <section className="mt-6">
          <h2 className="mb-2 text-sm font-medium text-muted-foreground">Poznámka</h2>
          <p className="rounded-xl border bg-surface p-4 whitespace-pre-wrap">{equipment.note}</p>
        </section>
      )}
    </>
  )
}
