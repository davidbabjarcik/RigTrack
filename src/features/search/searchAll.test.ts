import { describe, expect, it } from 'vitest'
import { searchAll, type SearchSources } from './searchAll'

const gear = (id: string, name: string, extra: Partial<NonNullable<SearchSources['equipment']>[number]> = {}) => ({
  id,
  name,
  manufacturer: '',
  model: '',
  serialNumber: '',
  inventoryNumber: '',
  caseId: null,
  quantity: 1,
  trackUnits: false,
  unitIds: [],
  ...extra,
})

const sources: SearchSources = {
  equipment: [gear('b1', 'Beam 7R', { caseId: 'c3', quantity: 2, trackUnits: true, unitIds: [5, 6] }), gear('m1', 'Shure SM58', { quantity: 12, inventoryNumber: 'MIC-1' })],
  cases: [{ id: 'c3', name: 'Beam Case', labelNumber: '3', inventoryNumber: '', title: 'Beam Case #3' }],
  events: [
    { id: 'e1', name: 'Ples v Kúpeľoch', venue: 'Dom kultúry', startsOn: '2026-11-20', status: 'confirmed' },
    { id: 'e2', name: 'Zrušený ples', venue: '', startsOn: '2026-11-21', status: 'cancelled' },
  ],
  partners: [{ id: 'p1', name: 'Ukážková agentúra', legalName: 'Ukážková agentúra s.r.o.', ico: '12345678', contacts: [{ id: 'k1', name: 'Jana Nová', role: 'produkcia', phone: '0900 000 000', email: 'jana@example.com' }] }],
  tasks: [{ id: 't1', title: 'Vymeniť lampu v beame', note: '', status: 'open' }],
  notes: [{ id: 'n1', title: '', body: 'Kódy k bráne\n1234' }],
  spots: [
    { id: 's1', name: 'Regál A', kind: 'rack' },
    { id: 's2', name: 'Stĺp', kind: 'column' },
  ],
  caseName: (id) => (id === 'c3' ? 'Beam Case #3' : ''),
}

const kinds = (query: string) => searchAll(query, sources).map((group) => [group.kind, group.hits.map((hit) => hit.id)])

describe('searchAll', () => {
  it('finds across modules without diacritics and needs every word', () => {
    expect(kinds('beam')).toEqual([
      ['equipment', ['b1']],
      ['cases', ['c3']],
      ['tasks', ['t1']],
    ])
    expect(kinds('beam case 3')).toEqual([['cases', ['c3']]])
    expect(kinds('kupel')).toEqual([['events', ['e1']]])
    expect(kinds('jana')).toEqual([['contacts', ['k1']]])
    expect(kinds('12345678')).toEqual([['partners', ['p1']]])
    expect(kinds('brane')).toEqual([['notes', ['n1']]])
  })

  it('finds a unit number and shows where it lies', () => {
    const [group] = searchAll('#6', sources)
    expect(group.hits).toEqual([{ id: 'b1#6', title: 'Beam 7R #6', detail: 'v Beam Case #3', to: '/equipment/b1?unit=6' }])
    expect(searchAll('#9', sources)).toEqual([])
  })

  it('skips cancelled events, building elements and too short queries', () => {
    expect(kinds('zruseny')).toEqual([])
    expect(kinds('stlp')).toEqual([])
    expect(kinds('r')).toEqual([])
    expect(kinds('regal')).toEqual([['spots', ['s1']]])
  })
})
