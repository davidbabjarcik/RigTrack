import { describe, expect, it } from 'vitest'
import { ampReminders, ampsText, compatibleAmps, type CatalogEntry } from './catalog'

const k2: CatalogEntry = {
  id: 'k2',
  kind: 'audio',
  manufacturer: 'L-Acoustics',
  model: 'K2',
  verified: false,
  attributes: { compatibleAmps: [{ model: 'LA12X', perOutput: 3, total: 3 }, { model: 'LA7.16', perOutput: 1, total: 4, note: 'aj LA7.16i' }, { model: 'LA4X', perOutput: 1, total: 1 }] } as CatalogEntry['attributes'],
}
const box = (model: string, quantity: number, manufacturer = 'L-Acoustics') => ({ manufacturer, model, name: model, kind: 'audio' as const, quantity })

describe('compatible amplifiers', () => {
  it('describes which amplifiers drive a box', () => {
    expect(ampsText(compatibleAmps(k2)).split(' · ')[0]).toBe('LA12X (3 na výstup, 3 na zosilňovač)')
  })

  it('warns when the event has the boxes but none of their amplifiers', () => {
    const [reminder] = ampReminders([box('K2', 4), box('LA12X', 1, 'Crown')], [k2], 'na evente')
    expect(reminder.text).toBe('Na evente je 4 × L-Acoustics K2, ale žiadny zosilňovač, ktorý ho poháňa – len L-Acoustics: LA12X, LA7.16, LA4X.')
  })

  it('warns when there are too few amplifiers and is quiet when there are enough', () => {
    expect(ampReminders([box('K2', 4), box('LA12X', 1)], [k2], 'na evente')[0].text).toContain('zvládnu najviac 3')
    // LA7.16i sa počíta ako LA7.16; 1 × LA12X (3) + 1 × LA7.16i (4) = 7 boxov
    expect(ampReminders([box('K2', 7), box('LA12X', 1), box('LA7.16i', 1)], [k2], 'na evente')).toEqual([])
  })
})

describe('catalog changes', () => {
  it('lists only changed or added technical data', async () => {
    const { catalogChanges } = await import('./catalog')
    const entry = { attributes: { audioType: 'line_array', weightKg: 56, compatibleAmps: [] } as unknown as CatalogEntry['attributes'] }
    expect(catalogChanges(entry, { audioType: 'line_array', weightKg: 56 })).toEqual({})
    expect(catalogChanges(entry, { audioType: 'line_array', weightKg: 57, rmsW: 900, purchasePrice: 100 })).toEqual({ weightKg: 57, rmsW: 900 })
  })
})
