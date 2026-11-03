import { describe, expect, it } from 'vitest'
import { autoCell, byLevel, casesBySpot, describeSpot, findCases, levelUsage, metres, nextSpotName, type PlacedCase } from './model'

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

describe('rotation and rack length', () => {
  it('turns a rack around its centre and keeps it inside', async () => {
    const { rotated, rackLengthCm } = await import('./model')
    expect(rotated({ x: 100, y: 100, length: 300, width: 100 }, { lengthCm: 2000, widthCm: 1000 })).toEqual({ x: 200, y: 0, length: 100, width: 300 })
    expect(rotated({ x: 0, y: 0, length: 300, width: 100 }, { lengthCm: 2000, widthCm: 1000 })).toEqual({ x: 100, y: 0, length: 100, width: 300 })
    expect(rackLengthCm([{ widthCm: 267, levels: [] }, { widthCm: 267, levels: [] }])).toBe(561)
  })
})

describe('pallets on a shelf', () => {
  it('spreads them or packs them to one side', async () => {
    const { palletPositions } = await import('./model')
    expect(palletPositions(267, { heightCm: 150, pallets: 3, palletAlign: 'left' })).toEqual([0, 80, 160])
    expect(palletPositions(267, { heightCm: 150, pallets: 3, palletAlign: 'right' })).toEqual([27, 107, 187])
    expect(palletPositions(267, { heightCm: 150, pallets: 3 }).map(Math.round)).toEqual([7, 94, 180])
    expect(palletPositions(267, { heightCm: 150 })).toEqual([])
  })
})

describe('layoutCell', () => {
  const bay = { widthCm: 267, levels: [] }
  const box = (id: string, lengthCm: number | null, depthCm: number | null, spotPallet: number | null = null) => ({ id, name: id, spotId: 's', spotLevel: 1, lengthCm, depthCm, spotPallet })

  it('puts cases on pallets, stacks a full pallet and keeps manual choices', async () => {
    const { layoutCell } = await import('./model')
    const level = { heightCm: 150, pallets: 3, palletAlign: 'left' as const }
    const { boxes, freeCm, notFit } = layoutCell(bay, level, [box('a', 60, 40), box('b', 60, 40), box('c', 40, 30, 3), box('d', 30, 30)])
    const at = Object.fromEntries(boxes.map((b) => [b.item.id, { x: b.x, bottom: b.bottom, pallet: b.pallet }]))
    expect(at.c).toEqual({ x: 160, bottom: 14, pallet: 3 })
    expect(at.a).toEqual({ x: 0, bottom: 14, pallet: 1 })
    // 60 + 60 > 80 → b ide navrch a na prvú paletu
    expect(at.b).toEqual({ x: 0, bottom: 54, pallet: 1 })
    expect(at.d).toEqual({ x: 0, bottom: 94, pallet: 1 })
    expect(notFit).toEqual([])
    // Voľné spredu: paleta 1 (20) + paleta 2 (80) + paleta 3 (40) + 27 cm vpravo.
    expect(freeCm).toBe(167)
  })

  it('uses the side gap and flags what does not fit', async () => {
    const { layoutCell } = await import('./model')
    const level = { heightCm: 60, pallets: 3, palletAlign: 'left' as const }
    const { boxes, notFit } = layoutCell(bay, level, [box('wide', 120, 30), box('small', 25, 30), box('tall', 50, 70)])
    expect(boxes.find((b) => b.item.id === 'small')).toMatchObject({ pallet: 1, x: 0 })
    expect(notFit.map((item) => item.id)).toEqual(['wide', 'tall'])
    const { boxes: plain } = layoutCell(bay, { heightCm: 100 }, [box('x', null, null), box('y', 100, 40)])
    expect(plain.map((b) => [b.x, b.bottom, b.known])).toEqual([[0, 0, false], [60, 0, true]])
  })
})

describe('pallets and perimeter', () => {
  it('names pallets by company type and snaps doors to the nearest wall', async () => {
    const { palletName, DEFAULT_PALLET_TYPES, snapToPerimeter } = await import('./model')
    expect(palletName({ length: 80, width: 120, material: 'plastic' }, DEFAULT_PALLET_TYPES)).toBe('EUR plastová · 120 × 80 cm')
    expect(palletName({ length: 110, width: 110, material: 'wood' }, DEFAULT_PALLET_TYPES)).toBe('drevená 110 × 110 cm')
    const house = { lengthCm: 1000, widthCm: 800 }
    expect(snapToPerimeter({ x: 300, y: 40, length: 120, width: 15 }, house)).toEqual({ x: 300, y: 0, length: 120, width: 15 })
    expect(snapToPerimeter({ x: 960, y: 300, length: 15, width: 150 }, house)).toEqual({ x: 985, y: 300, length: 15, width: 150 })
    expect(snapToPerimeter({ x: 300, y: 300, length: 120, width: 15 }, house)).toEqual({ x: 300, y: 300, length: 120, width: 15 })
  })
})

describe('plan colours', () => {
  it('uses custom kind colours and pallet type colours', async () => {
    const { spotColor, palletTone, SPOT_KIND_FILLS, darker } = await import('./model')
    expect(spotColor('rack', { planColors: { rack: '#ff0000' } })).toBe('#ff0000')
    expect(spotColor('zone', { planColors: {} })).toBe(SPOT_KIND_FILLS.zone)
    const warehouse = { palletTypes: [{ id: 'a', name: 'EUR modrá', length: 120, width: 80, material: 'plastic' as const, color: '#3366ff' }] }
    expect(palletTone({ length: 80, width: 120, material: 'plastic' }, warehouse)).toEqual({ fill: '#3366ff', line: darker('#3366ff') })
    expect(palletTone({ length: 120, width: 80, material: 'wood' }, warehouse).fill).toBe('#d6b88a')
  })
})

describe('autoCell', () => {
  const bays = [
    { widthCm: 100, levels: [{ heightCm: 100 }, { heightCm: 100 }] },
    { widthCm: 100, levels: [{ heightCm: 100 }] },
  ]
  const placed = (id: string, bay: number, level: number, lengthCm: number | null) =>
    ({ id, name: id, spotId: 's', spotLevel: level, spotBay: bay, spotPallet: null, lengthCm, widthCm: null, depthCm: 90 }) as unknown as PlacedCase

  it('puts a case without size on the first shelf with room', () => {
    const item = placed('new', 1, 1, null)
    expect(autoCell(bays, [], item)).toEqual({ bay: 1, level: 1 })
    // Prvá polica plná (90 cm z 100, vysoké) – case bez rozmerov (60 cm) ide na druhú.
    expect(autoCell(bays, [placed('a', 1, 1, 90)], item)).toEqual({ bay: 1, level: 2 })
    expect(autoCell(bays, [placed('a', 1, 1, 90), placed('b', 1, 2, 90)], item)).toEqual({ bay: 2, level: 1 })
  })
})
