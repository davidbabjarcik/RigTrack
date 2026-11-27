import { describe, expect, it } from 'vitest'
import { faceShapes } from './faces'
import { RACK_CATEGORIES } from './library'
import { ACCESSORIES } from './model'

describe('kresba panelov', () => {
  it('každá kategória a doplnok má predok aj zadok s platnými súradnicami vo vnútri slotu', () => {
    const inputs = [
      ...RACK_CATEGORIES.map((category) => ({ category: category.id, accessory: null })),
      ...ACCESSORIES.map((accessory) => ({ category: null, accessory })),
    ]
    for (const input of inputs) {
      for (const side of ['front', 'rear'] as const) {
        for (const heightU of [1, 2, 3]) {
          const shapes = faceShapes({ ...input, side, heightU, width: 'full', name: 'Ukážka' })
          expect(shapes[0]).toMatchObject({ t: 'rect', x: 0, y: 0, w: 1, h: heightU })
          for (const shape of shapes) {
            const values = Object.values(shape).filter((value) => typeof value === 'number')
            expect(values.every(Number.isFinite)).toBe(true)
            if (shape.t === 'circle') {
              expect(shape.x).toBeGreaterThanOrEqual(0)
              expect(shape.x).toBeLessThanOrEqual(1)
              expect(shape.y).toBeLessThanOrEqual(heightU)
            }
          }
        }
      }
    }
  })

  it('dvojitý a štvorkanálový prijímač kreslí toľko displejov', () => {
    const displays = (name: string) => faceShapes({ category: 'wireless', accessory: null, side: 'front', heightU: 1, width: 'full', name }).filter((shape) => shape.t === 'rect' && shape.fill === '#164e63').length
    expect(displays('Ukážka AD4Q')).toBe(4)
    expect(displays('Ukážka ULXD4D')).toBe(2)
    expect(faceShapes({ category: 'wireless', accessory: null, side: 'front', heightU: 1, width: 'half', name: 'Ukážka' }).filter((shape) => shape.t === 'rect' && shape.fill === '#164e63')).toHaveLength(1)
  })
})
