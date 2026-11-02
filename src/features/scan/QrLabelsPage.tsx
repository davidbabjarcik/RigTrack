import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Download, Printer } from 'lucide-react'
import { useState } from 'react'
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
import { AddToPrintButton } from '@/features/print/AddToPrintButton'
import { clampQrMm, QR_MM_MAX, QR_MM_MIN, QR_SIZE_LABELS, QR_SIZES, useCompanyPrefs, type QrSize } from '@/features/print/api'
import { cn } from '@/lib/utils'

/** Samotný QR kód ako PNG (bez textu, s malým bielym okrajom, aby sa dal naskenovať). */
async function downloadQr(item: { url: string; name: string; number: string }) {
  const canvas = await qrCanvas(item.url, 1024, 2)
  downloadCanvas(canvas, `qr-${fileSlug([item.name, item.number].filter(Boolean).join('-'))}.png`)
}

/** Rozloženie štítkov na A4 podľa veľkosti: stĺpce, veľkosť QR a písma (pri tlači na celú šírku strany). */
const SIZE_LOOK: Record<Exclude<QrSize, 'custom'>, { grid: string; card: string; qr: string; name: string; small: string }> = {
  small: { grid: 'grid-cols-3 sm:grid-cols-4 print:grid-cols-4', card: 'p-1.5', qr: 'max-w-32', name: 'text-xs', small: 'text-[10px]' },
  medium: { grid: 'grid-cols-2 sm:grid-cols-3 print:grid-cols-3', card: 'p-2', qr: 'max-w-44', name: 'text-sm', small: 'text-xs' },
  large: { grid: 'grid-cols-1 sm:grid-cols-2 print:grid-cols-2', card: 'p-4', qr: 'max-w-64', name: 'text-xl', small: 'text-sm' },
  xl: { grid: 'grid-cols-1 print:grid-cols-1', card: 'p-6 print:min-h-[125mm] justify-center', qr: 'max-w-[110mm]', name: 'text-4xl', small: 'text-lg' },
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
  const companyPrefs = useCompanyPrefs(company.companyId).data
  const [chosenSize, setSize] = useState<QrSize | null>(null)
  const size: QrSize = chosenSize ?? companyPrefs?.qrSize ?? 'medium'
  const look = SIZE_LOOK[size === 'custom' ? 'medium' : size]
  // Vlastná veľkosť: strana QR v mm, písmo sa prispôsobí; stĺpcov je toľko, koľko sa zmestí na A4.
  const [chosenMm, setMm] = useState<string | null>(null)
  const mm = clampQrMm(Number(chosenMm ?? companyPrefs?.qrMm ?? 50))
  const custom = size === 'custom'
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
  type LabelRecord = { id: string; key: string; name: string; number: string; kind: 'spot' | 'case' | 'equipment'; unit?: number; place?: string }
  // Pri technike v case aj v ktorom (napr. #3 a #4 v „Beam case #2“).
  const placeOf = (caseId: string | null) => {
    const found = caseId ? (cases.data ?? []).find((item) => item.id === caseId) : undefined
    return found ? caseTitle(found) : undefined
  }
  const records: LabelRecord[] = isSpots
    ? (plan.data?.spots ?? []).map((spot) => ({ id: spot.id, key: spot.id, name: spot.name, number: spot.levels > 1 ? `${spot.levels} poschodia` : '', kind: 'spot' as const }))
    : isCases
      ? (cases.data ?? []).map((item) => ({ id: item.id, key: item.id, name: caseTitle(item), number: item.inventoryNumber, kind: 'case' as const }))
      : // Technika po kusoch: každý kus (#1, #2…) má vlastný štítok s QR.
        (equipment.data ?? []).flatMap((item) =>
          item.trackUnits && item.quantity > 1
            ? unitIdsOf(item).map((unit) => ({ id: item.id, key: `${item.id}-${unit}`, name: `${item.name} #${unit}`, number: item.unitInfo?.[unit]?.inv ?? '', kind: 'equipment' as const, unit, place: placeOf(item.caseId) }))
            : [{ id: item.id, key: item.id, name: item.name, number: item.inventoryNumber, kind: 'equipment' as const, place: placeOf(item.caseId) }],
        )
  const items = records
    .filter((item) => ids.size === 0 || ids.has(item.id))
    .map((item) => ({ id: item.key, name: item.name, number: item.number, place: item.place, url: qrUrl({ kind: item.kind, id: item.id, unit: item.unit }, window.location.origin) }))
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
          {(isCases || type === 'equipment') && items.length > 0 && (
            <AddToPrintButton companyId={company.companyId} kind={isCases ? 'case' : 'equipment'} targetIds={[...new Set(records.filter((item) => ids.size === 0 || ids.has(item.id)).map((item) => item.id))]} />
          )}
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
          {/* Veľkosť QR na A4 – predvolená z nastavení firmy; väčšie sa ľahšie skenujú (aj iPhonom). */}
          <select aria-label="Veľkosť štítkov" className="h-10 rounded-lg border border-neutral-300 bg-white px-2 text-sm" value={size} onChange={(event) => setSize(event.target.value as QrSize)}>
            {QR_SIZES.map((value) => (
              <option key={value} value={value}>
                {QR_SIZE_LABELS[value]}
              </option>
            ))}
          </select>
          {custom && (
            <label className="flex items-center gap-1.5 text-sm">
              <input
                type="number"
                min={QR_MM_MIN}
                max={QR_MM_MAX}
                aria-label="Veľkosť QR v mm"
                className="h-10 w-20 rounded-lg border border-neutral-300 bg-white px-2"
                value={chosenMm ?? String(mm)}
                onChange={(event) => setMm(event.target.value)}
              />
              mm
            </label>
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
        <ul className={cn('grid gap-3', !custom && look.grid)} style={custom ? { gridTemplateColumns: `repeat(auto-fill, ${mm + 8}mm)`, justifyContent: 'center' } : undefined}>
          {items.map((item) => (
            <li key={item.id} className={cn('flex break-inside-avoid flex-col items-center rounded-lg border border-neutral-400 text-center', custom ? 'p-[4mm]' : look.card)}>
              <QrCode text={item.url} label={`QR kód: ${item.name}`} className={cn('w-full', !custom && look.qr)} style={custom ? { width: `${mm}mm`, maxWidth: `${mm}mm` } : undefined} />
              <p className={cn('mt-1 line-clamp-2 font-bold', !custom && look.name)} style={custom ? { fontSize: `${Math.max(2.6, mm * 0.085)}mm`, lineHeight: 1.15 } : undefined}>
                {item.name}
              </p>
              {item.place && (
                <p className={cn('font-medium', !custom && look.small)} style={custom ? { fontSize: `${Math.max(2.2, mm * 0.055)}mm` } : undefined}>
                  v {item.place}
                </p>
              )}
              <p className={cn('text-neutral-600', !custom && look.small)} style={custom ? { fontSize: `${Math.max(2.2, mm * 0.05)}mm` } : undefined}>
                {[item.number, company.companyName].filter(Boolean).join(' · ')}
              </p>
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
