import { describe, expect, it } from 'vitest'
import { slotInfo } from './fit'
import { catalogMatch, rackCategory, withCatalog } from './library'

const catalog = [
  { id: 'c1', kind: 'audio', manufacturer: 'Ukážka', model: 'A2', attributes: { audioType: 'amplifier' as const, rackU: 2, weightKg: 12, powerW: 800 } },
  { id: 'c2', kind: 'audio', manufacturer: 'Ukážka', model: 'R1', attributes: { audioType: 'other' as const, rackRole: 'antenna', rackU: 1 } },
]

describe('knižnica racku', () => {
  it('kategória podľa typu techniky alebo rackRole', () => {
    expect(rackCategory('audio', { audioType: 'amplifier' })).toBe('amp')
    expect(rackCategory('audio', { audioType: 'wireless' })).toBe('wireless')
    expect(rackCategory('audio', { audioType: 'other', rackRole: 'antenna' })).toBe('antenna')
    expect(rackCategory('it', { itType: 'network' })).toBe('network')
    expect(rackCategory('appliance', { rackRole: 'power' })).toBe('power')
    expect(rackCategory('audio', { rackRole: 'nezmysel' })).toBe('other')
  })

  it('technika bez údajov do racku ich dostane z rovnakého modelu v databáze', () => {
    const item = { kind: 'audio', manufacturer: 'ukážka ', model: 'a2' }
    expect(catalogMatch(item, catalog)?.id).toBe('c1')
    expect(catalogMatch({ ...item, model: '' }, catalog)).toBeUndefined()
    // Zadané pri technike má prednosť.
    expect(withCatalog({ weightKg: 15 }, catalog[0])).toEqual({ weightKg: 15, rackU: 2, powerW: 800 })
  })

  it('slot s technikou berie hmotnosť a príkon z databázy', () => {
    const slot = { key: 'k', side: 'front' as const, bottomU: 1, heightU: 2, width: 'full' as const, col: 0, equipmentId: 'e1', unit: null, catalogId: null, accessory: null, label: '', depthMm: null, weightKg: null, powerW: null, rearSupport: null }
    const sources = { equipment: [{ id: 'e1', name: 'Zosilňovač', manufacturer: 'Ukážka', model: 'A2', kind: 'audio' as const, attributes: {} }], catalog }
    expect(slotInfo(slot, sources)).toMatchObject({ weightKg: 12, powerW: 800 })
  })
})
