import { describe, expect, it } from 'vitest'
import { applyToScene, headampFor, x32Name } from './x32Scene'

const scene = [
  '#4.0# "Ukazka" "" %000000000 1',
  '/config/routing/IN AN1-8 A1-8 CARD1-8 B9-16 AUX1-4',
  '/ch/01/config "" 1 OFF 1',
  '/ch/01/preamp +0.0 OFF ON 24  82',
  '/ch/02/config "Old" 5 GNi 9',
  '/ch/03/config "" 1 OFF 17',
  '/ch/04/config "" 1 OFF 25',
  '/bus/01/config "" 1 CY',
  '/headamp/000 +20.0 OFF',
  '/headamp/032 +35.5 OFF',
  '/headamp/088 +0.0 ON',
  '',
].join('\n')

describe('scéna X32 / M32', () => {
  it('meno na scribble strip: bez diakritiky a úvodzoviek, max 12 znakov', () => {
    expect(x32Name('Spev "lead" – Ľubo')).toBe("Spev 'lead'")
    expect(x32Name('Akustická gitara')).toBe('Akusticka gi')
  })

  it('headamp podľa routingu (lokálne, AES50 A/B, karta bez predzosilňovača)', () => {
    const routing = ['AN1-8', 'A1-8', 'CARD1-8', 'B9-16']
    expect(headampFor(3, routing)).toBe(2)
    expect(headampFor(9, routing)).toBe(32)
    expect(headampFor(17, routing)).toBeNull()
    expect(headampFor(25, routing)).toBe(88)
    expect(headampFor(0, routing)).toBeNull()
  })

  it('zapíše mená, farby, phantom a busy; ostatné riadky nechá', () => {
    const lines = [
      { channel: 1, name: 'Kick', color: 'red' as const, phantom: false },
      { channel: 2, name: 'Overhead ľavý', color: 'yellow' as const, phantom: true },
      { channel: 3, name: 'Notebook', color: '' as const, phantom: true },
      { channel: 4, name: 'Spev', color: 'white' as const, phantom: false },
      { channel: 40, name: 'Navyše', color: '' as const, phantom: false },
    ]
    const result = applyToScene(scene, lines, [{ name: 'Wedge spevák', mix: 'Mix 1' }])
    expect(result.text.split('\n')).toEqual([
      '#4.0# "Ukazka" "" %000000000 1',
      '/config/routing/IN AN1-8 A1-8 CARD1-8 B9-16 AUX1-4',
      '/ch/01/config "Kick" 1 RD 1',
      '/ch/01/preamp +0.0 OFF ON 24  82',
      '/ch/02/config "Overhead lav" 5 YEi 9',
      '/ch/03/config "Notebook" 1 OFF 17',
      '/ch/04/config "Spev" 1 WH 25',
      '/bus/01/config "Wedge spevak" 1 CY',
      '/headamp/000 +20.0 OFF',
      '/headamp/032 +35.5 ON',
      '/headamp/088 +0.0 OFF',
      '',
    ])
    expect(result.changes).toHaveLength(7)
    expect(result.warnings).toEqual(['Kanály nad 32 sa do scény nezapíšu (40)', 'Phantom sa nedá nastaviť – vstup kanála nemá predzosilňovač podľa routingu (kanály 3)'])
  })

  it('zachová konce riadkov CRLF a odmietne iný súbor', () => {
    expect(applyToScene(scene.replace(/\n/g, '\r\n'), [{ channel: 1, name: 'Kick', color: '', phantom: false }], []).text).toContain('"Kick" 1 OFF 1\r\n')
    expect(() => applyToScene('hello', [], [])).toThrow('not-a-scene')
  })
})
