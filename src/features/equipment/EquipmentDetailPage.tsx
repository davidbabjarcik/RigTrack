import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Copy, Pencil, QrCode, Tag, Trash2, Wrench } from 'lucide-react'
import type { ReactNode } from 'react'
import { caseTitle } from '@/features/cases/model'
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
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
import { deleteEquipment, equipmentKeys, fetchEquipment, fetchEquipmentList } from './api'
import { EquipmentPhoto } from './EquipmentPhoto'
import { ItemHistory } from './ItemHistory'
import { OwnerLink } from '@/features/staff/OwnerLink'
import { AmpPresetsInfo } from './AmpPresetsInfo'
import { ResponsibleFor } from '@/features/responsibilities/ResponsibleFor'
import { EquipmentLinks } from './PurchaseLinksFields'
import { CAPTURE_MATCH_LABELS, hoursSinceLamp, describeAttributes, describeUnitIds, groupSplitEquipment, isSimpleKind, KIND_LABELS, needsRestock, serviceState, unitIdsOf } from './model'
import { OperatingHours } from './OperatingHours'
import { QuantityStepper } from './QuantityStepper'
import { StatusBadge } from './StatusBadge'
import { useEquipmentLookups } from './useEquipmentLookups'
import { equipmentValue } from './value'

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
  // QR kusu (?unit=7): ak kus medzitým presunuli do inej časti (iný case), otvorí sa tá.
  const [params] = useSearchParams()
  const unit = Number(params.get('unit')) || null
  const list = useQuery({ queryKey: equipmentKeys.list(company.companyId), queryFn: () => fetchEquipmentList(company.companyId), enabled: unit !== null })

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
  const focusUnit = unit !== null && equipment.trackUnits && unitIdsOf(equipment).includes(unit) ? unit : null
  if (unit !== null && equipment.trackUnits && !unitIdsOf(equipment).includes(unit) && list.data) {
    const group = groupSplitEquipment(list.data).find((candidate) => candidate.items.some((part) => part.id === equipment.id))
    const holder = group?.items.find((part) => part.trackUnits && unitIdsOf(part).includes(unit))
    if (holder) return <Navigate to={`/equipment/${holder.id}?unit=${unit}`} replace />
  }
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
  // Nákupná cena a hodnota len pre tých, čo techniku spravujú.
  const value = can(company, 'equipment.edit') ? equipmentValue(equipment) : null
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
          {caseTitle(inCase)}
        </Link>
      ),
    ],
    focusUnit !== null ? [
      'Kus',
      <span key="unit">
        #{focusUnit}
        <span className="text-sm font-normal text-muted-foreground"> · v tejto časti spolu {equipment.quantity} ks</span>
      </span>,
    ] : [
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
    ['Evidencia', focusUnit !== null ? undefined : equipment.quantity > 1 ? (equipment.trackUnits ? `po kusoch (${describeUnitIds(unitIdsOf(equipment))})` : 'len počet kusov') : undefined],
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
      (() => {
        // Kus: dátum nákupu a odkiaľ je kúpený („#1 14. 2. 2025 (Thomann)“).
        const purchases = equipment.unitPurchases ?? {}
        const info = equipment.unitInfo ?? {}
        const units = [...new Set([...Object.keys(purchases), ...Object.keys(info).filter((unit) => info[unit]?.from)])].sort((a, b) => Number(a) - Number(b))
        return (
          units.length > 0 &&
          units
            .map((unit) => [`#${unit}`, purchases[unit] && formatDate(purchases[unit]), info[unit]?.from && `(${info[unit].from})`].filter(Boolean).join(' '))
            .join(' · ')
        )
      })(),
    ],
    [
      'Nákupná cena',
      value !== null &&
        `${formatMoney(equipment.attributes.purchasePrice!, 'EUR')} za kus${equipment.quantity > 1 ? ` · spolu ${formatMoney(value, 'EUR')}` : ''}`,
    ],
    ['Posledný servis', equipment.lastServiceOn && formatDate(equipment.lastServiceOn)],
    ['Ďalší servis', serviceText],
    ['Naposledy upravené', new Date(equipment.updatedAt).toLocaleString('sk-SK', { dateStyle: 'medium', timeStyle: 'short' })],
  ]

  return (
    <>
      {back}
      {focusUnit !== null && (
        <p role="status" className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-accent/40 bg-accent/10 px-4 py-3 text-sm">
          <span>
            Zobrazujete <strong>kus #{focusUnit}</strong>
            {equipment.quantity > 1 && ` – v tejto časti sú ${equipment.quantity} ks (${unitIdsOf(equipment).map((value) => `#${value}`).join(', ')}), napr. spolu v jednom case`}.
          </span>
          <Link to={`/equipment/${equipment.id}`} className="font-medium text-accent hover:underline">
            Zobraziť celú časť
          </Link>
        </p>
      )}
      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight break-words">
            {equipment.name}
            {unit !== null && unitIdsOf(equipment).includes(unit) && <span className="ml-2 text-accent">#{unit}</span>}
          </h1>
          <div className="mt-2">
            <StatusBadge status={equipment.status} />
          </div>
          <ResponsibleFor companyId={company.companyId} caseId={equipment.caseId} kinds={[equipment.kind]} className="mt-2" />
        </div>
        <div className="flex flex-wrap gap-2">
          <LinkButton to={`/service/requests/new?equipment=${equipment.id}`} variant="outline" size="sm">
            <Wrench className="size-4" aria-hidden />
            Nahlásiť poruchu
          </LinkButton>
          <LinkButton to={`/qr/equipment?ids=${equipment.id}`} variant="outline" size="sm">
            <QrCode className="size-4" aria-hidden />
            QR štítok
          </LinkButton>
          {can(company, 'equipment.edit') && (
            <LinkButton to={`/equipment/${equipment.id}/edit`} variant="outline" size="sm">
              <Pencil className="size-4" aria-hidden />
              Upraviť
            </LinkButton>
          )}
          <LinkButton to={`/labels/tape?ids=${equipment.id}`} variant="outline" size="sm">
            <Tag className="size-4" aria-hidden />
            Štítky na pásku
          </LinkButton>
          {can(company, 'equipment.edit') && (
            <LinkButton to={`/equipment/new?copy=${equipment.id}`} variant="outline" size="sm">
              <Copy className="size-4" aria-hidden />
              Duplikovať
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
          .filter(([label, value]) => (value !== undefined && value !== null && value !== '' && value !== false) || label === 'Počet kusov' || label === 'Kus')
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

      {equipment.trackUnits && equipment.quantity > 1 && <UnitsOverview companyId={company.companyId} equipment={equipment} showInvoices={can(company, 'orders.view')} only={focusUnit} />}

      <AmpPresetsInfo companyId={company.companyId} equipment={equipment} />
      {!simple && <OperatingHours companyId={company.companyId} equipment={equipment} canEdit={can(company, 'equipment.edit')} only={focusUnit} />}

      {!simple && <EquipmentServiceHistory companyId={company.companyId} equipmentId={equipment.id} canEdit={can(company, 'service.edit')} />}

      <UsageHistory companyId={company.companyId} equipmentIds={[equipment.id]} />

      <ItemHistory companyId={company.companyId} equipmentId={equipment.id} withChanges={can(company, 'audit.view')} />

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
