import { beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_PINNED, loadPinned, savePinned } from './navigation'

const KEY = 'rigtrack:pinned-nav'

describe('pinned navigation', () => {
  beforeEach(() => localStorage.clear())

  it('returns defaults when nothing is stored', () => {
    expect(loadPinned()).toEqual(DEFAULT_PINNED)
  })

  it('round-trips a valid selection', () => {
    const ids = ['cases', 'service', 'todos']
    savePinned(ids)
    expect(loadPinned()).toEqual(ids)
  })

  it.each([
    ['corrupt JSON', '{not json'],
    ['unknown module id', JSON.stringify(['equipment', 'events', 'removed-module'])],
    ['dashboard among the choices', JSON.stringify(['dashboard', 'events', 'loans'])],
    ['wrong length', JSON.stringify(['dashboard'])],
    ['duplicates', JSON.stringify(['events', 'events', 'loans'])],
    ['wrong type', JSON.stringify({ a: 1 })],
  ])('falls back to defaults on %s', (_name, stored) => {
    localStorage.setItem(KEY, stored)
    expect(loadPinned()).toEqual(DEFAULT_PINNED)
  })

  it('keeps an old four-item selection without the fixed dashboard', () => {
    localStorage.setItem(KEY, JSON.stringify(['dashboard', 'cases', 'service', 'todos']))
    expect(loadPinned()).toEqual(['cases', 'service', 'todos'])
  })

  it('refuses to save an invalid selection', () => {
    savePinned(['dashboard'])
    expect(localStorage.getItem(KEY)).toBeNull()
  })
})
