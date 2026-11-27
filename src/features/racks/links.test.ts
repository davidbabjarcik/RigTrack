import { describe, expect, it } from 'vitest'
import { cableFor, cableSummary, compatible, estimateLength, fromStored, portsOf, summaryText, toStored, type RackLink } from './links'

const ports = (category: Parameters<typeof portsOf>[0]['category'], name = 'Ukážka', width: 'full' | 'half' = 'full') => portsOf({ category, accessory: null, name, width })

describe('prepojenia v racku', () => {
  it('porty podľa kategórie a počtu kanálov', () => {
    expect(ports('amp').filter((port) => port.kind === 'speaker')).toHaveLength(4)
    expect(portsOf({ category: 'amp', accessory: null, name: 'A', width: 'full', attributes: { connectors: '2 kanály' } }).filter((port) => port.kind === 'speaker')).toHaveLength(2)
    expect(ports('wireless', 'Ukážka AD4Q').filter((port) => port.kind === 'audio')).toHaveLength(4)
    expect(ports('wireless', 'Ukážka', 'half').some((port) => port.kind === 'network')).toBe(false)
    expect(portsOf({ category: null, accessory: 'pdu', name: '', width: 'full' }).filter((port) => port.dir === 'out')).toHaveLength(8)
    expect(portsOf({ category: null, accessory: 'blank', name: '', width: 'full' })).toEqual([])
  })

  it('spojiteľné porty a typ kábla', () => {
    const [ampIn] = ports('amp')
    const procOut = ports('processor').find((port) => port.id === 'out-1')!
    const speaker = ports('amp').find((port) => port.id === 'out-1')!
    const power = ports('amp').find((port) => port.id === 'power')!
    const pduOut = portsOf({ category: null, accessory: 'pdu', name: '', width: 'full' })[1]
    expect(compatible(procOut, ampIn)).toBe(true)
    expect(compatible(ampIn, ampIn)).toBe(false)
    expect(compatible(procOut, power)).toBe(false)
    expect(compatible(pduOut, power)).toBe(true)
    expect(cableFor(procOut, ampIn)).toBe('XLR')
    expect(cableFor(speaker, { id: 'p-1', label: 'Patch 1', kind: 'patch', dir: 'io' })).toBe('NL4')
    expect(cableFor(pduOut, power)).toBe('power')
  })

  it('odhad dĺžky podľa vzdialenosti v U', () => {
    expect(estimateLength({ bottomU: 1, heightU: 2 }, { bottomU: 3, heightU: 1 })).toBe(0.5)
    expect(estimateLength({ bottomU: 1, heightU: 1 }, { bottomU: 20, heightU: 1 })).toBe(1.5)
  })

  it('uloženie podľa poradia slotov a späť', () => {
    const slots = [{ key: 'a' }, { key: 'b' }, { key: 'c' }]
    const links: RackLink[] = [
      { key: 'l1', from: 'c', fromPort: 'out-1', to: 'a', toPort: 'in-1', cable: 'XLR', lengthM: 1, label: '' },
      { key: 'l2', from: 'x', fromPort: 'out-1', to: 'a', toPort: 'in-2', cable: 'XLR', lengthM: null, label: '' },
    ]
    const stored = toStored(links, slots)
    expect(stored).toEqual([{ from: 3, fromPort: 'out-1', to: 1, toPort: 'in-1', cable: 'XLR', lengthM: 1, label: '' }])
    expect(fromStored(stored, slots, (index) => `k${index}`)).toEqual([{ ...links[0], key: 'k0' }])
  })

  it('súhrn káblov pre balenie', () => {
    const rows = cableSummary([
      { cable: 'NL4', lengthM: 2 },
      { cable: 'XLR', lengthM: 1 },
      { cable: 'NL4', lengthM: 2 },
    ])
    expect(rows.map((row) => summaryText(row))).toEqual(['1× XLR (signálový) 1 m', '2× speakON NL4 2 m'])
  })
})
