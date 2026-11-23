import { describe, expect, it } from 'vitest'
import { cableSummary, linkEnds, linkText, newLink, newNode, NODE_H, NODE_W, synopticWarnings } from './model'

describe('synoptika', () => {
  it('nové uzly idú po riadkoch', () => {
    const first = newNode('console', [])
    const sixth = newNode('amp', [1, 2, 3, 4, 5].map(() => first))
    expect([first.x, first.y, first.label]).toEqual([40, 40, 'Pult'])
    expect([sixth.x, sixth.y]).toEqual([40, 170])
  })

  it('čiara končí na hranách uzlov', () => {
    const a = { ...newNode('console', []), x: 0, y: 0 }
    const b = { ...newNode('stagebox', []), x: 400, y: 0 }
    expect(linkEnds(a, b)).toEqual({ start: { x: NODE_W, y: NODE_H / 2 }, end: { x: 400, y: NODE_H / 2 } })
  })

  it('súhrn káblov podľa typu a dĺžky; text prepojenia', () => {
    const links = [
      { ...newLink('a', 'b', 'aes50'), cable: 'CAT6', length_m: 50, count: 2 },
      { ...newLink('a', 'c', 'analog'), cable: 'XLR', length_m: 10 },
      { ...newLink('b', 'c', 'analog'), cable: 'XLR' },
    ]
    expect(cableSummary(links)).toEqual([
      { cable: 'CAT6', pieces: 2, meters: 100, missing: 0 },
      { cable: 'XLR', pieces: 2, meters: 10, missing: 1 },
    ])
    expect(linkText(links[0])).toBe('2× CAT6 · 50 m')
    expect(linkText(newLink('a', 'b', 'dante'))).toBe('Dante')
  })

  it('upozornenia: bez dĺžky, bez prepojenia, zmazaný uzol', () => {
    const a = newNode('console', [], { id: 'a' })
    const b = newNode('stagebox', [a], { id: 'b' })
    const c = newNode('amp', [a, b], { id: 'c', label: 'Amp' })
    expect(synopticWarnings({ nodes: [a, b, c], links: [newLink('a', 'b'), newLink('a', 'x')] })).toEqual(['1 prepojení vedie na zmazaný uzol', '2 prepojení nemá dĺžku kábla', 'Bez prepojenia: Amp'])
  })
})
