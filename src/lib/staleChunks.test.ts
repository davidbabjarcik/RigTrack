import { afterEach, describe, expect, it, vi } from 'vitest'
import { hardReloadForNewVersion, isStaleChunkError, reloadForNewVersion } from './staleChunks'

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
    // Safari: prázdny modul počas obnovy na novú verziu (v texte chyby je kód s __vite__mapDeps).
    expect(isStaleChunkError(new TypeError("undefined is not an object (evaluating '(await M(async()=>{},__vite__mapDeps([233,7]))).ChangelogPage')"))).toBe(true)
  })

  it('reloads once, then not again for a while; the hard reload also only once', async () => {
    const reload = vi.fn()
    expect(reloadForNewVersion(reload)).toBe(true)
    expect(reloadForNewVersion(reload)).toBe(false)
    expect(hardReloadForNewVersion(reload)).toBe(true)
    expect(hardReloadForNewVersion(reload)).toBe(false)
    await vi.waitFor(() => expect(reload).toHaveBeenCalledTimes(2))
  })
})
