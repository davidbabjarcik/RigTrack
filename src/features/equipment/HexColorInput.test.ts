import { describe, expect, it } from 'vitest'
import { parseHexColor } from './cableColors'

describe('parseHexColor', () => {
  it('accepts a code with or without the hash, in any case', () => {
    expect(parseHexColor('#00A651')).toBe('#00a651')
    expect(parseHexColor('00a651')).toBe('#00a651')
    expect(parseHexColor('  #FFEE00 ')).toBe('#ffee00')
  })

  it('rejects anything that is not six hex digits', () => {
    for (const text of ['', '#fff', '#00a65', '#00a6511', 'zelená', '#gg0000']) {
      expect(parseHexColor(text)).toBeNull()
    }
  })
})
