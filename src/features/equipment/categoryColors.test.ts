import { describe, expect, it } from 'vitest'
import { colorOf, suggestedColor } from './categoryColors'

describe('category colors', () => {
  it('guess a colour from the category name', () => {
    expect(suggestedColor('Svetlá – hlavy')).toBe('green')
    expect(suggestedColor('Zvuk')).toBe('pink')
    expect(suggestedColor('Pódium Nivtec')).toBe('yellow')
    expect(suggestedColor('Hliník / Truss')).toBe('red')
    expect(suggestedColor('Káble')).toBeNull()
  })

  it('prefer the colour set in settings, then the name, then the kind', () => {
    const categories = [
      { id: 'a', name: 'Svetlá', color: 'blue' as const },
      { id: 'b', name: 'Zvuk', color: null },
      { id: 'c', name: 'Rôzne', color: null },
    ]
    expect(colorOf({ kind: 'general', categoryId: 'a' }, categories)).toBe('blue')
    expect(colorOf({ kind: 'general', categoryId: 'b' }, categories)).toBe('pink')
    expect(colorOf({ kind: 'truss', categoryId: 'c' }, categories)).toBe('red')
    expect(colorOf({ kind: 'general', categoryId: null }, categories)).toBeNull()
  })
})
