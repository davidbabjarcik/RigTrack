import { describe, expect, it } from 'vitest'
import { cableNeeds } from './cables'
import { cablePieces, distance, project, routeLength, scaleBar, unproject } from './geo'

describe('site plán – mapa a dĺžky', () => {
  it('projekcia tam a späť', () => {
    const point = { lat: 48.1486, lon: 17.1077 }
    const back = unproject(project(point, 17), 17)
    expect(back.lat).toBeCloseTo(point.lat, 6)
    expect(back.lon).toBeCloseTo(point.lon, 6)
    expect(project({ lat: 0, lon: 0 }, 0)).toEqual({ x: 128, y: 128 })
  })

  it('vzdialenosť po zemi a dĺžka trasy s rezervou', () => {
    // 0,001° zemepisnej šírky ≈ 111,2 m
    expect(Math.round(distance({ lat: 48, lon: 17 }, { lat: 48.001, lon: 17 }))).toBe(111)
    expect(routeLength([[48, 17], [48.001, 17], [48.002, 17]], 10)).toEqual({ measured: 222, withSlack: 245 })
    expect(routeLength([[48, 17]], 10)).toEqual({ measured: 0, withSlack: 0 })
  })

  it('kusy kábla a súčty podľa kábla', () => {
    expect(cablePieces(245, 50)).toBe(5)
    expect(cablePieces(10, 50)).toBe(1)
    expect(cablePieces(10, undefined)).toBeNull()
    const route = (id: string, equipment: string | null, points: [number, number][]) => ({ id, kind: 'power' as const, label: '', equipment_id: equipment, slack_pct: 0, points })
    const cables = [{ id: 'c50', name: 'Ukážkový kábel 50 m', quantity: 10, attributes: { lengthM: 50 } }]
    const needs = cableNeeds([route('a', 'c50', [[48, 17], [48.001, 17]]), route('b', 'c50', [[48, 17], [48.0002, 17]]), route('c', null, [[48, 17], [48.001, 17]])], cables)
    expect(needs.rows.map((row) => row.pieces)).toEqual([3, 1, null])
    expect([...needs.totals]).toEqual([['c50', 4]])
    expect(needs.meters).toBe(112 + 23 + 112)
  })

  it('mierka', () => {
    const bar = scaleBar(48, 17, 120)
    expect(bar.meters).toBe(50)
    expect(bar.px).toBeGreaterThan(50)
  })
})
