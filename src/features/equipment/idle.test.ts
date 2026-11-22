import { describe, expect, it } from 'vitest'
import { idleEquipment } from './idle'

const item = (id: string, extra: object = {}) => ({ id, name: `Ukážka ${id}`, kind: 'audio' as const, status: 'available' as const, quantity: 1, purchasedOn: null, attributes: {}, ...extra })
const event = (startsOn: string, endsOn: string, ids: string[], status = 'done') => ({ startsOn, endsOn, status, equipment: ids.map((equipmentId) => ({ equipmentId, quantity: 1, caseId: null })) }) as never

describe('idleEquipment', () => {
  it('bez eventu a výpožičky za rok, najdrahšie hore, s posledným použitím', () => {
    const items = [
      item('a', { attributes: { purchasePrice: 100 } }),
      item('b', { attributes: { purchasePrice: 900 } }),
      item('c'),
      item('d', { purchasedOn: '2026-06-01' }),
      item('e', { kind: 'consumable' }),
      item('f', { status: 'sold' }),
    ]
    const events = [event('2026-05-01', '2026-05-02', ['a']), event('2025-03-01', '2025-03-01', ['b']), event('2026-01-10', '2026-01-10', ['c'], 'cancelled')]
    const loans = [{ startsOn: '2027-01-01', endsOn: '2027-01-05', status: 'reserved', items: [{ equipmentId: 'c', quantity: 1 }] }] as never
    const idle = idleEquipment(items as never, events, loans, '2026-11-22')
    expect(idle.map((row) => [row.id, row.value, row.lastUsed])).toEqual([
      ['b', 900, '2025-03-01'],
      ['c', null, null],
    ])
  })
})
