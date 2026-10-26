import { describe, expect, it } from 'vitest'
import { makerModeOf, makersOver, makersToSave } from './makers'

describe('cable makers', () => {
  it('picks the mode from saved makers', () => {
    expect(makerModeOf([], 10)).toBe('none')
    expect(makerModeOf([{ name: 'Jano', count: 10 }], 10)).toBe('one')
    expect(makerModeOf([{ name: 'Jano', count: 8 }, { name: 'Fero', count: 2 }], 10)).toBe('split')
  })

  it('saves one maker for all pieces or only filled split rows', () => {
    expect(makersToSave('one', ' Jano ', 12, [])).toEqual([{ name: 'Jano', count: 12 }])
    expect(makersToSave('split', '', 12, [{ name: 'Jano', count: 2 }, { name: '', count: 3 }, { name: 'Fero', count: Number.NaN }])).toEqual([{ name: 'Jano', count: 2 }])
    expect(makersToSave('none', 'Jano', 12, [{ name: 'Jano', count: 2 }])).toEqual([])
  })

  it('flags more made pieces than the length has', () => {
    expect(makersOver({ quantity: 10, makers: [{ name: 'a', count: 8 }, { name: 'b', count: 3 }] })).toBe(true)
    expect(makersOver({ quantity: 10, makers: [{ name: 'a', count: 2 }] })).toBe(false)
  })
})
