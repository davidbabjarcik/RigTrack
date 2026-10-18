import { describe, expect, it } from 'vitest'
import type { Equipment } from '@/features/equipment/model'
import type { Loan } from '@/features/loans/model'
import type { ServiceRecord } from '@/features/service/model'
import type { Vehicle } from '@/features/vehicles/model'
import { buildStats, daysWithin, type StatsSources } from './model'

const today = '2026-10-13'
const yearAgo = '2025-10-13'

const equipment = (patch: Partial<Equipment>): Equipment => ({
  id: 'e1', name: 'Mixpult', kind: 'general', attributes: {}, categoryId: null, locationId: null, caseId: null, labelRole: null,
  minQuantity: null, trackUnits: false, unitIds: [], rentalPrice: null, quantity: 1, manufacturer: '', model: '', serialNumber: '', inventoryNumber: '', macAddress: '', ipAddress: '',
  serviceIntervalMonths: null, lastServiceOn: null, hoursIntervalMonths: null, operatingHours: null, hoursReadOn: null, photoPath: '', status: 'available', note: '', updatedAt: '', ...patch,
})
const loan = (patch: Partial<Loan>): Loan => ({
  id: 'l1', borrower: 'Klient', contact: '', borrowerIco: '', borrowerAddress: '', billedDays: null, price: null, deposit: null, startsOn: '2026-09-01', endsOn: '2026-09-03', status: 'returned', note: '',
  issuedAt: null, returnedAt: null, issuedByName: '', returnedByName: '', items: [{ equipmentId: 'e1', quantity: 1, damaged: false, caseId: null, unitNumbers: [], damagedUnits: [], damagedQuantity: 0, unitPrice: null }], ...patch,
})
const service = (patch: Partial<ServiceRecord>): ServiceRecord => ({
  id: 's1', equipmentId: 'e1', quantity: 1, unitNumbers: [], kind: 'repair', status: 'done', happenedOn: '2026-09-01', problem: '', workDone: '', hours: null,
  cost: null, technician: '', technicianId: null, ...patch,
})
const vehicle = (patch: Partial<Vehicle>): Vehicle => ({
  id: 'v1', plate: 'SP123AB', model: '', vin: '', status: 'active', driver: '', odometerKm: null, photoPath: '', payloadKg: null, cargoLengthCm: null, cargoWidthCm: null, cargoHeightCm: null, cargoObstacles: [], technicianId: null, note: '',
  stkUntil: null, ekUntil: null, vignetteUntil: null, pzpUntil: null, cascoUntil: null, leasingUntil: null, ...patch,
})
const none: StatsSources = { equipment: [], loans: [], service: [], vehicles: [], vehicleCosts: [] }
const stats = (patch: Partial<StatsSources>) => buildStats({ ...none, ...patch }, today, yearAgo)

describe('daysWithin', () => {
  it('counts inclusive days clipped to the window', () => {
    expect(daysWithin('2026-09-01', '2026-09-03', yearAgo, today)).toBe(3)
    expect(daysWithin('2025-10-10', '2025-10-14', yearAgo, today)).toBe(2)
    expect(daysWithin('2025-01-01', '2025-01-05', yearAgo, today)).toBe(0)
  })
})

describe('buildStats', () => {
  it('summarises equipment by pieces and status, leaving consumables out', () => {
    const result = stats({
      equipment: [
        equipment({ id: 'a', quantity: 1 }),
        equipment({ id: 'b', quantity: 20, kind: 'cable', caseId: 'c1' }),
        equipment({ id: 'c', status: 'in_service' }),
        equipment({ id: 'd', status: 'retired' }),
        equipment({ id: 'fluid', kind: 'consumable', quantity: 5 }),
      ],
    }).equipment
    expect(result).toMatchObject({ items: 4, pieces: 23, packed: 1, unpacked: 2 })
    // 21 dostupných z 22 nevyradených kusov
    expect(result.availability).toBeCloseTo(21 / 22)
    expect(result.byStatus).toEqual([
      { id: 'available', label: 'Dostupná', value: 2 },
      { id: 'in_service', label: 'V servise', value: 1 },
      { id: 'retired', label: 'Vyradená', value: 1 },
    ])
  })

  it('ranks equipment by days actually spent out, ignoring reservations', () => {
    const result = stats({
      equipment: [equipment({ id: 'e1', name: 'Mixpult' }), equipment({ id: 'e2', name: 'Reproduktor' })],
      loans: [
        loan({}),
        loan({ id: 'l2', startsOn: '2026-08-01', endsOn: '2026-08-10', items: [{ equipmentId: 'e2', quantity: 1, damaged: false, caseId: null, unitNumbers: [], damagedUnits: [], damagedQuantity: 0, unitPrice: null }] }),
        loan({ id: 'l3', status: 'reserved', startsOn: '2026-10-01', endsOn: '2026-10-30' }),
        // vydané a nevrátené: ráta sa až po dnešok
        loan({ id: 'l4', status: 'issued', startsOn: '2026-10-10', endsOn: '2026-10-11' }),
      ],
    }).loans
    expect(result).toMatchObject({ total: 4, open: 2, overdue: 1 })
    expect(result.mostLent).toEqual([
      { id: 'e2', label: 'Reproduktor', value: 10 },
      { id: 'e1', label: 'Mixpult', value: 7 },
    ])
  })

  it('totals service work and finds the costliest equipment', () => {
    const result = stats({
      equipment: [equipment({})],
      service: [
        service({ hours: 1.5, cost: 40 }),
        service({ id: 's2', kind: 'inspection', status: 'open', hours: 0.5, cost: 10.5 }),
        service({ id: 's3', equipmentId: 'gone', cost: 5 }),
      ],
    }).service
    expect(result).toMatchObject({ records: 3, open: 1, hours: 2, cost: 55.5 })
    expect(result.byKind).toEqual([
      { id: 'repair', label: 'Oprava', value: 2 },
      { id: 'inspection', label: 'Kontrola', value: 1 },
    ])
    expect(result.costliest[0]).toEqual({ id: 'e1', label: 'Mixpult', value: 50.5 })
    expect(result.costliest[1].label).toBe('Odstránená technika')
  })

  it('counts active vehicles, their due deadlines and running costs', () => {
    const result = stats({
      vehicles: [vehicle({ stkUntil: '2026-10-20' }), vehicle({ id: 'v2', plate: 'OLD', status: 'retired', stkUntil: '2026-10-20' })],
      vehicleCosts: [
        { vehicleId: 'v1', cost: 60 },
        { vehicleId: 'v1', cost: null },
        { vehicleId: 'v1', cost: 40.5 },
      ],
    }).vehicles
    expect(result).toEqual({ count: 1, due: 1, costs: [{ id: 'v1', label: 'SP123AB', value: 100.5 }] })
  })

  it('handles an empty company', () => {
    expect(stats({}).equipment).toMatchObject({ items: 0, pieces: 0, availability: 0, byStatus: [] })
  })
})
