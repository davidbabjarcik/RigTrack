import { describe, expect, it } from 'vitest'
import { byLevel, casesBySpot, describeSpot, findCases, levelUsage, metres, nextSpotName, type PlacedCase } from './model'

const item = (id: string, spotId: string | null, spotLevel: number | null = null, name = id): PlacedCase => ({ id, name, spotId, spotLevel })

describe('warehouse plan', () => {
  const cases = [item('a', 'rack', 2), item('b', 'rack', 1), item('c', 'pallet'), item('d', null), item('e', 'rack'), item('f', 'rack', 9)]

  it('groups cases by their spot and leaves out the unplaced', () => {
    const map = casesBySpot(cases)
    expect(map.get('rack')!.map((entry) => entry.id)).toEqual(['a', 'b', 'e', 'f'])
    expect(map.get('pallet')!.map((entry) => entry.id)).toEqual(['c'])
    expect([...map.keys()]).toEqual(['rack', 'pallet'])
  })

  it('lists rack levels from the top, with cases of unknown level last', () => {
    const groups = byLevel({ levels: 3 }, casesBySpot(cases).get('rack')!)
    expect(groups.map((group) => [group.level, group.cases.map((entry) => entry.id)])).toEqual([
      [3, []],
      [2, ['a']],
      [1, ['b']],
      [null, ['e', 'f']],
    ])
    // paleta má jedinú úroveň a nezobrazuje prázdne poschodia
    expect(byLevel({ levels: 1 }, [item('c', 'pallet')])).toEqual([{ level: null, cases: [item('c', 'pallet')] }])
  })

  it('names the place of a case', () => {
    expect(describeSpot({ name: 'Regál A', levels: 4 }, 2)).toBe('Regál A, 2. poschodie')
    expect(describeSpot({ name: 'Regál A', levels: 4 }, null)).toBe('Regál A')
    expect(describeSpot({ name: 'Paleta 1', levels: 1 }, 1)).toBe('Paleta 1')
  })

  it('finds cases regardless of case and diacritics', () => {
    const named = [item('1', null, null, 'Káble XLR'), item('2', null, null, 'Hlavy A')]
    expect(findCases(named, 'kable').map((entry) => entry.id)).toEqual(['1'])
    expect(findCases(named, '  ')).toEqual([])
  })

  it('finds cases by inventory, label and old numbers as whole numbers', () => {
    const numbered = [
      { ...item('x', 'rack'), inventoryNumber: 'C-14' },
      { ...item('y', 'rack'), oldNumbers: '4, A-7' },
      { ...item('z', null), labelNumber: '14' },
    ]
    expect(findCases(numbered, '4').map((entry) => entry.id)).toEqual(['y'])
    expect(findCases(numbered, 'a-7').map((entry) => entry.id)).toEqual(['y'])
    expect(findCases(numbered, 'c-14').map((entry) => entry.id)).toEqual(['x'])
    expect(findCases(numbered, '14').map((entry) => entry.id)).toEqual(['z'])
  })

  it('formats metres and proposes a free name', () => {
    expect(metres(1250)).toBe('12,5 m')
    expect(metres(800)).toBe('8 m')
    expect(nextSpotName([])).toBe('Miesto 1')
    expect(nextSpotName([{ name: 'Regál' }, { name: 'Miesto 3' }])).toBe('Miesto 4')
  })
})

describe('level usage', () => {
  it('counts footprint of cases against the shelf and flags too tall ones', () => {
    const spot = { length: 200, width: 100, levelHeightCm: 80 }
    const cases = [
      { id: 'a', name: 'Beam case', spotId: 's', spotLevel: 1, widthCm: 60, lengthCm: 100, depthCm: 70 },
      { id: 'b', name: 'Rack', spotId: 's', spotLevel: 1, widthCm: 60, lengthCm: 50, depthCm: 90 },
      { id: 'c', name: 'Taška', spotId: 's', spotLevel: 1 },
    ]
    const usage = levelUsage(spot, cases)
    expect(usage.percent).toBe(45)
    expect(usage.freeM2).toBeCloseTo(1.1)
    expect(usage.unknown).toBe(1)
    expect(usage.tooTall.map((item) => item.name)).toEqual(['Rack'])
  })
})

describe('rack bays', () => {
  it('falls back to one bay and computes what fits on a shelf', async () => {
    const { rackBays, cellUsage, casesInCell, describeSpot, cleanBays } = await import('./model')
    const old = { length: 300, levels: 2, levelHeightCm: 120 }
    expect(rackBays(old)).toEqual([{ widthCm: 300, levels: [{ heightCm: 120 }, { heightCm: 120 }] }])
    const bay = { widthCm: 267, levels: [{ heightCm: 160, pallets: 2 }] }
    const cases = [
      { id: 'a', name: 'Amp', spotId: 's', spotLevel: 1, spotBay: 2, lengthCm: 60, depthCm: 50 },
      { id: 'b', name: 'Svetlá', spotId: 's', spotLevel: 1, spotBay: 2, lengthCm: 120, depthCm: 170 },
      { id: 'c', name: 'Káble', spotId: 's', spotLevel: 1, spotBay: null },
    ]
    const cell = casesInCell(cases, 2, 1)
    expect(cell.map((item) => item.id)).toEqual(['a', 'b'])
    expect(cellUsage(bay, bay.levels[0], cell)).toMatchObject({ usedCm: 180, freeCm: 87, palletFit: 3, palletRest: 27, unknown: 0 })
    expect(cellUsage(bay, bay.levels[0], cell).tooTall.map((item) => item.id)).toEqual(['b'])
    expect(casesInCell(cases, 1, 1).map((item) => item.id)).toEqual(['c'])
    expect(describeSpot({ name: 'Regál A', levels: 3, bays: [bay, bay] }, 2, 1)).toBe('Regál A, pole 1, 2. polica')
    expect(cleanBays([{ widthCm: 5, levels: [] }])).toEqual([{ widthCm: 20, levels: [{ heightCm: 100 }] }])
  })
})
