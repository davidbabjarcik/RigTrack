import { describe, expect, it } from 'vitest'
import { AUDIT_EXPORT_COLUMNS, auditExportRow, describeChanges, entryLink } from './model'

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

describe('audit export', () => {
  it('turns an entry into a readable row', () => {
    const row = auditExportRow(
      { id: 1, actorName: 'Jana', action: 'update', entity: 'equipment', entityId: 'e1', label: 'Sharpy', changed: ['status', 'quantity'], createdAt: '2026-10-15T10:00:00Z' },
      () => '15. 10. 2026 12:00',
    )
    expect(row).toEqual(['15. 10. 2026 12:00', 'Jana', 'upravil(a)', 'techniku', 'Sharpy', 'stav, počet kusov', 'e1'])
    expect(row.length).toBe(AUDIT_EXPORT_COLUMNS.length)
  })
})
