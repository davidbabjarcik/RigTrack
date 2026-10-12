import { describe, expect, it } from 'vitest'
import { describeChanges, entryLink } from './model'

describe('describeChanges', () => {
  it('translates known columns and keeps unknown ones as they are', () => {
    expect(describeChanges(['status', 'case_id', 'attributes'])).toBe('stav, case, attributes')
    expect(describeChanges([])).toBe('')
  })
})

describe('entryLink', () => {
  it('links to records that still exist', () => {
    expect(entryLink({ action: 'update', entity: 'equipment', entityId: 'abc' })).toBe('/equipment/abc')
    expect(entryLink({ action: 'insert', entity: 'service_records', entityId: 'r1' })).toBe('/service/r1')
  })

  it('has no link for deleted records, unknown tables or missing ids', () => {
    expect(entryLink({ action: 'delete', entity: 'equipment', entityId: 'abc' })).toBeNull()
    expect(entryLink({ action: 'update', entity: 'mystery', entityId: 'abc' })).toBeNull()
    expect(entryLink({ action: 'update', entity: 'equipment', entityId: null })).toBeNull()
  })
})
