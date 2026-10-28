import { describe, expect, it } from 'vitest'
import type { Equipment } from '@/features/equipment/model'
import { addressesFromEquipment, dmxConflicts, dmxFromEquipment, fillAddresses, nextDmxAddress, sortDmx, type DmxLine } from './dmx'

const line = (id: string, universe: string, address: number | null, channels: number): DmxLine => ({ id, universe, address, channels, name: id, equipmentId: null, unit: null, mode: '', note: '' })

describe('DMX patch', () => {
  it('finds overlapping addresses and the next free one', () => {
    const lines = [line('a', '1', 1, 16), line('b', '1', 10, 8), line('c', '2', 1, 16), line('d', '1', 505, 16)]
    expect([...dmxConflicts(lines)].sort()).toEqual(['a', 'b', 'd'])
    expect(nextDmxAddress([line('a', '1', 1, 16)], '1')).toBe(17)
    expect(sortDmx([line('x', '10', 1, 1), line('y', '2', 5, 1), line('z', '2', 1, 1)]).map((value) => value.id)).toEqual(['z', 'y', 'x'])
  })

  it('builds lines from lights on the event with their default DMX', () => {
    const beam = {
      id: 'b',
      name: 'Beam',
      kind: 'light',
      trackUnits: true,
      quantity: 3,
      unitIds: [1, 2, 3],
      attributes: { dmxModes: [{ name: 'Basic', channels: 16 }] },
      unitInfo: { '1': { dmxLine: 'A', dmxAddress: 1, dmxMode: 'Basic' } },
    } as unknown as Equipment
    const lines = fillAddresses(dmxFromEquipment([{ equipmentId: 'b', quantity: 2, caseId: null }], [beam]))
    expect(lines.map((value) => [value.name, value.universe, value.address, value.channels])).toEqual([
      ['Beam #1', 'A', 1, 16],
      ['Beam #2', '1', 1, 16],
    ])
  })

  it('takes addresses written at the equipment later', () => {
    const gear = [{ id: 'b', attributes: { dmxModes: [{ name: 'Basic', channels: 16 }] }, unitInfo: { '2': { dmxLine: 'B', dmxAddress: 33, dmxMode: 'Basic' } } }] as never
    const lines = [
      { universe: '1', address: null, channels: 1, name: 'Beam #2', equipmentId: 'b', unit: 2, mode: '', note: '' },
      { universe: '1', address: 5, channels: 1, name: 'Iné', equipmentId: null, unit: null, mode: '', note: '' },
    ]
    const result = addressesFromEquipment(lines, gear)
    expect(result.changed).toBe(1)
    expect(result.lines[0]).toMatchObject({ universe: 'B', address: 33, mode: 'Basic', channels: 16 })
    expect(result.lines[1]).toBe(lines[1])
  })
})
