import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Download, Printer } from 'lucide-react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ErrorBlock, LoadingBlock } from '@/components/feedback/QueryState'
import { Button } from '@/components/ui/button'
import { useCompany } from '@/features/companies/company-context'
import { formatDate, todayIso } from '@/lib/format'
import { equipmentKeys, fetchEquipmentList } from './api'
import type { Equipment } from './model'

const PRINT_CSS = `
@page { size: A4; margin: 12mm; @top-left { content: ""; } @top-center { content: ""; } @top-right { content: ""; } @bottom-left { content: ""; } @bottom-center { content: ""; } @bottom-right { content: ""; } }
@media print { html, body { background: #fff !important; } .amp { break-inside: avoid; } }
`

/** Riadky tabuľky presetov: všetky sloty zosilňovača (aj prázdne), aby bolo vidno, čo je voľné. */
function presetRows(amp: Equipment, nameOf: (id?: string) => string) {
  const presets = amp.attributes.ampPresets ?? []
  const slots = Math.max(amp.attributes.ampPresetSlots ?? 0, ...presets.map((preset) => preset.slot))
  return Array.from({ length: slots }, (_, index) => {
    const preset = presets.find((item) => item.slot === index + 1)
    return { slot: index + 1, name: preset?.name ?? '', speaker: nameOf(preset?.speakerId), note: preset?.note ?? '', locked: Boolean(preset?.locked) }
  })
}

/** CSV pre Excel (bodkočiarka, UTF-8 s BOM, aby sa správne zobrazila diakritika). */
function toCsv(amps: Equipment[], nameOf: (id?: string) => string) {
  const cell = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`
  const lines = [['Zosilňovač', 'Preset č.', 'Názov', 'Reprobox', 'Poznámka', 'Výrobný'].map(cell).join(';')]
  for (const amp of amps) {
    for (const row of presetRows(amp, nameOf)) lines.push([amp.name, row.slot, row.name, row.speaker, row.note, row.locked ? 'áno' : ''].map(cell).join(';'))
  }
  return String.fromCharCode(0xfeff) + lines.join(String.fromCharCode(13, 10))
}

/**
 * Tabuľka presetov digitálneho zosilňovača (napr. Crown I-Tech) na tlač a stiahnutie do Excelu.
 * /equipment/:id/presets – jeden zosilňovač; ?ids=a,b – viac naraz (napr. všetky časti rozdelenej techniky).
 */
export function AmpPresetsPrintPage() {
  const { id = '' } = useParams()
  const [params] = useSearchParams()
  const company = useCompany().active!
  const list = useQuery({ queryKey: equipmentKeys.list(company.companyId), queryFn: () => fetchEquipmentList(company.companyId) })
  if (list.isPending) return <LoadingBlock />
  if (list.isError) return <ErrorBlock message="Presety sa nepodarilo načítať." />

  const ids = (params.get('ids') ?? id).split(',').filter(Boolean)
  const all = list.data
  const amps = all.filter((item) => ids.includes(item.id) && (item.attributes.ampPresets?.length || item.attributes.ampPresetSlots))
  const nameOf = (speakerId?: string) => (speakerId ? (all.find((item) => item.id === speakerId)?.name ?? '') : '')
  const download = () => {
    const url = URL.createObjectURL(new Blob([toCsv(amps, nameOf)], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `presety-${(amps[0]?.name ?? 'zosilnovac').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.csv`
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 10_000)
  }

  return (
    <div className="min-h-dvh bg-white p-6 text-black">
      <style>{PRINT_CSS}</style>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link to={ids.length === 1 ? `/equipment/${ids[0]}` : '/equipment'} className="inline-flex items-center gap-1 text-sm text-neutral-600 hover:text-black">
          <ArrowLeft className="size-4" aria-hidden />
          Späť
        </Link>
        <div className="flex gap-2">
          <Button variant="outline" className="border-neutral-300 bg-white text-black hover:bg-neutral-100" disabled={amps.length === 0} onClick={download}>
            <Download className="size-4" aria-hidden />
            Stiahnuť (Excel)
          </Button>
          <Button disabled={amps.length === 0} onClick={() => window.print()}>
            <Printer className="size-4" aria-hidden />
            Tlačiť
          </Button>
        </div>
      </div>
      {amps.length === 0 ? (
        <p>Pri tejto technike nie sú zapísané presety.</p>
      ) : (
        amps.map((amp) => (
          <section key={amp.id} className="amp mb-8">
            <h1 className="text-xl font-bold">Presety – {amp.name}</h1>
            <p className="mb-3 text-sm text-neutral-600">
              {[company.companyName, [amp.manufacturer, amp.model].filter(Boolean).join(' '), amp.attributes.ampDeviceId && `ID ${amp.attributes.ampDeviceId}`, `vytlačené ${formatDate(todayIso())}`].filter(Boolean).join(' · ')}
            </p>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b-2 border-black text-left">
                  <th className="w-16 py-1.5 pr-2">Preset</th>
                  <th className="py-1.5 pr-2">Názov</th>
                  <th className="py-1.5 pr-2">Reprobox</th>
                  <th className="py-1.5 pr-2">Poznámka</th>
                </tr>
              </thead>
              <tbody>
                {presetRows(amp, nameOf).map((row) => (
                  <tr key={row.slot} className="border-b border-neutral-300">
                    <td className="py-1.5 pr-2 font-semibold tabular-nums">{row.slot}</td>
                    <td className="py-1.5 pr-2">
                      {row.name || <span className="text-neutral-400">voľný</span>}
                      {row.locked && <span className="ml-2 text-xs text-neutral-500">(výrobný)</span>}
                    </td>
                    <td className="py-1.5 pr-2">{row.speaker}</td>
                    <td className="py-1.5 pr-2 text-neutral-600">{row.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))
      )}
    </div>
  )
}
