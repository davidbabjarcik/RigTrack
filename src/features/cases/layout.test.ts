import { describe, expect, it } from 'vitest'
import { addSection, autoFill, copyLayoutTo, editSection, placeables, placeIn, readLayout, removeSection, unplaced, withoutGone } from './layout'

const A = '00000000-0000-4000-8000-0000000000a1'
const B = '00000000-0000-4000-8000-0000000000a2'
const content = [
  { id: A, name: 'Ukážkový PAR', quantity: 3, trackUnits: true, unitIds: [] },
  { id: B, name: 'Ukážkový mikrofón', quantity: 10, trackUnits: false, unitIds: [] },
]
const [par1, par2, , mic] = placeables(content)

describe('rozloženie v case', () => {
  it('prázdne = bez rozloženia; staršia jednoduchá mriežka je jedna časť', () => {
    expect(readLayout({})).toBeNull()
    const layout = readLayout({ rows: 99, cols: 2, cells: [{ items: [{ equipmentId: 'zlé' }, { equipmentId: A, unit: 2 }], note: 'x' }] })!
    expect(layout.sections).toHaveLength(1)
    expect(layout.sections[0]).toMatchObject({ name: 'Priehradky', rows: 8, cols: 2 })
    expect(layout.sections[0].cells[0]).toEqual({ items: [{ equipmentId: A, unit: 2, count: 0 }], note: 'x' })
  })

  it('šuplíky: kusy po kusoch, položka s počtom rozdelená do dvoch šuplíkov', () => {
    let layout = addSection(addSection(null, 'Šuplík 1 – SM 58', 1, 1), 'Šuplík 2', 1, 1)
    layout = placeIn(layout, { section: 0, cell: 0 }, mic, 6)
    layout = placeIn(layout, { section: 1, cell: 0 }, mic, 99)
    expect(layout.sections.map((section) => section.cells[0].items)).toEqual([[{ equipmentId: B, unit: null, count: 6 }], [{ equipmentId: B, unit: null, count: 4 }]])
    layout = placeIn(layout, { section: 0, cell: 0 }, par1)
    layout = placeIn(layout, { section: 1, cell: 0 }, par1)
    expect(layout.sections[0].cells[0].items).toHaveLength(1)
    expect(unplaced(layout, content).map((item) => item.label)).toEqual(['Ukážkový PAR #2', 'Ukážkový PAR #3'])
  })

  it('rozloží nezaradené do prázdnych priehradok jednej časti a zmena mriežky drží miesta', () => {
    let layout = autoFill(addSection(null, 'Priehradky', 2, 3), 0, content)
    expect(layout.sections[0].cells.slice(0, 4).map((cell) => cell.items)).toEqual([
      [{ equipmentId: A, unit: 1, count: 1 }],
      [{ equipmentId: A, unit: 2, count: 1 }],
      [{ equipmentId: A, unit: 3, count: 1 }],
      [{ equipmentId: B, unit: null, count: 10 }],
    ])
    expect(unplaced(layout, content)).toEqual([])
    layout = editSection(layout, 0, 'Spodok', 2, 2)
    expect(layout.sections[0].name).toBe('Spodok')
    expect(layout.sections[0].cells[2].items).toEqual([{ equipmentId: B, unit: null, count: 10 }])
    expect(unplaced(layout, content).map((item) => item.label)).toEqual(['Ukážkový PAR #3'])
    expect(removeSection(layout, 0)).toBeNull()
  })

  it('technika, ktorá z case zmizla alebo jej ubudlo, sa upraví', () => {
    let layout = placeIn(addSection(null, 'X', 1, 2), { section: 0, cell: 0 }, par2)
    layout = placeIn(layout, { section: 0, cell: 1 }, mic, 8)
    const fewer = withoutGone(layout, [{ ...content[1], quantity: 5 }])
    expect(fewer.sections[0].cells.map((cell) => cell.items)).toEqual([[], [{ equipmentId: B, unit: null, count: 5 }]])
  })
})

describe('copyLayoutTo', () => {
  const blinder = (id: string, units: number[]) => ({ id, name: 'Ukážkový blinder', quantity: units.length, trackUnits: true, unitIds: units })
  const cable = (id: string, quantity: number) => ({ id, name: 'Ukážkový kábel', quantity, trackUnits: false, unitIds: [] })
  const layout = {
    sections: [
      { name: 'Priehradky', rows: 1, cols: 3, cells: [
        { items: [{ equipmentId: 'a', unit: 1, count: 1 }], note: 'vľavo' },
        { items: [{ equipmentId: 'a', unit: 2, count: 1 }], note: '' },
        { items: [{ equipmentId: 'k', unit: null, count: 4 }], note: 'káble' },
      ] },
    ],
  }

  it('kusy v rovnakom poradí, počty podľa cieľa, poznámky ostanú', () => {
    const { layout: copy, placed } = copyLayoutTo(layout, [blinder('a', [1, 2]), cable('k', 4)], [blinder('b', [5, 6]), cable('m', 3)])
    expect(copy.sections[0].cells.map((cell) => cell.items)).toEqual([
      [{ equipmentId: 'b', unit: 5, count: 1 }],
      [{ equipmentId: 'b', unit: 6, count: 1 }],
      [{ equipmentId: 'm', unit: null, count: 3 }],
    ])
    expect(copy.sections[0].cells.map((cell) => cell.note)).toEqual(['vľavo', '', 'káble'])
    expect(placed).toBe(3)
  })

  it('čo v cieli chýba, ostane prázdne', () => {
    const { layout: copy, placed } = copyLayoutTo(layout, [blinder('a', [1, 2]), cable('k', 4)], [blinder('b', [9])])
    expect(copy.sections[0].cells.map((cell) => cell.items.length)).toEqual([1, 0, 0])
    expect(placed).toBe(1)
  })
})

