import { describe, expect, it } from 'vitest'
import { filterCases, needsCheck, NO_CASE_FILTER, type Case } from './model'

const NOW = Date.parse('2026-10-19T12:00:00Z')
const daysAgo = (days: number) => new Date(NOW - days * 86_400_000).toISOString()

const box = (patch: Partial<Case>): Case => ({
  id: patch.id ?? 'x',
  name: patch.name ?? 'Case',
  inventoryNumber: '',
  locationId: null,
  labelNumber: '',
  labelCategory: '',
  labelTitle: '',
  labelPhotoPath: '',
  weightKg: null,
  widthCm: null,
  lengthCm: null,
  depthCm: null,
  spotId: null,
  spotLevel: null,
  note: '',
  updatedAt: '',
  lastCheck: null,
  photoPath: '',
  ownerStaffId: null,
  checkPriority: 'normal',
  ...patch,
})

const cases = [
  box({ id: 'mics', name: 'Mikrofóny', checkPriority: 'high', lastCheck: { checkedAt: daysAgo(20), checkedByName: 'A', note: '' } }),
  box({ id: 'cables', name: 'Káble', checkPriority: 'low', lastCheck: { checkedAt: daysAgo(100), checkedByName: 'A', note: '' } }),
  box({ id: 'new', name: 'Nový rack', ownerStaffId: 's1' }),
]

describe('needsCheck', () => {
  it('depends on the priority', () => {
    expect(needsCheck(cases[0], NOW)).toBe(true) // vysoká: 14 dní
    expect(needsCheck(cases[1], NOW)).toBe(false) // nízka: 180 dní
    expect(needsCheck(cases[2], NOW)).toBe(true) // nikdy
  })
})

describe('filterCases', () => {
  const pieces = new Map([['mics', 12], ['cables', 40]])
  it('filters by check state, owner and content', () => {
    expect(filterCases(cases, { ...NO_CASE_FILTER, check: 'due' }, pieces, NOW).map((c) => c.id)).toEqual(['mics', 'new'])
    expect(filterCases(cases, { ...NO_CASE_FILTER, check: 'never' }, pieces, NOW).map((c) => c.id)).toEqual(['new'])
    expect(filterCases(cases, { ...NO_CASE_FILTER, owner: 'company' }, pieces, NOW).map((c) => c.id)).toEqual(['mics', 'cables'])
    expect(filterCases(cases, { ...NO_CASE_FILTER, content: 'empty' }, pieces, NOW).map((c) => c.id)).toEqual(['new'])
    expect(filterCases(cases, { ...NO_CASE_FILTER, search: 'kable' }, pieces, NOW).map((c) => c.id)).toEqual(['cables'])
  })

  it('sorts by priority and by the oldest check', () => {
    expect(filterCases(cases, { ...NO_CASE_FILTER, sort: 'priority' }, pieces, NOW).map((c) => c.id)).toEqual(['mics', 'new', 'cables'])
    expect(filterCases(cases, { ...NO_CASE_FILTER, sort: 'lastCheck' }, pieces, NOW).map((c) => c.id)).toEqual(['new', 'cables', 'mics'])
    expect(filterCases(cases, { ...NO_CASE_FILTER, sort: 'pieces' }, pieces, NOW)[0].id).toBe('cables')
  })
})
