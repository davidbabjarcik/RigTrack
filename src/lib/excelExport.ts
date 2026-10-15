import type { Row } from 'write-excel-file/browser'

export type ExportColumn = { title: string; width: number }
export type ExportCell = string | number | null

/** Stiahne jednoduchú tabuľku ako .xlsx: zvýraznená hlavička, ukotvený prvý riadok. Knižnica sa načíta až teraz. */
export async function downloadTable(fileName: string, sheet: string, columns: ExportColumn[], rows: ExportCell[][]) {
  const { default: writeXlsxFile } = await import('write-excel-file/browser')
  const header: Row = columns.map((column) => ({ value: column.title, fontWeight: 'bold', backgroundColor: '#FDE68A' }))
  const body: Row[] = rows.map((row) => row.map((value) => (value === '' ? null : value)))
  await writeXlsxFile([header, ...body], {
    sheet,
    columns: columns.map((column) => ({ width: column.width })),
    stickyRowsCount: 1,
  }).toFile(fileName)
}
