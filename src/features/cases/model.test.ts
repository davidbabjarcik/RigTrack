import { describe, expect, it } from 'vitest'
import { caseContentHash } from './model'


describe('caseContentHash', () => {
  const gear = [
    { id: 'a', name: 'Kábel', caseId: 'c1', quantity: 10, unitIds: [] },
    { id: 'b', name: 'Hlava', caseId: 'c1', quantity: 2, unitIds: [2, 1] },
    { id: 'c', name: 'Mimo', caseId: null, quantity: 1 },
  ]
  it('stays the same for the same content in any order and changes when the content changes', () => {
    const hash = caseContentHash('c1', gear)
    expect(caseContentHash('c1', [...gear].reverse())).toBe(hash)
    expect(caseContentHash('c1', gear.map((item) => (item.id === 'a' ? { ...item, quantity: 9 } : item)))).not.toBe(hash)
    expect(caseContentHash('c1', gear.filter((item) => item.id !== 'b'))).not.toBe(hash)
    expect(caseContentHash('c1', [...gear, { id: 'd', name: 'Iný case', caseId: 'c2', quantity: 1 }])).toBe(hash)
  })
})
