import { describe, expect, it } from 'vitest'
import { calculateLed, DEFAULT_INPUT, describePieces, fit, PANEL_PRESETS, splitTruss } from './model'

describe('fit', () => {
  it('rounds to whole panels', () => {
    expect(fit(6.2, 500, 'nearest')).toBe(12)
    expect(fit(6.2, 500, 'down')).toBe(12)
    expect(fit(6.2, 500, 'up')).toBe(13)
    expect(fit(6, 500, 'up')).toBe(12)
    expect(fit(0.1, 500, 'down')).toBe(1)
  })
})

describe('splitTruss', () => {
  it('uses the longest pieces first and rounds up', () => {
    expect(splitTruss(7, [3, 2, 1, 0.5]).pieces).toEqual([3, 3, 1])
    expect(splitTruss(6.3, [3, 2, 1, 0.5])).toEqual({ pieces: [3, 3, 0.5], totalM: 6.5 })
    expect(describePieces([3, 3, 1])).toBe('3 m × 2, 1 m × 1')
  })
})

describe('calculateLed', () => {
  it('counts panels, resolution, power and rigging for a flown wall', () => {
    const result = calculateLed({ ...DEFAULT_INPUT, panel: PANEL_PRESETS[2], widthM: 6, heightM: 3.5 })
    expect([result.columns, result.rows, result.panels]).toEqual([12, 7, 84])
    expect(result.areaM2).toBe(21)
    expect(result.resolution).toEqual({ w: 1536, h: 896, total: 1376256 })
    expect(result.ports).toBe(3)
    expect(result.power.maxW).toBe(16800)
    expect(result.power.panelsPerCircuit).toBe(16)
    expect(result.power.circuits).toBe(6)
    // Truss 6 m + 2 × 0,5 m = 7 m → 3 + 3 + 1, dva spoje.
    expect(result.truss?.runs[0].pieces).toEqual([3, 3, 1])
    expect(result.truss?.joints).toBe(2)
    expect(result.truss?.cones).toBe(8)
    // 7 m / 2 m → 5 bodov; 12 líšt.
    expect(result.rigging).toMatchObject({ bars: 12, points: 5, slings: 12 + 5, steels: 5, shackles: 24 + 10 })
    expect(result.rigging?.overload).toBe(false)
  })

  it('builds a goalpost with towers, cubes and base plates', () => {
    const result = calculateLed({ ...DEFAULT_INPUT, mount: 'goalpost', widthM: 4, heightM: 2.5, clearanceM: 0.5 })
    // Veže 2,5 + 0,5 + 0,5 = 3,5 m → 3 + 0,5.
    expect(result.truss?.runs[1].pieces).toEqual([3, 0.5])
    expect(result.truss?.needs).toEqual([
      { lengthM: 3, count: 3 },
      { lengthM: 2, count: 1 },
      { lengthM: 0.5, count: 2 },
    ])
    expect(result.truss).toMatchObject({ cornerCubes: 2, basePlates: 2, totalM: 5 + 7 })
    // Horný truss 5 m = 3 + 2 → 1 spoj + 2 ku kockám; každá veža 1 spoj + kocka + podstava.
    expect(result.truss?.joints).toBe(1 + 2 + 2 * 3)
    expect(result.rigging?.steels).toBe(0)
  })

  it('warns when a hoist is overloaded and when a stack is too high', () => {
    const heavy = calculateLed({ ...DEFAULT_INPUT, panel: PANEL_PRESETS[4], widthM: 10, heightM: 6, pointSpacingM: 6, hoistKg: 250 })
    expect(heavy.rigging?.overload).toBe(true)
    const stacked = calculateLed({ ...DEFAULT_INPUT, mount: 'stacked', heightM: 5 })
    expect(stacked.truss).toBeNull()
    expect(stacked.stack).toEqual({ baseBars: 12, braces: 6 })
    expect(stacked.warnings.length).toBe(1)
  })
})
