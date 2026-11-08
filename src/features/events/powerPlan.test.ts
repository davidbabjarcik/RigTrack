import { describe, expect, it } from 'vitest'
import type { Equipment } from '@/features/equipment/model'
import { adviseFeed, dimmerAdvice, generatorAdvice, overAssigned, readPowerPlan, socapexAdvice, splitPhases, unassigned, zoneLoads, type Load } from './powerPlan'

const item = (id: string, name: string, kind: Equipment['kind'], attributes: Equipment['attributes']) => ({ id, name, kind, attributes }) as Equipment

const equipment = [
  item('fresnel', 'Fresnel 1 kW', 'light', { powerW: 1000, externalDimmer: true }),
  item('beam', 'Beam', 'light', { powerW: 450 }),
  item('amp', 'Zosilňovač', 'audio', { powerW: 2000 }),
  item('par', 'PAR bez údajov', 'light', {}),
  item('cable', 'Kábel', 'cable', {}),
]
const loads = (watts: number[], dimmed = false): Load[] => watts.map((w) => ({ name: 'x', watts: w, dimmed }))

describe('power plan by places', () => {
  it('turns a place into single loads and reports equipment without power', () => {
    const { loads: list, unknown } = zoneLoads({ items: [{ equipmentId: 'fresnel', quantity: 2 }, { equipmentId: 'par', quantity: 4 }], extraKw: 3 }, equipment)
    expect(list.filter((load) => load.dimmed)).toHaveLength(2)
    expect(list.reduce((sum, load) => sum + load.watts, 0)).toBe(5000)
    expect(unknown).toEqual(['PAR bez údajov'])
  })

  it('balances phases from the largest load', () => {
    expect(splitPhases(loads([2000, 2000, 2000, 450, 450, 450]), 3)).toEqual([2450, 2450, 2450])
    expect(splitPhases(loads([1000, 500]), 1)).toEqual([1500])
  })

  it('recommends minimum and optimal feeds, single and three phase', () => {
    // 3,5 kW ≈ 15,2 A na jednej fáze: 16 A zásuvka tesne stačí, s rezervou až 32 A; trojfázovo 16 A.
    const advice = adviseFeed(loads([1000, 1000, 1000, 500]))
    expect(advice.onePhase.minimum?.feed.id).toBe('schuko16')
    expect(advice.onePhase.optimal?.feed.id).toBe('cee32_1f')
    expect(advice.threePhase.minimum?.feed.id).toBe('cee16')
    expect(advice.threePhase.optimal?.feed.id).toBe('cee16')
    // 30 kW sa jednofázovo nedá.
    const big = adviseFeed(loads(Array.from({ length: 30 }, () => 1000)))
    expect(big.onePhase.minimum).toBeNull()
    expect(big.threePhase.minimum?.feed.id).toBe('cee63')
    expect(big.threePhase.optimal?.feed.id).toBe('cee63')
  })

  it('counts Socapex circuits for a lighting bar', () => {
    expect(socapexAdvice(loads([1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000]))).toEqual({ circuits: 4, cables: 1 })
    expect(socapexAdvice(loads(Array.from({ length: 16 }, () => 1000)))).toEqual({ circuits: 8, cables: 2 })
    expect(socapexAdvice(loads([5000]))).toBeNull()
  })

  it('recommends a 230 V dimmer for a few fresnels and a 400 V one for more', () => {
    expect(dimmerAdvice(loads([450, 450]))).toBeNull()
    const small = dimmerAdvice(loads([1000, 1000], true))
    expect(small).toMatchObject({ channels: 2, voltage: 230, feed: { id: 'schuko16' } })
    const large = dimmerAdvice(loads(Array.from({ length: 12 }, () => 1000), true))
    expect(large).toMatchObject({ channels: 12, voltage: 400, feed: { id: 'cee32' } })
    expect(dimmerAdvice(loads([2500], true))?.bigChannels).toBe(1)
  })

  it('lists what is not yet placed and what is placed twice', () => {
    const lines = [
      { equipmentId: 'fresnel', quantity: 4, caseId: null },
      { equipmentId: 'amp', quantity: 2, caseId: null },
      { equipmentId: 'cable', quantity: 10, caseId: null },
    ]
    const zones = [
      { id: 'a', name: 'Predné svietenie', kind: 'light' as const, items: [{ equipmentId: 'fresnel', quantity: 3 }], extraKw: 0 },
      { id: 'b', name: 'PA', kind: 'sound' as const, items: [{ equipmentId: 'amp', quantity: 3 }], extraKw: 0 },
    ]
    expect(unassigned(lines, zones, equipment)).toEqual([{ equipmentId: 'fresnel', quantity: 1 }])
    expect(overAssigned(lines, zones)).toEqual(['amp'])
  })

  it('sizes a generator from the busiest phase', () => {
    expect(generatorAdvice([0, 0, 0])).toBeNull()
    // 8 kW na fáze → 24 kW / 0,8 = 30 kVA; s rezervou 37,5 → 45 kVA.
    expect(generatorAdvice([8000, 6000, 7000])).toEqual({ minimumKva: 30, optimalKva: 37.5, minimumSize: 30, optimalSize: 45 })
  })

  it('reads a saved plan and drops what does not fit', () => {
    const plan = readPowerPlan({
      zones: [{ id: 'z', name: 'Strecha', kind: 'nonsense', items: [{ equipmentId: 'beam', quantity: 2 }, { equipmentId: 5 }], extraKw: -3 }, 'bad'],
      generators: [{ id: 'g', name: 'Centrála', kva: 60, supplier: 'Požičovňa', partnerId: null, note: '' }],
    })
    expect(plan.zones).toEqual([{ id: 'z', name: 'Strecha', kind: 'other', items: [{ equipmentId: 'beam', quantity: 2 }], extraKw: 0 }])
    expect(plan.generators[0]).toMatchObject({ kva: 60, supplier: 'Požičovňa' })
    expect(readPowerPlan(null)).toEqual({ zones: [], generators: [] })
  })
})
