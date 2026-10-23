import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Download, Printer } from 'lucide-react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ErrorBlock, LoadingBlock } from '@/components/feedback/QueryState'
import { Button } from '@/components/ui/button'
import { downloadCanvas, fileSlug, qrCanvas } from '@/features/cases/canvas'
import { useCases } from '@/features/cases/useCases'
import { useCompany } from '@/features/companies/company-context'
import { equipmentKeys, fetchEquipmentList } from '@/features/equipment/api'
import { QrCode } from '@/features/networks/QrCode'
import { fetchWarehouse, warehouseKeys } from '@/features/warehouse/api'
import { qrUrl } from './qr'

/** Samotný QR kód ako PNG (bez textu, s malým bielym okrajom, aby sa dal naskenovať). */
async function downloadQr(item: { url: string; name: string; number: string }) {
  const canvas = await qrCanvas(item.url, 1024, 2)
  downloadCanvas(canvas, `qr-${fileSlug([item.name, item.number].filter(Boolean).join('-'))}.png`)
}

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
  const isSpots = type === 'spots'
  const cases = useCases(companyId)
  const equipment = useQuery({ queryKey: equipmentKeys.list(companyId), queryFn: () => fetchEquipmentList(companyId), enabled: !isCases && !isSpots })
  const plan = useQuery({ queryKey: warehouseKeys.plan(companyId), queryFn: () => fetchWarehouse(companyId), enabled: isSpots })
  const source = isSpots ? plan : isCases ? cases : equipment
  if (source.isPending) return <LoadingBlock />
  if (source.isError) return <ErrorBlock message="Štítky sa nepodarilo načítať." />

  const ids = new Set((params.get('ids') ?? '').split(',').filter(Boolean))
  const records = isSpots
    ? (plan.data?.spots ?? []).map((spot) => ({ id: spot.id, name: spot.name, number: spot.levels > 1 ? `${spot.levels} poschodia` : '', kind: 'spot' as const }))
    : (isCases ? (cases.data ?? []) : (equipment.data ?? [])).map((item) => ({ id: item.id, name: item.name, number: item.inventoryNumber, kind: isCases ? ('case' as const) : ('equipment' as const) }))
  const items = records
    .filter((item) => ids.size === 0 || ids.has(item.id))
    .map((item) => ({ id: item.id, name: item.name, number: item.number, url: qrUrl({ kind: item.kind, id: item.id }, window.location.origin) }))
    .sort((a, b) => a.name.localeCompare(b.name, 'sk', { numeric: true }))
  const base = isSpots ? '/warehouse' : `/${isCases ? 'cases' : 'equipment'}`
  const back = ids.size === 1 && !isSpots ? `${base}/${[...ids][0]}` : base

  return (
    <div className="min-h-dvh bg-white p-6 text-black">
      <style>{PRINT_CSS}</style>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link to={back} className="inline-flex items-center gap-1 text-sm text-neutral-600 hover:text-black">
          <ArrowLeft className="size-4" aria-hidden />
          Späť
        </Link>
        <p className="text-sm text-neutral-600">{items.length} štítkov · QR otvorí detail v appke</p>
        <div className="flex flex-wrap gap-2">
          {items.length > 0 && (
            <Button
              variant="outline"
              title="Stiahne každý QR kód ako samostatný PNG obrázok (prehliadač sa môže spýtať, či povoliť viac súborov)"
              onClick={async () => {
                for (const item of items) {
                  await downloadQr(item)
                  await new Promise((resolve) => setTimeout(resolve, 300))
                }
              }}
            >
              <Download className="size-4" aria-hidden />
              {items.length === 1 ? 'Stiahnuť QR (PNG)' : `Stiahnuť všetky QR (${items.length} PNG)`}
            </Button>
          )}
          <Button onClick={() => window.print()}>
            <Printer className="size-4" aria-hidden />
            Tlačiť
          </Button>
        </div>
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
              <button type="button" className="mt-1 inline-flex items-center gap-1 text-xs text-neutral-600 hover:text-black print:hidden" onClick={() => void downloadQr(item)}>
                <Download className="size-3.5" aria-hidden />
                PNG
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
