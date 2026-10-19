import { describe, expect, it } from 'vitest'
import type { MemberDevice } from '@/features/devices/model'
import type { Equipment } from '@/features/equipment/model'
import { addressRows, inNetwork, managementUrl, matchesAddress, parseSubnet, parseWifiQr, suggestFreeIp, wifiQrText, wifiSchema, type WifiNetwork } from './model'

const network = (patch: Partial<WifiNetwork>): WifiNetwork => ({
  id: 'n1', ssid: 'SD9-Router', password: 'tajne123', security: 'WPA', hidden: false, subnet: '192.168.1.0/24', routerIp: '192.168.1.1',
  managementIp: '', routerModel: '', dhcp: true, dhcpStart: '', dhcpEnd: '', equipmentId: null, place: '', note: '', ...patch,
})
const item = (patch: Partial<Equipment>) => ({ id: 'e1', name: 'SD9', manufacturer: 'DiGiCo', model: 'SD9', ipAddress: '', macAddress: '', status: 'available', ...patch }) as Equipment
const device = (patch: Partial<MemberDevice>): MemberDevice => ({ id: 'd1', userId: 'u1', kind: 'phone', name: 'iPhone', mac: 'A4:83:E7:12:34:56', note: '', networks: [], ...patch })

describe('wifi QR', () => {
  it('builds and reads the WIFI: text with escaping', () => {
    const text = wifiQrText({ ssid: 'JEF;Prod', password: 'a:b\\c', security: 'WPA', hidden: true })
    expect(text).toBe('WIFI:T:WPA;S:JEF\\;Prod;P:a\\:b\\\\c;H:true;;')
    expect(parseWifiQr(text)).toEqual({ ssid: 'JEF;Prod', password: 'a:b\\c', security: 'WPA', hidden: true })
    expect(wifiQrText({ ssid: 'Free', password: 'x', security: 'nopass', hidden: false })).toBe('WIFI:T:nopass;S:Free;;')
    expect(parseWifiQr('WIFI:S:Bar;T:WEP;P:12345;;')).toEqual({ ssid: 'Bar', password: '12345', security: 'WEP', hidden: false })
    expect(parseWifiQr('https://example.com')).toBeNull()
  })

  it('validates the form', () => {
    const values = { ssid: 'A', password: 'kratke', security: 'WPA' as const, hidden: false, subnet: '', routerIp: '', managementIp: '', routerModel: '', dhcp: true, dhcpStart: '', dhcpEnd: '', loginUser: '', loginPassword: '', equipmentId: '', place: '', note: '' }
    expect(wifiSchema.safeParse(values).success).toBe(false)
    expect(wifiSchema.safeParse({ ...values, password: 'dostatocne' }).success).toBe(true)
    expect(wifiSchema.safeParse({ ...values, security: 'nopass' }).success).toBe(true)
    expect(wifiSchema.safeParse({ ...values, password: 'dostatocne', subnet: '192.168.1/24' }).success).toBe(false)
  })
})

describe('IP ranges', () => {
  it('match addresses to a subnet or the router /24', () => {
    expect(parseSubnet('10.0.0.0/8')).toEqual({ value: 167772160, bits: 8 })
    expect(inNetwork('192.168.1.55', network({}))).toBe(true)
    expect(inNetwork('192.168.2.55', network({}))).toBe(false)
    expect(inNetwork('192.168.2.55', network({ subnet: '', routerIp: '192.168.2.1' }))).toBe(true)
    expect(managementUrl(network({ managementIp: '192.168.1.2' }))).toBe('http://192.168.1.2')
    expect(managementUrl(network({ routerIp: '' }))).toBeNull()
  })

  it('suggest the next free address', () => {
    expect(suggestFreeIp(network({}), ['192.168.1.10', '192.168.1.11'])).toBe('192.168.1.12')
    // DHCP rozdáva .10–.99 → pevná IP až od .100
    expect(suggestFreeIp(network({ dhcpStart: '192.168.1.10', dhcpEnd: '192.168.1.99' }), [])).toBe('192.168.1.100')
  })
})

describe('address overview', () => {
  const owner = () => ({ name: 'Dávid', to: '/staff/s1' })

  it('joins equipment and member devices, assigns networks and flags clashes', () => {
    const rows = addressRows(
      [item({ ipAddress: '192.168.1.20', macAddress: '00:1A:2B:3C:4D:5E' }), item({ id: 'e2', name: 'Retired', ipAddress: '192.168.1.20', status: 'retired' })],
      [device({ networks: [{ ssid: 'SD9-Router', ip: '192.168.1.20', mac: 'DA:A1:19:00:00:01' }, { ssid: 'Hotel', ip: '10.0.0.5', mac: '' }] })],
      [network({})],
      owner,
    )
    expect(rows.map((row) => [row.name, row.ip, row.networkId, row.duplicateIp])).toEqual([
      ['iPhone', '10.0.0.5', null, false],
      ['iPhone', '192.168.1.20', 'n1', true],
      ['SD9', '192.168.1.20', 'n1', true],
    ])
    expect(rows.find((row) => row.ip === '10.0.0.5')?.detail).toBe('Dávid · Wi-Fi Hotel')
    expect(rows.find((row) => row.ip === '10.0.0.5')?.mac).toBe('A4:83:E7:12:34:56')
  })

  it('searches by IP prefix, MAC fragment or name', () => {
    const row = { ip: '192.168.1.20', mac: '00:1A:2B:3C:4D:5E', name: 'SD9', detail: 'DiGiCo' }
    expect(matchesAddress(row, '192.168.1.')).toBe(true)
    expect(matchesAddress(row, '4d-5e')).toBe(true)
    expect(matchesAddress(row, 'digico')).toBe(true)
    expect(matchesAddress(row, 'yamaha')).toBe(false)
  })
})
