import { describe, expect, it } from 'vitest'
import { paintOrder, project, toView, type ViewBox3 } from './isometric'

const box = (a: number, b: number, z: number, la = 10, lb = 10, h = 10): ViewBox3 => ({ a, b, z, la, lb, h })

describe('toView', () => {
  const item = { x: 10, y: 20, z: 5, length: 30, width: 40, height: 50 }

  it('keeps the box inside the space after every quarter turn', () => {
    for (const turns of [0, 1, 2, 3, 4, -1]) {
      const view = toView(item, 100, 80, turns)
      const [sizeA, sizeB] = turns % 2 === 0 ? [100, 80] : [80, 100]
      expect(view.a).toBeGreaterThanOrEqual(0)
      expect(view.b).toBeGreaterThanOrEqual(0)
      expect(view.a + view.la).toBeLessThanOrEqual(sizeA)
      expect(view.b + view.lb).toBeLessThanOrEqual(sizeB)
      expect([view.z, view.h]).toEqual([5, 50])
    }
  })

  it('returns to the start after four quarter turns and mirrors after two', () => {
    expect(toView(item, 100, 80, 4)).toEqual(toView(item, 100, 80, 0))
    expect(toView(item, 100, 80, 2)).toMatchObject({ a: 60, b: 20, la: 30, lb: 40 })
  })
})

describe('paintOrder', () => {
  it('draws farther boxes first and a stacked box after the one below it', () => {
    const boxes = [box(20, 20, 0), box(0, 0, 0), box(20, 20, 10), box(0, 20, 0)]
    const order = paintOrder(boxes)
    expect(order.indexOf(1)).toBeLessThan(order.indexOf(0))
    expect(order.indexOf(3)).toBeLessThan(order.indexOf(0))
    expect(order.indexOf(0)).toBeLessThan(order.indexOf(2))
    expect([...order].sort()).toEqual([0, 1, 2, 3])
  })

  it('handles an empty list', () => {
    expect(paintOrder([])).toEqual([])
  })
})

describe('project', () => {
  it('moves nearer points down the screen and higher points up', () => {
    expect(project(10, 10, 0).y).toBeGreaterThan(project(0, 0, 0).y)
    expect(project(0, 0, 10).y).toBeLessThan(project(0, 0, 0).y)
    // os b mieri doprava, os a doľava (pohľad nie je zrkadlový)
    expect(project(0, 10, 0).x).toBeGreaterThan(project(10, 0, 0).x)
  })
})
