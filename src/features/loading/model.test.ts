import { describe, expect, it } from 'vitest'
import { describePlace, loadingOrder, planLoading, type CargoSpace, type Parcel, type Placement } from './model'

const van = (patch: Partial<CargoSpace> = {}): CargoSpace => ({
  id: 'van', name: 'Crafter', payloadKg: 1000, length: 300, width: 170, height: 180, obstacles: [], ...patch,
})
const box = (id: string, length: number, width: number, height: number, weightKg = 20): Parcel => ({ id, name: id, length, width, height, weightKg })

const overlap = (a: Placement, b: Placement) =>
  a.x < b.x + b.length && b.x < a.x + a.length && a.y < b.y + b.width && b.y < a.y + a.width && a.z < b.z + b.height && b.z < a.z + a.height

describe('planLoading', () => {
  it('fills the floor from the cab before stacking and never overlaps', () => {
    const plan = planLoading([van()], [box('a', 100, 80, 60), box('b', 100, 80, 60), box('c', 100, 80, 60), box('d', 100, 80, 60)])
    expect(plan.unplaced).toEqual([])
    expect(plan.loads).toHaveLength(1)
    const placed = plan.loads[0].placements
    expect(placed).toHaveLength(4)
    expect(placed.every((item) => item.z === 0)).toBe(true)
    expect(placed[0]).toMatchObject({ x: 0, y: 0, z: 0 })
    for (const a of placed) for (const b of placed) if (a !== b) expect(overlap(a, b)).toBe(false)
    expect(plan.loads[0].weightKg).toBe(80)
  })

  it('rotates a case when it only fits the other way', () => {
    const plan = planLoading([van({ length: 120, width: 60 })], [box('long', 50, 110, 40)])
    expect(plan.loads[0].placements[0]).toMatchObject({ rotated: true, length: 110, width: 50 })
  })

  it('stacks only on a single case that is not lighter', () => {
    const narrow = van({ length: 100, width: 80, height: 150 })
    const stacked = planLoading([narrow], [box('heavy', 100, 80, 60, 50), box('light', 80, 60, 50, 10)])
    expect(stacked.loads[0].placements.find((item) => item.id === 'light')).toMatchObject({ z: 60, on: 'heavy' })

    // ťažší na ľahší nejde: rovnaký pôdorys, ale ten navrchu by vážil viac
    const refused = planLoading([narrow], [box('base', 100, 80, 60, 10), box('brick', 90, 70, 50, 40)])
    expect(refused.loads[0].placements.map((item) => item.id)).toEqual(['base'])
    expect(refused.unplaced).toEqual([{ parcel: expect.objectContaining({ id: 'brick' }), reason: 'no-vehicle' }])
  })

  it('keeps wheel arches free but lets a case sit on top of one', () => {
    const arch = { label: 'podbeh', x: 0, y: 0, z: 0, length: 100, width: 30, height: 30 }
    const plan = planLoading([van({ length: 100, width: 100, height: 100, obstacles: [arch] })], [box('wide', 100, 70, 80), box('flat', 90, 25, 20, 5)])
    const [wide, flat] = ['wide', 'flat'].map((id) => plan.loads[0].placements.find((item) => item.id === id)!)
    expect(wide).toMatchObject({ x: 0, y: 30, z: 0 })
    expect(flat).toMatchObject({ z: 30, on: 'podbeh' })
  })

  it('opens another vehicle when the first is full by volume or by weight', () => {
    const small = van({ id: 'small', name: 'Caddy', length: 100, width: 100, height: 100, payloadKg: 100 })
    const byVolume = planLoading([small, van()], [box('a', 100, 100, 100, 10), box('b', 100, 100, 100, 10)])
    expect(byVolume.loads.map((load) => load.space.id)).toEqual(['small', 'van'])

    const byWeight = planLoading([small, van()], [box('a', 50, 50, 50, 80), box('b', 50, 50, 50, 80)])
    expect(byWeight.loads.map((load) => [load.space.id, load.weightKg])).toEqual([['small', 80], ['van', 80]])
  })

  it('says why a case could not be loaded', () => {
    const plan = planLoading([van({ payloadKg: 100 })], [box('huge', 400, 100, 100), box('lead', 50, 50, 50, 500), box('ok', 50, 50, 50)])
    expect(plan.unplaced.map((item) => [item.parcel.id, item.reason]).sort()).toEqual([['huge', 'too-big'], ['lead', 'too-heavy']])
    expect(planLoading([], [box('a', 10, 10, 10)]).unplaced[0].reason).toBe('too-big')
  })

  it('reports how full the vehicle is', () => {
    const plan = planLoading([van({ length: 100, width: 100, height: 100 })], [box('half', 100, 50, 100)])
    expect(plan.loads[0].volumeShare).toBeCloseTo(0.5)
  })
})

describe('loading order and place names', () => {
  it('loads from the cab backwards, bottom first', () => {
    const plan = planLoading([van({ length: 200, width: 80, height: 150 })], [box('a', 100, 80, 60, 30), box('b', 100, 80, 60, 30), box('top', 60, 60, 40, 5)])
    expect(loadingOrder(plan.loads[0].placements).map((item) => item.id)).toEqual(['a', 'top', 'b'])
  })

  it('describes the position in words', () => {
    const at = (patch: Partial<Placement>) =>
      describePlace({ id: 'x', name: 'x', weightKg: 1, rotated: false, on: null, x: 0, y: 0, z: 0, length: 50, width: 50, height: 50, ...patch }, { length: 300, width: 150 })
    expect(at({})).toBe('vpredu vľavo, na podlahe')
    expect(at({ x: 250, y: 100, on: 'Audio case' })).toBe('vzadu vpravo, na „Audio case“')
    expect(at({ x: 125, y: 50 })).toBe('v strede, na podlahe')
  })
})
