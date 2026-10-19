import { describe, expect, it } from 'vitest'
import { balancePhases, wallCircuits } from './power'

describe('LED power', () => {
  it('splits a wall into 16 A circuits by columns', () => {
    // 200 W panel, 3200 W na okruh → 16 panelov; 7 riadkov → 2 stĺpce na okruh.
    const circuits = wallCircuits({ name: 'A', columns: 12, rows: 7, maxW: 200, avgW: 70 }, 3200)
    expect(circuits).toHaveLength(6)
    expect(circuits[0]).toMatchObject({ fromColumn: 1, toColumn: 2, panels: 14, maxW: 2800 })
  })

  it('balances circuits over three phases', () => {
    const plan = balancePhases([{ name: 'A', columns: 12, rows: 7, maxW: 200, avgW: 70 }], 3200)
    expect(plan.phases.map((phase) => phase.maxW)).toEqual([5600, 5600, 5600])
    expect(plan.imbalance).toBe(0)
    expect(plan.phases[0].amps).toBe(24.3)
  })

  it('reports imbalance when it cannot be even', () => {
    const plan = balancePhases([{ name: 'B', columns: 4, rows: 7, maxW: 200, avgW: 70 }], 3200)
    expect(plan.circuits).toHaveLength(2)
    expect(plan.imbalance).toBe(100)
  })
  it('counts with load already on a phase', () => {
    const plan = balancePhases([{ name: 'A', columns: 12, rows: 7, maxW: 200, avgW: 70 }], 3200, [6000, 0, 0])
    expect(plan.phases.map((phase) => phase.ledW)).toEqual([0, 8400, 8400])
  })
  it('can use only two phases', () => {
    const plan = balancePhases([{ name: 'A', columns: 12, rows: 7, maxW: 200, avgW: 70 }], 3200, [0, 0, 0], 2)
    expect(plan.phases.map((phase) => phase.maxW)).toEqual([8400, 8400])
    expect(plan.circuits.every((circuit) => circuit.phase <= 2)).toBe(true)
  })
})
