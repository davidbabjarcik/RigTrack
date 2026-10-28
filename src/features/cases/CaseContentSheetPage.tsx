import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, ChevronDown, ChevronUp, Download } from 'lucide-react'
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
import { withoutWhiteBackground } from './removeBackground'
import { buildCableMatrix, DEFAULT_SHOW, drawContentSheet, matrixPages, orderColumns, SHEET_PART_LABELS, SHEET_PARTS, type SheetShow, SHEET_HEIGHT, SHEET_LAYOUT_LABELS, SHEET_LAYOUTS, SHEET_WIDTH, type SheetLayout } from './contentSheet'

const LAYOUT_KEY = 'rigtrack.sheetLayout'
const PAPERS = ['A4', 'A5'] as const
type Paper = (typeof PAPERS)[number]
/** A5 pri 300 dpi. */
const A5_WIDTH = 1748
const A5_HEIGHT = 2480

/** Zmenšená kópia hárku (napr. na A5). */
function scaled(source: HTMLCanvasElement, width: number, height: number) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(source, 0, 0, width, height)
  return canvas
}
const ORDER_KEY = 'rigtrack.sheetOrder'
const SHOW_KEY = 'rigtrack.sheetShow'
const ORIENTATION_KEY = 'rigtrack.sheetOrientation'
import { useCases } from './useCases'
import { cn } from '@/lib/utils'

export function CaseContentSheetPage() {
  const { id = '' } = useParams()
  const company = useCompany().active!
  const companyId = company.companyId
  const canvases = useRef<(HTMLCanvasElement | null)[]>([])
  const [paper, setPaper] = useState<Paper>('A4')
  // Na výšku / na šírku – pamätá sa v prehliadači.
  const [landscape, setLandscapeState] = useState(() => {
    try {
      return localStorage.getItem(ORIENTATION_KEY) === 'landscape'
    } catch {
      return false
    }
  })
  const setLandscape = (next: boolean) => {
    setLandscapeState(next)
    try {
      localStorage.setItem(ORIENTATION_KEY, next ? 'landscape' : 'portrait')
    } catch {
      // Bez úložiska sa voľba len nezapamätá.
    }
  }
  const sheetW = landscape ? SHEET_HEIGHT : SHEET_WIDTH
  const sheetH = landscape ? SHEET_WIDTH : SHEET_HEIGHT
  const a5W = landscape ? A5_HEIGHT : A5_WIDTH
  const a5H = landscape ? A5_WIDTH : A5_HEIGHT
  // Čo ukázať na hárku (číslo case, QR, súhrn dole) – pamätá sa v prehliadači.
  const [show, setShowState] = useState<SheetShow>(() => {
    try {
      return { ...DEFAULT_SHOW, ...(JSON.parse(localStorage.getItem(SHOW_KEY) ?? '{}') as Partial<SheetShow>) }
    } catch {
      return DEFAULT_SHOW
    }
  })
  const toggleShow = (part: keyof SheetShow) => {
    const next = { ...show, [part]: !show[part] }
    setShowState(next)
    try {
      localStorage.setItem(SHOW_KEY, JSON.stringify(next))
    } catch {
      // Bez úložiska sa voľba len nezapamätá.
    }
  }
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

  // Poradie typov (čo hore, čo dole / na ktorom hárku) – pamätá sa v prehliadači.
  const [order, setOrderState] = useState<string[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(ORDER_KEY) ?? '[]') as unknown
      return Array.isArray(saved) ? saved.filter((value): value is string => typeof value === 'string') : []
    } catch {
      return []
    }
  })
  const ordered = useMemo(() => orderColumns(matrix, order), [matrix, order])
  const move = (column: string, step: -1 | 1) => {
    const columns = [...ordered.columns]
    const index = columns.indexOf(column)
    const target = index + step
    if (target < 0 || target >= columns.length) return
    ;[columns[index], columns[target]] = [columns[target], columns[index]]
    // Ostatné typy (z iných cases) ostanú v uloženom poradí za týmito.
    const next = [...columns, ...order.filter((value) => !columns.includes(value))]
    setOrderState(next)
    try {
      localStorage.setItem(ORDER_KEY, JSON.stringify(next))
    } catch {
      // Bez úložiska sa poradie len nezapamätá.
    }
  }
  const pages = useMemo(() => (layout === 'pages' ? matrixPages(ordered) : [ordered]), [layout, ordered])

  useEffect(() => {
    if (!ready || !current) return
    let cancelled = false
    void (async () => {
      const bitmap = logo.data ? await createImageBitmap(logo.data).catch(() => null) : null
      // Fotky príslušenstva na karty (bez fotky ostane karta len s názvom a počtom).
      const photos = new Map<string, ImageBitmap | HTMLCanvasElement>()
      const withPhotos = pages.flatMap((page) => [...page.others, ...(page.accessories ?? [])])
      await Promise.all(
        [...new Set(withPhotos.map((item) => item.photoPath).filter((path): path is string => Boolean(path)))].map(async (path) => {
          const image = await fetchPhotoBlob(path)
            .then((blob) => createImageBitmap(blob))
            .catch(() => null)
          if (!image) return
          // Produktové fotky na bielom: biele pozadie preč, aby výrobok sedel priamo na karte.
          if (show.cutout) {
            photos.set(path, withoutWhiteBackground(image))
            image.close()
          } else photos.set(path, image)
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
        landscape,
        show,
        colors: colors.data ?? [],
        footer: branding.data?.labelFooter ?? '',
        logo: bitmap,
        companyName: company.companyName,
        photos,
        })
      })
      bitmap?.close()
      photos.forEach((image) => {
        if (image instanceof ImageBitmap) image.close()
      })
      setDrawn(true)
    })()
    return () => {
      cancelled = true
    }
  }, [ready, current, matrix, pages, layout, show, landscape, colors.data, branding.data, logo.data, company.companyName, equipment.data])

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
      // A5 má rovnaký pomer strán ako A4 – hárok sa len zmenší (148 × 210 mm pri 300 dpi).
      const output = paper === 'A5' ? scaled(target, a5W, a5H) : target
      const suffix = paper === 'A5' ? '-a5' : ''
      downloadCanvas(output, pages.length > 1 ? `${baseName}-${index + 1}-${fileSlug(pages[index].columns[0] ?? '')}${suffix}.png` : `${baseName}${suffix}.png`)
      await new Promise((resolve) => setTimeout(resolve, 300))
    }
  }

  return (
    <>
      {back}
      <PageHeader
        title="Flightcase content"
        description={`${current.name} · ${paper} ${landscape ? 'na šírku' : 'na výšku'} (${paper === 'A5' ? `${a5W} × ${a5H}` : `${sheetW} × ${sheetH}`} px)`}
        action={
          <Button disabled={!drawn} onClick={() => void download()}>
            <Download className="size-4" aria-hidden />
            {pages.length > 1 ? `Stiahnuť PNG ${paper} (${pages.length})` : `Stiahnuť PNG ${paper}`}
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
      <div role="radiogroup" aria-label="Orientácia hárku" className="mx-auto mb-3 flex w-full max-w-2xl gap-1 rounded-lg bg-muted p-1">
        {[false, true].map((value) => (
          <button
            key={String(value)}
            type="button"
            role="radio"
            aria-checked={landscape === value}
            onClick={() => setLandscape(value)}
            className={cn('h-9 flex-1 rounded-md px-3 text-sm', landscape === value ? 'bg-surface font-medium shadow-sm' : 'text-muted-foreground hover:text-foreground')}
          >
            {value ? 'Na šírku' : 'Na výšku'}
          </button>
        ))}
      </div>
      <div role="radiogroup" aria-label="Veľkosť hárku" className="mx-auto mb-3 flex w-full max-w-2xl gap-1 rounded-lg bg-muted p-1">
        {PAPERS.map((value) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={paper === value}
            onClick={() => setPaper(value)}
            className={cn('h-9 flex-1 rounded-md px-3 text-sm', paper === value ? 'bg-surface font-medium shadow-sm' : 'text-muted-foreground hover:text-foreground')}
          >
            {value === 'A4' ? 'A4 (210 × 297 mm)' : 'A5 (148 × 210 mm)'}
          </button>
        ))}
      </div>
      <fieldset className="mx-auto mb-3 flex w-full max-w-2xl flex-wrap gap-x-5 gap-y-2 rounded-lg border bg-surface px-3 py-2 text-sm">
        <legend className="px-1 text-xs text-muted-foreground">Na hárku ukázať</legend>
        {SHEET_PARTS.map((part) => (
          <label key={part} className="flex items-center gap-2">
            <input type="checkbox" className="size-4" checked={show[part]} onChange={() => toggleShow(part)} />
            {SHEET_PART_LABELS[part]}
          </label>
        ))}
      </fieldset>
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
      {matrix.columns.length > 1 && layout !== 'together' && (
        <div className="mx-auto mb-3 flex w-full max-w-2xl flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">{layout === 'stacked' ? 'Poradie zhora:' : 'Poradie hárkov:'}</span>
          {ordered.columns.map((column, index) => (
            <span key={column} className="inline-flex items-center gap-1 rounded-lg border bg-surface py-1 pr-1 pl-3">
              <span className="font-medium">
                {index + 1}. {column}
              </span>
              <Button size="sm" variant="ghost" className="size-8 p-0" aria-label={`${column} vyššie`} disabled={index === 0} onClick={() => move(column, -1)}>
                <ChevronUp className="size-4" aria-hidden />
              </Button>
              <Button size="sm" variant="ghost" className="size-8 p-0" aria-label={`${column} nižšie`} disabled={index === ordered.columns.length - 1} onClick={() => move(column, 1)}>
                <ChevronDown className="size-4" aria-hidden />
              </Button>
            </span>
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
            width={sheetW}
            height={sheetH}
            aria-label={`Náhľad hárku s obsahom pre ${current.name}${pages.length > 1 ? ` – ${page.columns[0] ?? ''}` : ''}`}
            className={cn('mx-auto h-auto w-full rounded-lg border bg-white', landscape ? 'max-w-4xl' : 'max-w-2xl')}
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
