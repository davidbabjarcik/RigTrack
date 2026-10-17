import { describe, expect, it } from 'vitest'
import type { Equipment } from '@/features/equipment/model'
import { describePackage, packageAdditions, readItems } from './model'

const item = (id: string, patch: Partial<Equipment> = {}) => ({ id, name: id, status: 'available', ...patch }) as Equipment
const equipment = [item('Reprobox'), item('NL4'), item('Starý', { status: 'retired' })]
const cases = [{ id: 'c1', name: 'Audio case' }]

describe('packages', () => {
  it('adds what still exists, merges duplicates and counts what is gone', () => {
    const pkg = {
      items: [
        { equipmentId: 'Reprobox', quantity: 2 },
        { equipmentId: 'NL4', quantity: 4 },
        { equipmentId: 'Reprobox', quantity: 2 },
        { equipmentId: 'Starý', quantity: 1 },
        { equipmentId: 'zmazaný', quantity: 1 },
      ],
      cases: ['c1', 'c1', 'gone'],
    }
    expect(packageAdditions(pkg, equipment, cases)).toEqual({
      items: [
        { equipmentId: 'Reprobox', quantity: 4 },
        { equipmentId: 'NL4', quantity: 4 },
      ],
      cases: ['c1'],
      skipped: 3,
    })
  })

  it('describes the content in one line', () => {
    expect(describePackage({ items: [{ equipmentId: 'Reprobox', quantity: 4 }, { equipmentId: 'NL4', quantity: 1 }], cases: ['c1'] }, equipment, cases)).toBe(
      'Audio case · 4× Reprobox · NL4',
    )
  })

  it('drops broken stored items', () => {
    expect(readItems([{ equipmentId: 'a', quantity: 2 }, { equipmentId: '', quantity: 1 }, 'x'])).toEqual([{ equipmentId: 'a', quantity: 2 }])
  })
})
