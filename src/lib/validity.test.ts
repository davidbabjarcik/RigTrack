import { describe, expect, it } from 'vitest'
import { validity } from './validity'

describe('validity', () => {
  it('sorts dates into none, ok, soon and expired', () => {
    expect(validity(null, '2026-11-09')).toBe('none')
    expect(validity('2026-11-08', '2026-11-09')).toBe('expired')
    expect(validity('2026-11-09', '2026-11-09')).toBe('soon')
    expect(validity('2026-12-09', '2026-11-09')).toBe('soon')
    expect(validity('2026-12-10', '2026-11-09')).toBe('ok')
  })
})
