import { useMutation, useQuery } from '@tanstack/react-query'
import { FileDown, Pencil } from 'lucide-react'
import { CollapsibleSection } from '@/components/layout/CollapsibleSection'
import { Button, LinkButton } from '@/components/ui/button'
import { fileSlug } from '@/features/cases/canvas'
import { brandingKeys, fetchBranding, fetchLogoBlob, logoForLightBackground } from '@/features/companies/branding'
import { equipmentKeys, fetchEquipmentList } from '@/features/equipment/api'
import type { CompanyEvent } from '@/features/events/model'
import { DocSharesSection } from '@/features/shares/DocSharesSection'
import { formatDateTime, todayIso } from '@/lib/format'
import { tf, tx } from '@/lib/i18n'
import { useSynoptic } from './api'
import { cableSummary } from './model'
import { SynopticSvg } from './SynopticSvg'

/** Synoptika v detaile akcie: náhľad, súhrn káblov, úprava, PDF A4 / A3 a zdieľanie odkazom. */
export function EventSynopticSection({ companyId, companyName, event, canEdit }: { companyId: string; companyName: string; event: CompanyEvent; canEdit: boolean }) {
  const synoptic = useSynoptic(companyId, event.id)
  const equipment = useQuery({ queryKey: equipmentKeys.list(companyId), queryFn: () => fetchEquipmentList(companyId) })
  const branding = useQuery({ queryKey: brandingKeys.branding(companyId), queryFn: () => fetchBranding(companyId) })
  const names = Object.fromEntries((equipment.data ?? []).map((item) => [item.id, item.name]))
  const pdf = useMutation({
    mutationFn: async (paper: 'A4' | 'A3') => {
      if (!synoptic.data) return
      const logoPath = branding.data?.logoPath ?? ''
      const logo = logoPath ? await fetchLogoBlob(logoPath).then(logoForLightBackground).then((blob) => createImageBitmap(blob)).catch(() => null) : null
      const { synopticPdf } = await import('./synopticPdf')
      const blob = await synopticPdf({
        paper,
        nodes: synoptic.data.nodes,
        links: synoptic.data.links,
        names,
        note: synoptic.data.note,
        version: synoptic.data.version,
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
      link.download = `synoptika-${fileSlug(event.name)}-${paper}.pdf`
      link.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 10_000)
    },
  })
  if (synoptic.isError || synoptic.isPending) return null
  const data = synoptic.data
  const summary = data ? cableSummary(data.links) : []

  return (
    <>
      <CollapsibleSection
        id="event.synoptic"
        title={data ? tf('Synoptika ({0} prepojení)', data.links.length) : tx('Synoptika')}
        actions={
          canEdit && (
            <LinkButton to={`/events/${event.id}/synoptic`} variant="outline" size="sm">
              <Pencil className="size-4" aria-hidden />
              {data ? tx('Upraviť') : tx('Nakresliť')}
            </LinkButton>
          )
        }
      >
        {data ? (
          <div className="flex flex-col gap-2">
            <div className="max-w-3xl overflow-auto rounded-xl border bg-surface p-2 text-foreground">
              <SynopticSvg nodes={data.nodes} links={data.links} names={names} className="h-auto w-full min-w-[32rem]" />
            </div>
            {summary.length > 0 && (
              <p className="text-sm">
                <span className="font-medium">{tx('Káble')}: </span>
                {summary.map((row) => [`${row.pieces}× ${row.cable}`, row.meters ? `${row.meters.toLocaleString('sk-SK')} m` : ''].filter(Boolean).join(' ')).join(' · ')}
              </p>
            )}
            <p className="text-sm text-muted-foreground">{[tf('verzia {0}', data.version), data.updatedAt && tf('uložené {0}', formatDateTime(data.updatedAt))].filter(Boolean).join(' · ')}</p>
            <div className="flex flex-wrap gap-2">
              {(['A4', 'A3'] as const).map((paper) => (
                <Button key={paper} size="sm" variant="outline" disabled={pdf.isPending} onClick={() => pdf.mutate(paper)}>
                  <FileDown className="size-4" aria-hidden />
                  {tf('PDF {0}', paper)}
                </Button>
              ))}
            </div>
            {pdf.isError && <p role="alert" className="text-sm text-destructive">{tx('PDF sa nepodarilo vytvoriť.')}</p>}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{tx('Blokové zapojenie: pult, stageboxy, racky, zosilňovače a reproduktory s prepojeniami – signál, kábel a dĺžka. Súhrn káblov a tlač na A4 alebo A3.')}</p>
        )}
      </CollapsibleSection>
      {data && (
        <DocSharesSection
          companyId={companyId}
          docType="synoptic"
          docId={event.id}
          canEdit={canEdit}
          hint={tx('Synoptika pre technikov klubu alebo prenajímateľa – odkaz len na čítanie s poslednou uloženou verziou.')}
        />
      )}
    </>
  )
}
