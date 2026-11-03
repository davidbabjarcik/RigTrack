import { describe, expect, it } from 'vitest'
import { cleanTrussLayout, moveStack, pieceColor, pieceHeightCm, placedCounts, stackHeightCm, withStack } from './truss'

const piece = (id: string, attributes: object) => ({ id, name: id, quantity: 4, attributes })

describe('truss storage', () => {
  it('cleans the stored layout', () => {
    expect(cleanTrussLayout(null)).toEqual({ cellCm: 35, cols: 10, rows: 6, stacks: [], spotId: null })
    const layout = cleanTrussLayout({ cellCm: 500, cols: 3, rows: 2, stacks: [{ col: 9, row: 0, pieces: ['a', 1] }, { col: 2, row: 0, pieces: ['b'] }, { col: 1, row: 1, pieces: [] }] })
    expect(layout).toEqual({ cellCm: 100, cols: 3, rows: 2, stacks: [{ col: 2, row: 0, pieces: ['a'] }], spotId: null })
    expect(cleanTrussLayout({ spotId: 'abc' }).spotId).toBe('abc')
  })

  it('stacks, counts and moves pieces', () => {
    let layout = withStack(cleanTrussLayout({}), 0, 0, ['t3', 't3', 'base'])
    layout = withStack(layout, 1, 0, ['t2'])
    expect(placedCounts(layout)).toEqual(new Map([['t3', 2], ['base', 1], ['t2', 1]]))
    layout = moveStack(layout, { col: 0, row: 0 }, { col: 1, row: 0 })
    expect(layout.stacks.find((s) => s.col === 1)?.pieces).toEqual(['t3', 't3', 'base'])
    expect(layout.stacks.find((s) => s.col === 0)?.pieces).toEqual(['t2'])
    expect(withStack(layout, 0, 0, []).stacks).toHaveLength(1)
  })

  it('knows piece heights and colours', () => {
    const byId = new Map([
      ['t3', piece('t3', { trussType: 'point4', lengthM: 3 })],
      ['roh', piece('roh', { trussType: 'point4', trussShape: 'corner' })],
      ['base', piece('base', { trussType: 'accessory' })],
    ])
    expect(pieceHeightCm(byId.get('t3'), 35)).toBe(300)
    expect(stackHeightCm({ col: 0, row: 0, pieces: ['t3', 'roh', 'base'] }, byId, 35)).toBe(347)
    expect(pieceColor(byId.get('t3'))).toBe(pieceColor(piece('x', { lengthM: 3 })))
    expect(pieceColor(byId.get('roh'))).not.toBe(pieceColor(byId.get('t3')))
  })
})
