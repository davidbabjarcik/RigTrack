import { describe, expect, it } from 'vitest'
import { coverLength, DEFAULT_STAGE_CONFIG, legPoints, openSegments, planStage, quantitiesByEquipment, readStageConfig, type StageRequest } from './model'

const config = {
  ...DEFAULT_STAGE_CONFIG,
  legs: [20, 40, 60, 80, 100].map((heightCm) => ({ heightCm, equipmentId: `leg${heightCm}` })),
}
const request = (patch: Partial<StageRequest>): StageRequest => ({
  widthM: 6,
  depthM: 4,
  heightCm: 60,
  orientation: 'auto',
  skirtSides: [],
  railingSides: [],
  lathSides: [],
  stairs: [],
  extraDecks: [],
  catwalk: null,
  risers: [],
  stairsToTop: false,
  stairsRailingSides: 0,
  ...patch,
})
const plan = (patch: Partial<StageRequest>) => planStage(request(patch), config)
const quantities = (patch: Partial<StageRequest>) => Object.fromEntries(plan(patch).lines.map((line) => [line.key, line.quantity]))

describe('legs', () => {
  // Tabuľka na výpočet nôh na NIVTEC: stĺpce šírka 1–10 m, riadky dĺžka 2–22 m (po 2 m, smer dlhšej strany dosky).
  it('match the paper table for every cell', () => {
    for (let width = 1; width <= 10; width++) {
      for (let depth = 2; depth <= 22; depth += 2) {
        const legs = quantities({ widthM: width, depthM: depth, orientation: 'deep' })[`leg-60`]
        expect(legs, `${width} × ${depth} m`).toBe((width + 1) * (depth / 2 + 1))
      }
    }
  })

  it('are shared by neighbouring decks', () => {
    expect(legPoints([{ x: 0, y: 0, w: 2, d: 1 }])).toBe(4)
    expect(legPoints([{ x: 0, y: 0, w: 2, d: 1 }, { x: 0, y: 1, w: 2, d: 1 }])).toBe(6)
  })
})

describe('planStage', () => {
  it('needs no deck connectors, only decks and legs', () => {
    expect(quantities({ orientation: 'deep' })).toEqual({ 'deck-d2x1': 12, 'leg-60': 21 })
  })

  it('turns the decks so that as few 1 × 1 decks as possible are needed', () => {
    expect(plan({ widthM: 5, depthM: 3 }).orientation).toBe('wide')
    expect(quantities({ widthM: 5, depthM: 3 })).toMatchObject({ 'deck-d2x1': 6, 'deck-d1x1': 3 })
    expect(plan({ widthM: 3, depthM: 5 }).orientation).toBe('deep')
  })

  it('leaves openings for stairs in railing and skirt', () => {
    const result = plan({ railingSides: ['back', 'left', 'right'], skirtSides: ['front'], stairs: [{ side: 'left', positionM: 1 }] })
    expect(result.railingSegments.filter((segment) => segment.side === 'left')).toEqual([
      { side: 'left', fromM: 0, toM: 1 },
      { side: 'left', fromM: 2, toM: 4 },
    ])
    // zadná 6 m = 3 × 2 m, ľavá 1 m + 2 m, pravá 2 × 2 m
    expect(quantities({ railingSides: ['back', 'left', 'right'], stairs: [{ side: 'left', positionM: 1 }] })).toMatchObject({
      'railing-2': 6,
      'railing-1': 1,
    })
    expect(result.skirtMeters).toBe(6)
  })

  it('counts railing accessories per piece, joint and corner', () => {
    const lines = plan({ railingSides: ['back', 'left'] }).lines
    const of = (label: string) => lines.find((line) => line.label === label)?.quantity
    // zadná 3 diely (2 spoje), ľavá 2 diely (1 spoj), jeden roh
    expect(of('Čapová spojka pre zábradlie')).toBe(10)
    expect(of('Spojka pre zábradlie')).toBe(3)
    expect(of('Rohová spojka pre zábradlie')).toBe(2)
  })

  it('builds stairs of 20 cm steps that end 20 cm under the stage by default', () => {
    expect(quantities({ heightCm: 100, stairs: [{ side: 'front', positionM: 2 }], stairsRailingSides: 1 })).toMatchObject({
      'deck-d1x05': 4,
      'leg-20': 4,
      'leg-40': 2,
      'leg-60': 2,
      'leg-80': 2,
      stairLeg: 6,
      stairRailing: 1,
      stairConnector: 2,
    })
    expect(quantities({ heightCm: 60, stairs: [{ side: 'front', positionM: 0 }], stairsToTop: true })).toMatchObject({ 'deck-d1x05': 3 })
  })

  it('fills half metres with smaller decks and warns when it cannot cover the stage', () => {
    expect(quantities({ widthM: 2, depthM: 1.5, orientation: 'wide' })).toMatchObject({ 'deck-d2x1': 1, 'deck-d1x05': 2 })
    const onlyBig = { ...config, decks: config.decks.filter((item) => item.id === 'd2x1') }
    expect(planStage(request({ widthM: 3, depthM: 2 }), onlyBig).warnings).toContain('Z nastavených dosiek sa celé pódium poskladať nedá; pridajte menšiu dosku.')
  })

  it('puts a lath of the deck edge length on each edge, never one lath across two decks', () => {
    // 2 × 2 m, dosky dlhšou stranou dozadu: vpredu dve hrany po 1 m → dve 1 m lišty na drážku
    expect(quantities({ widthM: 2, depthM: 2, orientation: 'deep', lathSides: ['front'] })).toMatchObject({ 'lath-groove-1': 2 })
    expect(quantities({ widthM: 2, depthM: 2, orientation: 'wide', lathSides: ['front', 'right'] })).toMatchObject({ 'lath-groove-2': 1, 'lath-tongue-1': 2 })
    expect(quantities({ widthM: 2, depthM: 2, orientation: 'deep', lathSides: ['front'] })['lath-groove-2']).toBeUndefined()
    // kde sú schody, lišta nie je
    expect(quantities({ widthM: 2, depthM: 2, orientation: 'deep', lathSides: ['front'], stairs: [{ side: 'front', positionM: 0 }], heightCm: 60 })).toMatchObject({ 'lath-groove-1': 1 })
  })

  it('counts decks added by hand, such as triangles', () => {
    expect(quantities({ extraDecks: [{ deckId: 'tri', count: 2 }] })).toMatchObject({ 'deck-tri': 2 })
  })

  it('adds a catwalk that shares legs with the stage and leaves an opening in the stage skirt', () => {
    const catwalk = { side: 'front' as const, positionM: 2, widthM: 2, lengthM: 4, skirt: true }
    // pódium 21 nôh + molo 3 × 3 body, z toho 3 na prednej hrane pódia spoločné
    expect(quantities({ orientation: 'deep', catwalk })).toMatchObject({ 'deck-d2x1': 16, 'leg-60': 27, 'skirt-2': 5, skirtClip: 30 })
    // plachta vpredu: 6 m mínus 2 m pri mole, plus 10 m okolo mola
    expect(quantities({ orientation: 'deep', catwalk, skirtSides: ['front'] })).toMatchObject({ 'skirt-2': 7 })
    expect(plan({ orientation: 'deep', catwalk }).catwalkDecks.every((deck) => deck.y < 0)).toBe(true)
    expect(plan({ catwalk: { ...catwalk, positionM: 5 } }).warnings).toContain('Molo je mimo hrany pódia.')
  })

  it('builds risers on legs or on wheels, with their own skirt height', () => {
    const riser = { widthM: 2, depthM: 2, heightCm: 40, wheels: true, skirt: true, xM: 2, yM: 2 }
    expect(quantities({ orientation: 'deep', risers: [riser] })).toMatchObject({ riserWheel: 6, 'skirt-2-40': 4, 'deck-d2x1': 14 })
    expect(quantities({ orientation: 'deep', risers: [{ ...riser, wheels: false, skirt: false }, { ...riser, wheels: false, skirt: false, xM: 0 }] })).toMatchObject({ 'leg-40': 12 })
    expect(plan({ risers: [{ ...riser, xM: 5 }] }).warnings).toContain('Rizer presahuje pódium.')
  })

  it('adds diagonals from 80 cm on the perimeter fields', () => {
    expect(Object.keys(quantities({ heightCm: 60 })).some((key) => key.startsWith('diagonal'))).toBe(false)
    // 6 × 4 m na šírku: vpredu a vzadu 3 + 3 polia po 2 m, po stranách 4 + 4 polia po 1 m
    expect(quantities({ heightCm: 80, orientation: 'wide' })).toMatchObject({ 'diagonal-2': 6, 'diagonal-1': 8 })
  })
})

describe('helpers', () => {
  it('cover a length with the longest pieces first', () => {
    expect([...coverLength(5, [1, 2])]).toEqual([[2, 2], [1, 1]])
    expect([...coverLength(3, [])]).toEqual([])
  })

  it('cut a side into segments around stairs', () => {
    expect(openSegments('front', 6, [{ side: 'front', positionM: 0, widthM: 1 }])).toEqual([{ side: 'front', fromM: 1, toM: 6 }])
  })

  it('add up lines that share one piece of equipment', () => {
    expect(
      quantitiesByEquipment([
        { key: 'a', group: '', label: '', quantity: 2, equipmentId: 'x' },
        { key: 'b', group: '', label: '', quantity: 3, equipmentId: 'x' },
      ]),
    ).toEqual(new Map([['x', 5]]))
  })

  it('turn old settings with deck2x1 and deck1x1 into the deck list', () => {
    const read = readStageConfig({ deck2x1: { equipmentId: 'a' }, deck1x1: { equipmentId: 'b' } })
    expect(read.decks.find((item) => item.id === 'd2x1')?.equipmentId).toBe('a')
    expect(read.decks.find((item) => item.id === 'd1x1')?.equipmentId).toBe('b')
  })

  it('keep valid parts of old or broken settings', () => {
    const read = readStageConfig({ name: 'Bütec', legs: 'zlé', clamp: { equipmentId: 'x', perMeter: 1 } })
    expect(read.name).toBe('Bütec')
    expect(read.legs).toEqual(DEFAULT_STAGE_CONFIG.legs)
    expect('clamp' in read).toBe(false)
  })
})
