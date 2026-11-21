import { describe, expect, it } from 'vitest'
import { readTemplate } from './templates'

const ID = '00000000-0000-4000-8000-0000000000a1'

describe('readTemplate', () => {
  it('vynechá, čo nesedí, a obmedzí počty', () => {
    const data = readTemplate({
      kind: 'dj',
      venue: 'Ukážková sála',
      setting: 'zle',
      power: 'cee32',
      equipment: [{ equipmentId: ID, quantity: 99999, caseId: 'x' }, { equipmentId: 'zlé' }, null],
      crew: [{ memberId: null, name: 'Ukážkový technik', role: 'Zvuk' }, { memberId: 'x', name: ' ' }],
    })
    expect(data).toMatchObject({ kind: 'dj', venue: 'Ukážková sála', setting: '', power: 'cee32' })
    expect(data.equipment).toEqual([{ equipmentId: ID, quantity: 10000, caseId: null }])
    expect(data.crew).toEqual([{ memberId: null, name: 'Ukážkový technik', role: 'Zvuk' }])
  })

  it('prázdna alebo pokazená šablóna je bežný event bez ničoho', () => {
    expect(readTemplate(null)).toMatchObject({ kind: 'event', equipment: [], crew: [], venue: '' })
  })
})
