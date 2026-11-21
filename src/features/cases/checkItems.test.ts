import { describe, expect, it } from 'vitest'
import { checkRows, missingCount, missingText, readCheckItems } from './checkItems'

describe('kontrola po položkách', () => {
  it('riadky, chýbajúce a pokazené záznamy', () => {
    const rows = checkRows([
      { id: 'a', name: 'PAR', quantity: 2, trackUnits: true, unitIds: [] },
      { id: 'b', name: 'SM58', quantity: 10, trackUnits: false, unitIds: [] },
    ])
    expect(rows.map((row) => [row.label, row.expected, row.found])).toEqual([['PAR #1', 1, 1], ['PAR #2', 1, 1], ['SM58', 10, 10]])
    const items = [{ equipmentId: 'a', unit: 2, expected: 1, found: 0 }, { equipmentId: 'b', unit: null, expected: 10, found: 7 }]
    expect(missingText(items, (item) => (item.unit ? `PAR #${item.unit}` : 'SM58'))).toBe('PAR #2, 3× SM58')
    expect(missingCount(items)).toBe(4)
    expect(readCheckItems([{ equipmentId: 'a', expected: 1, found: 1 }, { nope: 1 }, null])).toEqual([{ equipmentId: 'a', unit: null, expected: 1, found: 1 }])
  })
})
