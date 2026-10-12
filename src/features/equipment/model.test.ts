import { describe, expect, it } from 'vitest'
import {
  attributesFor,
  cableName,
  cableSetSchema,
  describeAttributes,
  equipmentSchema,
  filterEquipment,
  needsRestock,
  isValidIp,
  NO_CASE,
  normalizeMac,
  serviceState,
  unpackedEquipment,
  type Equipment,
  type EquipmentFilter,
} from './model'

const base: Equipment = {
  id: '1',
  name: 'Mikrofón SM58',
  kind: 'general',
  attributes: {},
  macAddress: '',
  ipAddress: '',
  serviceIntervalMonths: null,
  lastServiceOn: null,
  photoPath: '',
  categoryId: 'zvuk',
  locationId: 'sklad',
  caseId: null,
  labelRole: null,
  minQuantity: null,
  quantity: 1,
  manufacturer: 'Shure',
  model: 'SM58',
  serialNumber: 'SN-123',
  inventoryNumber: 'INV-0042',
  status: 'available',
  note: '',
  updatedAt: '',
}
const items: Equipment[] = [
  base,
  { ...base, id: '2', name: 'Reflektor', caseId: 'case-1', categoryId: 'svetla', manufacturer: 'Robe', model: 'Spiider', inventoryNumber: 'INV-0100', serialNumber: '', status: 'in_service' },
  { ...base, id: '3', name: 'Kábel XLR 10 m', categoryId: null, locationId: null, manufacturer: '', model: '', inventoryNumber: '', serialNumber: '', status: 'damaged' },
]
const none: EquipmentFilter = { search: '', status: '', categoryId: '', locationId: '', caseId: '' }
const ids = (filter: Partial<EquipmentFilter>) => filterEquipment(items, { ...none, ...filter }).map((i) => i.id)

describe('filterEquipment', () => {
  it('returns everything without a filter', () => {
    expect(ids({})).toEqual(['1', '2', '3'])
  })

  it('ignores case and diacritics', () => {
    expect(ids({ search: 'mikrofon' })).toEqual(['1'])
    expect(ids({ search: 'KABEL' })).toEqual(['3'])
  })

  it('searches manufacturer, model, serial and inventory number', () => {
    expect(ids({ search: 'robe' })).toEqual(['2'])
    expect(ids({ search: 'sn-123' })).toEqual(['1'])
    expect(ids({ search: 'inv-0100' })).toEqual(['2'])
  })

  it('requires every word to match', () => {
    expect(ids({ search: 'shure sm58' })).toEqual(['1'])
    expect(ids({ search: 'shure spiider' })).toEqual([])
  })

  it('combines status, category and location', () => {
    expect(ids({ status: 'in_service' })).toEqual(['2'])
    expect(ids({ categoryId: 'zvuk' })).toEqual(['1'])
    expect(ids({ locationId: 'sklad' })).toEqual(['1', '2'])
    expect(ids({ locationId: 'sklad', status: 'damaged' })).toEqual([])
  })
})

describe('case filter', () => {
  it('filters by a specific case or by being outside any case', () => {
    expect(ids({ caseId: 'case-1' })).toEqual(['2'])
    expect(ids({ caseId: NO_CASE })).toEqual(['1', '3'])
  })

  it('does not count retired equipment as unpacked', () => {
    const withRetired = [...items, { ...base, id: '4', status: 'retired' as const }]
    expect(unpackedEquipment(withRetired).map((i) => i.id)).toEqual(['1', '3'])
  })
})

describe('equipmentSchema', () => {
  const valid = {
    name: ' Mixpult ',
    kind: 'general',
    category: '',
    location: '',
    caseId: '',
    manufacturer: '',
    model: '',
    serialNumber: '',
    inventoryNumber: '',
    quantity: 1,
    status: 'available',
    connector: '',
    lightSource: '',
    macAddress: '',
    ipAddress: '',
    lastServiceOn: '',
    note: '',
  }

  it('trims values', () => {
    expect(equipmentSchema.parse(valid).name).toBe('Mixpult')
  })

  it('rejects a blank name, an unknown status and over-long values', () => {
    expect(equipmentSchema.safeParse({ ...valid, name: '   ' }).success).toBe(false)
    expect(equipmentSchema.safeParse({ ...valid, status: 'lost' }).success).toBe(false)
    expect(equipmentSchema.safeParse({ ...valid, quantity: -1 }).success).toBe(false)
    expect(equipmentSchema.safeParse({ ...valid, quantity: NaN }).success).toBe(false)
    expect(equipmentSchema.safeParse({ ...valid, inventoryNumber: 'x'.repeat(41) }).success).toBe(false)
  })
})

describe('network addresses', () => {
  it('normalises common ways of writing a MAC address', () => {
    expect(normalizeMac('00-1a-2b-3c-4d-5e')).toBe('00:1A:2B:3C:4D:5E')
    expect(normalizeMac('001a.2b3c.4d5e')).toBe('00:1A:2B:3C:4D:5E')
    expect(normalizeMac(' 00:1A:2B:3C:4D:5E ')).toBe('00:1A:2B:3C:4D:5E')
  })

  it('validates MAC and IP in the form', () => {
    const base = { name: 'x', kind: 'general', category: '', location: '', caseId: '', manufacturer: '', model: '', serialNumber: '', inventoryNumber: '', quantity: 1, status: 'available', connector: '', lightSource: '', lastServiceOn: '', note: '' }
    const ok = (macAddress: string, ipAddress: string) => equipmentSchema.safeParse({ ...base, macAddress, ipAddress }).success
    expect(ok('00-1a-2b-3c-4d-5e', '192.168.1.10')).toBe(true)
    expect(ok('', '')).toBe(true)
    expect(ok('00:1A:2B', '')).toBe(false)
    expect(ok('', '192.168.1.256')).toBe(false)
    expect(isValidIp('10.0.0')).toBe(false)
  })
})

describe('kind-specific data', () => {
  const values = { connector: 'XLR', lengthM: 5, powerW: 200, lightSource: 'led' as const }

  it('keeps only what belongs to the kind', () => {
    expect(attributesFor({ ...values, kind: 'cable' })).toEqual({ connector: 'XLR', lengthM: 5 })
    expect(attributesFor({ ...values, kind: 'light' })).toEqual({ powerW: 200, lightSource: 'led' })
    expect(attributesFor({ ...values, kind: 'audio' })).toEqual({ powerW: 200 })
    expect(attributesFor({ ...values, kind: 'general' })).toEqual({})
  })

  it('describes the data briefly', () => {
    expect(describeAttributes({ attributes: { connector: 'XLR', lengthM: 1.5 } })).toEqual(['XLR', '1,5 m'])
    expect(describeAttributes({ attributes: { powerW: 200, lightSource: 'discharge' } })).toEqual(['200 W', 'Výbojka'])
    expect(describeAttributes({ attributes: {} })).toEqual([])
  })
})

describe('serviceState', () => {
  const today = '2026-10-12'

  it('reports nothing without an interval and unknown without a recorded service', () => {
    expect(serviceState({ serviceIntervalMonths: null, lastServiceOn: '2026-01-01' }, today)).toEqual({ state: 'none' })
    expect(serviceState({ serviceIntervalMonths: 12, lastServiceOn: null }, today)).toEqual({ state: 'unknown' })
  })

  it('distinguishes overdue, due soon and fine', () => {
    expect(serviceState({ serviceIntervalMonths: 12, lastServiceOn: '2025-10-01' }, today)).toEqual({ state: 'overdue', dueOn: '2026-10-01' })
    expect(serviceState({ serviceIntervalMonths: 12, lastServiceOn: '2025-11-01' }, today)).toEqual({ state: 'soon', dueOn: '2026-11-01' })
    expect(serviceState({ serviceIntervalMonths: 12, lastServiceOn: '2026-06-01' }, today)).toEqual({ state: 'ok', dueOn: '2027-06-01' })
  })

  it('clamps to the end of a shorter month', () => {
    expect(serviceState({ serviceIntervalMonths: 1, lastServiceOn: '2027-01-31' }, today)).toEqual({ state: 'ok', dueOn: '2027-02-28' })
  })
})

describe('cable sets', () => {
  const set = (rows: object[]) => ({ namePrefix: 'XLR kábel', connector: 'XLR', category: '', location: '', rows })

  it('names each length', () => {
    expect(cableName('XLR kábel', 5)).toBe('XLR kábel 5 m')
    expect(cableName('powerCON prepojovací', 1.5)).toBe('powerCON prepojovací 1,5 m')
  })

  it('requires valid, distinct lengths', () => {
    expect(cableSetSchema.safeParse(set([{ lengthM: 1, quantity: 20 }, { lengthM: 1.5, quantity: 10 }])).success).toBe(true)
    expect(cableSetSchema.safeParse(set([])).success).toBe(false)
    expect(cableSetSchema.safeParse(set([{ lengthM: 5, quantity: 1 }, { lengthM: 5, quantity: 2 }])).success).toBe(false)
    expect(cableSetSchema.safeParse(set([{ lengthM: NaN, quantity: 1 }])).success).toBe(false)
    expect(cableSetSchema.safeParse(set([{ lengthM: 5, quantity: 0 }])).success).toBe(false)
  })
})

describe('stock', () => {
  it('flags an item once it drops to its reorder level', () => {
    expect(needsRestock({ quantity: 2, minQuantity: 1 })).toBe(false)
    expect(needsRestock({ quantity: 1, minQuantity: 1 })).toBe(true)
    expect(needsRestock({ quantity: 0, minQuantity: 1 })).toBe(true)
  })

  it('never flags items without a reorder level', () => {
    expect(needsRestock({ quantity: 0, minQuantity: null })).toBe(false)
  })

  it('does not ask for consumables to be packed into a case', () => {
    expect(unpackedEquipment([{ ...base, id: '9', kind: 'consumable' }])).toEqual([])
  })
})
