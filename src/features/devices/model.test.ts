import { describe, expect, it } from 'vitest'
import { deviceRow, deviceSchema, isRandomMac, matchesDevice, normalizeMac, type MemberDevice } from './model'

const device: MemberDevice = { id: 'd', userId: 'u', kind: 'phone', name: 'iPhone 15', mac: 'A4:83:E7:12:34:56', ethernetMac: '', note: '', networks: [] }

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
      deviceSchema.parse({ kind: 'laptop', name: ' MacBook ', mac: 'a483e7123456', ethernetMac: '001a2b3c4d5e', note: '', networks: [{ ssid: 'SD9-Router', ip: ' 192.168.1.20 ', mac: 'da-a1-19-00-00-01' }] }),
    ).toEqual({ kind: 'laptop', name: 'MacBook', mac: 'A4:83:E7:12:34:56', ethernetMac: '00:1A:2B:3C:4D:5E', note: '', networks: [{ ssid: 'SD9-Router', ip: '192.168.1.20', mac: 'DA:A1:19:00:00:01' }] })
    expect(deviceSchema.safeParse({ kind: 'phone', name: 'X', mac: 'a483e7123456', ethernetMac: '', note: '', networks: [{ ssid: 'A', ip: '999.1.1.1', mac: '' }] }).success).toBe(false)
    expect(deviceSchema.safeParse({ kind: 'phone', name: '', mac: 'x', ethernetMac: '', note: '', networks: [] }).success).toBe(false)
  })

  it('search by name, owner or MAC fragment', () => {
    expect(matchesDevice(device, 'Dávid', 'david')).toBe(true)
    expect(matchesDevice(device, 'Dávid', 'e7-12')).toBe(true)
    expect(matchesDevice(device, 'Dávid', 'samsung')).toBe(false)
  })
})

describe('device row', () => {
  it('maps form values to database columns', () => {
    const row = deviceRow({ kind: 'laptop', name: 'DB-PC', mac: '74:4C:A1:D8:DC:65', ethernetMac: '38:F3:AB:CD:3E:20', note: '', networks: [] })
    expect(row).toEqual({ kind: 'laptop', name: 'DB-PC', mac: '74:4C:A1:D8:DC:65', ethernet_mac: '38:F3:AB:CD:3E:20', note: '', networks: [] })
    expect(Object.keys(row).every((key) => /^[a-z_]+$/.test(key))).toBe(true)
  })
})
