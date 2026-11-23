import { describe, expect, it } from 'vitest'
import { changedKeys, removedRows, shareState } from './api'

describe('zdieľanie dokumentov', () => {
  it('zmenené, nové a odstránené riadky oproti videnej verzii', () => {
    const key = (row: { channel: number }) => String(row.channel)
    const before = [{ channel: 1, name: 'Spev' }, { channel: 2, name: 'Gitara' }, { channel: 3, name: 'Basa' }]
    const now = [{ channel: 1, name: 'Spev' }, { channel: 2, name: 'Gitara L' }, { channel: 4, name: 'Klávesy' }]
    expect([...changedKeys(now, before, key)]).toEqual(['2', '4'])
    expect(removedRows(now, before, key)).toEqual([{ channel: 3, name: 'Basa' }])
    expect(changedKeys(now, null, key).size).toBe(0)
  })

  it('stav odkazu', () => {
    expect(shareState({ revokedAt: null, expiresOn: null }, '2026-11-23')).toBe('active')
    expect(shareState({ revokedAt: null, expiresOn: '2026-11-23' }, '2026-11-23')).toBe('active')
    expect(shareState({ revokedAt: null, expiresOn: '2026-11-22' }, '2026-11-23')).toBe('expired')
    expect(shareState({ revokedAt: '2026-11-01T00:00:00Z', expiresOn: null }, '2026-11-23')).toBe('revoked')
  })
})
