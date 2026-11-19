import { describe, expect, it } from 'vitest'
import { pageBreaks } from './printSheet'

describe('pageBreaks', () => {
  it('keeps short content on one page', () => {
    expect(pageBreaks(() => true, 900, 1000)).toEqual([0])
  })

  it('breaks on a blank row just above the page edge so a line of text is not cut', () => {
    // Prázdne riadky len na 940 a 1900.
    const blank = (y: number) => y === 940 || y === 1900
    expect(pageBreaks(blank, 2500, 1000)).toEqual([0, 940, 1900])
  })

  it('cuts at the page edge when no blank row is near', () => {
    expect(pageBreaks(() => false, 2500, 1000)).toEqual([0, 1000, 2000])
  })
})
