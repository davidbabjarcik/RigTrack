import { describe, expect, it } from 'vitest'
import { describeDays, fuelConsumption, totalCost, upcomingDeadlines, vehicleDeadlines, type Vehicle } from './model'

const today = '2026-10-13'

const vehicle = (patch: Partial<Vehicle>): Vehicle => ({
  id: '1',
  plate: 'SP123AB',
  model: 'VW Crafter',
  vin: '',
  status: 'active',
  driver: '',
  odometerKm: null,
  note: '',
  stkUntil: null,
  ekUntil: null,
  vignetteUntil: null,
  pzpUntil: null,
  cascoUntil: null,
  leasingUntil: null,
  ...patch,
})

describe('vehicleDeadlines', () => {
  it('skips empty dates and sorts the rest, nearest first', () => {
    const deadlines = vehicleDeadlines(vehicle({ stkUntil: '2027-03-01', vignetteUntil: '2026-10-20', pzpUntil: '2026-10-01' }), today)
    expect(deadlines.map((d) => [d.label, d.state, d.days])).toEqual([
      ['PZP', 'expired', -12],
      ['Diaľničná známka', 'soon', 7],
      ['STK', 'ok', 139],
    ])
  })

  it('treats today and the 30th day as due soon, the 31st as fine', () => {
    const state = (date: string) => vehicleDeadlines(vehicle({ stkUntil: date }), today)[0].state
    expect(state('2026-10-13')).toBe('soon')
    expect(state('2026-11-12')).toBe('soon')
    expect(state('2026-11-13')).toBe('ok')
    expect(state('2026-10-12')).toBe('expired')
  })
})

describe('upcomingDeadlines', () => {
  it('lists expired and soon-due deadlines across vehicles, ignoring retired ones', () => {
    const list = upcomingDeadlines(
      [
        vehicle({ id: 'a', plate: 'A', stkUntil: '2026-10-25', ekUntil: '2027-10-25' }),
        vehicle({ id: 'b', plate: 'B', vignetteUntil: '2026-09-30' }),
        vehicle({ id: 'c', plate: 'C', status: 'retired', stkUntil: '2026-01-01' }),
      ],
      today,
    )
    expect(list.map((item) => [item.vehicle.plate, item.deadline.label])).toEqual([
      ['B', 'Diaľničná známka'],
      ['A', 'STK'],
    ])
  })
})

describe('describeDays', () => {
  it('uses Slovak plural forms', () => {
    expect(describeDays(0)).toBe('dnes')
    expect(describeDays(1)).toBe('o 1 deň')
    expect(describeDays(3)).toBe('o 3 dni')
    expect(describeDays(12)).toBe('o 12 dní')
    expect(describeDays(-1)).toBe('po termíne 1 deň')
    expect(describeDays(-5)).toBe('po termíne 5 dní')
  })
})

describe('running costs', () => {
  const fuel = (odometerKm: number | null, liters: number | null) => ({ kind: 'fuel' as const, odometerKm, liters })

  it('computes average consumption from fill-ups with odometer readings', () => {
    // 1000 km na 40 + 45 litrov = 8,5 l/100 km; prvé tankovanie je len východisko
    expect(fuelConsumption([fuel(100000, 60), fuel(100500, 40), fuel(101000, 45)])).toBe(8.5)
  })

  it('needs at least two usable fill-ups', () => {
    expect(fuelConsumption([fuel(100000, 60)])).toBeNull()
    expect(fuelConsumption([fuel(100000, 60), fuel(null, 40)])).toBeNull()
    expect(fuelConsumption([{ kind: 'service', odometerKm: 1, liters: 1 }, { kind: 'service', odometerKm: 2, liters: 1 }])).toBeNull()
  })

  it('sums costs, skipping records without one', () => {
    expect(totalCost([{ cost: 50.1 }, { cost: null }, { cost: 20.2 }])).toBe(70.3)
  })
})
