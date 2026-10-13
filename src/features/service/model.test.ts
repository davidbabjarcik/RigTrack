import { describe, expect, it } from 'vitest'
import { formatUnits, piecesInService, serviceSchema, serviceTotals, sortServiceRecords, unitsInService, type ServiceRecord } from './model'

const record = (patch: Partial<ServiceRecord>): ServiceRecord => ({
  id: 'x',
  equipmentId: 'e',
  quantity: 1,
  unitNumbers: [],
  kind: 'repair',
  status: 'open',
  happenedOn: '2026-10-01',
  problem: '',
  workDone: '',
  hours: null,
  cost: null,
  technician: '',
  ...patch,
})

describe('sortServiceRecords', () => {
  it('puts unfinished records first, oldest on top, then finished from the newest', () => {
    const sorted = sortServiceRecords([
      record({ id: 'done-old', status: 'done', happenedOn: '2026-01-01' }),
      record({ id: 'open-new', status: 'open', happenedOn: '2026-10-10' }),
      record({ id: 'done-new', status: 'done', happenedOn: '2026-09-01' }),
      record({ id: 'progress-old', status: 'in_progress', happenedOn: '2026-08-01' }),
    ])
    expect(sorted.map((r) => r.id)).toEqual(['progress-old', 'open-new', 'done-new', 'done-old'])
  })
})

describe('piecesInService', () => {
  it('adds up pieces in unfinished records per equipment', () => {
    const counts = piecesInService([
      record({ equipmentId: 'di', quantity: 1 }),
      record({ equipmentId: 'di', quantity: 2, status: 'in_progress' }),
      record({ equipmentId: 'di', quantity: 5, status: 'done' }),
      record({ equipmentId: 'amp', status: 'done' }),
    ])
    expect(counts.get('di')).toBe(3)
    expect(counts.has('amp')).toBe(false)
  })
})

describe('unitsInService', () => {
  it('lists the numbered pieces of unfinished records', () => {
    const units = unitsInService([
      record({ equipmentId: 'blinder', unitNumbers: [4] }),
      record({ equipmentId: 'blinder', unitNumbers: [1, 2], status: 'in_progress' }),
      record({ equipmentId: 'blinder', unitNumbers: [3], status: 'done' }),
      record({ equipmentId: 'amp' }),
    ])
    expect(units.get('blinder')).toEqual([1, 2, 4])
    expect(units.has('amp')).toBe(false)
    expect(formatUnits([1, 2, 4])).toBe('#1, #2, #4')
  })
})

describe('serviceTotals', () => {
  it('sums hours and costs, skipping empty values', () => {
    expect(serviceTotals([{ hours: 1.5, cost: 20.1 }, { hours: null, cost: 30.2 }, { hours: 2, cost: null }])).toEqual({ hours: 3.5, cost: 50.3 })
    expect(serviceTotals([])).toEqual({ hours: 0, cost: 0 })
  })
})

describe('serviceSchema', () => {
  const valid = { equipmentId: 'e', unitNumbers: [], quantity: 1, kind: 'repair', status: 'open', happenedOn: '2026-10-13', problem: '', workDone: '', technician: '' }

  it('accepts a minimal record and rejects one without equipment or with negative hours', () => {
    expect(serviceSchema.safeParse(valid).success).toBe(true)
    expect(serviceSchema.safeParse({ ...valid, equipmentId: '' }).success).toBe(false)
    expect(serviceSchema.safeParse({ ...valid, hours: -1 }).success).toBe(false)
    expect(serviceSchema.safeParse({ ...valid, unitNumbers: [0] }).success).toBe(false)
  })
})
