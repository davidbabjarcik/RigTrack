import { afterEach, describe, expect, it, vi } from 'vitest'
import { isStaleChunkError, reloadForNewVersion } from './staleChunks'

afterEach(() => {
  sessionStorage.clear()
  vi.restoreAllMocks()
})

describe('staleChunks', () => {
  it('recognises a missing page file after a new version in all browsers', () => {
    expect(isStaleChunkError(new TypeError('Failed to fetch dynamically imported module: https://x/assets/EquipmentListPage-Coutyqs3.js'))).toBe(true)
    expect(isStaleChunkError(new TypeError('Importing a module script failed.'))).toBe(true)
    expect(isStaleChunkError(new TypeError('error loading dynamically imported module'))).toBe(true)
    expect(isStaleChunkError(new Error('Cannot read properties of undefined'))).toBe(false)
  })

  it('reloads once, then not again for a while', () => {
    const reload = vi.fn()
    expect(reloadForNewVersion(reload)).toBe(true)
    expect(reloadForNewVersion(reload)).toBe(false)
    expect(reload).toHaveBeenCalledTimes(1)
  })
})
