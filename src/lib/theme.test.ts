import { describe, expect, it } from 'vitest'
import { parseStoredTheme, resolveTheme } from './theme'

describe('theme', () => {
  it('accepts only a known stored choice', () => {
    expect(parseStoredTheme('dark')).toBe('dark')
    expect(parseStoredTheme('light')).toBe('light')
    expect(parseStoredTheme('blue')).toBeNull()
    expect(parseStoredTheme(null)).toBeNull()
  })

  it('follows the device until the user chooses', () => {
    expect(resolveTheme(null, true)).toBe('dark')
    expect(resolveTheme(null, false)).toBe('light')
    expect(resolveTheme('light', true)).toBe('light')
    expect(resolveTheme('dark', false)).toBe('dark')
  })
})
