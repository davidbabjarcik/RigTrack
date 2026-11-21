import { describe, expect, it } from 'vitest'
import { expectedItems, inventoryReport, outNow, scannedKeys } from './inventory'

const piece = (id: string, extra: object = {}) => ({ id, caseId: null, status: 'available', kind: 'light', trackUnits: false, quantity: 1, unitIds: [], ...extra })
const cases = [{ id: 'c1', spotId: 's1' }, { id: 'c2', spotId: 's2' }]
const equipment = [piece('a'), piece('b', { trackUnits: true, quantity: 2 }), piece('in-case', { caseId: 'c1' }), piece('sold', { status: 'sold' }), piece('tape', { kind: 'consumable' })]

describe('inventúra', () => {
  it('celý sklad: cases a technika mimo cases, po kusoch po kusoch', () => {
    expect(expectedItems(cases, equipment, '').map((item) => item.key)).toEqual(['case:c1', 'case:c2', 'eq:a', 'eq:b#1', 'eq:b#2'])
    expect(expectedItems(cases, equipment, 's1').map((item) => item.key)).toEqual(['case:c1'])
  })

  it('nájdené, chýba, vonku a navyše', () => {
    const expected = expectedItems(cases, equipment, '')
    const scanned = scannedKeys(
      [{ kind: 'case', id: 'c1', units: [], count: 1 }, { kind: 'equipment', id: 'b', units: [2], count: 1 }, { kind: 'equipment', id: 'in-case', units: [], count: 1 }],
      equipment,
    )
    const out = outNow([{ startsOn: '2026-11-20', endsOn: '2026-11-22', status: 'confirmed', equipment: [{ equipmentId: 'a', caseId: null }] }], [], '2026-11-21')
    const report = inventoryReport(expected, scanned, out)
    expect(report.found.map((item) => item.key)).toEqual(['case:c1', 'eq:b#2'])
    expect(report.missing.map((item) => item.key)).toEqual(['case:c2', 'eq:b#1'])
    expect(report.out.map((item) => item.key)).toEqual(['eq:a'])
    expect(report.extra).toEqual(['eq:in-case'])
  })

  it('štítok celej položky pri technike po kusoch zaráta všetky kusy', () => {
    const scanned = scannedKeys([{ kind: 'equipment', id: 'b', units: [], count: 1 }], equipment)
    const report = inventoryReport(expectedItems([], equipment, ''), scanned, new Set())
    expect(report.found.map((item) => item.key)).toEqual(['eq:b#1', 'eq:b#2'])
    expect(report.extra).toEqual([])
  })
})
