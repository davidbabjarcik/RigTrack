import { describe, expect, it } from 'vitest'
import { alignment, arcDelay, cardioid, delayMs, endFire, maxLineSpacing, quarterWave, round, samples, speedOfSound, straightLine, towerDelay } from './model'

describe('delay calculator', () => {
  it('uses the speed of sound for the air temperature', () => {
    expect(round(speedOfSound(20), 1)).toBe(343.4)
    expect(round(speedOfSound(0), 1)).toBe(331.3)
    expect(round(delayMs(10, 20), 2)).toBe(29.12)
    expect(samples(1)).toBe(48)
  })

  it('delays the closer source', () => {
    expect(alignment(20, 23, 20)).toEqual({ ms: delayMs(3, 20), delayed: 'a' })
    expect(alignment(23, 20, 20).delayed).toBe('b')
    expect(alignment(20, 20, 20).delayed).toBeNull()
    expect(round(towerDelay(50, 20, 10), 1)).toBe(155.6)
  })

  it('builds a cardioid with a delayed, inverted rear sub', () => {
    const subs = cardioid(1.2, 20)
    expect(subs).toHaveLength(3)
    expect(subs.slice(0, 2).every((sub) => sub.ms === 0)).toBe(true)
    expect(subs[2]).toMatchObject({ inverted: true, facingBack: true })
    expect(round(subs[2].ms, 2)).toBe(3.49)
    expect(round(quarterWave(80, 20), 2)).toBe(1.07)
    const many = cardioid(1, 20, 4, 2)
    expect(many.filter((sub) => sub.inverted)).toHaveLength(2)
    expect(many.filter((sub) => sub.inverted).every((sub) => sub.ms === many[4].ms)).toBe(true)
    // v rade: P O P a pri 4 : 2 rovnomerne P O P P O P
    expect(cardioid(1, 20, 2, 1, 'side').map((sub) => (sub.inverted ? 'O' : 'P')).join('')).toBe('POP')
    expect(cardioid(1, 20, 4, 2, 'side').map((sub) => (sub.inverted ? 'O' : 'P')).join('')).toBe('POPPOP')
  })

  it('delays end-fire rows from the back to the front', () => {
    const rows = endFire(3, 1, 20)
    expect(rows.map((row) => round(row.ms, 2))).toEqual([5.82, 2.91, 0])
    expect(rows[0].label).toContain('predný')
  })

  it('keeps a straight line without delay and warns about wide spacing', () => {
    expect(straightLine(4, 1.5).map((sub) => sub.x)).toEqual([0, 1.5, 3, 4.5])
    expect(round(maxLineSpacing(100, 20), 2)).toBe(1.72)
  })

  it('bends a straight line into an arc with delays growing to the edges', () => {
    const { radius, subs } = arcDelay(5, 1, 60, 20)
    // tetiva 4 m pri uhle 60° → polomer 4 m
    expect(round(radius, 3)).toBe(4)
    expect(subs[2].ms).toBe(0)
    expect(subs[0].ms).toBeCloseTo(subs[4].ms)
    expect(subs[0].ms).toBeGreaterThan(subs[1].ms)
    // kraj je na oblúku vzadu o R − R·cos 30°
    expect(round(subs[0].ms, 2)).toBe(round(delayMs(4 - 4 * Math.cos(Math.PI / 6), 20), 2))
  })
})

describe('sub dimensions', () => {
  it('derive spacings from the box size', async () => {
    const { cardioidSpacing, minSpacing, physicalWidth } = await import('./model')
    const box = { widthCm: 60, depthCm: 80 }
    expect(cardioidSpacing(box, 'stack')).toBe(0.8)
    expect(cardioidSpacing(box, 'side')).toBe(0.8)
    expect(cardioidSpacing(box, 'behind', 0.2)).toBeCloseTo(1.8)
    expect(minSpacing(box, 'side')).toBe(0.6)
    expect(minSpacing(box, 'row')).toBe(0.8)
    expect(physicalWidth(6, 1, box)).toBeCloseTo(5.6)
    expect(physicalWidth(6, 1, null)).toBe(5)
  })
})

describe('directional response', () => {
  it('estimates cardioid front gain and rear rejection', async () => {
    const { cardioidResponse, speedOfSound } = await import('./model')
    const d = 1
    const best = speedOfSound(20) / (4 * d)
    // 1 : 1 → dozadu úplné vyrušenie, dopredu +6 dB pri c/(4d) a ticho pri c/(2d)
    expect(cardioidResponse(1, 1, d, best, 20).rearDb).toBe(-60)
    expect(cardioidResponse(1, 1, d, best, 20).frontDb).toBeCloseTo(6.02, 1)
    expect(cardioidResponse(1, 1, d, 2 * best, 20).frontDb).toBe(-60)
    // 2 : 1 → dozadu polovica, −6 dB
    expect(cardioidResponse(2, 1, d, 60, 20).rearDb).toBeCloseTo(-6.02, 1)
  })

  it('estimates end-fire rear rejection', async () => {
    const { endFireResponse, speedOfSound } = await import('./model')
    const quarter = speedOfSound(20) / 4
    expect(endFireResponse(4, 1, quarter, 20).frontDb).toBeCloseTo(12.04, 1)
    expect(endFireResponse(4, 1, quarter, 20).rearDb).toBe(-60)
    expect(endFireResponse(3, 1, quarter, 20).rearDb).toBeCloseTo(0, 1)
  })
})
