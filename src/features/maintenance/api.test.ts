import { describe, expect, it } from 'vitest'
import { describeDue, needsAttention, type MaintenanceDue, type MaintenanceRule } from './api'

const rule = (kind: MaintenanceRule['kind']): MaintenanceRule => ({
  id: 'r',
  kind,
  name: kind === 'hours' ? 'Výbojka' : 'Revízia',
  counter: 'Výbojka',
  limitHours: 1000,
  warnPercent: 90,
  intervalMonths: 12,
  warnDays: 30,
  kinds: [],
  categoryIds: [],
  equipmentIds: [],
  createTask: false,
  note: '',
})
const due = (state: MaintenanceDue['state'], extra: Partial<MaintenanceDue> = {}): MaintenanceDue => ({ ruleId: 'r', equipmentId: 'e', unit: null, state, used: null, limitHours: 1000, lastDone: null, dueOn: null, ...extra })
const fmt = (iso: string) => iso
const num = (value: number) => String(value)

describe('maintenance texts', () => {
  it('describes hours and revisions', () => {
    expect(describeDue(due('overdue', { used: 1010 }), rule('hours'), fmt, num)).toBe('1010 / 1000 h – limit prekročený')
    expect(describeDue(due('unknown'), rule('hours'), fmt, num)).toBe('počítadlo ešte neodčítané')
    expect(describeDue(due('soon', { dueOn: '2027-01-01' }), rule('revision'), fmt, num)).toBe('revízia do 2027-01-01')
    expect(describeDue(due('failed', { lastDone: '2026-10-01' }), rule('revision'), fmt, num)).toBe('revízia 2026-10-01 nevyhovela')
  })

  it('lists what needs attention', () => {
    expect(needsAttention(due('ok'), rule('hours'))).toBe(false)
    expect(needsAttention(due('unknown'), rule('hours'))).toBe(false)
    expect(needsAttention(due('unknown'), rule('revision'))).toBe(true)
    expect(needsAttention(due('soon'), rule('hours'))).toBe(true)
    expect(needsAttention(due('overdue'), undefined)).toBe(false)
  })
})
