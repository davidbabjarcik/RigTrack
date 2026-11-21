import { describe, expect, it } from 'vitest'
import { autoFill, placeIn, readLayout, resizeLayout, unplaced, withoutGone } from './layout'

const A = '00000000-0000-4000-8000-0000000000a1'
const B = '00000000-0000-4000-8000-0000000000a2'
const content = [
  { id: A, name: 'Ukážkový PAR', quantity: 3, trackUnits: true, unitIds: [] },
  { id: B, name: 'Ukážkový kábel', quantity: 6, trackUnits: false, unitIds: [] },
]

describe('priehradky v case', () => {
  it('prázdne rozloženie je case bez priehradok, pokazené sa opraví', () => {
    expect(readLayout({})).toBeNull()
    const layout = readLayout({ rows: 99, cols: 2, cells: [{ items: [{ equipmentId: 'zlé' }, { equipmentId: A, unit: 2 }], note: 'x' }] })!
    expect(layout.rows).toBe(8)
    expect(layout.cells).toHaveLength(16)
    expect(layout.cells[0]).toEqual({ items: [{ equipmentId: A, unit: 2 }], note: 'x' })
  })

  it('rozloží kusy po jednom, presunie a zmena mriežky drží miesta', () => {
    let layout = autoFill(resizeLayout(null, 2, 3), content)
    expect(layout.cells.slice(0, 4).map((cell) => cell.items)).toEqual([[{ equipmentId: A, unit: 1 }], [{ equipmentId: A, unit: 2 }], [{ equipmentId: A, unit: 3 }], [{ equipmentId: B, unit: null }]])
    expect(unplaced(layout, content)).toEqual([])
    layout = placeIn(layout, 5, { equipmentId: A, unit: 1 })
    expect(layout.cells[0].items).toEqual([])
    expect(layout.cells[5].items).toEqual([{ equipmentId: A, unit: 1 }])
    const smaller = resizeLayout(layout, 2, 2)
    // Riadok 2, stĺpec 1 (pôvodne priehradka 4 s káblom) je teraz priehradka 3.
    expect(smaller.cells[2].items).toEqual([{ equipmentId: B, unit: null }])
    expect(unplaced(smaller, content).map((item) => item.label)).toEqual(['Ukážkový PAR #1', 'Ukážkový PAR #3'])
  })

  it('technika, ktorá z case zmizla, sa z priehradok vynechá', () => {
    const layout = autoFill(resizeLayout(null, 1, 4), content)
    expect(withoutGone(layout, [content[1]]).cells.flatMap((cell) => cell.items)).toEqual([{ equipmentId: B, unit: null }])
  })
})
