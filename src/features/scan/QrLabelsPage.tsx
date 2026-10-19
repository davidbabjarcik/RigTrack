import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Printer } from 'lucide-react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ErrorBlock, LoadingBlock } from '@/components/feedback/QueryState'
import { Button } from '@/components/ui/button'
import { useCases } from '@/features/cases/useCases'
import { useCompany } from '@/features/companies/company-context'
import { equipmentKeys, fetchEquipmentList } from '@/features/equipment/api'
import { QrCode } from '@/features/networks/QrCode'
import { qrUrl } from './qr'

const PRINT_CSS = `
@page { size: A4; margin: 10mm; }
@media print { html, body { background: #fff !important; } }
`

/** QR štítky na tlač (3 v rade): jeden kus (?ids=…) alebo všetky cases / všetka technika. */
export function QrLabelsPage() {
  const { type = 'cases' } = useParams()
  const [params] = useSearchParams()
  const company = useCompany().active!
  const companyId = company.companyId
  const isCases = type === 'cases'
  const cases = useCases(companyId)
  const equipment = useQuery({ queryKey: equipmentKeys.list(companyId), queryFn: () => fetchEquipmentList(companyId), enabled: !isCases })
  const source = isCases ? cases : equipment
  if (source.isPending) return <LoadingBlock />
  if (source.isError) return <ErrorBlock message="Štítky sa nepodarilo načítať." />

  const ids = new Set((params.get('ids') ?? '').split(',').filter(Boolean))
  const items = (isCases ? (cases.data ?? []) : (equipment.data ?? []))
    .filter((item) => ids.size === 0 || ids.has(item.id))
    .map((item) => ({
      id: item.id,
      name: item.name,
      number: item.inventoryNumber,
      url: qrUrl({ kind: isCases ? 'case' : 'equipment', id: item.id }, window.location.origin),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'sk', { numeric: true }))
  const back = ids.size === 1 ? `/${isCases ? 'cases' : 'equipment'}/${[...ids][0]}` : `/${isCases ? 'cases' : 'equipment'}`

  return (
    <div className="min-h-dvh bg-white p-6 text-black">
      <style>{PRINT_CSS}</style>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link to={back} className="inline-flex items-center gap-1 text-sm text-neutral-600 hover:text-black">
          <ArrowLeft className="size-4" aria-hidden />
          Späť
        </Link>
        <p className="text-sm text-neutral-600">{items.length} štítkov · QR otvorí detail v appke</p>
        <Button onClick={() => window.print()}>
          <Printer className="size-4" aria-hidden />
          Tlačiť
        </Button>
      </div>
      {items.length === 0 ? (
        <p>Nie je čo tlačiť.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 print:grid-cols-3">
          {items.map((item) => (
            <li key={item.id} className="flex break-inside-avoid flex-col items-center rounded-lg border border-neutral-400 p-2 text-center">
              <QrCode text={item.url} label={`QR kód: ${item.name}`} className="w-full max-w-44" />
              <p className="mt-1 line-clamp-2 text-sm font-semibold">{item.name}</p>
              <p className="text-xs text-neutral-600">{[item.number, company.companyName].filter(Boolean).join(' · ')}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
