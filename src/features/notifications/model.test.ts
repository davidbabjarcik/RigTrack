import { describe, expect, it } from 'vitest'
import type { Equipment } from '@/features/equipment/model'
import type { Loan } from '@/features/loans/model'
import type { Task } from '@/features/tasks/model'
import type { Vehicle } from '@/features/vehicles/model'
import { buildNotifications, type NotificationSources } from './model'

const today = '2026-10-13'
const me = 'user-me'

const equipment = (patch: Partial<Equipment>): Equipment => ({
  id: 'e1', name: 'Hazer', kind: 'general', attributes: {}, categoryId: null, locationId: null, caseId: null, labelRole: null,
  minQuantity: null, trackUnits: false, unitIds: [], rentalPrice: null, quantity: 1, manufacturer: '', model: '', serialNumber: '', inventoryNumber: '', macAddress: '', ipAddress: '',
  serviceIntervalMonths: null, lastServiceOn: null, hoursIntervalMonths: null, operatingHours: null, hoursReadOn: null, photoPath: '', status: 'available', note: '', updatedAt: '', ...patch,
})
const loan = (patch: Partial<Loan>): Loan => ({
  id: 'l1', borrower: 'Klient', contact: '', borrowerIco: '', borrowerAddress: '', billedDays: null, price: null, deposit: null, startsOn: '2026-10-01', endsOn: '2026-10-05', status: 'issued', note: '',
  issuedAt: null, returnedAt: null, issuedByName: '', returnedByName: '', items: [], ...patch,
})
const task = (patch: Partial<Task>): Task => ({
  id: 't1', title: 'Inventúra', note: '', assigneeId: me, priority: 'normal', dueOn: '2026-10-01', status: 'open', createdBy: null, ...patch,
})
const vehicle = (patch: Partial<Vehicle>): Vehicle => ({
  id: 'v1', plate: 'SP123AB', model: '', vin: '', status: 'active', driver: '', odometerKm: null, photoPath: '', payloadKg: null, cargoLengthCm: null, cargoWidthCm: null, cargoHeightCm: null, cargoObstacles: [], technicianId: null, note: '',
  stkUntil: null, ekUntil: null, vignetteUntil: null, pzpUntil: null, cascoUntil: null, leasingUntil: null, ...patch,
})
const none: NotificationSources = { equipment: [], loans: [], tasks: [], vehicles: [], invitations: [] }
const notify = (patch: Partial<NotificationSources>) =>
  buildNotifications({ ...none, ...patch }, today, me).map((n) => `${n.severity}: ${n.title} — ${n.detail}`)

describe('buildNotifications', () => {
  it('is empty when nothing needs attention', () => {
    expect(notify({ equipment: [equipment({})], loans: [loan({ status: 'returned' })], vehicles: [vehicle({ stkUntil: '2027-06-01' })] })).toEqual([])
  })

  it('flags overdue loans as urgent and waiting reservations as upcoming', () => {
    expect(notify({ loans: [loan({ id: 'a', status: 'reserved', startsOn: '2026-10-13', endsOn: '2026-10-15' }), loan({})] })).toEqual([
      'urgent: Klient — nevrátená technika po termíne',
      'soon: Klient — rezervácia čaká na vydanie',
    ])
  })

  it('reports vehicle deadlines, due services and low stock', () => {
    expect(notify({ vehicles: [vehicle({ stkUntil: '2026-10-01', vignetteUntil: '2026-10-20' })] })).toEqual([
      'urgent: SP123AB — STK — po termíne 12 dní',
      'soon: SP123AB — Diaľničná známka — o 7 dní',
    ])
    expect(
      notify({
        equipment: [
          equipment({ serviceIntervalMonths: 12, lastServiceOn: '2025-10-01' }),
          equipment({ id: 'f', name: 'Kvapalina', kind: 'consumable', quantity: 0, minQuantity: 1 }),
          equipment({ id: 'old', status: 'retired', serviceIntervalMonths: 1, lastServiceOn: '2020-01-01' }),
        ],
      }),
    ).toEqual(['urgent: Hazer — servis po termíne', 'urgent: Kvapalina — došlo, treba kúpiť'])
  })

  it('reminds to read operating hours when the interval has passed or nothing was read yet', () => {
    expect(
      notify({
        equipment: [
          equipment({ id: 'a', name: 'Hlava', hoursIntervalMonths: 3, hoursReadOn: '2026-06-01' }),
          equipment({ id: 'b', name: 'Zosilňovač', hoursIntervalMonths: 6 }),
          equipment({ id: 'c', name: 'Čerstvo odčítané', hoursIntervalMonths: 6, hoursReadOn: '2026-10-01' }),
        ],
      }),
    ).toEqual(['urgent: Hlava — treba odčítať prevádzkové hodiny', 'urgent: Zosilňovač — prevádzkové hodiny ešte neboli odčítané'])
  })

  it('mentions only my own overdue tasks and my pending invitations', () => {
    expect(
      notify({
        tasks: [task({}), task({ id: 't2', assigneeId: 'someone-else' }), task({ id: 't3', status: 'done' }), task({ id: 't4', dueOn: '2026-12-01' })],
        invitations: [{ id: 'i1', companyName: 'Iná firma' }],
      }),
    ).toEqual(['urgent: Inventúra — vaša úloha je po termíne', 'soon: Iná firma — pozvánka do firmy'])
  })
})
