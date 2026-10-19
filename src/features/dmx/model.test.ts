import { describe, expect, it } from 'vitest'
import { addressFromSwitches, describeSwitches, dipSwitches, patchFixtures } from './model'

describe('DMX dip switch', () => {
  it('converts address to switches and back', () => {
    const on = dipSwitches(37)
    expect(on.slice(0, 6)).toEqual([true, false, true, false, false, true])
    expect(describeSwitches(on)).toBe('1 + 4 + 32')
    expect(addressFromSwitches(on)).toBe(37)
    expect(addressFromSwitches(dipSwitches(511))).toBe(511)
  })

  it('patches a row of fixtures and wraps to the next universe', () => {
    expect(patchFixtures(1, 16, 3).map((item) => item.address)).toEqual([1, 17, 33])
    const wrapped = patchFixtures(490, 16, 3)
    expect(wrapped.map((item) => [item.universe, item.address])).toEqual([
      [1, 490],
      [2, 1],
      [2, 17],
    ])
  })
})
