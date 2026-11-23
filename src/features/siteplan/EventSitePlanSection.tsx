import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FileDown, PackagePlus, Pencil } from 'lucide-react'
import { useState } from 'react'
import { CollapsibleSection } from '@/components/layout/CollapsibleSection'
import { Button, LinkButton } from '@/components/ui/button'
import { fileSlug } from '@/features/cases/canvas'
import { brandingKeys, fetchBranding, fetchLogoBlob, logoForLightBackground } from '@/features/companies/branding'
import { equipmentKeys, fetchEquipmentList } from '@/features/equipment/api'
import type { CompanyEvent } from '@/features/events/model'
import { DocSharesSection } from '@/features/shares/DocSharesSection'
import { formatDateTime, todayIso } from '@/lib/format'
import { tf, tx } from '@/lib/i18n'
import { useSitePlan } from './api'
import { addCablesToEvent, cableNeeds } from './cables'
import { MapCanvas } from './MapCanvas'
import { ROUTE_LABELS } from './model'

/** Site plán v detaile akcie: mapa, trasy káblov s dĺžkou, káble do pack listu, PDF a zdieľanie. */
export function EventSitePlanSection({ companyId, companyName, event, canEdit }: { companyId: string; companyName: string; event: CompanyEvent; canEdit: boolean }) {
  const queryClient = useQueryClient()
  const plan = useSitePlan(companyId, event.id)
  const equipment = useQuery({ queryKey: equipmentKeys.list(companyId), queryFn: () => fetchEquipmentList(companyId) })
  const branding = useQuery({ queryKey: brandingKeys.branding(companyId), queryFn: () => fetchBranding(companyId) })
  const [notice, setNotice] = useState('')
  const cables = (equipment.data ?? []).filter((item) => item.kind === 'cable')
  const needs = plan.data ? cableNeeds(plan.data.routes, cables) : null
  const rowLabel = (row: NonNullable<typeof needs>['rows'][number]) => row.route.label || tx(ROUTE_LABELS[row.route.kind])
  const toPack = useMutation({
    mutationFn: () => addCablesToEvent(companyId, event, needs!.totals, cables),
    onSuccess: async (changed) => {
      setNotice(changed > 0 ? tf('Do techniky akcie pridané alebo doplnené káble: {0} položiek.', changed) : tx('Všetky káble z trás už na akcii sú.'))
      await queryClient.invalidateQueries({ queryKey: ['company', companyId, 'events'] })
    },
  })
  const pdf = useMutation({
    mutationFn: async () => {
      if (!plan.data || !needs) return
      const logoPath = branding.data?.logoPath ?? ''
      const logo = logoPath ? await fetchLogoBlob(logoPath).then(logoForLightBackground).then((blob) => createImageBitmap(blob)).catch(() => null) : null
      const { sitePlanPdf } = await import('./sitePlanPdf')
      const blob = await sitePlanPdf({
        view: plan.data.view,
        markers: plan.data.markers,
        routes: plan.data.routes,
        rows: needs.rows.map((row) => ({ label: rowLabel(row), meters: row.length.withSlack, cable: row.item ? (row.pieces ? `${row.pieces}× ${row.item.name}` : row.item.name) : '' })),
        note: plan.data.note,
        version: plan.data.version,
        companyName,
        logo,
        contact: branding.data?.labelFooter ?? '',
        event: { name: event.name, startsOn: event.startsOn, endsOn: event.endsOn, venue: event.venue },
        generatedOn: todayIso(),
      })
      logo?.close()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `site-plan-${fileSlug(event.name)}.pdf`
      link.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 10_000)
    },
  })
  if (plan.isError || plan.isPending) return null
  const data = plan.data

  return (
    <>
      <CollapsibleSection
        id="event.siteplan"
        title={data ? tf('Site plán ({0} trás)', data.routes.length) : tx('Site plán')}
        actions={
          canEdit && (
            <LinkButton to={`/events/${event.id}/site`} variant="outline" size="sm">
              <Pencil className="size-4" aria-hidden />
              {data ? tx('Upraviť') : tx('Nakresliť')}
            </LinkButton>
          )
        }
      >
        {data && needs ? (
          <div className="flex flex-col gap-2">
            <MapCanvas view={data.view} markers={data.markers} routes={data.routes} height={320} className="max-w-3xl" />
            {needs.rows.length > 0 && (
              <ul className="text-sm">
                {needs.rows.map((row) => (
                  <li key={row.route.id}>{[rowLabel(row), `${row.length.withSlack} m`, row.item ? (row.pieces ? `${row.pieces}× ${row.item.name}` : row.item.name) : ''].filter(Boolean).join(' · ')}</li>
                ))}
                <li className="font-medium">{tf('Spolu {0} m káblov', needs.meters)}</li>
              </ul>
            )}
            <p className="text-sm text-muted-foreground">{[tf('verzia {0}', data.version), data.updatedAt && tf('uložené {0}', formatDateTime(data.updatedAt))].filter(Boolean).join(' · ')}</p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" disabled={pdf.isPending} onClick={() => pdf.mutate()}>
                <FileDown className="size-4" aria-hidden />PDF
              </Button>
              {canEdit && needs.totals.size > 0 && (
                <Button size="sm" variant="outline" disabled={toPack.isPending} onClick={() => toPack.mutate()}>
                  <PackagePlus className="size-4" aria-hidden />{tx('Káble do techniky akcie')}
                </Button>
              )}
            </div>
            {notice && <p role="status" className="text-sm text-emerald-700 dark:text-emerald-400">{notice}</p>}
            {(pdf.isError || toPack.isError) && <p role="alert" className="text-sm text-destructive">{tx('Nepodarilo sa – skontrolujte pripojenie a oprávnenia.')}</p>}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{tx('Mapa miesta akcie: pódium, FOH, elektrina, vykládka a trasy káblov s dĺžkou – káble sa doplnia do techniky akcie. Tlač do PDF.')}</p>
        )}
      </CollapsibleSection>
      {data && <DocSharesSection companyId={companyId} docType="siteplan" docId={event.id} canEdit={canEdit} hint={tx('Site plán pre produkciu, organizátora alebo elektrikára – odkaz len na čítanie s poslednou uloženou verziou.')} />}
    </>
  )
}
