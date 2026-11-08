import { describe, expect, it } from 'vitest'
import type { Spot } from '@/features/warehouse/model'
import { addScan, eventAdditions, placements, type Scanned } from './bulkMove'

describe('bulk move', () => {
  it('collects scans: a case once, units once each, equipment without units counted', () => {
    let list: Scanned[] = []
    const scan = (target: Parameters<typeof addScan>[1]) => {
      const result = addScan(list, target)
      list = result.list
      return result.added
    }
    expect(scan({ kind: 'case', id: 'c1' })).toBe(true)
    expect(scan({ kind: 'case', id: 'c1' })).toBe(false)
    expect(scan({ kind: 'equipment', id: 'beam', unit: 2 })).toBe(true)
    expect(scan({ kind: 'equipment', id: 'beam', unit: 1 })).toBe(true)
    expect(scan({ kind: 'equipment', id: 'beam', unit: 2 })).toBe(false)
    expect(scan({ kind: 'equipment', id: 'cable' })).toBe(true)
    expect(scan({ kind: 'equipment', id: 'cable' })).toBe(true)
    expect(scan({ kind: 'spot', id: 's1' })).toBe(false)
    expect(list).toEqual([
      { kind: 'case', id: 'c1', units: [], count: 1 },
      { kind: 'equipment', id: 'beam', units: [1, 2], count: 2 },
      { kind: 'equipment', id: 'cable', units: [], count: 2 },
    ])
  })

  it('adds whole cases and extra pieces to an event without counting case content twice', () => {
    const equipment = [
      { id: 'mic', caseId: 'c1', quantity: 6 },
      { id: 'stand', caseId: 'c1', quantity: 0 },
      { id: 'beam', caseId: null, quantity: 8 },
      { id: 'cable', caseId: null, quantity: 50 },
    ]
    const scanned: Scanned[] = [
      { kind: 'case', id: 'c1', units: [], count: 1 },
      { kind: 'case', id: 'c2', units: [], count: 1 },
      { kind: 'equipment', id: 'mic', units: [], count: 1 },
      { kind: 'equipment', id: 'beam', units: [1, 2], count: 2 },
      { kind: 'equipment', id: 'cable', units: [], count: 3 },
    ]
    const lines = [
      { equipmentId: 'cable', quantity: 10, caseId: null },
      { equipmentId: 'x', quantity: 1, caseId: 'c2' },
    ]
    expect(eventAdditions(scanned, equipment, lines)).toEqual({
      cases: [{ caseId: 'c1', content: [{ equipmentId: 'mic', quantity: 6 }] }],
      items: [
        { equipmentId: 'beam', quantity: 2, isNew: true },
        { equipmentId: 'cable', quantity: 13, isNew: false },
      ],
    })
  })

  it('places cases on the chosen level, or bay by bay in a rack with bays', () => {
    const floor = { id: 's1', name: 'Zóna', kind: 'zone', x: 0, y: 0, length: 200, width: 100, levels: 1 } as Spot
    const shelf = { ...floor, id: 's2', name: 'Regál', kind: 'rack', levels: 3 } as Spot
    const boxes = [
      { id: 'a', name: 'A', spotId: null, spotLevel: null },
      { id: 'b', name: 'B', spotId: null, spotLevel: null },
    ]
    expect(placements(floor, [], boxes, 2)).toEqual([
      { caseId: 'a', level: null, bay: null },
      { caseId: 'b', level: null, bay: null },
    ])
    expect(placements(shelf, [], boxes, 5).map((item) => item.level)).toEqual([3, 3])
    const bays = { ...shelf, id: 's3', bays: [{ widthCm: 60, levels: [{ heightCm: 100 }] }, { widthCm: 60, levels: [{ heightCm: 100 }] }] } as Spot
    const wide = boxes.map((box) => ({ ...box, widthCm: 50, lengthCm: 50, depthCm: 80 }))
    expect(placements(bays, [], wide, null).map((item) => item.bay)).toEqual([1, 2])
  })
})
