import { describe, expect, it } from 'vitest'
import { cableColorType, findCableColor, resolveCableType, type CableColor } from './cableColors'

describe('cable colors by type', () => {
  it('recognises the cable type from the connector', () => {
    expect(['XLR', 'DMX 5-pin', 'powerCON TRUE1', 'Schuko', 'CEE 16A', 'speakON'].map(cableColorType)).toEqual(['xlr', 'xlr', 'powercon', '230', '230', ''])
  })

  it('uses the type colour first, then the shared one', () => {
    const colors: CableColor[] = [
      { lengthM: 10, name: 'zelená', color: '#00a651', cableType: '' },
      { lengthM: 10, name: 'modrá', color: '#0000ff', cableType: 'xlr' },
      { lengthM: 5, name: 'žltá', color: '#ffff00', cableType: '' },
    ]
    expect(findCableColor(colors, 'XLR', 10)?.name).toBe('modrá')
    expect(findCableColor(colors, 'powerCON prepojovací', 10)?.name).toBe('zelená')
    expect(findCableColor(colors, 'XLR', 5)?.name).toBe('žltá')
    expect(findCableColor(colors, 'XLR', 20)).toBeUndefined()
  })

  it('uses a custom type when the connector contains its name', () => {
    const colors: CableColor[] = [
      { lengthM: 10, name: 'modrá', color: '#0000ff', cableType: '' },
      { lengthM: 10, name: 'čierna', color: '#000000', cableType: 'Káblovka' },
      { lengthM: 10, name: 'červená', color: '#ff0000', cableType: '230' },
    ]
    expect(findCableColor(colors, '230V káblovka 3x2,5', 10)?.name).toBe('čierna')
    expect(findCableColor(colors, '230V', 10)?.name).toBe('červená')
    expect(resolveCableType(colors, 'Káblovka 5x2,5')).toBe('Káblovka')
    expect(resolveCableType(colors, 'XLR')).toBe('xlr')
  })
})
