import { describe, expect, it } from 'vitest'
import { channelLegend, clampItem, itemText, newItem, printScale } from './model'

describe('stage plán', () => {
  const plot = { widthM: 10, depthM: 6, items: [] }

  it('nová položka v strede pódia s rozmerom podľa druhu', () => {
    const item = newItem('drums', plot)
    expect([item.x, item.y, item.w, item.d, item.channel]).toEqual([5, 3, 2, 1.8, null])
  })

  it('položka ostane pri pódiu (presah max 1 m), súradnice po 5 cm', () => {
    const item = { ...newItem('mic', plot), x: 13.33, y: -4 }
    expect(clampItem(item, plot)).toMatchObject({ x: 11, y: -1 })
    expect(clampItem({ ...item, x: 2.123, y: 3.976 }, plot)).toMatchObject({ x: 2.1, y: 4 })
  })

  it('text položky: popis, inak názov kanála, inak skratka', () => {
    const names = (channel: number) => (channel === 5 ? 'Spev' : undefined)
    expect(itemText({ ...newItem('vocal', plot), channel: 5 }, names)).toEqual({ main: 'Spev', channel: 'CH 5' })
    expect(itemText({ ...newItem('vocal', plot), channel: 5, label: 'Lead' }, names).main).toBe('Lead')
    expect(itemText(newItem('wedge', plot), names)).toEqual({ main: 'MON', channel: '' })
  })

  it('mierka tlače: najbližšia pekná mierka, pri ktorej sa pódium zmestí', () => {
    // A4 na šírku 297 mm na 3508 px; 200 px na meter ≈ 16,9 mm na meter ≈ 1 : 59 → 1 : 75
    expect(printScale(200, 3508, 297).nice).toBe(75)
    expect(printScale(300, 3508, 420).nice).toBe(50)
  })

  it('legenda kanálov podľa čísla', () => {
    const items = [{ ...newItem('vocal', plot), channel: 7 }, { ...newItem('amp_guitar', plot), channel: 3 }, newItem('wedge', plot)]
    expect(channelLegend(items, (channel) => `K${channel}`).map((row) => [row.channel, row.name, row.kind])).toEqual([[3, 'K3', 'Gitarový aparát'], [7, 'K7', 'Spevák / mikrofón']])
  })
})
