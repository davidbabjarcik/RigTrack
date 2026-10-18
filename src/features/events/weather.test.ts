import { describe, expect, it } from 'vitest'
import { forecastWindow, weatherLabel, weatherWarnings, type DayForecast } from './weather'

const day = (patch: Partial<DayForecast>): DayForecast => ({ date: '2026-10-20', code: 1, tempMax: 18, tempMin: 8, rainChance: 10, rainMm: 0, gustKmh: 20, ...patch })

describe('weather', () => {
  it('knows when a forecast is available', () => {
    expect(forecastWindow('2026-10-20', '2026-10-21', '2026-10-17')).toEqual({ state: 'ok', from: '2026-10-20', to: '2026-10-21' })
    // event cez hranicu predpovede: len dostupné dni
    expect(forecastWindow('2026-11-01', '2026-11-05', '2026-10-17')).toEqual({ state: 'ok', from: '2026-11-01', to: '2026-11-01' })
    expect(forecastWindow('2026-11-10', '2026-11-10', '2026-10-17')).toEqual({ state: 'early', days: 9 })
    expect(forecastWindow('2026-10-01', '2026-10-02', '2026-10-17')).toEqual({ state: 'past' })
    expect(forecastWindow('2026-10-15', '2026-10-18', '2026-10-17')).toEqual({ state: 'ok', from: '2026-10-17', to: '2026-10-18' })
  })

  it('describes weather codes in Slovak', () => {
    expect(weatherLabel(0)).toBe('jasno')
    expect(weatherLabel(63)).toBe('dážď')
    expect(weatherLabel(95)).toBe('búrka')
  })

  it('warns about storm, rain, wind and frost', () => {
    expect(weatherWarnings([day({})])).toEqual([])
    expect(weatherWarnings([day({ code: 95, rainChance: 80, gustKmh: 65, tempMin: -2 })])).toEqual([
      'Hrozí búrka.',
      'Pravdepodobne bude pršať – kryty na techniku a stany.',
      'Nárazy vetra do 65 km/h – pozor na truss, plachty a bannery.',
      'Mráz – pozor na batérie a displeje.',
    ])
  })
})

describe('forecast links', () => {
  it('point to the place coordinates', async () => {
    const { forecastLinks } = await import('./weather')
    const [windy, meteoblue] = forecastLinks({ latitude: 49.2063, longitude: 21.6523 })
    expect(windy.url).toBe('https://www.windy.com/49.206/21.652?49.206,21.652,11')
    expect(meteoblue.url).toBe('https://www.meteoblue.com/en/weather/week/49.206N21.652E')
  })
})
