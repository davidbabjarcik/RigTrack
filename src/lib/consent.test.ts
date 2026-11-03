import { beforeEach, describe, expect, it } from 'vitest'
import { installStorageGuard, isFunctionalKey, isNecessaryKey, readConsent, saveConsent } from './consent'

describe('consent', () => {
  beforeEach(() => localStorage.clear())

  it('sorts keys into necessary and functional', () => {
    expect(isNecessaryKey('sb-abc-auth-token')).toBe(true)
    expect(isNecessaryKey('rigtrack:active-company')).toBe(true)
    expect(isNecessaryKey('rigtrack.pack.queue.1')).toBe(true)
    expect(isFunctionalKey('rigtrack:theme')).toBe(true)
    expect(isFunctionalKey('rigtrack.equipment.filter')).toBe(true)
    expect(isFunctionalKey('rigtrack:consent')).toBe(false)
  })

  it('drops functional writes without consent and keeps necessary ones', () => {
    installStorageGuard()
    localStorage.setItem('rigtrack:theme', 'dark')
    localStorage.setItem('rigtrack:active-company', 'c1')
    expect(localStorage.getItem('rigtrack:theme')).toBeNull()
    expect(localStorage.getItem('rigtrack:active-company')).toBe('c1')

    saveConsent({ functional: true })
    localStorage.setItem('rigtrack:theme', 'dark')
    expect(localStorage.getItem('rigtrack:theme')).toBe('dark')
    expect(readConsent()).toMatchObject({ functional: true, analytics: false, marketing: false })

    // Odvolanie súhlasu zmaže funkčné údaje.
    saveConsent({ functional: false })
    expect(localStorage.getItem('rigtrack:theme')).toBeNull()
    expect(localStorage.getItem('rigtrack:active-company')).toBe('c1')
  })
})
