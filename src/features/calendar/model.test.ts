import { describe, expect, it } from 'vitest'
import type { Equipment } from '@/features/equipment/model'
import type { Loan } from '@/features/loans/model'
import type { ShoppingItem } from '@/features/shopping/model'
import type { Task } from '@/features/tasks/model'
import type { Vehicle } from '@/features/vehicles/model'
import type { CompanyEvent } from '@/features/events/model'
import { addDays, buildAgenda, entriesByDay, groupAgenda, monthGridDays, shiftMonth, type AgendaSources } from './model'

const today = '2026-10-13'

const loan = (patch: Partial<Loan>): Loan => ({
  id: 'l1', borrower: 'Klient', contact: '', borrowerIco: '', borrowerAddress: '', billedDays: null, price: null, deposit: null, startsOn: '2026-10-20', endsOn: '2026-10-22', status: 'reserved', note: '',
  issuedAt: null, returnedAt: null, issuedByName: '', returnedByName: '', items: [], ...patch,
})
const vehicle = (patch: Partial<Vehicle>): Vehicle => ({
  id: 'v1', plate: 'SP123AB', model: '', vin: '', status: 'active', driver: '', odometerKm: null, photoPath: '', payloadKg: null, cargoLengthCm: null, cargoWidthCm: null, cargoHeightCm: null, cargoObstacles: [], note: '',
  stkUntil: null, ekUntil: null, vignetteUntil: null, pzpUntil: null, cascoUntil: null, leasingUntil: null, ...patch,
})
const task = (patch: Partial<Task>): Task => ({
  id: 't1', title: 'Inventúra', note: '', assigneeId: null, priority: 'normal', dueOn: null, status: 'open', createdBy: null, ...patch,
})
const equipment = (patch: Partial<Equipment>): Equipment => ({
  id: 'e1', name: 'Hazer', kind: 'general', attributes: {}, categoryId: null, locationId: null, caseId: null, labelRole: null,
  minQuantity: null, trackUnits: false, unitIds: [], rentalPrice: null, quantity: 1, manufacturer: '', model: '', serialNumber: '', inventoryNumber: '', macAddress: '', ipAddress: '',
  serviceIntervalMonths: null, lastServiceOn: null, hoursIntervalMonths: null, operatingHours: null, hoursReadOn: null, photoPath: '', status: 'available', note: '', updatedAt: '', ...patch,
})
const shopping = (patch: Partial<ShoppingItem>): ShoppingItem => ({
  id: 's1', list: 'buy', name: 'Kvapalina', quantity: 1, unitPrice: null, supplier: '', url: '', priority: 'normal', dueOn: null,
  status: 'planned', assigneeId: null, orderNumber: '', note: '', createdBy: null, ...patch,
})
const none: AgendaSources = { events: [], loans: [], vehicles: [], tasks: [], equipment: [], shopping: [] }
const agenda = (patch: Partial<AgendaSources>) => buildAgenda({ ...none, ...patch }, today).map((e) => `${e.date} ${e.kind} ${e.detail}`)

describe('buildAgenda', () => {
  it('lists hand-out and return for a reservation, only the return once issued, nothing when closed', () => {
    expect(agenda({ loans: [loan({})] })).toEqual(['2026-10-20 loan vydať techniku', '2026-10-22 loan vrátenie techniky'])
    expect(agenda({ loans: [loan({ status: 'issued' })] })).toEqual(['2026-10-22 loan vrátenie techniky'])
    expect(agenda({ loans: [loan({ status: 'returned' })] })).toEqual([])
  })

  it('includes vehicle deadlines except for retired vehicles', () => {
    expect(agenda({ vehicles: [vehicle({ stkUntil: '2027-03-01', vignetteUntil: '2026-12-31' })] })).toEqual([
      '2026-12-31 vehicle končí Diaľničná známka',
      '2027-03-01 vehicle končí STK',
    ])
    expect(agenda({ vehicles: [vehicle({ status: 'retired', stkUntil: '2027-03-01' })] })).toEqual([])
  })

  it('includes unfinished tasks with a due date, due services and purchases to make', () => {
    expect(agenda({ tasks: [task({ dueOn: '2026-10-15' }), task({ id: 't2', dueOn: '2026-10-16', status: 'done' }), task({ id: 't3' })] })).toEqual([
      '2026-10-15 task termín úlohy',
    ])
    expect(agenda({ equipment: [equipment({ serviceIntervalMonths: 12, lastServiceOn: '2026-01-15' }), equipment({ id: 'e2' })] })).toEqual([
      '2027-01-15 service pravidelný servis',
    ])
    expect(
      agenda({ shopping: [shopping({ dueOn: '2026-11-01' }), shopping({ id: 's2', dueOn: '2026-11-02', status: 'delivered' }), shopping({ id: 's3', list: 'want', dueOn: '2026-11-03' })] }),
    ).toEqual(['2026-11-01 shopping kúpiť do'])
  })

  it('sorts everything by date', () => {
    const dates = buildAgenda({ ...none, loans: [loan({})], tasks: [task({ dueOn: '2026-10-21' })] }, today).map((e) => e.date)
    expect(dates).toEqual(['2026-10-20', '2026-10-21', '2026-10-22'])
  })
})

describe('events in the agenda', () => {
  const event = (patch: object) => ({
    id: 'ev', name: 'Festival', client: '', venue: 'Amfiteáter', startsOn: '2026-11-01', endsOn: '2026-11-03', status: 'confirmed' as const,
    note: '', equipment: [], crew: [], ...patch,
  })

  it('shows live events on their first day and skips cancelled or finished ones', () => {
    expect(agenda({ events: [event({})] })).toEqual(['2026-11-01 event Amfiteáter · do 3. 11. 2026'])
    expect(agenda({ events: [event({ endsOn: '2026-11-01', venue: '' })] })).toEqual(['2026-11-01 event event'])
    expect(agenda({ events: [event({ status: 'cancelled' }), event({ id: 'x', status: 'done' })] })).toEqual([])
  })

  it('files a running multi-day event under today rather than as overdue', () => {
    expect(agenda({ events: [event({ startsOn: '2026-10-12', endsOn: '2026-10-14' })] })).toEqual([
      '2026-10-13 event prebieha · Amfiteáter · do 14. 10. 2026',
    ])
  })
})

describe('groupAgenda', () => {
  it('separates overdue entries, groups upcoming ones by day and counts what lies beyond the window', () => {
    const entries = buildAgenda(
      { ...none, tasks: [task({ dueOn: '2026-10-01' }), task({ id: 't2', dueOn: '2026-10-13' }), task({ id: 't3', dueOn: '2026-10-13' }), task({ id: 't4', dueOn: '2027-06-01' })] },
      today,
    )
    const grouped = groupAgenda(entries, today, addDays(today, 30))
    expect(grouped.overdue).toHaveLength(1)
    expect(grouped.upcoming.map((g) => [g.date, g.entries.length])).toEqual([['2026-10-13', 2]])
    expect(grouped.later).toBe(1)
  })
})

describe('addDays', () => {
  it('crosses month and year boundaries', () => {
    expect(addDays('2026-10-13', 30)).toBe('2026-11-12')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
  })
})

describe('month grid', () => {
  it('covers whole weeks from Monday', () => {
    const october = monthGridDays('2026-10')
    expect(october).toHaveLength(35)
    expect(october[0]).toBe('2026-09-28')
    expect(october.at(-1)).toBe('2026-11-01')
    // február 2027 začína v pondelok a má presne štyri týždne
    expect(monthGridDays('2027-02')).toHaveLength(28)
    expect(monthGridDays('2026-08')).toHaveLength(42)
  })

  it('moves across the year boundary', () => {
    expect(shiftMonth('2026-12', 1)).toBe('2027-01')
    expect(shiftMonth('2026-01', -1)).toBe('2025-12')
  })

  it('puts events and loans on every day they last, clipped to the range', () => {
    const festival: CompanyEvent = {
      id: 'e1', name: 'Festival', client: '', venue: 'Prešov', startsOn: '2026-09-29', endsOn: '2026-10-02', status: 'done', note: '', equipment: [], crew: [],
    }
    const days = entriesByDay(
      {
        events: [festival, { ...festival, id: 'e2', status: 'cancelled' }],
        loans: [loan({ status: 'returned', startsOn: '2026-10-02', endsOn: '2026-10-03' })],
        vehicles: [vehicle({ stkUntil: '2026-10-02' })],
        tasks: [],
        equipment: [],
        shopping: [],
      },
      today,
      '2026-10-01',
      '2026-10-31',
    )
    expect([...days.keys()].sort()).toEqual(['2026-10-01', '2026-10-02', '2026-10-03'])
    expect(days.get('2026-10-02')!.map((entry) => entry.kind)).toEqual(['event', 'loan', 'vehicle'])
    expect(days.get('2026-10-03')![0]).toMatchObject({ kind: 'loan', title: 'Klient', detail: 'Vrátené' })
  })
})
