import { describe, expect, it } from 'vitest'
import { packCanvases, planProcessors, PROCESSOR_PRESETS, wireWall } from './processor'

describe('wireWall', () => {
  it('wires whole columns per port', () => {
    // 128×128 px panel = 16 384 px → 39 panelov na port; 7 riadkov → 5 stĺpcov na port.
    const runs = wireWall({ name: 'A', columns: 12, rows: 7, panelPxW: 128, panelPxH: 128 }, 650_000)
    expect(runs.map((run) => [run.fromColumn, run.toColumn, run.panels])).toEqual([
      [1, 5, 35],
      [6, 10, 35],
      [11, 12, 14],
    ])
  })

  it('splits a column when it is too tall for one port', () => {
    const runs = wireWall({ name: 'A', columns: 1, rows: 50, panelPxW: 128, panelPxH: 128 }, 650_000)
    expect(runs.map((run) => run.panels)).toEqual([39, 11])
  })
})

describe('packCanvases', () => {
  it('puts small walls into one Full HD image and the rest to the next input', () => {
    const { placements, canvases } = packCanvases(
      [
        { name: 'Stred', w: 1536, h: 896 },
        { name: 'Ľavá', w: 384, h: 768 },
        { name: 'Pravá', w: 384, h: 768 },
      ],
      1920,
      1080,
    )
    expect(placements.map((place) => [place.wall, place.canvas, place.x, place.y])).toEqual([
      ['Stred', 0, 0, 0],
      ['Ľavá', 0, 1536, 0],
      ['Pravá', 1, 0, 0],
    ])
    expect(canvases).toBe(2)
  })

  it('splits a wall larger than the input into tiles', () => {
    const { placements, canvases } = packCanvases([{ name: 'Veľká', w: 3000, h: 1200 }], 1920, 1080)
    expect(placements[0]).toMatchObject({ tilesX: 2, tilesY: 2 })
    expect(canvases).toBe(4)
  })
})

describe('planProcessors', () => {
  it('counts processors from outputs', () => {
    const plan = planProcessors(
      [
        { name: 'A', columns: 12, rows: 7, panelPxW: 128, panelPxH: 128 },
        { name: 'B', columns: 6, rows: 4, panelPxW: 128, panelPxH: 128 },
      ],
      PROCESSOR_PRESETS[0],
    )
    // A: 3 porty, B: 6 stĺpcov × 4 riadky sa zmestí na 1 port → 4 porty = jeden 4-výstupový procesor.
    expect(plan.ports).toBe(4)
    expect(plan.processors).toBe(1)
    expect(planProcessors([{ name: 'C', columns: 20, rows: 8, panelPxW: 128, panelPxH: 128 }], PROCESSOR_PRESETS[0]).processors).toBe(2)
    // 1536×896 a 768×512 sa do jedného Full HD nezmestia vedľa ani pod seba → 2 vstupy.
    expect(plan.canvases).toBe(2)
  })
})
