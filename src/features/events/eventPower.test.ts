import { describe, expect, it } from 'vitest'
import type { Equipment } from '@/features/equipment/model'
import { eventPhases, supplyOf } from './eventPower'

const item = (id: string, name: string, kind: Equipment['kind'], attributes: Equipment['attributes']) => ({ id, name, kind, attributes }) as Equipment

const equipment = [
  item('spiider', 'Robe Spiider', 'light', { powerW: 650 }),
  item('amp', 'Zosilňovač', 'audio', { powerW: 2000 }),
  item('led', 'LED P3.9', 'video', { ledPanel: { widthMm: 500, heightMm: 1000, pxW: 128, pxH: 256, weightKg: 12.5, maxW: 275, avgW: 95 } }),
  item('par', 'PAR bez údajov', 'light', {}),
  item('cable', 'Kábel', 'cable', {}),
]

describe('event phases', () => {
  it('spreads equipment over three phases', () => {
    const plan = eventPhases(
      [
        { equipmentId: 'spiider', quantity: 6, caseId: null },
        { equipmentId: 'amp', quantity: 3, caseId: null },
        { equipmentId: 'led', quantity: 12, caseId: null },
        { equipmentId: 'par', quantity: 4, caseId: null },
        { equipmentId: 'cable', quantity: 10, caseId: null },
      ],
      equipment,
      3,
    )
    expect(plan.totalWatts).toBe(6 * 650 + 3 * 2000 + 12 * 275)
    expect(plan.phases.map((phase) => phase.items.find((row) => row.name === 'Zosilňovač')?.count)).toEqual([1, 1, 1])
    expect(plan.imbalance).toBeLessThan(10)
    expect(plan.unknown).toEqual(['PAR bez údajov'])
  })

  it('respects load already on a phase and one-phase supply', () => {
    const plan = eventPhases([{ equipmentId: 'amp', quantity: 2, caseId: null }], equipment, 3, [3000, 0, 0])
    expect(plan.phases.map((phase) => phase.watts)).toEqual([3000, 2000, 2000])
    expect(supplyOf('schuko16', null)).toEqual({ phases: 1, amps: 16 })
    expect(supplyOf('cee32', 2)).toEqual({ phases: 3, amps: 64 })
    expect(supplyOf('generator', null)).toBeNull()
  })
})
