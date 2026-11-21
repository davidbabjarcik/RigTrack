import { describe, expect, it } from 'vitest'
import { substitutesFor } from './substitutes'

const gear = (id: string, extra: object = {}) => ({ id, name: `Ukážka ${id}`, kind: 'light', categoryId: 'c1', manufacturer: 'X', model: 'A', quantity: 2, ...extra })

describe('substitutesFor', () => {
  it('rovnaký druh a kategória, voľné, nie na evente; najprv rovnaký model', () => {
    const piece = gear('p')
    const stock = [piece, gear('other-maker', { manufacturer: 'Y' }), gear('same-model'), gear('other-cat', { categoryId: 'c2' }), gear('audio', { kind: 'audio' }), gear('busy'), gear('here')]
    const free = (item: { id: string }) => (item.id === 'busy' ? 0 : 2)
    const result = substitutesFor(piece, stock, free, new Set(['here']))
    expect(result.map((row) => row.item.id)).toEqual(['same-model', 'other-maker'])
  })
})
