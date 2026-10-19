import { describe, expect, it } from 'vitest'
import { COMPANY_OWNER, filterEquipment, purchaseDates, type Equipment, type EquipmentFilter } from './model'

const base: Equipment = {
  id: '1',
  name: 'Shure ULX-D',
  kind: 'audio',
  attributes: { audioType: 'wireless' },
  macAddress: '',
  ipAddress: '',
  serviceIntervalMonths: null,
  lastServiceOn: null,
  hoursIntervalMonths: null,
  operatingHours: null,
  hoursReadOn: null,
  photoPath: '',
  categoryId: null,
  locationId: null,
  caseId: null,
  labelRole: null,
  minQuantity: null,
  trackUnits: true,
  unitIds: [],
  rentalPrice: null,
  quantity: 4,
  manufacturer: 'Shure',
  model: 'ULX-D',
  serialNumber: '',
  inventoryNumber: '',
  status: 'available',
  note: '',
  updatedAt: '2026-01-01T00:00:00Z',
  purchasedOn: '2023-05-01',
  unitPurchases: { '4': '2025-02-10' },
  links: [],
}
const items: Equipment[] = [
  base,
  { ...base, id: '2', name: 'Spiider klon', kind: 'light', attributes: {}, manufacturer: 'Fos', cloneOf: 'Robe Spiider', captureMatch: 'partial', ownerStaffId: 's1', purchasedOn: null, unitPurchases: {}, links: [{ title: 'Návod', url: 'https://x', tag: 'manual' }], updatedAt: '2026-06-01T00:00:00Z', ipAddress: '10.0.0.5', quantity: 1 },
  { ...base, id: '3', name: 'Beam', kind: 'light', attributes: {}, manufacturer: 'Fos', purchasedOn: '2024-01-01', unitPurchases: {}, serviceIntervalMonths: 12, lastServiceOn: '2025-01-01', quantity: 8 },
]
const none: EquipmentFilter = { search: '', status: '', categoryId: '', locationId: '', caseId: '' }
const ids = (filter: Partial<EquipmentFilter>) => filterEquipment(items, { ...none, ...filter }, '2026-10-19').map((i) => i.id)

describe('advanced equipment filter', () => {
  it('filters by kind, audio type, owner and manufacturer', () => {
    expect(ids({ kind: 'light' })).toEqual(['2', '3'])
    expect(ids({ audioType: 'wireless' })).toEqual(['1'])
    expect(ids({ owner: 's1' })).toEqual(['2'])
    expect(ids({ owner: COMPANY_OWNER })).toEqual(['1', '3'])
    expect(ids({ manufacturer: 'fos' })).toEqual(['2', '3'])
  })

  it('filters by Capture match, purchase year, network, links and service', () => {
    expect(ids({ capture: 'partial' })).toEqual(['2'])
    expect(ids({ capture: 'unset' })).toEqual(['3'])
    expect(ids({ purchasedYear: '2025' })).toEqual(['1'])
    expect(ids({ withNetwork: true })).toEqual(['2'])
    expect(ids({ withLinks: true })).toEqual(['2'])
    expect(ids({ attention: 'service' })).toEqual(['3'])
    expect(ids({ search: 'spiider' })).toEqual(['2'])
  })

  it('sorts', () => {
    expect(ids({ sort: 'newest' })).toEqual(['2', '1', '3'])
    expect(ids({ sort: 'purchased' })).toEqual(['1', '3', '2'])
    expect(ids({ sort: 'quantity' })).toEqual(['3', '1', '2'])
  })

  it('lists purchase dates of the item and units', () => {
    expect(purchaseDates(base)).toEqual(['2023-05-01', '2025-02-10'])
  })
})
