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
import { cn } from '@/lib/utils'
import { useRfPlan } from './api'
import { analyze, formatMhz, toKhz, tvChannelOf } from './rf'
import { Spectrum } from './Spectrum'

/** HF plán v detaile akcie: frekvencie, kolízie, PDF a zdieľanie odkazom. */
export function EventRfPlanSection({ companyId, companyName, event, canEdit }: { companyId: string; companyName: string; event: CompanyEvent; canEdit: boolean }) {
  const plan = useRfPlan(companyId, event.id)
  const equipment = useQuery({ queryKey: equipmentKeys.list(companyId), queryFn: () => fetchEquipmentList(companyId) })
  const branding = useQuery({ queryKey: brandingKeys.branding(companyId), queryFn: () => fetchBranding(companyId) })
  const names = Object.fromEntries((equipment.data ?? []).map((item) => [item.id, item.name]))
  const pdf = useMutation({
    mutationFn: async () => {
      if (!plan.data) return
      const logoPath = branding.data?.logoPath ?? ''
      const logo = logoPath ? await fetchLogoBlob(logoPath).then(logoForLightBackground).then((blob) => createImageBitmap(blob)).catch(() => null) : null
      const { rfPdf } = await import('./rfPdf')
      const blob = await rfPdf({
        ...plan.data,
        names,
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
      link.download = `hf-plan-${fileSlug(event.name)}.pdf`
      link.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 10_000)
    },
  })
  if (plan.isError || plan.isPending) return null
  const data = plan.data
  const issues = data ? analyze(data.channels, data.settings, data.excludedTv) : new Map()
  const problems = [...issues.values()].filter((list) => list.some((issue: { kind: string }) => issue.kind !== 'missing')).length

  return (
    <>
      <CollapsibleSection
        id="event.rfplan"
        title={data ? tf('HF plán ({0} kanálov)', data.channels.length) : tx('HF plán')}
        actions={
          canEdit && (
            <LinkButton to={`/events/${event.id}/rf`} variant="outline" size="sm">
              <Pencil className="size-4" aria-hidden />
              {data ? tx('Upraviť') : tx('Vytvoriť')}
            </LinkButton>
          )
        }
      >
        {data ? (
          <div className="flex flex-col gap-2">
            <div className="max-w-3xl rounded-xl border bg-surface p-2 text-foreground">
              <Spectrum channels={data.channels} settings={data.settings} excludedTv={data.excludedTv} className="h-auto w-full" />
            </div>
            <p className={cn('text-sm font-medium', problems > 0 ? 'text-destructive' : 'text-emerald-700 dark:text-emerald-400')}>{problems > 0 ? tf('Kanály s problémom: {0}', problems) : tx('Bez kolízií v zadaných frekvenciách.')}</p>
            <ul className="grid gap-x-6 text-sm sm:grid-cols-2">
              {[...data.channels].sort((a, b) => (a.freq_mhz ?? 1e9) - (b.freq_mhz ?? 1e9)).map((channel) => (
                <li key={channel.id} className="flex gap-2 border-b py-1">
                  <span className="w-20 shrink-0 font-mono font-semibold">{channel.freq_mhz === null ? '—' : formatMhz(toKhz(channel.freq_mhz))}</span>
                  <span className="min-w-0 flex-1 truncate">{channel.name}</span>
                  <span className="text-muted-foreground">{channel.freq_mhz === null ? '' : `TV ${tvChannelOf(toKhz(channel.freq_mhz)) ?? '–'}`}</span>
                </li>
              ))}
            </ul>
            <p className="text-sm text-muted-foreground">{[tf('verzia {0}', data.version), data.updatedAt && tf('uložené {0}', formatDateTime(data.updatedAt))].filter(Boolean).join(' · ')}</p>
            <div>
              <Button size="sm" variant="outline" disabled={pdf.isPending} onClick={() => pdf.mutate()}>
                <FileDown className="size-4" aria-hidden />PDF
              </Button>
            </div>
            {pdf.isError && <p role="alert" className="text-sm text-destructive">{tx('PDF sa nepodarilo vytvoriť.')}</p>}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{tx('Frekvencie bezdrôtových mikrofónov a IEM: kontrola odstupov a intermodulácií, vylúčenie vysielaných TV kanálov a návrh frekvencií.')}</p>
        )}
      </CollapsibleSection>
      {data && (
        <DocSharesSection companyId={companyId} docType="rfplan" docId={event.id} canEdit={canEdit} hint={tx('HF plán pre koordinátora frekvencií alebo techniku klubu – odkaz len na čítanie s poslednou uloženou verziou.')} />
      )}
    </>
  )
}
