import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, ChevronDown, ChevronUp, Download, FileDown, Printer } from 'lucide-react'
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
import type { DmxMode } from '@/features/equipment/model'
import { withoutWhiteBackground } from './removeBackground'
import { buildCableMatrix, DEFAULT_SHOW, drawContentSheet, matrixPages, orderColumns, SHEET_PART_LABELS, SHEET_PARTS, type SheetShow, SHEET_HEIGHT, SHEET_LAYOUT_LABELS, SHEET_LAYOUTS, SHEET_WIDTH, type SheetLayout } from './contentSheet'

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
import { useCases } from './useCases'
import { buildPdf, canvasJpeg, pageSizePt } from './sheetPdf'
import { useUserPrefs, type SheetPrefs } from '@/features/settings/userPrefs'
import { cn } from '@/lib/utils'

export function CaseContentSheetPage() {
  const { id = '' } = useParams()
  const company = useCompany().active!
  const companyId = company.companyId
  const canvases = useRef<(HTMLCanvasElement | null)[]>([])
  // Voľby hárku sa ukladajú k účtu (rovnaké na PC aj v mobile).
  const { prefs, update } = useUserPrefs()
  const sheet = prefs.sheet ?? {}
  const setSheet = (patch: Partial<SheetPrefs>) => update({ sheet: { ...sheet, ...patch } })
  const paper: Paper = sheet.paper === 'A5' ? 'A5' : 'A4'
  const setPaper = (next: Paper) => setSheet({ paper: next })
  const landscape = Boolean(sheet.landscape)
  const setLandscape = (next: boolean) => setSheet({ landscape: next })
  // DMX na hárku: nie / módy / módy s rozpisom kanálov – len keď je v case svetlo.
  const dmxInfo: 'off' | 'modes' | 'channels' = sheet.dmx === 'modes' || sheet.dmx === 'channels' ? sheet.dmx : 'off'
  const setDmxInfo = (next: 'off' | 'modes' | 'channels') => setSheet({ dmx: next })
  const sheetW = landscape ? SHEET_HEIGHT : SHEET_WIDTH
  const sheetH = landscape ? SHEET_WIDTH : SHEET_HEIGHT
  const a5W = landscape ? A5_HEIGHT : A5_WIDTH
  const a5H = landscape ? A5_WIDTH : A5_HEIGHT
  // Čo ukázať na hárku (číslo case, QR, súhrn dole, fotky bez pozadia).
  const show = useMemo<SheetShow>(() => ({ ...DEFAULT_SHOW, ...(sheet.show ?? {}) }), [sheet.show])
  const toggleShow = (part: keyof SheetShow) => setSheet({ show: { ...show, [part]: !show[part] } })
  const [drawn, setDrawn] = useState(false)
  // Obrázky hárkov na tlač (len počas tlače).
  const [printUrls, setPrintUrls] = useState<string[]>([])
  // Viac typov káblov (napr. XLR a Jack): spolu, pod sebou, alebo každý na vlastný hárok.
  const layout: SheetLayout = SHEET_LAYOUTS.includes(sheet.layout as SheetLayout) ? (sheet.layout as SheetLayout) : 'together'
  const setLayout = (next: SheetLayout) => setSheet({ layout: next })

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
  const caseLights = useMemo(() => {
    const seen = new Map<string, { name: string; modes: DmxMode[] }>()
    for (const item of (equipment.data ?? []).filter((part) => part.caseId === id)) {
      // Svetlá (nie príslušenstvo ako háky, mixpult) s DMX módmi.
      if (item.kind !== 'light' || item.attributes.lightType?.startsWith('acc_') || !item.attributes.dmxModes?.length) continue
      if (!seen.has(item.name)) seen.set(item.name, { name: item.name, modes: item.attributes.dmxModes })
    }
    return [...seen.values()]
  }, [equipment.data, id])
  const logoSettled = !logoPath || logo.isSuccess || logo.isError
  const ready = Boolean(current && equipment.data && colors.data && branding.data && logoSettled)

  // Poradie typov (čo hore, čo dole / na ktorom hárku).
  const order = useMemo(() => sheet.order ?? [], [sheet.order])
  const ordered = useMemo(() => orderColumns(matrix, order), [matrix, order])
  const move = (column: string, step: -1 | 1) => {
    const columns = [...ordered.columns]
    const index = columns.indexOf(column)
    const target = index + step
    if (target < 0 || target >= columns.length) return
    ;[columns[index], columns[target]] = [columns[target], columns[index]]
    // Ostatné typy (z iných cases) ostanú v uloženom poradí za týmito.
    setSheet({ order: [...columns, ...order.filter((value) => !columns.includes(value))] })
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
        dmx: dmxInfo === 'off' ? [] : caseLights,
        dmxChannels: dmxInfo === 'channels',
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
  }, [ready, current, matrix, pages, layout, show, landscape, dmxInfo, caseLights, colors.data, branding.data, logo.data, company.companyName, equipment.data])

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
  const sheets = () => canvases.current.slice(0, pages.length).filter((target): target is HTMLCanvasElement => Boolean(target))
  // PDF: všetky hárky ako strany (A4 / A5, na výšku / na šírku).
  const downloadPdf = async () => {
    const images = await Promise.all(sheets().map((target) => canvasJpeg(paper === 'A5' ? scaled(target, a5W, a5H) : target)))
    const url = URL.createObjectURL(buildPdf(images, pageSizePt(paper, landscape)))
    const link = document.createElement('a')
    link.href = url
    link.download = `${baseName}${paper === 'A5' ? '-a5' : ''}.pdf`
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 10_000)
  }
  // Tlač: obrázky hárkov na celú stranu, bez okrajov prehliadača.
  const print = () => {
    setPrintUrls(sheets().map((target) => target.toDataURL('image/jpeg', 0.92)))
    window.setTimeout(() => {
      window.print()
      setPrintUrls([])
    }, 200)
  }

  return (
    <>
      {printUrls.length > 0 && (
        <>
          <style>{`@page { size: ${paper} ${landscape ? 'landscape' : 'portrait'}; margin: 0 } @media print { body * { visibility: hidden !important } .sheet-print, .sheet-print * { visibility: visible !important } .sheet-print { position: absolute; inset: 0 } .sheet-print img { display: block; width: 100%; height: auto; break-after: page } }`}</style>
          <div className="sheet-print hidden print:block">
            {printUrls.map((url, index) => (
              <img key={index} src={url} alt="" />
            ))}
          </div>
        </>
      )}
      {back}
      <PageHeader
        title="Flightcase content"
        description={`${current.name} · ${paper} ${landscape ? 'na šírku' : 'na výšku'} (${paper === 'A5' ? `${a5W} × ${a5H}` : `${sheetW} × ${sheetH}`} px)`}
        action={
          <div className="flex flex-wrap gap-2">
            <Button disabled={!drawn} onClick={print}>
              <Printer className="size-4" aria-hidden />
              Tlačiť
            </Button>
            <Button variant="outline" disabled={!drawn} onClick={() => void downloadPdf()}>
              <FileDown className="size-4" aria-hidden />
              PDF
            </Button>
            <Button variant="outline" disabled={!drawn} onClick={() => void download()}>
              <Download className="size-4" aria-hidden />
              {pages.length > 1 ? `PNG (${pages.length})` : 'PNG'}
            </Button>
          </div>
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
      {caseLights.length > 0 && (
        <div role="radiogroup" aria-label="DMX na hárku" className="mx-auto mb-3 flex w-full max-w-2xl flex-wrap items-center gap-1 rounded-lg bg-muted p-1">
          <span className="px-2 text-sm text-muted-foreground">DMX:</span>
          {(
            [
              ['off', 'Nie'],
              ['modes', 'Módy (napr. Standard 16 ch)'],
              ['channels', 'Módy s rozpisom kanálov'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={dmxInfo === value}
              onClick={() => setDmxInfo(value)}
              className={cn('h-9 flex-1 rounded-md px-3 text-sm', dmxInfo === value ? 'bg-surface font-medium shadow-sm' : 'text-muted-foreground hover:text-foreground')}
            >
              {label}
            </button>
          ))}
        </div>
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
