import { describe, expect, it } from 'vitest'
import { groupGear } from './myEquipment'

describe('my equipment', () => {
  it('groups copies under their original', () => {
    const items = [
      { id: 'a', companyId: 'c1', name: 'X32', quantity: 1, sharedFrom: null },
      { id: 'b', companyId: 'c2', name: 'X32', quantity: 1, sharedFrom: 'a' },
      { id: 'c', companyId: 'c3', name: 'Basa', quantity: 2, sharedFrom: 'hidden' },
    ]
    expect(groupGear(items).map((gear) => [gear.original.id, gear.copies.map((copy) => copy.id)])).toEqual([
      ['c', []],
      ['a', ['b']],
    ])
  })
})
