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
      ['F34 – rovné diely', 19],
      ['Rohy, T-čká a kríže', 8],
      ['Adaptéry, základne, spojky a príslušenstvo', 12],
    ])
    expect(sections[0].tiles.map((t) => [t.name, t.detail, t.count])).toEqual([
      ['F34 3 m', '3 m', 10],
      ['F34 1 m', '1 m', 9],
    ])
    expect(sections[1].tiles[0].detail).toBe('Roh')
  })

  it('splits truss by series (F34, F34 P) with straight pieces first, then corners and T pieces', () => {
    const gt = (model: string, patch: Partial<Equipment['attributes']>, quantity = 1) =>
      item({ name: `Global Truss ${model}`, manufacturer: 'Global Truss', model, attributes: { trussType: 'point4', ...patch }, quantity })
    const sections = posterSections(
      [
        gt('F34 – 1 m (F34100)', { trussShape: 'straight', lengthM: 1 }, 9),
        gt('F34 – 2 m (F34200)', { trussShape: 'straight', lengthM: 2 }, 10),
        gt('F34 P (silnejší) – 3 m (F34300P)', { trussShape: 'straight', lengthM: 3 }, 20),
        gt('F34 – roh 90° (C001)', { trussShape: 'corner' }, 4),
        gt('F34 – T-kus (T35)', { trussShape: 'tee' }, 2),
        gt('F34 P (silnejší) – 0,5 m (F34050P)', { trussShape: 'straight', lengthM: 0.5 }, 4),
        item({ name: 'Adaptér F34 / F44', attributes: { trussType: 'accessory' }, quantity: 3 }),
      ],
      'truss',
    )
    expect(sections.map((s) => [s.title, s.total])).toEqual([
      ['Global Truss F34 – rovné diely', 19],
      ['Global Truss F34 – rohy, T-čká a kríže', 6],
      ['Global Truss F34 P (silnejší) – rovné diely', 24],
      ['Adaptéry, základne, spojky a príslušenstvo', 3],
    ])
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

  it('splits lights into moving, static and effect groups', () => {
    const sections = posterSections(
      [
        item({ name: 'Beam 7R', kind: 'light', attributes: { lightType: 'moving_beam' }, quantity: 16 }),
        item({ name: 'Blinder 2×100 W', kind: 'light', attributes: { lightType: 'blinder' }, quantity: 8 }),
        item({ name: 'Poistné lanko', kind: 'light', attributes: { lightType: 'acc_other' }, quantity: 10 }),
        item({ name: 'Bez typu', kind: 'light', attributes: {}, quantity: 1 }),
      ],
      'light',
    )
    expect(sections.map((s) => s.title)).toEqual(['Pohyblivé svetlá', 'Efektové svetlá', 'Príslušenstvo', 'Ostatné'])
  })

  it('adds a quiet info line and keeps shared companies on their own tiles', () => {
    const sections = posterSections(
      [
        item({ name: 'Box 12', kind: 'audio', attributes: { audioType: 'speaker', powered: 'active' } }),
        item({ name: 'Mic set', kind: 'audio', attributes: { audioType: 'wireless', rfRange: '470–790 MHz' } }),
        item({ name: 'Box 12', kind: 'audio', attributes: { audioType: 'speaker', powered: 'active' }, quantity: 2 }),
        { ...item({ name: 'Box 12', kind: 'audio', attributes: { audioType: 'speaker', powered: 'passive' } }), from: 'Partner' },
      ],
      'audio',
    )
    const tiles = sections.flatMap((section) => section.tiles.map((tile) => [tile.name, tile.info, tile.count]))
    expect(tiles).toEqual([
      ['Box 12', 'aktívny', 3],
      ['Box 12', 'pasívny · Partner', 1],
      ['Mic set', '470–790 MHz', 1],
    ])
    const light = posterSections([item({ name: 'Wash', kind: 'light', attributes: { lightType: 'led_par', lightSource: 'led' } })], 'light')
    expect(light[0].tiles[0].info).toBe('LED')
  })
})
