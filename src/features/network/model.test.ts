import { describe, expect, it } from 'vitest'
import type { Equipment } from '@/features/equipment/model'
import { ipValue, matchesNetwork, networkRows } from './model'

const item = (patch: Partial<Equipment>) => ({ id: patch.name, name: 'X', manufacturer: '', model: '', ipAddress: '', macAddress: '', caseId: null, locationId: null, status: 'available', ...patch }) as Equipment

describe('networkRows', () => {
  const rows = networkRows([
    item({ name: 'Pult', ipAddress: '192.168.1.10', macAddress: '00:1A:2B:3C:4D:5E' }),
    item({ name: 'Stagebox', ipAddress: '192.168.1.9' }),
    item({ name: 'Switch', macAddress: '00:1A:2B:3C:4D:FF' }),
    item({ name: 'Procesor', ipAddress: '192.168.1.10' }),
    item({ name: 'Kábel' }),
    item({ name: 'Starý', ipAddress: '192.168.1.50', status: 'retired' }),
  ])

  it('lists devices with an address sorted by IP numerically, without retired ones', () => {
    expect(rows.map((row) => row.name)).toEqual(['Stagebox', 'Procesor', 'Pult', 'Switch'])
  })

  it('flags an IP used twice', () => {
    expect(rows.filter((row) => row.duplicateIp).map((row) => row.name)).toEqual(['Procesor', 'Pult'])
    expect(rows.some((row) => row.duplicateMac)).toBe(false)
  })

  it('finds a device by IP prefix, by MAC in any notation or by name', () => {
    const find = (query: string) => rows.filter((row) => matchesNetwork(row, query)).map((row) => row.name)
    expect(find('192.168.1.1')).toEqual(['Procesor', 'Pult'])
    expect(find('4d-5e')).toEqual(['Pult'])
    expect(find('001a2b3c4dff')).toEqual(['Switch'])
    expect(find('stage')).toEqual(['Stagebox'])
  })
})

describe('ipValue', () => {
  it('orders addresses by their numbers, not as text', () => {
    expect(ipValue('10.0.0.2')).toBeLessThan(ipValue('10.0.0.10'))
    expect(ipValue('')).toBe(Number.POSITIVE_INFINITY)
  })
})
