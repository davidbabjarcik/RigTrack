import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, ChevronRight, Package, Pencil, QrCode } from 'lucide-react'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { GroupHours } from './GroupHours'
import { ErrorBlock, LoadingBlock } from '@/components/feedback/QueryState'
import { LinkButton } from '@/components/ui/button'
import { caseTitle } from '@/features/cases/model'
import { useCases } from '@/features/cases/useCases'
import { useCompany } from '@/features/companies/company-context'
import { can } from '@/lib/permissions'
import { equipmentKeys, fetchEquipmentList } from './api'
import { PhotoThumb } from './PhotoThumb'
import { usePhotoThumbs } from './usePhotoThumbs'
import { cableBaseName, describeAttributes, groupSplitEquipment, STATUS_LABELS, unitIdsOf } from './model'

/**
 * Prehľad rozdelenej techniky (napr. Beam 7R v 8 cases, alebo XLR vo všetkých dĺžkach):
 * kde je ktorý kus, odkazy na cases, úprava všetkých naraz a QR štítky všetkých kusov.
 */
export function EquipmentGroupPage() {
  const company = useCompany().active!
  const companyId = company.companyId
  const [params] = useSearchParams()
  const ids = (params.get('ids') ?? '').split(',').filter(Boolean)
  const list = useQuery({ queryKey: equipmentKeys.list(companyId), queryFn: () => fetchEquipmentList(companyId) })
  const cases = useCases(companyId)
  const parts = groupSplitEquipment((list.data ?? []).filter((item) => ids.includes(item.id)))[0]?.items ?? []
  const [hoursOpen, setHoursOpen] = useState(false)
  const thumbs = usePhotoThumbs(companyId, parts.slice(0, 1).map((item) => item.photoPath))

  const back = (
    <Link to="/equipment" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
      <ArrowLeft className="size-4" aria-hidden />
      Technika
    </Link>
  )
  if (list.isPending) return <LoadingBlock />
  if (list.isError) return <ErrorBlock message="Techniku sa nepodarilo načítať." onRetry={() => void list.refetch()} />
  if (parts.length === 0) {
    return (
      <>
        {back}
        <ErrorBlock message="Táto technika neexistuje alebo k nej nemáte prístup." />
      </>
    )
  }

  const main = parts[0]
  const tracksHours = parts.some((item) => Boolean(item.attributes.trackHours) || item.hoursIntervalMonths !== null || item.operatingHours !== null)
  const cables = main.kind === 'cable'
  const caseName = (caseId: string | null) => {
    const box = cases.data?.find((item) => item.id === caseId)
    return box ? caseTitle(box) : ''
  }
  const total = parts.reduce((sum, item) => sum + item.quantity, 0)
  const free = parts.filter((item) => !item.caseId).reduce((sum, item) => sum + item.quantity, 0)
  const caseCount = new Set(parts.map((item) => item.caseId).filter(Boolean)).size
  const allIds = parts.map((item) => item.id).join(',')
  // Po kusoch: každý kus (#1…) s tým, kde je.
  const units = parts
    .filter((item) => item.trackUnits)
    .flatMap((item) => unitIdsOf(item).map((unit) => ({ unit, part: item })))
    .sort((a, b) => a.unit - b.unit)

  return (
    <>
      {back}
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <PhotoThumb url={thumbs[main.photoPath]} />
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight break-words">{cables ? cableBaseName(main.name) : main.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {[
                [main.manufacturer, main.model].filter(Boolean).join(' '),
                ...(cables ? [main.attributes.connector] : describeAttributes(main)),
                `${total} ks`,
                free > 0 && `${free} mimo case`,
                caseCount > 0 && `${total - free} v ${caseCount === 1 ? 'jednom case' : `${caseCount} cases`}`,
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {!cables && can(company, 'equipment.edit') && (
            <LinkButton to={`/equipment/${main.id}/edit?group=${allIds}`} variant="outline" size="sm">
              <Pencil className="size-4" aria-hidden />
              Upraviť všetky naraz
            </LinkButton>
          )}
          <LinkButton to={`/qr/equipment?ids=${allIds}`} variant="outline" size="sm">
            <QrCode className="size-4" aria-hidden />
            QR štítky všetkých{units.length > 0 && ` (${units.length})`}
          </LinkButton>
          {tracksHours && !hoursOpen && can(company, 'equipment.edit') && <GroupHours companyId={companyId} parts={parts} caseName={caseName} onOpen={() => setHoursOpen(true)} />}
        </div>
      </header>
      {hoursOpen && <GroupHours companyId={companyId} parts={parts} caseName={caseName} open onClose={() => setHoursOpen(false)} />}

      {units.length > 0 && (
        <section aria-labelledby="units-heading" className="mb-6">
          <h2 id="units-heading" className="mb-2 text-sm font-medium text-muted-foreground">
            Kusy ({units.length})
          </h2>
          <ul className="divide-y overflow-hidden rounded-xl border bg-surface">
            {units.map(({ unit, part }) => (
              <li key={`${part.id}-${unit}`} className="flex min-h-12 items-center gap-3 px-4 py-2">
                <Link to={`/equipment/${part.id}?unit=${unit}`} className="w-12 font-semibold hover:underline">
                  #{unit}
                </Link>
                <span className="min-w-0 flex-1 truncate text-sm">
                  {part.caseId ? (
                    <Link to={`/cases/${part.caseId}`} className="inline-flex items-center gap-1 text-accent hover:underline">
                      <Package className="size-4" aria-hidden />
                      {caseName(part.caseId) || 'case'}
                    </Link>
                  ) : (
                    <span className="text-muted-foreground">mimo case</span>
                  )}
                </span>
                <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs">{STATUS_LABELS[part.status]}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="parts-heading">
        <h2 id="parts-heading" className="mb-2 text-sm font-medium text-muted-foreground">
          {cables ? 'Dĺžky' : 'Časti'} ({parts.length})
        </h2>
        <ul className="divide-y overflow-hidden rounded-xl border bg-surface">
          {parts.map((part) => (
            <li key={part.id}>
              <Link to={`/equipment/${part.id}`} className="flex min-h-14 items-center gap-3 px-4 py-3 hover:bg-muted">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{cables ? part.name : part.caseId ? caseName(part.caseId) || 'V case' : 'Mimo case'}</span>
                  <span className="block truncate text-sm text-muted-foreground">
                    {[
                      `${part.quantity} ks`,
                      part.trackUnits && part.unitIds.length > 0 && part.unitIds.map((value) => `#${value}`).join(', '),
                      cables && part.caseId && `v ${caseName(part.caseId)}`,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </span>
                <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs">{STATUS_LABELS[part.status]}</span>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}
