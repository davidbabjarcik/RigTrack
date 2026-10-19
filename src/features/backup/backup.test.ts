import { describe, expect, it } from 'vitest'
import { BACKUP_FILES, rowsToSheet, toCell } from './backup'

describe('backup', () => {
  it('turns database rows into a sheet with all columns', () => {
    expect(
      rowsToSheet([
        { id: 'a', name: 'Pult', attributes: { powerW: 200 }, unit_ids: [1, 4], track_units: true },
        { id: 'b', name: 'Kábel', note: 'x' },
      ]),
    ).toEqual([
      ['id', 'name', 'attributes', 'unit_ids', 'track_units', 'note'],
      ['a', 'Pult', '{"powerW":200}', '[1,4]', true, null],
      ['b', 'Kábel', null, null, null, 'x'],
    ])
    expect(rowsToSheet([])).toEqual([['Žiadne záznamy']])
  })

  it('keeps cells within the Excel limit', () => {
    expect((toCell('x'.repeat(40000)) as string).length).toBe(32767)
  })

  it('has valid, unique sheet names in every file', () => {
    for (const { tables } of BACKUP_FILES) {
      const names = tables.map((table) => table.sheet)
      expect(new Set(names).size).toBe(names.length)
      for (const name of names) expect(name.length <= 31 && !/[[\]:*?/\\]/.test(name)).toBe(true)
    }
  })
})

describe('restore helpers', () => {
  it('turns sheets back into rows with JSON columns', async () => {
    const { sheetToRows, restoreOrder } = await import('./backup')
    expect(
      sheetToRows([
        ['id', 'name', 'attributes', 'unit_ids', 'note'],
        ['a', 'Kábel', '{"lengthM":5}', '[1,2]', null],
        [null, null, null, null, null],
      ]),
    ).toEqual([{ id: 'a', name: 'Kábel', attributes: { lengthM: 5 }, unit_ids: [1, 2], note: null }])
    expect(sheetToRows([['Žiadne záznamy']])).toEqual([])
    const order = restoreOrder()
    expect(order.indexOf('equipment_categories')).toBeLessThan(order.indexOf('equipment'))
    expect(order.indexOf('cases')).toBeLessThan(order.indexOf('equipment'))
    expect(order.indexOf('events')).toBeLessThan(order.indexOf('event_equipment'))
  })
})
