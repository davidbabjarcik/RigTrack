import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Download } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ErrorBlock, LoadingBlock } from '@/components/feedback/QueryState'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { brandingKeys, fetchBranding, fetchLogoBlob, logoForLightBackground } from '@/features/companies/branding'
import { useCompany } from '@/features/companies/company-context'
import { equipmentKeys, fetchEquipmentList } from '@/features/equipment/api'
import { cableColorKeys, fetchCableColors } from '@/features/equipment/cableColors'
import { downloadCanvas, fileSlug, qrCanvas } from './canvas'
import { caseBaseName, caseNumber } from './model'
import { qrUrl } from '@/features/scan/qr'
import { fetchPhotoBlob } from '@/features/equipment/photo'
import { buildCableMatrix, drawContentSheet, matrixPages, SHEET_HEIGHT, SHEET_LAYOUT_LABELS, SHEET_LAYOUTS, SHEET_WIDTH, type SheetLayout } from './contentSheet'

const LAYOUT_KEY = 'rigtrack.sheetLayout'
import { useCases } from './useCases'
import { cn } from '@/lib/utils'

export function CaseContentSheetPage() {
  const { id = '' } = useParams()
  const company = useCompany().active!
  const companyId = company.companyId
  const canvases = useRef<(HTMLCanvasElement | null)[]>([])
  const [drawn, setDrawn] = useState(false)
  // Viac typov káblov (napr. XLR a Jack): spolu, pod sebou, alebo každý na vlastný hárok. Pamätá sa v prehliadači.
  const [layout, setLayoutState] = useState<SheetLayout>(() => {
    try {
      const saved = localStorage.getItem(LAYOUT_KEY)
      return SHEET_LAYOUTS.includes(saved as SheetLayout) ? (saved as SheetLayout) : 'together'
    } catch {
      return 'together'
    }
  })
  const setLayout = (next: SheetLayout) => {
    setLayoutState(next)
    try {
      localStorage.setItem(LAYOUT_KEY, next)
    } catch {
      // Bez úložiska sa voľba len nezapamätá.
    }
  }

  const cases = useCases(companyId)
  const equipment = useQuery({ queryKey: equipmentKeys.list(companyId), queryFn: () => fetchEquipmentList(companyId) })
  const colors = useQuery({ queryKey: cableColorKeys.list(companyId), queryFn: () => fetchCableColors(companyId) })
  const branding = useQuery({ queryKey: brandingKeys.branding(companyId), queryFn: () => fetchBranding(companyId) })
  const logoPath = branding.data?.logoPath ?? ''
  const logo = useQuery({
    queryKey: brandingKeys.logo(companyId, logoPath),
    // Štítok aj hárok sú biele: svetlé logo sa na ne prefarbí na čierno.
    queryFn: async () => logoForLightBackground(await fetchLogoBlob(logoPath)),
    enabled: Boolean(logoPath),
    staleTime: Infinity,
  })

  const current = cases.data?.find((c) => c.id === id)
  const matrix = useMemo(
    () => buildCableMatrix((equipment.data ?? []).filter((item) => item.caseId === id)),
    [equipment.data, id],
  )
  const logoSettled = !logoPath || logo.isSuccess || logo.isError
  const ready = Boolean(current && equipment.data && colors.data && branding.data && logoSettled)

  const pages = useMemo(() => (layout === 'pages' ? matrixPages(matrix) : [matrix]), [layout, matrix])

  useEffect(() => {
    if (!ready || !current) return
    let cancelled = false
    void (async () => {
      const bitmap = logo.data ? await createImageBitmap(logo.data).catch(() => null) : null
      // Fotky príslušenstva na karty (bez fotky ostane karta len s názvom a počtom).
      const photos = new Map<string, ImageBitmap>()
      await Promise.all(
        [...new Set(pages.flatMap((page) => page.others).map((item) => item.photoPath).filter((path): path is string => Boolean(path)))].map(async (path) => {
          const image = await fetchPhotoBlob(path)
            .then((blob) => createImageBitmap(blob))
            .catch(() => null)
          if (image) photos.set(path, image)
        }),
      )
      const qr = await qrCanvas(qrUrl({ kind: 'case', id: current.id }, window.location.origin), 520, 0).catch(() => null)
      if (cancelled) return
      // Súhrn: kusov v case a hmotnosť (prázdny case + technika so zadanou váhou).
      const inside = (equipment.data ?? []).filter((item) => item.caseId === current.id)
      const gearKg = inside.reduce((sum, item) => sum + (item.attributes.weightKg ?? 0) * item.quantity, 0)
      pages.forEach((page, index) => {
        const target = canvases.current[index]
        if (!target) return
        drawContentSheet(target, {
        caseName: caseBaseName(current),
        caseNumber: caseNumber(current),
        qr,
        totalPieces: inside.reduce((sum, item) => sum + item.quantity, 0),
        weightKg: (current.weightKg ?? 0) + gearKg || null,
        matrix: page,
        layout: layout === 'stacked' ? 'stacked' : 'together',
        colors: colors.data ?? [],
        footer: branding.data?.labelFooter ?? '',
        logo: bitmap,
        companyName: company.companyName,
        photos,
        })
      })
      bitmap?.close()
      photos.forEach((image) => image.close())
      setDrawn(true)
    })()
    return () => {
      cancelled = true
    }
  }, [ready, current, matrix, pages, layout, colors.data, branding.data, logo.data, company.companyName, equipment.data])

  const back = (
    <Link to={`/cases/${id}`} className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
      <ArrowLeft className="size-4" aria-hidden />
      Späť na case
    </Link>
  )

  if (cases.isPending || equipment.isPending || colors.isPending || branding.isPending) return <LoadingBlock />
  if (cases.isError || equipment.isError || colors.isError || branding.isError) {
    return <ErrorBlock message="Údaje pre hárok sa nepodarilo načítať." onRetry={() => void cases.refetch()} />
  }
  if (!current) {
    return (
      <>
        {back}
        <ErrorBlock message="Tento case neexistuje alebo k nemu nemáte prístup." />
      </>
    )
  }

  const missingColors = matrix.rows.filter((row) => !colors.data.some((color) => color.lengthM === row.lengthM)).length
  const baseName = `flightcase-content-${fileSlug([current.name, current.labelNumber].filter(Boolean).join('-'))}`
  const download = async () => {
    for (const [index, target] of canvases.current.slice(0, pages.length).entries()) {
      if (!target) continue
      downloadCanvas(target, pages.length > 1 ? `${baseName}-${index + 1}-${fileSlug(pages[index].columns[0] ?? '')}.png` : `${baseName}.png`)
      await new Promise((resolve) => setTimeout(resolve, 300))
    }
  }

  return (
    <>
      {back}
      <PageHeader
        title="Flightcase content"
        description={`${current.name} · A4 na výšku (${SHEET_WIDTH} × ${SHEET_HEIGHT} px)`}
        action={
          <Button disabled={!drawn} onClick={() => void download()}>
            <Download className="size-4" aria-hidden />
            {pages.length > 1 ? `Stiahnuť PNG (${pages.length})` : 'Stiahnuť PNG'}
          </Button>
        }
      />
      {matrix.rows.length === 0 && matrix.others.length === 0 && (
        <p role="status" className="mb-3 rounded-lg border border-accent/40 bg-accent/10 p-3 text-sm">
          Case je prázdny, hárok nemá čo zobraziť.
        </p>
      )}
      {missingColors > 0 && (
        <p role="status" className="mb-3 rounded-lg border border-accent/40 bg-accent/10 p-3 text-sm">
          {missingColors === 1 ? 'Jedna dĺžka nemá' : `${missingColors} dĺžky nemajú`} priradenú farbu. Farbu dĺžky
          nastavíte v úprave ľubovoľného kábla s touto dĺžkou.
        </p>
      )}
      {matrix.columns.length > 1 && (
        <div role="radiogroup" aria-label="Viac typov káblov na hárku" className="mx-auto mb-3 flex w-full max-w-2xl flex-wrap gap-1 rounded-lg bg-muted p-1">
          {SHEET_LAYOUTS.map((value) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={layout === value}
              onClick={() => setLayout(value)}
              className={cn('h-9 flex-1 rounded-md px-3 text-sm', layout === value ? 'bg-surface font-medium shadow-sm' : 'text-muted-foreground hover:text-foreground')}
            >
              {SHEET_LAYOUT_LABELS[value]}
            </button>
          ))}
        </div>
      )}
      <div className="flex flex-col gap-4">
        {pages.map((page, index) => (
          <canvas
            key={`${layout}-${index}`}
            ref={(element) => {
              canvases.current[index] = element
            }}
            width={SHEET_WIDTH}
            height={SHEET_HEIGHT}
            aria-label={`Náhľad hárku s obsahom pre ${current.name}${pages.length > 1 ? ` – ${page.columns[0] ?? ''}` : ''}`}
            className="mx-auto h-auto w-full max-w-2xl rounded-lg border bg-white"
          />
        ))}
      </div>
      <p className="mt-3 text-sm text-muted-foreground">
        Káble sú v tabuľke podľa dĺžky a typu (konektora), príslušenstvo ako karty s fotkou pod ňou. Vpravo hore je číslo
        case a QR kód, dole súhrn kusov, hmotnosť (case a technika so zadanou váhou) a miesto na podpis a dátum kontroly.
        Hárok je vo veľkosti A4 a dá sa vytlačiť aj zmenšený na A5.
      </p>
    </>
  )
}
