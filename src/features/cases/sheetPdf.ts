// Jednoduché PDF z obrázkov hárku: každá strana = jeden JPEG cez celú stranu (A4 / A5, na výšku aj na šírku).
// Bez knižnice – PDF s obrázkami JPEG (DCTDecode) je len pár objektov.

const MM_TO_PT = 72 / 25.4

/** Veľkosť strany v bodoch (pt). */
export function pageSizePt(paper: 'A4' | 'A5', landscape: boolean) {
  const [w, h] = paper === 'A5' ? [148, 210] : [210, 297]
  const [width, height] = landscape ? [h, w] : [w, h]
  return { width: width * MM_TO_PT, height: height * MM_TO_PT }
}

/** JPEG bajty z plátna (hárok je biely, JPEG stačí a je malý). */
export async function canvasJpeg(canvas: HTMLCanvasElement, quality = 0.9): Promise<{ bytes: Uint8Array; width: number; height: number }> {
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => (value ? resolve(value) : reject(new Error('JPEG'))), 'image/jpeg', quality))
  return { bytes: new Uint8Array(await blob.arrayBuffer()), width: canvas.width, height: canvas.height }
}

/** PDF so stranami z JPEG obrázkov (každý roztiahnutý na celú stranu). */
export function buildPdf(images: { bytes: Uint8Array; width: number; height: number }[], page: { width: number; height: number }): Blob {
  const encoder = new TextEncoder()
  const parts: Uint8Array[] = []
  const offsets: number[] = []
  let length = 0
  const push = (chunk: Uint8Array | string) => {
    const bytes = typeof chunk === 'string' ? encoder.encode(chunk) : chunk
    parts.push(bytes)
    length += bytes.length
  }
  const object = (id: number, body: (string | Uint8Array)[]) => {
    offsets[id] = length
    push(`${id} 0 obj\n`)
    for (const piece of body) push(piece)
    push('\nendobj\n')
  }

  push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n')
  // 1 = katalóg, 2 = strany, potom na každú stranu 3 objekty: strana, obrázok, obsah.
  const pageIds = images.map((_, index) => 3 + index * 3)
  object(1, ['<< /Type /Catalog /Pages 2 0 R >>'])
  object(2, [`<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${images.length} >>`])
  const w = page.width.toFixed(2)
  const h = page.height.toFixed(2)
  images.forEach((image, index) => {
    const pageId = pageIds[index]
    const imageId = pageId + 1
    const contentId = pageId + 2
    object(pageId, [`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${w} ${h}] /Resources << /XObject << /Im${index} ${imageId} 0 R >> >> /Contents ${contentId} 0 R >>`])
    object(imageId, [
      `<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.bytes.length} >>\nstream\n`,
      image.bytes,
      '\nendstream',
    ])
    const content = `q ${w} 0 0 ${h} 0 0 cm /Im${index} Do Q`
    object(contentId, [`<< /Length ${content.length} >>\nstream\n${content}\nendstream`])
  })
  const xref = length
  const count = 3 + images.length * 3
  push(`xref\n0 ${count}\n0000000000 65535 f \n`)
  for (let id = 1; id < count; id++) push(`${String(offsets[id]).padStart(10, '0')} 00000 n \n`)
  push(`trailer\n<< /Size ${count} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`)
  return new Blob(parts as BlobPart[], { type: 'application/pdf' })
}
