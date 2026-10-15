import { describe, expect, it } from 'vitest'
import { EMPTY_EVENT_DETAILS, type CompanyEvent } from '@/features/events/model'
import type { Loan } from '@/features/loans/model'
import { unitSummaries, usageHistory } from './model'

const loan = (patch: Partial<Loan>): Loan => ({
  id: 'l1', borrower: 'Klient', contact: '', borrowerIco: '', borrowerAddress: '', billedDays: null, price: null, deposit: null, startsOn: '2026-09-01', endsOn: '2026-09-02', status: 'returned', note: '',
  issuedAt: null, returnedAt: null, issuedByName: '', returnedByName: '', items: [{ equipmentId: 'di', quantity: 2, damaged: false, caseId: null, unitNumbers: [], damagedUnits: [], damagedQuantity: 0, unitPrice: null }], ...patch,
})
const event = (patch: Partial<CompanyEvent>): CompanyEvent => ({
  id: 'e1', name: 'Festival', client: '', venue: '', startsOn: '2026-10-01', endsOn: '2026-10-03', status: 'done', note: '',
  equipment: [{ equipmentId: 'di', quantity: 1, caseId: null }], crew: [], ...EMPTY_EVENT_DETAILS, ...patch,
})

describe('usageHistory', () => {
  it('lists loans and events of the equipment from the newest and skips cancelled events', () => {
    const entries = usageHistory(
      [loan({}), loan({ id: 'l2', items: [{ equipmentId: 'amp', quantity: 1, damaged: false, caseId: null, unitNumbers: [], damagedUnits: [], damagedQuantity: 0, unitPrice: null }] })],
      [event({}), event({ id: 'e2', status: 'cancelled', startsOn: '2026-11-01' })],
      ['di'],
    )
    expect(entries.map((entry) => [entry.kind, entry.id, entry.quantity])).toEqual([
      ['event', 'e1', 1],
      ['loan', 'l1', 2],
    ])
    expect(entries[1]).toMatchObject({ title: 'Klient', status: 'Vrátené', to: '/loans/l1' })
  })

  it('counts a loan of the whole case even after its content changed', () => {
    const whole = loan({ items: [{ equipmentId: 'gone', quantity: 3, damaged: false, caseId: 'case-1', unitNumbers: [], damagedUnits: [], damagedQuantity: 0, unitPrice: null }] })
    expect(usageHistory([whole], [], ['di'], 'case-1').map((entry) => entry.quantity)).toEqual([3])
    expect(usageHistory([whole], [], ['di'])).toEqual([])
  })
})

describe('unitSummaries', () => {
  const item = (unitNumbers: number[]) => ({ equipmentId: 'light', quantity: unitNumbers.length, damaged: false, caseId: null, unitNumbers, damagedUnits: [], damagedQuantity: 0, unitPrice: null })

  it('tells where each numbered piece is and what it has been through', () => {
    const units = unitSummaries(
      'light',
      [1, 2, 3, 4],
      [
        loan({ id: 'old', borrower: 'Starý klient', startsOn: '2026-08-01', endsOn: '2026-08-02', items: [item([1, 2])] }),
        loan({ id: 'out', borrower: 'Klub', status: 'issued', startsOn: '2026-10-10', endsOn: '2026-10-20', items: [item([2])] }),
        loan({ id: 'next', borrower: 'Festival', status: 'reserved', startsOn: '2026-11-01', endsOn: '2026-11-02', items: [item([3])] }),
      ],
      [
        { id: 's1', equipmentId: 'light', unitNumbers: [1], status: 'open' },
        { id: 's2', equipmentId: 'light', unitNumbers: [1, 4], status: 'done' },
        { id: 's3', equipmentId: 'other', unitNumbers: [4], status: 'open' },
      ],
      '2026-10-13',
    )
    expect(units.map((unit) => unit.state)).toEqual(['service', 'loaned', 'reserved', 'free'])
    expect(units[0]).toMatchObject({ serviceCount: 2, loanCount: 1, current: { to: '/service/s1' }, lastLoan: { id: 'old' } })
    expect(units[1]).toMatchObject({ loanCount: 2, current: { label: 'u: Klub', to: '/loans/out' } })
    expect(units[2].current).toEqual({ label: 'pre: Festival', to: '/loans/next' })
    expect(units[3]).toMatchObject({ serviceCount: 1, loanCount: 0, current: null, lastLoan: null })
  })
})
