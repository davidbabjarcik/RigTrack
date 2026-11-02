import { describe, expect, it } from 'vitest'
import { describeError, shouldIgnore } from '@/lib/errorReporting'
import { groupAppErrors, type AppError } from './appErrors'

const row = (patch: Partial<AppError>): AppError => ({
  id: 'x',
  fingerprint: 'f1',
  userEmail: 'a@example.com',
  companyId: null,
  source: 'render',
  message: 'TypeError: x',
  stack: '',
  pageUrl: '/warehouse',
  appVersion: '6.2',
  userAgent: '',
  count: 1,
  firstAt: '2026-11-01T10:00:00Z',
  lastAt: '2026-11-01T10:00:00Z',
  resolvedAt: null,
  ...patch,
})

describe('groupAppErrors', () => {
  it('merges the same error across people and keeps open ones on top', () => {
    const groups = groupAppErrors([
      row({ id: '1', count: 3 }),
      row({ id: '2', userEmail: 'b@example.com', appVersion: '6.1', pageUrl: '/checks', lastAt: '2026-11-02T08:00:00Z' }),
      row({ id: '3', fingerprint: 'f2', message: 'Old', resolvedAt: '2026-11-02T09:00:00Z', lastAt: '2026-11-02T09:00:00Z' }),
      row({ id: '4', fingerprint: 'f3', message: 'Newer', lastAt: '2026-11-02T12:00:00Z' }),
    ])
    expect(groups.map((g) => g.message)).toEqual(['Newer', 'TypeError: x', 'Old'])
    expect(groups[1]).toMatchObject({ total: 4, users: ['a@example.com', 'b@example.com'], versions: ['6.2', '6.1'], pages: ['/warehouse', '/checks'], ids: ['1', '2'] })
    expect(groups[2].resolved).toBe(true)
  })
})

describe('describeError', () => {
  it('reads errors, strings and odd values', () => {
    expect(describeError(new TypeError('boom')).message).toBe('TypeError: boom')
    expect(describeError('text')).toEqual({ message: 'text', stack: '' })
    expect(describeError({ message: 'db down' }).message).toBe('db down')
    expect(describeError(42).message).toBe('42')
  })

  it('skips browser noise', () => {
    expect(shouldIgnore('ResizeObserver loop completed with undelivered notifications.')).toBe(true)
    expect(shouldIgnore('TypeError: x is undefined')).toBe(false)
  })
})
