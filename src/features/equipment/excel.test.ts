import { describe, expect, it } from 'vitest'
import { CASE_COLUMNS, COLUMNS, parseExcelRows, parseWorkbook, sheetName, toExcelRow } from './excel'
import type { Equipment } from './model'

const header = COLUMNS.map((column) => column.title)
const row = (values: Partial<Record<(typeof COLUMNS)[number]['key'], unknown>>) => COLUMNS.map((column) => values[column.key] ?? null)

describe('equipment Excel', () => {
  it('exports a row with Slovak labels and the id', () => {
    const item = {
      id: 'e1', name: 'Mixpult', kind: 'audio', categoryId: 'c1', locationId: null, caseId: null, quantity: 1, manufacturer: 'Behringer',
      model: 'X32', serialNumber: '', inventoryNumber: 'INV-1', macAddress: '', ipAddress: '192.168.1.10', rentalPrice: 60, status: 'available',
      attributes: { audioType: 'mixer' }, note: '',
    } as unknown as Equipment
    const cells = toExcelRow(item, [{ id: 'c1', name: 'Zvuk' }], [], [])
    expect(cells[COLUMNS.findIndex((c) => c.key === 'kind')]).toBe('Zvuk')
    expect(cells[COLUMNS.findIndex((c) => c.key === 'audioType')]).toBe('Mixpult')
    expect(cells.at(-1)).toBe('e1')
  })

  it('reads new and existing items, labels with or without accents, in any column order', () => {
    const result = parseExcelRows(
      [
        header,
        row({ name: COLUMNS[0].hint }),
        row({ name: 'Sharpy', kind: 'svetlo', quantity: 4, rentalPrice: '40,5', status: 'Dostupna', powerW: 350 }),
        row({ name: 'XLR 10 m', kind: 'Kábel', lengthM: 10, connector: 'XLR', id: 'e1' }),
        [],
      ],
      new Set(['e1']),
    )
    expect(result.errors).toEqual([])
    expect(result.items).toMatchObject([
      { row: 3, id: null, name: 'Sharpy', kind: 'light', quantity: 4, rentalPrice: 40.5, status: 'available', attributes: { powerW: 350 } },
      { row: 4, id: 'e1', kind: 'cable', quantity: 1, attributes: { lengthM: 10, connector: 'XLR' } },
    ])

    const reversed = parseExcelRows([['Počet kusov', 'Názov'], [3, 'Hák']], new Set())
    expect(reversed.items).toMatchObject([{ name: 'Hák', quantity: 3 }])
  })

  it('reports bad rows with their Excel row number', () => {
    const result = parseExcelRows(
      [
        header,
        row({ kind: 'Svetlo' }),
        row({ name: 'Vec', kind: 'Loď', quantity: 'veľa', ipAddress: '999.1.1.1' }),
        row({ name: 'Cudzia', id: 'x' }),
        row({ name: 'A', inventoryNumber: 'INV-1' }),
        row({ name: 'B', inventoryNumber: 'inv-1' }),
      ],
      new Set(),
    )
    expect(result.errors).toEqual([
      'Riadok 2: chýba názov.',
      'Riadok 3: neznámy druh „Loď“, počet kusov musí byť celé číslo, neplatná IP „999.1.1.1“.',
      'Riadok 4: ID nepatrí žiadnej technike tejto firmy (pre novú techniku ho nechajte prázdne).',
      'Riadok 6: inventárne číslo „inv-1“ sa opakuje (prvýkrát: riadok 5).',
    ])
    expect(parseExcelRows([['Niečo']], new Set()).errors).toEqual(['Chýba stĺpec „Názov“. Použite tabuľku z exportu.'])
  })
})

describe('workbook', () => {
  it('uses the sheet as the category, reads cases and checks numbers across sheets', () => {
    const caseHeader = CASE_COLUMNS.map((column) => column.title)
    const result = parseWorkbook(
      [
        { sheet: 'Svetlo', data: [header, row({ name: 'Sharpy', inventoryNumber: 'A-1' }), row({ name: 'Par', category: 'Svetlá LED' })] },
        { sheet: 'Bez kategórie', data: [header, row({ name: 'Hák', inventoryNumber: 'a-1' })] },
        { sheet: 'Cases', data: [caseHeader, [CASE_COLUMNS[0].hint], ['Audio case', 'C-1', 'Sklad', 18.5, 60, 120, 40, '', null]] },
      ],
      new Set(),
      new Set(),
    )
    expect(result.items.map((item) => [item.name, item.category])).toEqual([
      ['Sharpy', 'Svetlo'],
      ['Par', 'Svetlá LED'],
      ['Hák', ''],
    ])
    expect(result.cases).toMatchObject([{ row: 3, name: 'Audio case', inventoryNumber: 'C-1', location: 'Sklad', weightKg: 18.5, depthCm: 40 }])
    expect(result.errors).toEqual(['Hárok Bez kategórie, riadok 2: inventárne číslo „a-1“ sa opakuje (prvýkrát: hárok Svetlo, riadok 2).'])
  })

  it('makes valid, unique sheet names', () => {
    const taken = new Set<string>()
    expect(sheetName('Zvuk / Audio', taken)).toBe('Zvuk Audio')
    expect(sheetName('zvuk / audio', taken)).toBe('zvuk audio (2)')
    expect(sheetName('', taken)).toBe('Bez kategórie')
  })
})
