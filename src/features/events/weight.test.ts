import { describe, expect, it } from 'vitest'
import { eventWeight, formatTotalWeight } from './weight'

describe('eventWeight', () => {
  const items = [
    { id: 'head', attributes: { weightKg: 22.5 } },
    { id: 'cable', attributes: {} },
  ]
  const cases = [{ id: 'box', weightKg: 18 }]

  it('adds pieces times quantity and each case once', () => {
    const lines = [
      { equipmentId: 'head', quantity: 2, caseId: 'box' },
      { equipmentId: 'cable', quantity: 10, caseId: 'box' },
    ]
    expect(eventWeight(lines, items, cases)).toEqual({ kg: 63, missing: 1 })
  })

  it('formats tonnes for heavy events', () => {
    expect(formatTotalWeight(63)).toBe('63 kg')
    expect(formatTotalWeight(1250)).toBe('1,25 t')
  })
})
