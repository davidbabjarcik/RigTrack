import { describe, expect, it } from 'vitest'
import { parseHidden, STAT_SECTIONS, STAT_WIDGETS } from './widgets'

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
