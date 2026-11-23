import { useMutation, useQuery } from '@tanstack/react-query'
import { FileDown, Pencil } from 'lucide-react'
import { CollapsibleSection } from '@/components/layout/CollapsibleSection'
import { Button, LinkButton } from '@/components/ui/button'
import { fileSlug } from '@/features/cases/canvas'
import { brandingKeys, fetchBranding, fetchLogoBlob, logoForLightBackground } from '@/features/companies/branding'
import type { CompanyEvent } from '@/features/events/model'
import { usePatch } from '@/features/patch/api'
import { DocSharesSection } from '@/features/shares/DocSharesSection'
import { formatDateTime, todayIso } from '@/lib/format'
import { tf, tx } from '@/lib/i18n'
import { useStagePlot } from './api'
import { StagePlotSvg } from './StagePlotSvg'

/** Stage plán v detaile akcie: náhľad, úprava, PDF A4 / A3 a zdieľanie odkazom. */
export function EventStagePlotSection({ companyId, companyName, event, canEdit }: { companyId: string; companyName: string; event: CompanyEvent; canEdit: boolean }) {
  const plot = useStagePlot(companyId, event.id)
  const patch = usePatch(companyId, event.id)
  const branding = useQuery({ queryKey: brandingKeys.branding(companyId), queryFn: () => fetchBranding(companyId) })
  const pdf = useMutation({
    mutationFn: async (paper: 'A4' | 'A3') => {
      if (!plot.data) return
      const logoPath = branding.data?.logoPath ?? ''
      const logo = logoPath ? await fetchLogoBlob(logoPath).then(logoForLightBackground).then((blob) => createImageBitmap(blob)).catch(() => null) : null
      const { stagePlotPdf } = await import('./stagePlotPdf')
      const blob = await stagePlotPdf({
        paper,
        widthM: plot.data.widthM,
        depthM: plot.data.depthM,
        items: plot.data.items,
        note: plot.data.note,
        version: plot.data.version,
        channels: (patch.data ?? []).map((line) => ({ channel: line.channel, name: line.name })),
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
      link.download = `stage-plan-${fileSlug(event.name)}-${paper}.pdf`
      link.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 10_000)
    },
  })
  // Bez migrácie 0199 sa sekcia neukáže.
  if (plot.isError || plot.isPending) return null
  const channelName = (channel: number) => patch.data?.find((line) => line.channel === channel)?.name

  return (
    <>
      <CollapsibleSection
        id="event.stageplot"
        title={plot.data ? tf('Stage plán ({0} položiek)', plot.data.items.length) : tx('Stage plán')}
        actions={
          canEdit && (
            <LinkButton to={`/events/${event.id}/stage-plot`} variant="outline" size="sm">
              <Pencil className="size-4" aria-hidden />
              {plot.data ? tx('Upraviť') : tx('Nakresliť')}
            </LinkButton>
          )
        }
      >
        {plot.data ? (
          <div className="flex flex-col gap-2">
            <div className="max-w-2xl rounded-xl border bg-surface p-2 text-foreground">
              <StagePlotSvg widthM={plot.data.widthM} depthM={plot.data.depthM} items={plot.data.items} channelName={channelName} className="h-auto w-full" />
            </div>
            <p className="text-sm text-muted-foreground">
              {[`${plot.data.widthM.toLocaleString('sk-SK')} × ${plot.data.depthM.toLocaleString('sk-SK')} m`, tf('verzia {0}', plot.data.version), plot.data.updatedAt && tf('uložené {0}', formatDateTime(plot.data.updatedAt))].filter(Boolean).join(' · ')}
            </p>
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
          <p className="text-sm text-muted-foreground">{tx('Pôdorys pódia v mierke: bicie, aparáty, mikrofóny, monitory, DI, stagebox a elektrina – s kanálmi z input listu. Tlač na A4 alebo A3.')}</p>
        )}
      </CollapsibleSection>
      {plot.data && (
        <DocSharesSection
          companyId={companyId}
          docType="stageplot"
          docId={event.id}
          canEdit={canEdit}
          hint={tx('Stage plán pre kapelu, klub alebo prenajímateľa – odkaz len na čítanie s poslednou uloženou verziou.')}
        />
      )}
    </>
  )
}
