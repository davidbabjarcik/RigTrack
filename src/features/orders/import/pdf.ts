import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

GlobalWorkerOptions.workerSrc = workerUrl

// Kúsky textu s rozdielom výšky do 2 bodov patria do toho istého riadku.
const SAME_LINE = 2

/** Text PDF po riadkoch, zhora nadol a zľava doprava. Súbor neopúšťa prehliadač. */
export async function extractPdfLines(file: File): Promise<string[]> {
  const task = getDocument({ data: new Uint8Array(await file.arrayBuffer()) })
  const lines: string[] = []
  try {
    const pdf = await task.promise
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber)
      const content = await page.getTextContent()
      const rows: { y: number; cells: { x: number; text: string }[] }[] = []
      for (const item of content.items) {
        if (!('str' in item) || !item.str.trim()) continue
        const [x, y] = [item.transform[4], item.transform[5]]
        let row = rows.find((candidate) => Math.abs(candidate.y - y) <= SAME_LINE)
        if (!row) rows.push((row = { y, cells: [] }))
        row.cells.push({ x, text: item.str.trim() })
      }
      rows.sort((a, b) => b.y - a.y)
      for (const row of rows) {
        lines.push(
          row.cells
            .sort((a, b) => a.x - b.x)
            .map((cell) => cell.text)
            .join(' '),
        )
      }
    }
  } finally {
    await task.destroy()
  }
  return lines
}
