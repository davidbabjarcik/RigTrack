import { describe, expect, it } from 'vitest'
import { responsibilitiesFor, type Responsibility } from './api'

const base: Responsibility = { id: '', name: '', kinds: [], caseIds: [], memberIds: [], hoursEveryDays: null, checkEveryDays: null, note: '' }

describe('responsibilities', () => {
  it('matches a case by id or by the kinds of equipment inside', () => {
    const list = [
      { ...base, id: 'lights', kinds: ['light'] },
      { ...base, id: 'led', caseIds: ['c1'] },
      { ...base, id: 'sound', kinds: ['audio'] },
    ]
    expect(responsibilitiesFor(list, { caseId: 'c1', kinds: ['light'] }).map((item) => item.id)).toEqual(['lights', 'led'])
    expect(responsibilitiesFor(list, { kinds: ['audio'] }).map((item) => item.id)).toEqual(['sound'])
    expect(responsibilitiesFor(list, { caseId: 'c9' })).toEqual([])
  })
})
