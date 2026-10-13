import { describe, expect, it } from 'vitest'
import { byLevel, casesBySpot, describeSpot, findCases, metres, nextSpotName, type PlacedCase } from './model'

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

  it('formats metres and proposes a free name', () => {
    expect(metres(1250)).toBe('12,5 m')
    expect(metres(800)).toBe('8 m')
    expect(nextSpotName([])).toBe('Miesto 1')
    expect(nextSpotName([{ name: 'Regál' }, { name: 'Miesto 3' }])).toBe('Miesto 4')
  })
})
