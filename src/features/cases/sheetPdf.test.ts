import { describe, expect, it } from 'vitest'
import { buildPdf, pageSizePt } from './sheetPdf'

describe('sheet PDF', () => {
  it('has a page per image and a valid cross-reference table', async () => {
    const jpeg = { bytes: new Uint8Array([0xff, 0xd8, 0xff, 0xd9]), width: 10, height: 14 }
    const blob = buildPdf([jpeg, jpeg], pageSizePt('A4', false))
    const bytes = new Uint8Array(await blob.arrayBuffer())
    const text = new TextDecoder('latin1').decode(bytes)
    expect(text.startsWith('%PDF-1.4')).toBe(true)
    expect(text).toContain('/Count 2')
    expect(text).toContain('/MediaBox [0 0 595.28 841.89]')
    // Každý záznam v xref ukazuje presne na začiatok svojho objektu.
    const xrefAt = Number(/startxref\n(\d+)/.exec(text)![1])
    const entries = text.slice(xrefAt).split('\n').slice(3, 3 + 8)
    entries.forEach((entry, index) => {
      const offset = Number(entry.slice(0, 10))
      expect(text.slice(offset, offset + 12)).toMatch(new RegExp(`^${index + 1} 0 obj`))
    })
  })

  it('swaps the page size for landscape and A5', () => {
    expect(pageSizePt('A5', true).width).toBeCloseTo(595.28, 1)
    expect(pageSizePt('A5', true).height).toBeCloseTo(419.53, 1)
  })
})
