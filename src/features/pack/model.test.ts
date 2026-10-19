import { describe, expect, it } from 'vitest'
import type { Case } from '@/features/cases/model'
import type { Equipment } from '@/features/equipment/model'
import type { PackCheck } from './api'
import { checkOf, packProgress, packRows } from './model'

const equipment = [
  { id: 'sm58', name: 'Shure SM58', manufacturer: 'Shure', inventoryNumber: '' },
  { id: 'cable', name: 'XLR kábel 10 m', manufacturer: '', inventoryNumber: '' },
  { id: 'spiider', name: 'Robe Spiider', manufacturer: 'Robe', inventoryNumber: 'L-12' },
] as Equipment[]
const cases = [{ id: 'mics', name: 'Mikrofóny', inventoryNumber: 'C-1' }] as Case[]

describe('pack list', () => {
  it('lists cases first and loose equipment after', () => {
    const rows = packRows(
      [
        { equipmentId: 'sm58', quantity: 4, caseId: 'mics' },
        { equipmentId: 'cable', quantity: 10, caseId: null },
        { equipmentId: 'spiider', quantity: 1, caseId: null },
      ],
      equipment,
      cases,
    )
    expect(rows.map((row) => [row.name, row.quantity, row.detail])).toEqual([
      ['Mikrofóny', 1, '4 ks techniky · C-1'],
      ['Robe Spiider', 1, 'Robe · inv. L-12'],
      ['XLR kábel 10 m', 10, ''],
    ])
    const checks = [{ id: 'x', equipmentId: null, caseId: 'mics', phase: 'out', checkedByName: 'Jano', checkedAt: '' }] as PackCheck[]
    expect(checkOf(rows[0], checks, 'out')?.checkedByName).toBe('Jano')
    expect(checkOf(rows[0], checks, 'back')).toBeUndefined()
    expect(packProgress(rows, checks, 'out')).toEqual({ done: 1, total: 3 })
  })
})
