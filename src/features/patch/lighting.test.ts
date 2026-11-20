import { describe, expect, it } from 'vitest'
import type { Equipment } from '@/features/equipment/model'
import { lightSheets } from './lighting'

const light = (id: string, attributes: Equipment['attributes']) => ({ id, name: `Svetlo ${id}`, manufacturer: '', model: '', attributes }) as Equipment
const spot = light('spot', { dmxModes: [{ name: 'Basic', channels: 6 }, { name: 'Extended', channels: 12 }], gobos: [{ name: 'Hviezda', dmx: '20' }] })
const par = light('par', {})

describe('lightSheets', () => {
  it('groups patched lights by mode with their addresses and skips lights with nothing to show', () => {
    const patch = [
      { id: '1', universe: '1', address: 1, channels: 12, name: '', equipmentId: 'spot', unit: 1, mode: 'Extended', note: '' },
      { id: '2', universe: '1', address: 13, channels: 12, name: '', equipmentId: 'spot', unit: 2, mode: 'extended', note: '' },
      { id: '3', universe: '1', address: 25, channels: 4, name: '', equipmentId: 'par', unit: null, mode: '', note: '' },
    ]
    const sheets = lightSheets(patch, [], [spot, par])
    expect(sheets.map((sheet) => [sheet.item.id, sheet.mode?.name, sheet.addresses])).toEqual([['spot', 'Extended', ['1.001', '1.013']]])
  })

  it('falls back to the event gear when there is no patch', () => {
    expect(lightSheets([], [{ equipmentId: 'spot', quantity: 4, caseId: null }], [spot, par]).map((sheet) => [sheet.item.id, sheet.mode?.name])).toEqual([['spot', 'Basic']])
  })
})
