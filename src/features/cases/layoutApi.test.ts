import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase/client', () => ({ getSupabase: () => ({}) }))
const { sheetCompartments } = await import('./layoutApi')

describe('sheetCompartments', () => {
  it('v priehradke názvy aj fotky techniky (každá raz)', () => {
    const content = [
      { id: 'a', name: 'Ukážkový blinder', quantity: 2, trackUnits: true, unitIds: [1, 2], photoPath: 'co/a.jpg' },
      { id: 'b', name: 'Ukážkový kábel', quantity: 4, trackUnits: false, unitIds: [], photoPath: '' },
    ]
    const sections = sheetCompartments(
      { sections: [{ name: 'Priehradky', rows: 1, cols: 2, cells: [{ items: [{ equipmentId: 'a', unit: 1, count: 1 }, { equipmentId: 'a', unit: 2, count: 1 }], note: '' }, { items: [{ equipmentId: 'b', unit: null, count: 4 }], note: 'káble' }] }] },
      content,
    )
    expect(sections[0].cells[0].lines).toEqual(['Ukážkový blinder #1', 'Ukážkový blinder #2'])
    expect(sections[0].cells[0].photos).toEqual(['co/a.jpg'])
    expect(sections[0].cells[1].photos).toEqual([])
  })
})
