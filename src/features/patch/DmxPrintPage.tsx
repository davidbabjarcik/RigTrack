import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Printer } from 'lucide-react'
import { equipmentKeys, fetchEquipmentList } from '@/features/equipment/api'
import { dipOn } from '@/features/labels/tape'
import { portsForUniverse } from '@/features/equipment/dmxNode'
import { Link, useParams } from 'react-router-dom'
import { ErrorBlock, LoadingBlock } from '@/components/feedback/QueryState'
import { Button } from '@/components/ui/button'
import { useCompany } from '@/features/companies/company-context'
import { useEvents } from '@/features/events/useEvents'
import { formatDate } from '@/lib/format'
import { dmxConflicts, lastAddress } from './dmx'
import { useDmxPatch } from './dmxApi'

const PRINT_CSS = `
@page { size: A4; margin: 12mm; @top-left { content: ""; } @top-center { content: ""; } @top-right { content: ""; } @bottom-left { content: ""; } @bottom-center { content: ""; } @bottom-right { content: ""; } }
@media print { html, body { background: #fff !important; } }
`

const pad = (value: number | null) => (value ? String(value).padStart(3, '0') : '')

/** DMX patch list eventu na A4 – po linkách, s adresami od–do a súhrnom kanálov. */
export function DmxPrintPage() {
  const { id = '' } = useParams()
  const company = useCompany().active!
  const companyId = company.companyId
  const events = useEvents(companyId)
  const patch = useDmxPatch(companyId, id)
  // Svetlá s DIP prepínačmi: na papieri aj ktoré prepínače zapnúť.
  const equipment = useQuery({ queryKey: equipmentKeys.list(companyId), queryFn: () => fetchEquipmentList(companyId) })
  const nodes = (equipment.data ?? []).filter((item) => item.attributes.nodePorts?.length)
  const outputsOf = (universe: string) => (universe !== '' && Number.isFinite(Number(universe)) ? portsForUniverse(nodes, Number(universe)) : [])
  const dipOf = (equipmentId: string | null, address: number | null) => {
    const count = equipment.data?.find((item) => item.id === equipmentId)?.attributes.dipSwitches
    return count && address ? dipOn(address, count) : ''
  }

  if (events.isPending || patch.isPending) return <LoadingBlock />
  const event = events.data?.find((item) => item.id === id)
  if (!event || patch.isError) return <ErrorBlock message="DMX patch list sa nepodarilo načítať." />

  const conflicts = dmxConflicts(patch.data)
  const universes = [...new Set(patch.data.map((line) => line.universe))]

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
        <h1 className="text-xl font-bold">DMX patch list – {event.name}</h1>
        <p className="text-sm text-neutral-700">
          {[event.startsOn === event.endsOn ? formatDate(event.startsOn) : `${formatDate(event.startsOn)} – ${formatDate(event.endsOn)}`, event.venue, company.companyName].filter(Boolean).join(' · ')}
        </p>
      </header>
      {universes.map((universe) => {
        const lines = patch.data.filter((line) => line.universe === universe)
        const used = lines.reduce((sum, line) => sum + line.channels, 0)
        return (
          <section key={universe || '-'} className="mb-5 break-inside-avoid">
            <h2 className="mb-1 text-sm font-bold">
              Linka {universe || '–'} <span className="font-normal text-neutral-600">· {lines.length} svetiel · {used} / 512 kanálov</span>
            </h2>
            {/* Ktoré nody (Art-Net / sACN) túto universe posielajú a na ktorom porte. */}
            {outputsOf(universe).length > 0 && (
              <p className="mb-1 text-xs text-neutral-700">
                Výstup: {outputsOf(universe).map((item) => `${item.node.name} port ${item.port}${item.protocol ? ` (${item.protocol === 'artnet' ? 'Art-Net' : 'sACN'})` : ''}`).join(', ')}
              </p>
            )}
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b-2 border-black text-left">
                  <th className="w-24 py-1 pr-2">Adresa</th>
                  <th className="py-1 pr-2">Svetlo</th>
                  <th className="py-1 pr-2">Mód</th>
                  <th className="w-12 py-1 pr-2">Ch</th>
                  <th className="py-1 pr-2">DIP ON</th>
                  <th className="py-1">Poznámka</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => (
                  <tr key={line.id} className="border-b border-neutral-300 align-top">
                    <td className="py-1 pr-2 font-mono font-bold">
                      {pad(line.address)}
                      {line.address && line.channels > 1 && <span className="font-normal">–{pad(lastAddress(line))}</span>}
                      {conflicts.has(line.id) && ' ⚠'}
                    </td>
                    <td className="py-1 pr-2 font-medium">{line.name}</td>
                    <td className="py-1 pr-2">{line.mode}</td>
                    <td className="py-1 pr-2">{line.channels}</td>
                    <td className="py-1 pr-2 font-mono">{dipOf(line.equipmentId, line.address)}</td>
                    <td className="py-1">{line.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )
      })}
      {conflicts.size > 0 && <p className="text-sm">⚠ Adresa sa prekrýva s iným svetlom na tej istej linke alebo presahuje 512.</p>}
    </div>
  )
}
