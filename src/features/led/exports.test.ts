import { describe, expect, it } from 'vitest'
import { arenaGuide, novastarGuide, portStarts } from './exports'
import { planProcessors, PROCESSOR_PRESETS } from './processor'

const walls = [
  { name: 'Stred', columns: 12, rows: 7, panelPxW: 128, panelPxH: 128 },
  { name: 'Bok', columns: 3, rows: 6, panelPxW: 128, panelPxH: 128 },
]

describe('LED exports', () => {
  it('computes where each port starts in the input image', () => {
    const plan = planProcessors(walls, PROCESSOR_PRESETS[2])
    const starts = portStarts(walls, plan.runs, plan.placements)
    expect(starts.map((port) => [port.wall, port.input, port.x, port.y])).toEqual([
      ['Stred', 1, 0, 0],
      ['Stred', 1, 640, 0],
      ['Stred', 1, 1280, 0],
      ['Bok', 1, 1536, 0],
    ])
  })

  it('writes Novastar and Arena instructions', () => {
    const plan = planProcessors(walls, PROCESSOR_PRESETS[2])
    const novastar = novastarGuide(walls, plan.runs, plan.placements, PROCESSOR_PRESETS[2])
    expect(novastar).toContain('Výstup 2 (procesor 1, port 2): Stred, stĺpce 6–10, 35 panelov, vstup 1, štart X 640, Y 0')
    expect(arenaGuide(walls, plan.placements, PROCESSOR_PRESETS[2])).toContain('Slice „Bok“: Screen 1, X 1536, Y 0, šírka 384, výška 768')
  })
})
