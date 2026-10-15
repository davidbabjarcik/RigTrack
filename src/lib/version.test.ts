import { describe, expect, it } from 'vitest'
import { APP_VERSION, displayVersion } from './version'

describe('version', () => {
  it('drops a zero patch number', () => {
    expect(displayVersion('1.0.0')).toBe('1.0')
    expect(displayVersion('1.2.3')).toBe('1.2.3')
  })

  it('comes from package.json', () => {
    // Číslo sa mení s každou verziou; stačí, že je to verzia bez nulovej opravy.
    expect(APP_VERSION).toMatch(/^\d+\.\d+(\.[1-9]\d*)?$/)
  })
})
