import { describe, expect, it } from 'vitest'
import { formatWeight, labelContentLines } from './label'

describe('labelContentLines', () => {
  it('merges equal names and sums their pieces', () => {
    const lines = labelContentLines([
      { name: 'Svetlo LED Par', quantity: 1 },
      { name: 'XLR kábel 5 m', quantity: 20 },
      { name: 'Svetlo LED Par', quantity: 1 },
      { name: 'Mixpult', quantity: 1 },
    ])
    expect(lines).toEqual(['Mixpult', '2× Svetlo LED Par', '20× XLR kábel 5 m'])
  })

  it('sorts lengths numerically, not as text', () => {
    const lines = labelContentLines([
      { name: 'XLR kábel 10 m', quantity: 5 },
      { name: 'XLR kábel 2 m', quantity: 5 },
    ])
    expect(lines).toEqual(['5× XLR kábel 2 m', '5× XLR kábel 10 m'])
  })

  it('returns nothing for an empty case', () => {
    expect(labelContentLines([])).toEqual([])
  })
})

describe('formatWeight', () => {
  it('uses a decimal comma and leaves a missing weight empty', () => {
    expect(formatWeight(35.5)).toBe('35,5 kg')
    expect(formatWeight(40)).toBe('40 kg')
    expect(formatWeight(null)).toBe('')
  })
})
