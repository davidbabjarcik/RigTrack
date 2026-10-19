import { describe, expect, it } from 'vitest'
import { parseQr, qrPath, qrUrl } from './qr'

const ID = '0b6f2c1e-4a3d-4c2b-9f1e-2d3c4b5a6f70'

describe('qr', () => {
  it('round-trips app links', () => {
    expect(parseQr(qrUrl({ kind: 'case', id: ID }, 'https://rigtrack.app'))).toEqual({ kind: 'case', id: ID })
    expect(parseQr(`https://x.sk/equipment/${ID.toUpperCase()}?a=1`)).toEqual({ kind: 'equipment', id: ID })
    expect(qrPath({ kind: 'equipment', id: ID })).toBe(`/equipment/${ID}`)
  })

  it('ignores foreign codes', () => {
    expect(parseQr('WIFI:S:JEF;T:WPA;P:heslo;;')).toBeNull()
    expect(parseQr(`https://x.sk/events/${ID}`)).toBeNull()
    expect(parseQr(`https://x.sk/equipment/${ID}x`)).toBeNull()
  })
})
