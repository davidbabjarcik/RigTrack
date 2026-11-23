import { describe, expect, it } from 'vitest'
import { analyze, DEFAULT_SETTINGS, products, suggest, tvChannelOf, tvRange, type RfChannel } from './rf'

const ch = (id: string, freq: number | null, min = 470, max = 694): RfChannel => ({ id, name: id.toUpperCase(), kind: 'mic', equipment_id: null, min_mhz: min, max_mhz: max, freq_mhz: freq, locked: false })

describe('HF plán', () => {
  it('TV kanály UHF 8 MHz', () => {
    expect(tvRange(21)).toEqual({ lo: 470000, hi: 478000 })
    expect(tvRange(48)).toEqual({ lo: 686000, hi: 694000 })
    expect(tvChannelOf(518250)).toBe(27)
    expect(tvChannelOf(700000)).toBeNull()
  })

  it('intermodulačné produkty 3. a 5. rádu', () => {
    const list = products([{ id: 'a', khz: 600000 }, { id: 'b', khz: 601000 }, { id: 'c', khz: 603000 }], true)
    const khz = (order: number, sources: string) => list.filter((p) => p.order === order && p.sources.join() === sources).map((p) => p.khz)
    expect(khz(3, 'a,b')).toEqual([599000])
    expect(khz(3, 'b,a')).toEqual([602000])
    expect(khz(5, 'a,b')).toEqual([598000])
    expect(khz(3, 'a,b,c')).toEqual([598000])
    expect(khz(3, 'b,c,a')).toEqual([604000])
  })

  it('analýza: odstup, IM 3. rádu, TV kanál, mimo pásma', () => {
    const issues = analyze([ch('a', 600), ch('b', 601), ch('c', 602), ch('d', 610.2), ch('e', 700, 470, 694)], DEFAULT_SETTINGS, [30, 38])
    expect(issues.get('c')!.map((i) => i.kind)).toContain('imd3')
    expect(issues.get('c')!.find((i) => i.kind === 'imd3')!.text).toBe('IM 3. rádu z B + A (602.000 MHz)')
    expect(issues.get('d')!.map((i) => i.kind)).toEqual(['tv'])
    expect(issues.get('e')!.map((i) => i.kind)).toEqual(['band'])
    const close = analyze([ch('a', 600), ch('b', 600.2)], DEFAULT_SETTINGS, [])
    expect(close.get('a')![0]).toEqual({ kind: 'spacing', text: 'Blízko „B“ (200 kHz)' })
  })

  it('návrh: bez konfliktov, mimo zakázaných TV kanálov, zadané ostanú', () => {
    const channels = [ch('a', 606), ch('b', null, 606, 614), ch('c', null, 606, 614), ch('d', null, 606, 614), ch('e', null, 606, 630)]
    const { channels: out, failed } = suggest(channels, DEFAULT_SETTINGS, [37])
    expect(failed).toEqual([])
    expect(out[0].freq_mhz).toBe(606)
    const issues = analyze(out, DEFAULT_SETTINGS, [37])
    expect([...issues.values()].flat()).toEqual([])
    expect(out.every((c) => tvChannelOf(Math.round(c.freq_mhz! * 1000)) !== 37 || c.id === 'a')).toBe(true)
  })

  it('návrh oznámi, keď sa do úzkeho pásma nič nezmestí', () => {
    const { failed } = suggest([ch('a', null, 600, 600.2), ch('b', null, 600, 600.2)], DEFAULT_SETTINGS, [])
    expect(failed).toEqual(['b'])
  })
})
