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
import { formatDate, todayIso } from '@/lib/format'
import { canDeleteInventory, canEditInventory, canManageOrders } from '@/lib/permissions'
import { deleteEquipment, equipmentKeys, fetchEquipment } from './api'
import { EquipmentPhoto } from './EquipmentPhoto'
import { describeAttributes, KIND_LABELS, needsRestock, serviceState } from './model'
import { QuantityStepper } from './QuantityStepper'
import { discardPhotoFile } from './photo'
import { StatusBadge } from './StatusBadge'
import { useEquipmentLookups } from './useEquipmentLookups'

export function EquipmentDetailPage() {
  const { id = '' } = useParams()
  const company = useCompany().active!
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { categories, locations } = useEquipmentLookups(company.companyId)
  const cases = useCases(company.companyId)
  const item = useQuery({
    queryKey: equipmentKeys.detail(company.companyId, id),
    queryFn: () => fetchEquipment(company.companyId, id),
  })

  const remove = useMutation({
    mutationFn: async () => {
      const photoPath = item.data?.photoPath
      await deleteEquipment(company.companyId, id)
      if (photoPath) await discardPhotoFile(photoPath).catch(() => {})
    },
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
          canEdit={canEditInventory(company.role)}
        />
      </span>,
    ],
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
          {canEditInventory(company.role) && (
            <LinkButton to={`/equipment/${equipment.id}/edit`} variant="outline" size="sm">
              <Pencil className="size-4" aria-hidden />
              Upraviť
            </LinkButton>
          )}
          {canDeleteInventory(company.role) && (
            <Button
              variant="destructive"
              size="sm"
              disabled={remove.isPending}
              onClick={() => {
                if (window.confirm(`Naozaj odstrániť „${equipment.name}“? Tento krok sa nedá vrátiť.`)) remove.mutate()
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
        canEdit={canEditInventory(company.role)}
      />

      <dl className="divide-y overflow-hidden rounded-xl border bg-surface">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4 px-4 py-3">
            <dt className="text-sm text-muted-foreground">{label}</dt>
            <dd className="text-right font-medium break-words">{value || '—'}</dd>
          </div>
        ))}
      </dl>

      <EquipmentServiceHistory companyId={company.companyId} equipmentId={equipment.id} canEdit={canEditInventory(company.role)} />

      {canManageOrders(company.role) && <PurchaseHistory companyId={company.companyId} equipmentId={equipment.id} />}

      {equipment.note && (
        <section className="mt-6">
          <h2 className="mb-2 text-sm font-medium text-muted-foreground">Poznámka</h2>
          <p className="rounded-xl border bg-surface p-4 whitespace-pre-wrap">{equipment.note}</p>
        </section>
      )}
    </>
  )
}
