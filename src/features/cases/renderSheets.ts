import type { CableColor } from '@/features/equipment/cableColors'
import type { DmxMode, Equipment } from '@/features/equipment/model'
import { fetchPhotoBlob } from '@/features/equipment/photo'
import { qrUrl } from '@/features/scan/qr'
import type { SheetPrefs } from '@/features/settings/userPrefs'
import { qrCanvas } from './canvas'
import { buildCableMatrix, DEFAULT_SHOW, drawContentSheet, matrixPages, orderColumns, SHEET_HEIGHT, SHEET_LAYOUTS, SHEET_WIDTH, type SheetLayout, type SheetShow } from './contentSheet'
import { drawCaseLabel, formatWeight, labelContentLines } from './label'
import { caseBaseName, caseNumber, type Case } from './model'
import { withoutWhiteBackground } from './removeBackground'

/** A5 pri 300 dpi. */
export const A5_WIDTH = 1748
export const A5_HEIGHT = 2480

/** Voľby hárku z nastavení účtu s predvolenými hodnotami. */
export function sheetOptions(sheet: SheetPrefs) {
  const landscape = Boolean(sheet.landscape)
  return {
    paper: (sheet.paper === 'A5' ? 'A5' : 'A4') as 'A4' | 'A5',
    landscape,
    dmx: (sheet.dmx === 'modes' || sheet.dmx === 'channels' ? sheet.dmx : 'off') as 'off' | 'modes' | 'channels',
    layout: (SHEET_LAYOUTS.includes(sheet.layout as SheetLayout) ? sheet.layout : 'together') as SheetLayout,
    show: { ...DEFAULT_SHOW, ...(sheet.show ?? {}) } as SheetShow,
    order: sheet.order ?? [],
    width: landscape ? SHEET_HEIGHT : SHEET_WIDTH,
    height: landscape ? SHEET_WIDTH : SHEET_HEIGHT,
    a5Width: landscape ? A5_HEIGHT : A5_WIDTH,
    a5Height: landscape ? A5_WIDTH : A5_HEIGHT,
  }
}

/** Svetlá v case s DMX módmi (bez príslušenstva ako háky). */
export function caseLightsOf(inside: Equipment[]) {
  const seen = new Map<string, { name: string; modes: DmxMode[] }>()
  for (const item of inside) {
    if (item.kind !== 'light' || item.attributes.lightType?.startsWith('acc_') || !item.attributes.dmxModes?.length) continue
    if (!seen.has(item.name)) seen.set(item.name, { name: item.name, modes: item.attributes.dmxModes })
  }
  return [...seen.values()]
}

/** Tabuľka káblov a karty case v uloženom poradí, rozdelené na hárky podľa rozloženia. */
export function sheetPagesOf(inside: Equipment[], sheet: SheetPrefs) {
  const options = sheetOptions(sheet)
  const matrix = buildCableMatrix(inside)
  const ordered = orderColumns(matrix, options.order)
  return { matrix, ordered, pages: options.layout === 'pages' ? matrixPages(ordered) : [ordered] }
}

/** Zmenšená kópia hárku (napr. na A5). */
export function scaledCanvas(source: HTMLCanvasElement, width: number, height: number) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(source, 0, 0, width, height)
  return canvas
}

export type SheetContext = {
  equipment: Equipment[]
  colors: CableColor[]
  footer: string
  /** Logo už prefarbené na svetlé pozadie (alebo nič). */
  logo: Blob | null
  companyName: string
  sheet: SheetPrefs
  origin: string
}

/** Nakreslí hárky s obsahom case (jeden alebo viac podľa rozloženia) – pre stránku case aj hromadnú tlač. */
export async function renderContentSheets(current: Case, context: SheetContext): Promise<HTMLCanvasElement[]> {
  const options = sheetOptions(context.sheet)
  const inside = context.equipment.filter((item) => item.caseId === current.id)
  const { pages } = sheetPagesOf(inside, context.sheet)
  const bitmap = context.logo ? await createImageBitmap(context.logo).catch(() => null) : null
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
      if (options.show.cutout) {
        photos.set(path, withoutWhiteBackground(image))
        image.close()
      } else photos.set(path, image)
    }),
  )
  const qr = await qrCanvas(qrUrl({ kind: 'case', id: current.id }, context.origin), 520, 0).catch(() => null)
  // Súhrn: kusov v case a hmotnosť (prázdny case + technika so zadanou váhou).
  const gearKg = inside.reduce((sum, item) => sum + (item.attributes.weightKg ?? 0) * item.quantity, 0)
  const lights = caseLightsOf(inside)
  const canvases = pages.map((page) => {
    const canvas = document.createElement('canvas')
    canvas.width = options.width
    canvas.height = options.height
    drawContentSheet(canvas, {
      caseName: caseBaseName(current),
      caseNumber: caseNumber(current),
      qr,
      totalPieces: inside.reduce((sum, item) => sum + item.quantity, 0),
      weightKg: (current.weightKg ?? 0) + gearKg || null,
      matrix: page,
      layout: options.layout === 'stacked' ? 'stacked' : 'together',
      landscape: options.landscape,
      dmx: options.dmx === 'off' ? [] : lights,
      dmxChannels: options.dmx === 'channels',
      show: options.show,
      colors: context.colors,
      footer: context.footer,
      logo: bitmap,
      companyName: context.companyName,
      photos,
    })
    return canvas
  })
  bitmap?.close()
  photos.forEach((image) => {
    if (image instanceof ImageBitmap) image.close()
  })
  return canvases
}

export type LabelContext = { equipment: Equipment[]; footer: string; logo: Blob | null; companyName: string; withQr: boolean; origin: string }

/** Štítok case: hlavný prvok (alebo vlastný názov a fotka case), vedľajšie prvky, číslo, kategória a hmotnosť. */
export function caseLabelContent(current: Case, equipment: Equipment[]) {
  const inCase = equipment.filter((item) => item.caseId === current.id)
  const main = inCase.find((item) => item.labelRole === 'main') ?? null
  const secondary = labelContentLines(inCase.filter((item) => item.labelRole === 'secondary'))
  const photoPath = main ? main.photoPath : (current.labelPhotoPath ?? '')
  const mainName = main ? (main.quantity > 1 ? `${main.quantity}× ${main.name}` : main.name) : (current.labelTitle ?? '')
  return { main, secondary, photoPath, mainName, hasMain: Boolean(mainName || photoPath) }
}

/** Nakreslí štítok case do plátna (pre stránku štítku aj hromadnú tlač). */
export async function drawCaseLabelFor(target: HTMLCanvasElement, current: Case, context: LabelContext, photo: Blob | null) {
  const content = caseLabelContent(current, context.equipment)
  const [logoBitmap, photoBitmap] = await Promise.all([context.logo, photo].map((blob) => (blob ? createImageBitmap(blob).catch(() => null) : null)))
  const qr = context.withQr ? await qrCanvas(qrUrl({ kind: 'case', id: current.id }, context.origin)).catch(() => null) : null
  drawCaseLabel(target, {
    qr,
    number: current.labelNumber,
    category: current.labelCategory,
    weight: formatWeight(current.weightKg),
    main: content.hasMain ? { name: content.mainName, photo: photoBitmap } : null,
    secondary: content.secondary,
    footer: context.footer,
    logo: logoBitmap,
    companyName: context.companyName,
  })
  logoBitmap?.close()
  photoBitmap?.close()
}
