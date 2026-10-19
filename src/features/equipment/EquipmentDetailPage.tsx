import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Pencil, Trash2, Wrench } from 'lucide-react'
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
import { OwnerLink } from '@/features/staff/OwnerLink'
import { EquipmentLinks } from './PurchaseLinksFields'
import { CAPTURE_MATCH_LABELS, hoursSinceLamp, describeAttributes, describeUnitIds, isSimpleKind, KIND_LABELS, needsRestock, serviceState, unitIdsOf } from './model'
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
  // Káble a spotrebný materiál sa neservisujú a nemajú sieť.
  const simple = isSimpleKind(equipment.kind, categories.find((c) => c.id === equipment.categoryId)?.name ?? '')
  const rows: [string, ReactNode][] = [
    ['Druh', [KIND_LABELS[equipment.kind], ...describeAttributes(equipment)].join(' · ')],
    ['Vlastník', equipment.ownerStaffId ? <OwnerLink key="owner" companyId={company.companyId} staffId={equipment.ownerStaffId} /> : undefined],
    ['Kategória', categories.find((c) => c.id === equipment.categoryId)?.name],
    ['Príkon', equipment.attributes.powerW !== undefined && `${equipment.attributes.powerW} W`],
    ['DMX módy', equipment.attributes.dmxModes?.map((mode) => `${mode.name} ${mode.channels} ch`).join(' · ')],
    ['Kópia čoho', equipment.cloneOf],
    [
      'Sedí s Capture',
      equipment.captureMatch && (
        <span key="capture" className={equipment.captureMatch === 'no' ? 'text-destructive' : equipment.captureMatch === 'partial' ? 'text-accent' : undefined}>
          {CAPTURE_MATCH_LABELS[equipment.captureMatch]}
          {equipment.captureNote && <span className="block text-sm font-normal text-muted-foreground">{equipment.captureNote}</span>}
        </span>
      ),
    ],
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
    ['IP adresa', equipment.ipAddress && (equipment.attributes.ipPrefix ? `${equipment.ipAddress}/${equipment.attributes.ipPrefix}` : equipment.ipAddress)],
    [
      equipment.attributes.lightSource === 'halogen' ? 'Žiarovka menená' : 'Výbojka menená',
      equipment.attributes.lampChangedOn &&
        [formatDate(equipment.attributes.lampChangedOn), hoursSinceLamp(equipment) !== null && `odvtedy ${hoursSinceLamp(equipment)} h`].filter(Boolean).join(' · '),
    ],
    ['Kúpené', equipment.purchasedOn && formatDate(equipment.purchasedOn)],
    [
      'Kúpené po kusoch',
      Object.keys(equipment.unitPurchases ?? {}).length > 0 &&
        Object.entries(equipment.unitPurchases ?? {})
          .sort(([a], [b]) => Number(a) - Number(b))
          .map(([unit, date]) => `#${unit} ${formatDate(date)}`)
          .join(' · '),
    ],
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
        <div className="flex flex-wrap gap-2">
          <LinkButton to={`/service/requests/new?equipment=${equipment.id}`} variant="outline" size="sm">
            <Wrench className="size-4" aria-hidden />
            Nahlásiť poruchu
          </LinkButton>
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

      {/* Prázdne údaje sa neukazujú – kábel tak nemá MAC, IP ani servis, reprák DMX módy. */}
      <dl className="divide-y overflow-hidden rounded-xl border bg-surface">
        {rows
          .filter(([label, value]) => (value !== undefined && value !== null && value !== '' && value !== false) || label === 'Počet kusov')
          .map(([label, value]) => (
            <div key={label} className="flex justify-between gap-4 px-4 py-3">
              <dt className="text-sm text-muted-foreground">{label}</dt>
              <dd className="text-right font-medium break-words">{value}</dd>
            </div>
          ))}
      </dl>

      {(equipment.links?.length ?? 0) > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 text-sm font-medium text-muted-foreground">Odkazy</h2>
          <div className="rounded-xl border bg-surface p-4">
            <EquipmentLinks links={equipment.links ?? []} />
          </div>
        </section>
      )}

      {equipment.trackUnits && equipment.quantity > 1 && <UnitsOverview companyId={company.companyId} equipment={equipment} />}

      {!simple && <OperatingHours companyId={company.companyId} equipment={equipment} canEdit={can(company, 'equipment.edit')} />}

      {!simple && <EquipmentServiceHistory companyId={company.companyId} equipmentId={equipment.id} canEdit={can(company, 'service.edit')} />}

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
