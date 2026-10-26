import { describe, expect, it } from 'vitest'
import { describePorts, portsForUniverse, resizePorts, sameUniverse, sequentialUniverses } from './dmxNode'

describe('Art-Net / sACN node', () => {
  it('describes ports as ranges of the same universe', () => {
    expect(describePorts(sameUniverse(resizePorts([], 4), 0))).toBe('1–4 → U0')
    const eight = sequentialUniverses(resizePorts([], 8), 9).map((item, index) => (index >= 4 ? { ...item, universe: index - 3 } : item))
    expect(describePorts(eight)).toBe('1 → U9 · 2 → U10 · 3 → U11 · 4 → U12 · 5 → U1 · 6 → U2 · 7 → U3 · 8 → U4')
  })

  it('keeps settings when the number of ports changes and finds outputs of a universe', () => {
    const ports = resizePorts(sequentialUniverses(resizePorts([], 2), 1), 3)
    expect(ports).toEqual([{ port: 1, universe: 1 }, { port: 2, universe: 2 }, { port: 3, universe: null }])
    const node = { id: 'n', name: 'Node', attributes: { nodePorts: ports } }
    expect(portsForUniverse([node], 2)).toEqual([{ node, port: 2, protocol: undefined }])
  })
})
