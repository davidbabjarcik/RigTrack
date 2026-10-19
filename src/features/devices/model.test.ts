import { describe, expect, it } from 'vitest'
import { deviceSchema, isRandomMac, matchesDevice, normalizeMac, type MemberDevice } from './model'

const device: MemberDevice = { id: 'd', userId: 'u', kind: 'phone', name: 'iPhone 15', mac: 'A4:83:E7:12:34:56', note: '', networks: [] }

describe('member devices', () => {
  it('normalize MAC addresses written in any common format', () => {
    expect(normalizeMac('a4-83-e7-12-34-56')).toBe('A4:83:E7:12:34:56')
    expect(normalizeMac('a483.e712.3456')).toBe('A4:83:E7:12:34:56')
    expect(normalizeMac('A483E7123456')).toBe('A4:83:E7:12:34:56')
    expect(normalizeMac('A4:83:E7:12:34')).toBeNull()
    expect(normalizeMac('G4:83:E7:12:34:56')).toBeNull()
  })

  it('recognise private (random) addresses', () => {
    expect(isRandomMac('A4:83:E7:12:34:56')).toBe(false)
    expect(isRandomMac('DA:A1:19:00:00:01')).toBe(true)
  })

  it('validate the form and store the normalized MAC', () => {
    expect(
      deviceSchema.parse({ kind: 'laptop', name: ' MacBook ', mac: 'a483e7123456', note: '', networks: [{ ssid: 'SD9-Router', ip: ' 192.168.1.20 ', mac: 'da-a1-19-00-00-01' }] }),
    ).toEqual({ kind: 'laptop', name: 'MacBook', mac: 'A4:83:E7:12:34:56', note: '', networks: [{ ssid: 'SD9-Router', ip: '192.168.1.20', mac: 'DA:A1:19:00:00:01' }] })
    expect(deviceSchema.safeParse({ kind: 'phone', name: 'X', mac: 'a483e7123456', note: '', networks: [{ ssid: 'A', ip: '999.1.1.1', mac: '' }] }).success).toBe(false)
    expect(deviceSchema.safeParse({ kind: 'phone', name: '', mac: 'x', note: '', networks: [] }).success).toBe(false)
  })

  it('search by name, owner or MAC fragment', () => {
    expect(matchesDevice(device, 'Dávid', 'david')).toBe(true)
    expect(matchesDevice(device, 'Dávid', 'e7-12')).toBe(true)
    expect(matchesDevice(device, 'Dávid', 'samsung')).toBe(false)
  })
})
