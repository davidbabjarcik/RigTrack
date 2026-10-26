import { describe, expect, it } from 'vitest'
import { parseQr, qrPath, qrUrl } from './qr'

const ID = '0b6f2c1e-4a3d-4c2b-9f1e-2d3c4b5a6f70'

describe('qr', () => {
  it('round-trips app links', () => {
    expect(parseQr(qrUrl({ kind: 'case', id: ID }, 'https://rigtrack.app'))).toEqual({ kind: 'case', id: ID })
    expect(parseQr(`https://x.sk/equipment/${ID.toUpperCase()}?a=1`)).toEqual({ kind: 'equipment', id: ID })
    expect(qrPath({ kind: 'equipment', id: ID })).toBe(`/equipment/${ID}`)
    expect(parseQr(qrUrl({ kind: 'spot', id: ID }, 'https://rigtrack.app'))).toEqual({ kind: 'spot', id: ID })
    expect(parseQr(`https://x.sk/warehouse?x=1&spot=${ID}`)).toEqual({ kind: 'spot', id: ID })
  })

  it('ignores foreign codes', () => {
    expect(parseQr('WIFI:S:JEF;T:WPA;P:heslo;;')).toBeNull()
    expect(parseQr(`https://x.sk/events/${ID}`)).toBeNull()
    expect(parseQr(`https://x.sk/equipment/${ID}x`)).toBeNull()
  })
})

describe('unit QR', () => {
  it('links to one piece of equipment tracked by units', () => {
    const id = '0b6f3c1e-2d4a-4b8c-9e1f-123456789abc'
    expect(qrPath({ kind: 'equipment', id, unit: 7 })).toBe(`/equipment/${id}?unit=7`)
    expect(parseQr(`https://app.example.com/equipment/${id}?unit=7`)).toEqual({ kind: 'equipment', id, unit: 7 })
    expect(parseQr(`https://app.example.com/equipment/${id}`)).toEqual({ kind: 'equipment', id })
  })
})
