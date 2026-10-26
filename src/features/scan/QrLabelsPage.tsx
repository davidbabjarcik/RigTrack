import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Download, Printer } from 'lucide-react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ErrorBlock, LoadingBlock } from '@/components/feedback/QueryState'
import { Button } from '@/components/ui/button'
import { downloadCanvas, fileSlug, qrCanvas } from '@/features/cases/canvas'
import { caseTitle } from '@/features/cases/model'
import { useCases } from '@/features/cases/useCases'
import { useCompany } from '@/features/companies/company-context'
import { equipmentKeys, fetchEquipmentList } from '@/features/equipment/api'
import { unitIdsOf } from '@/features/equipment/model'
import { QrCode } from '@/features/networks/QrCode'
import { fetchWarehouse, warehouseKeys } from '@/features/warehouse/api'
import { qrUrl } from './qr'

/** Samotný QR kód ako PNG (bez textu, s malým bielym okrajom, aby sa dal naskenovať). */
async function downloadQr(item: { url: string; name: string; number: string }) {
  const canvas = await qrCanvas(item.url, 1024, 2)
  downloadCanvas(canvas, `qr-${fileSlug([item.name, item.number].filter(Boolean).join('-'))}.png`)
}

const PRINT_CSS = `
@page { size: A4; margin: 10mm; @top-left { content: ""; } @top-center { content: ""; } @top-right { content: ""; } @bottom-left { content: ""; } @bottom-center { content: ""; } @bottom-right { content: ""; } }
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
  type LabelRecord = { id: string; key: string; name: string; number: string; kind: 'spot' | 'case' | 'equipment'; unit?: number }
  const records: LabelRecord[] = isSpots
    ? (plan.data?.spots ?? []).map((spot) => ({ id: spot.id, key: spot.id, name: spot.name, number: spot.levels > 1 ? `${spot.levels} poschodia` : '', kind: 'spot' as const }))
    : isCases
      ? (cases.data ?? []).map((item) => ({ id: item.id, key: item.id, name: caseTitle(item), number: item.inventoryNumber, kind: 'case' as const }))
      : // Technika po kusoch: každý kus (#1, #2…) má vlastný štítok s QR.
        (equipment.data ?? []).flatMap((item) =>
          item.trackUnits && item.quantity > 1
            ? unitIdsOf(item).map((unit) => ({ id: item.id, key: `${item.id}-${unit}`, name: `${item.name} #${unit}`, number: item.unitInfo?.[unit]?.inv ?? '', kind: 'equipment' as const, unit }))
            : [{ id: item.id, key: item.id, name: item.name, number: item.inventoryNumber, kind: 'equipment' as const }],
        )
  const items = records
    .filter((item) => ids.size === 0 || ids.has(item.id))
    .map((item) => ({ id: item.key, name: item.name, number: item.number, url: qrUrl({ kind: item.kind, id: item.id, unit: item.unit }, window.location.origin) }))
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
              className="border-neutral-300 bg-white text-black hover:bg-neutral-100"
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
          {(isCases || type === 'equipment') && items.length > 0 && (
            <Link
              to={`/labels/tape?${isCases ? 'cases' : 'ids'}=${[...new Set(records.filter((item) => ids.size === 0 || ids.has(item.id)).map((item) => item.id))].join(',')}`}
              className="inline-flex h-10 items-center gap-1 rounded-lg border border-neutral-300 px-3 text-sm font-medium hover:bg-neutral-100"
            >
              Na pásku Brother
            </Link>
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
