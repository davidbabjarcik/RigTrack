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
