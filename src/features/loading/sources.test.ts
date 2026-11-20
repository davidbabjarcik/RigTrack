import { describe, expect, it } from 'vitest'
import type { Case } from '@/features/cases/model'
import { contentWeights, looseParcels, parcelOf, placementLink } from './sources'

const box = { id: 'c1', name: 'Ukážkový case', lengthCm: 60, widthCm: 40, depthCm: 50, weightKg: 12 } as Case
const items = [
  { id: 'head', name: 'Hlava', attributes: { weightKg: 20 } },
  { id: 'top', name: 'Ukážkový top', attributes: { boxWidthCm: 50, boxDepthCm: 40, boxHeightCm: 70, weightKg: 25 } },
  { id: 'cable', name: 'Kábel', attributes: {} },
]

describe('loading sources', () => {
  it('adds the gear inside a case to the empty case weight', () => {
    const contents = contentWeights([{ equipmentId: 'head', quantity: 2, caseId: 'c1' }], items)
    expect(parcelOf(box, contents.get('c1'))).toMatchObject({ weightKg: 52, length: 60, width: 40, height: 50 })
  })

  it('turns loose speakers into one parcel per piece and lists gear without a box size', () => {
    const { parcels, withoutSize } = looseParcels(
      [
        { equipmentId: 'top', quantity: 2, caseId: null },
        { equipmentId: 'cable', quantity: 5, caseId: null },
        { equipmentId: 'head', quantity: 1, caseId: 'c1' },
      ],
      items,
    )
    expect(parcels.map((parcel) => [parcel.id, parcel.name, parcel.height, parcel.weightKg])).toEqual([
      ['eq:top#1', 'Ukážkový top (1/2)', 70, 25],
      ['eq:top#2', 'Ukážkový top (2/2)', 70, 25],
    ])
    expect(withoutSize.map((item) => item.id)).toEqual(['cable'])
    expect(placementLink('eq:top#2')).toBe('/equipment/top')
    expect(placementLink('c1')).toBe('/cases/c1')
  })
})
