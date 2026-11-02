import { describe, expect, it } from 'vitest'
import type { Equipment } from './model'
import { posterSections } from './poster'

let n = 0
const item = (patch: Partial<Equipment>): Equipment =>
  ({ id: `e${++n}`, name: 'X', kind: 'truss', attributes: {}, quantity: 1, photoPath: '', status: 'available', manufacturer: '', model: '', categoryId: null, ...patch }) as Equipment

describe('posterSections', () => {
  it('groups truss into straight sections per series, corners and bases', () => {
    const sections = posterSections(
      [
        item({ name: 'F34 1 m', model: 'F34', attributes: { trussType: 'point4', trussShape: 'straight', lengthM: 1 }, quantity: 4 }),
        item({ name: 'F34 3 m', model: 'F34', attributes: { trussType: 'point4', lengthM: 3 }, quantity: 10, photoPath: 'p.jpg' }),
        // Rovnaký diel rozdelený do dvoch cases sa zráta.
        item({ name: 'F34 1 m', model: 'F34', attributes: { trussType: 'point4', trussShape: 'straight', lengthM: 1 }, quantity: 5 }),
        item({ name: 'Roh 90°', attributes: { trussType: 'point4', trussShape: 'corner' }, quantity: 8 }),
        item({ name: 'Base plate 600×600', attributes: { trussType: 'accessory' }, quantity: 12 }),
        item({ name: 'Starý diel', attributes: { trussType: 'point4' }, status: 'retired' }),
        item({ name: 'Platňa', kind: 'stage', attributes: { stageType: 'deck' } }),
      ],
      'truss',
    )
    expect(sections.map((s) => [s.title, s.total])).toEqual([
      ['Rovné diely – F34', 19],
      ['Rohy, T a kríže', 8],
      ['Základne, spojky a príslušenstvo', 12],
    ])
    expect(sections[0].tiles.map((t) => [t.name, t.detail, t.count])).toEqual([
      ['F34 3 m', '3 m', 10],
      ['F34 1 m', '1 m', 9],
    ])
    expect(sections[1].tiles[0].detail).toBe('Roh')
  })

  it('puts the biggest stage decks first', () => {
    const sections = posterSections(
      [
        item({ name: 'Platňa malá', kind: 'stage', attributes: { stageType: 'deck', stageSize: '0,5×1 m' }, quantity: 4 }),
        item({ name: 'Platňa', kind: 'stage', attributes: { stageType: 'deck', stageSize: '2×1 m' }, quantity: 15 }),
        item({ name: 'Noha 40 cm', kind: 'stage', attributes: { stageType: 'accessory' }, quantity: 24 }),
      ],
      'stage',
    )
    expect(sections.map((s) => s.title)).toEqual(['Pódiové platne', 'Nohy, zábradlia, schody a spojky'])
    expect(sections[0].tiles.map((t) => t.count)).toEqual([15, 4])
  })
})
