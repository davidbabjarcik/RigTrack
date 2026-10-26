import { describe, expect, it } from 'vitest'
import { describePorts, normalizePort, portsForUniverse, resizePorts, sameUniverse, sequentialUniverses } from './dmxNode'

describe('Art-Net / sACN node', () => {
  it('keeps a different universe for Art-Net and sACN on the same port', () => {
    const ports = sequentialUniverses(sameUniverse(resizePorts([], 4), 'artnet', 0), 'sacn', 9)
    expect(ports[0]).toEqual({ port: 1, artnet: 0, sacn: 9 })
    expect(describePorts(ports)).toBe('Art-Net 1–4 → U0 · sACN 1 → U9, 2 → U10, 3 → U11, 4 → U12')
    const node = { id: 'n', name: 'Node', attributes: { nodePorts: ports } }
    expect(portsForUniverse([node], 0).map((item) => [item.port, item.protocol])).toEqual([[1, 'artnet'], [2, 'artnet'], [3, 'artnet'], [4, 'artnet']])
    expect(portsForUniverse([node], 10)).toEqual([{ node, port: 2, protocol: 'sacn' }])
  })

  it('reads the older single-universe format', () => {
    expect(normalizePort({ port: 1, universe: 3 })).toEqual({ port: 1, artnet: 3, sacn: 3 })
    expect(normalizePort({ port: 1, universe: 3, protocol: 'sacn' })).toEqual({ port: 1, artnet: null, sacn: 3 })
    expect(resizePorts([{ port: 1, artnet: 1, sacn: null }], 2)).toEqual([{ port: 1, artnet: 1, sacn: null }, { port: 2, artnet: null, sacn: null }])
  })
})
