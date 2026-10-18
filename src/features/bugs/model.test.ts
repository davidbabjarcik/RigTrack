import { describe, expect, it } from 'vitest'
import { bugSchema, openReports, sortReports, type BugReport } from './model'

const report = (patch: Partial<BugReport>): BugReport => ({
  id: 'r', companyId: 'c', reporterId: 'u1', reporterName: '', title: 'x', description: '', pageUrl: '', appVersion: '', userAgent: '',
  screenshotPath: '', status: 'new', response: '', notifiedAt: null, createdAt: '2026-10-18T10:00:00Z', ...patch,
})

describe('bug reports', () => {
  it('sort open reports first, newest first', () => {
    const sorted = sortReports([
      report({ id: 'done', status: 'resolved', createdAt: '2026-10-18T12:00:00Z' }),
      report({ id: 'old-new', createdAt: '2026-10-10T10:00:00Z' }),
      report({ id: 'working', status: 'in_progress' }),
      report({ id: 'new', createdAt: '2026-10-17T10:00:00Z' }),
    ])
    expect(sorted.map((item) => item.id)).toEqual(['new', 'old-new', 'working', 'done'])
  })

  it('count new reports from other people', () => {
    expect(openReports([report({ id: 'a' }), report({ id: 'b', reporterId: 'me' }), report({ id: 'c', status: 'resolved' })], 'me').map((item) => item.id)).toEqual(['a'])
  })

  it('need a title', () => {
    expect(bugSchema.safeParse({ title: ' ', description: '', pageUrl: '' }).success).toBe(false)
    expect(bugSchema.safeParse({ title: 'Nejde tlač', description: '', pageUrl: '/events/1' }).success).toBe(true)
  })
})
