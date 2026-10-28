import { describe, expect, it } from 'vitest'
import { cableColorType, findCableColor, type CableColor } from './cableColors'

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
})
