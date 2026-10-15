import { describe, expect, it } from 'vitest'
import { DEFAULT_ORDER, move, parseHidden, parseOrder, STAT_SECTIONS, STAT_WIDGETS } from './widgets'

describe('stat widgets', () => {
  it('have unique ids and belong to known sections', () => {
    expect(new Set(STAT_WIDGETS.map((widget) => widget.id)).size).toBe(STAT_WIDGETS.length)
    const sections: string[] = STAT_SECTIONS.map((section) => section.id)
    expect(STAT_WIDGETS.every((widget) => sections.includes(widget.section))).toBe(true)
  })

  it('keep only known widgets from a stored selection', () => {
    expect(parseHidden('["service.cost","gone","equipment.items"]')).toEqual(['equipment.items', 'service.cost'])
    expect(parseHidden(null)).toEqual([])
    expect(parseHidden('{"a":1}')).toEqual([])
    expect(parseHidden('not json')).toEqual([])
  })
})

describe('stats order', () => {
  it('keeps the stored order and appends what is new', () => {
    const order = parseOrder(JSON.stringify({ sections: ['vehicles', 'money', 'gone'], widgets: ['service.cost', 'equipment.items', 'service.cost'] }))
    expect(order.sections).toEqual(['vehicles', 'money', 'equipment', 'service'])
    expect(order.widgets.slice(0, 2)).toEqual(['service.cost', 'equipment.items'])
    expect(order.widgets).toHaveLength(STAT_WIDGETS.length)
    expect(parseOrder('nonsense')).toEqual(DEFAULT_ORDER)
  })

  it('moves an item among its peers only', () => {
    expect(move(['a1', 'b1', 'a2', 'a3'], 'a2', -1, (id) => id.startsWith('a'))).toEqual(['a2', 'b1', 'a1', 'a3'])
    expect(move(['a', 'b'], 'a', -1)).toEqual(['a', 'b'])
    expect(move(['a', 'b'], 'b', 1)).toEqual(['a', 'b'])
  })
})
