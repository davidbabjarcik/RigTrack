import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Download } from 'lucide-react'
import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ErrorBlock, LoadingBlock } from '@/components/feedback/QueryState'
import { PaperSheet } from '@/components/print/PaperSheet'
import { PrintButton } from '@/components/print/PrintButton'
import { Button } from '@/components/ui/button'
import { useCompany } from '@/features/companies/company-context'
import { formatDate, formatMoney, todayIso } from '@/lib/format'
import { equipmentKeys, fetchEquipmentList } from './api'
import { soldCsv, soldForYear, soldYears } from './value'

const PRINT_CSS = `
@page { size: A4 landscape; margin: 12mm; @top-left { content: ""; } @top-center { content: ""; } @top-right { content: ""; } @bottom-left { content: ""; } @bottom-center { content: ""; } @bottom-right { content: ""; } }
@media print { html, body { background: #fff !important; } tr { break-inside: avoid; } }
`

/** Predaná technika pre účtovníka: čo, komu, kedy a za koľko – na tlač (PDF) a do Excelu, po rokoch. */
export function SoldPrintPage() {
  const sheet = useRef<HTMLDivElement>(null)
  const company = useCompany().active!
  const list = useQuery({ queryKey: equipmentKeys.list(company.companyId), queryFn: () => fetchEquipmentList(company.companyId) })
  const [chosen, setChosen] = useState<string | null>(null)
  if (list.isPending) return <LoadingBlock />
  if (list.isError) return <ErrorBlock message="Predanú techniku sa nepodarilo načítať." />

  const years = soldYears(list.data)
  const year = chosen ?? years[0] ?? todayIso().slice(0, 4)
  const summary = soldForYear(list.data, year)
  const money = (value: number | null) => (value === null ? '' : formatMoney(value, 'EUR'))
  const extra = (id: string) => {
    const item = list.data.find((candidate) => candidate.id === id)
    return { serial: item?.serialNumber ?? '', inventory: item?.inventoryNumber ?? '' }
  }
  const fileName = `predana-technika-${year || 'vsetko'}`
  const download = () => {
    const url = URL.createObjectURL(new Blob([soldCsv(summary.rows, extra)], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `${fileName}.csv`
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 10_000)
  }

  return (
    <div className="min-h-dvh bg-muted p-2 text-black sm:p-6 print:bg-white print:p-0">
      <style>{PRINT_CSS}</style>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link to="/stats" className="inline-flex items-center gap-1 text-sm text-neutral-600 hover:text-black">
          <ArrowLeft className="size-4" aria-hidden />
          Späť
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-sm">
            Rok
            <select className="h-9 rounded-lg border border-neutral-300 bg-white px-2" value={year} onChange={(changed) => setChosen(changed.target.value)}>
              {(years.length > 0 ? years : [year]).filter(Boolean).map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
              <option value="">Všetky roky</option>
            </select>
          </label>
          <Button variant="outline" className="border-neutral-300 bg-white text-black hover:bg-neutral-100" disabled={summary.count === 0} onClick={download}>
            <Download className="size-4" aria-hidden />
            Stiahnuť (Excel)
          </Button>
          <PrintButton sheet={sheet} fileName={fileName} marginMm={12} landscape disabled={summary.count === 0} label="Tlačiť" />
        </div>
      </div>
      <PaperSheet sheetRef={sheet} marginMm={12} landscape>
        <h1 className="text-xl font-bold">Predaná technika{year ? ` ${year}` : ''}</h1>
        <p className="mb-3 text-sm text-neutral-600">{[company.companyName, `vytlačené ${formatDate(todayIso())}`].join(' · ')}</p>
        {summary.count === 0 ? (
          <p>Za toto obdobie sa nič nepredalo.</p>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b-2 border-black text-left">
                <th className="py-1.5 pr-2">Dátum</th>
                <th className="py-1.5 pr-2">Technika</th>
                <th className="py-1.5 pr-2">Výr. č. / inv. č.</th>
                <th className="py-1.5 pr-2">Kupujúci</th>
                <th className="py-1.5 pr-2 text-right">Kúpené</th>
                <th className="py-1.5 pr-2 text-right">Predané</th>
                <th className="py-1.5 text-right">Rozdiel</th>
              </tr>
            </thead>
            <tbody>
              {summary.rows.map((row) => (
                <tr key={row.id} className="border-b border-neutral-300">
                  <td className="py-1.5 pr-2 tabular-nums">{row.soldOn ? formatDate(row.soldOn) : ''}</td>
                  <td className="py-1.5 pr-2 font-medium">{row.name}</td>
                  <td className="py-1.5 pr-2 text-neutral-600">{[extra(row.id).serial, extra(row.id).inventory].filter(Boolean).join(' / ')}</td>
                  <td className="py-1.5 pr-2">{row.soldTo}</td>
                  <td className="py-1.5 pr-2 text-right tabular-nums">{money(row.bought)}</td>
                  <td className="py-1.5 pr-2 text-right tabular-nums">{money(row.sold)}</td>
                  <td className="py-1.5 text-right tabular-nums">{money(row.gain)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-black font-semibold">
                <td className="py-1.5 pr-2" colSpan={4}>Spolu ({summary.count} ks{summary.unpriced > 0 ? `, ${summary.unpriced} bez sumy` : ''})</td>
                <td className="py-1.5 pr-2 text-right tabular-nums">{money(summary.bought)}</td>
                <td className="py-1.5 pr-2 text-right tabular-nums">{money(summary.sold)}</td>
                <td className="py-1.5 text-right tabular-nums">{money(summary.gain)}</td>
              </tr>
            </tfoot>
          </table>
        )}
      </PaperSheet>
    </div>
  )
}
