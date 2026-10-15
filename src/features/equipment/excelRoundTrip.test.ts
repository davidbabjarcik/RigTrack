// @vitest-environment node
import readXlsxFile, { readSheet } from 'read-excel-file/node'
import writeXlsxFile from 'write-excel-file/node'
import { describe, expect, it } from 'vitest'
import { CASE_COLUMNS, COLUMNS, parseExcelRows, parseWorkbook } from './excel'

// Ten istý tvar ako export v aplikácii: hlavička, vysvetlivky, dáta. Overuje, že čo appka zapíše, vie aj prečítať.
describe('Excel round trip', () => {
  it('reads back an exported table, including the empty template', async () => {
    const header = COLUMNS.map((column) => ({ value: column.title, fontWeight: 'bold' as const }))
    const hints = COLUMNS.map((column) => ({ value: column.hint, fontStyle: 'italic' as const }))
    const empty = await writeXlsxFile([header, hints], { columns: COLUMNS.map((column) => ({ width: column.width })) }).toBuffer()
    expect(parseExcelRows((await readSheet(empty)) as unknown[][], new Set())).toEqual({ items: [], errors: [] })

    const data = COLUMNS.map((column) => (column.key === 'name' ? 'Sharpy' : column.key === 'quantity' ? 4 : column.key === 'kind' ? 'Svetlo' : null))
    const filled = await writeXlsxFile([header, hints, data]).toBuffer()
    const result = parseExcelRows((await readSheet(filled)) as unknown[][], new Set())
    expect(result.errors).toEqual([])
    expect(result.items).toMatchObject([{ row: 3, name: 'Sharpy', kind: 'light', quantity: 4 }])
  })

  it('reads a workbook with a sheet per category and the cases sheet', async () => {
    const header = COLUMNS.map((column) => column.title)
    const named = (name: string) => COLUMNS.map((column) => (column.key === 'name' ? name : null))
    const buffer = await writeXlsxFile([
      { sheet: 'Svetlo', data: [header, named('Sharpy')] },
      { sheet: 'Cases', data: [CASE_COLUMNS.map((column) => column.title), ['Audio case', 'C-1']] },
    ]).toBuffer()
    const result = parseWorkbook((await readXlsxFile(buffer)) as { sheet: string; data: unknown[][] }[], new Set(), new Set())
    expect(result.errors).toEqual([])
    expect(result.items).toMatchObject([{ name: 'Sharpy', category: 'Svetlo' }])
    expect(result.cases).toMatchObject([{ name: 'Audio case', inventoryNumber: 'C-1' }])
  })
})
