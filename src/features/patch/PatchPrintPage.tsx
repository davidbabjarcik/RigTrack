import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Printer } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { ErrorBlock, LoadingBlock } from '@/components/feedback/QueryState'
import { Button } from '@/components/ui/button'
import { useCapsules } from '@/features/capsules/api'
import { useCompany } from '@/features/companies/company-context'
import { equipmentKeys, fetchEquipmentList } from '@/features/equipment/api'
import { useEvents } from '@/features/events/useEvents'
import { formatDate } from '@/lib/format'
import { usePatch } from './api'
import { describeSource, patchSummary, STAND_LABELS } from './model'

// Tlačí sa z prehliadača (Tlačiť → Uložiť ako PDF), vždy čierna na bielom.
const PRINT_CSS = `
@page { size: A4; margin: 12mm; @top-left { content: ""; } @top-center { content: ""; } @top-right { content: ""; } @bottom-left { content: ""; } @bottom-center { content: ""; } @bottom-right { content: ""; } }
@media print { html, body { background: #fff !important; } }
`

/** Patch list eventu na A4 – na tlač alebo PDF. */
export function PatchPrintPage() {
  const { id = '' } = useParams()
  const company = useCompany().active!
  const companyId = company.companyId
  const events = useEvents(companyId)
  const patch = usePatch(companyId, id)
  const equipment = useQuery({ queryKey: equipmentKeys.list(companyId), queryFn: () => fetchEquipmentList(companyId) })
  const capsules = useCapsules(companyId)

  if (events.isPending || patch.isPending) return <LoadingBlock />
  const event = events.data?.find((item) => item.id === id)
  if (!event || patch.isError) return <ErrorBlock message="Patch list sa nepodarilo načítať." />

  const equipmentName = (equipmentId: string) => equipment.data?.find((item) => item.id === equipmentId)?.name
  const capsuleName = (capsuleId: string) => {
    const capsule = capsules.data?.find((item) => item.id === capsuleId)
    return capsule ? [capsule.manufacturer, capsule.name].filter(Boolean).join(' ') : undefined
  }
  const summary = patchSummary(patch.data, equipmentName, capsuleName)

  return (
    <div className="min-h-dvh bg-white p-6 text-black">
      <style>{PRINT_CSS}</style>
      <div className="mb-4 flex items-center justify-between gap-3 print:hidden">
        <Link to={`/events/${id}`} className="inline-flex items-center gap-1 text-sm text-neutral-600 hover:text-black">
          <ArrowLeft className="size-4" aria-hidden />
          Späť na event
        </Link>
        <Button onClick={() => window.print()}>
          <Printer className="size-4" aria-hidden />
          Tlačiť / PDF
        </Button>
      </div>
      <header className="mb-4 border-b border-neutral-400 pb-2">
        <h1 className="text-xl font-bold">Patch list – {event.name}</h1>
        <p className="text-sm text-neutral-700">
          {[event.startsOn === event.endsOn ? formatDate(event.startsOn) : `${formatDate(event.startsOn)} – ${formatDate(event.endsOn)}`, event.venue, company.companyName].filter(Boolean).join(' · ')}
        </p>
      </header>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b-2 border-black text-left">
            <th className="w-10 py-1 pr-2">Ch</th>
            <th className="py-1 pr-2">Čo</th>
            <th className="py-1 pr-2">Stagebox</th>
            <th className="py-1 pr-2">Zdroj</th>
            <th className="py-1 pr-2">Stojan</th>
            <th className="py-1 pr-2">48V</th>
            <th className="py-1">Poznámka</th>
          </tr>
        </thead>
        <tbody>
          {patch.data.map((line) => (
            <tr key={line.id} className="border-b border-neutral-300 align-top">
              <td className="py-1 pr-2 font-mono font-bold">{line.channel}</td>
              <td className="py-1 pr-2 font-medium">{line.name}</td>
              <td className="py-1 pr-2 font-mono">{[line.stagebox, line.stageboxInput].filter((value) => value !== null && value !== '').join(' / ')}</td>
              <td className="py-1 pr-2">{describeSource(line, equipmentName, capsuleName)}</td>
              <td className="py-1 pr-2">{line.stand ? STAND_LABELS[line.stand] : ''}</td>
              <td className="py-1 pr-2">{line.phantom ? '✓' : ''}</td>
              <td className="py-1">{line.note}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {summary.items.length > 0 && (
        <section className="mt-5 break-inside-avoid">
          <h2 className="text-xs font-semibold tracking-wide text-neutral-600 uppercase">Na prípravu</h2>
          <ul className="mt-1 columns-2 text-sm">
            {summary.items.map(([name, count]) => (
              <li key={name}>
                {count}× {name}
              </li>
            ))}
            {summary.phantom > 0 && <li>Phantom 48 V: {summary.phantom} kanálov</li>}
            {summary.stageboxes.length > 0 && <li>Stageboxy: {summary.stageboxes.join(', ')}</li>}
          </ul>
        </section>
      )}
    </div>
  )
}
