import { describe, expect, it } from 'vitest'
import { safeUrl } from './safeUrl'

describe('safeUrl', () => {
  it('keeps web, mail and phone links and drops script URLs', () => {
    expect(safeUrl('https://example.com/manual.pdf')).toBe('https://example.com/manual.pdf')
    expect(safeUrl('mailto:a@example.com')).toBe('mailto:a@example.com')
    expect(safeUrl('javascript:alert(1)')).toBeUndefined()
    expect(safeUrl(' JavaScript:alert(1)')).toBeUndefined()
    expect(safeUrl('data:text/html,<script>alert(1)</script>')).toBeUndefined()
    expect(safeUrl('not a url')).toBeUndefined()
    expect(safeUrl('')).toBeUndefined()
  })
})
