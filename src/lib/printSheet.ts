import { buildPdf, canvasJpeg, pageSizePt } from '@/features/cases/sheetPdf'

// Tlač z mobilu: v appke pridanej na plochu (iPhone, iPad) a v mobilných prehliadačoch dialóg tlače
// často nefunguje alebo vytlačí rozbitú stranu. Tam hárok vyfotíme do PDF (A4) a ponúkneme cez
// zdieľanie – odtiaľ sa dá vytlačiť (AirPrint), uložiť alebo poslať.

/** A4 v pixeloch CSS (96 dpi). */
export const A4_WIDTH_PX = 794
const A4_HEIGHT_PX = 1123

/** Mobil alebo tablet s dotykom: tlač cez PDF namiesto dialógu prehliadača. */
export function printsViaPdf() {
  if (typeof window === 'undefined') return false
  const standalone = (navigator as Navigator & { standalone?: boolean }).standalone === true || window.matchMedia?.('(display-mode: standalone)').matches
  const touch = window.matchMedia?.('(pointer: coarse)').matches
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  return Boolean(touch && (ios || standalone || window.innerWidth < 900))
}

/**
 * Kde rozdeliť dlhý hárok na strany: hľadá prázdny (biely) riadok tesne nad hranicou strany,
 * aby sa nerozdelil riadok textu. Vracia y-ové pozície začiatkov strán.
 */
export function pageBreaks(isBlankRow: (y: number) => boolean, total: number, pageHeight: number) {
  const starts = [0]
  let start = 0
  while (total - start > pageHeight) {
    let end = start + pageHeight
    // Najviac pätinu strany nahor; keď sa prázdny riadok nenájde, reže sa na hranici.
    for (let y = end; y > start + pageHeight * 0.8; y--) {
      if (isBlankRow(y)) {
        end = y
        break
      }
    }
    starts.push(end)
    start = end
  }
  return starts
}

/** Hárok (HTML) do PDF na A4 s okrajmi; dlhý obsah ide na viac strán. */
export async function sheetToPdf(node: HTMLElement, { marginMm = 12, landscape = false }: { marginMm?: number; landscape?: boolean } = {}) {
  const { toCanvas } = await import('html-to-image')
  const scale = 2
  const pageWidth = (landscape ? A4_HEIGHT_PX : A4_WIDTH_PX) * scale
  const pageHeight = (landscape ? A4_WIDTH_PX : A4_HEIGHT_PX) * scale
  const margin = Math.round((marginMm / 25.4) * 96 * scale)
  const contentWidth = (pageWidth - 2 * margin) / scale
  // Na obrazovke je hárok zmenšený (zoom), má okraje a výšku celej A4 – do PDF ide kópia v plnej
  // veľkosti bez nich, mimo obrazovky, aby mala výšku len podľa obsahu.
  const copy = node.cloneNode(true) as HTMLElement
  for (const hidden of copy.querySelectorAll('[class*="print:hidden"], [data-print-skip="true"]')) hidden.remove()
  Object.assign(copy.style, { zoom: '1', minHeight: '0', padding: '0', margin: '0', boxShadow: 'none', width: `${contentWidth}px`, maxWidth: 'none' })
  const holder = document.createElement('div')
  Object.assign(holder.style, { position: 'fixed', left: '-10000px', top: '0', width: `${contentWidth}px`, pointerEvents: 'none' })
  holder.append(copy)
  document.body.append(holder)
  let content: HTMLCanvasElement
  try {
    const options = { pixelRatio: scale, backgroundColor: '#ffffff', width: contentWidth, height: copy.scrollHeight }
    // Safari občas pri prvom pokuse vynechá obrázky – druhý pokus je spoľahlivý.
    await toCanvas(copy, options).catch(() => null)
    content = await toCanvas(copy, options)
  } finally {
    holder.remove()
  }

  const context = content.getContext('2d', { willReadFrequently: true })!
  const usable = pageHeight - 2 * margin
  const isBlankRow = (y: number) => {
    const row = context.getImageData(0, y, content.width, 1).data
    for (let i = 0; i < row.length; i += 16) if (row[i] < 245 || row[i + 1] < 245 || row[i + 2] < 245) return false
    return true
  }
  const starts = pageBreaks(isBlankRow, content.height, usable)
  const pages = []
  for (const [index, start] of starts.entries()) {
    const end = starts[index + 1] ?? content.height
    const page = document.createElement('canvas')
    page.width = pageWidth
    page.height = pageHeight
    const ctx = page.getContext('2d')!
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, pageWidth, pageHeight)
    ctx.drawImage(content, 0, start, content.width, end - start, margin, margin, content.width, end - start)
    pages.push(await canvasJpeg(page, 0.9))
  }
  return buildPdf(pages, pageSizePt('A4', landscape))
}

/**
 * PDF ponúkne cez zdieľanie (tlač, uloženie); kde zdieľanie nejde, stiahne ho.
 * `blocked`: prehliadač zdieľanie odmietol, lebo od ťuknutia ubehlo priveľa času – treba ťuknúť znova.
 */
export async function sharePdf(pdf: Blob, fileName: string): Promise<'done' | 'blocked'> {
  const file = new File([pdf], fileName, { type: 'application/pdf' })
  const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean }
  if (nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: fileName })
      return 'done'
    } catch (error) {
      // Zrušené zdieľanie nie je chyba.
      if (error instanceof DOMException && error.name === 'AbortError') return 'done'
      if (error instanceof DOMException && error.name === 'NotAllowedError') return 'blocked'
    }
  }
  const url = URL.createObjectURL(pdf)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000)
  return 'done'
}
