import { describe, expect, it } from 'vitest'
import type { Equipment } from '@/features/equipment/model'
import { distribute, htmlReportLines, matchReportItem, normalizeName, parseReportLines } from './equipmentReport'

// Riadky tak, ako ich z PDF Equipment Reportu vytiahne pdf.js (skrátené).
const PDF_LINES = [
  'Deň obce Sečovská Polianka Equipment Report',
  '5. septembra 2026 Areál Futbalového ihriska',
  'Fixtures',
  '# Name Optics Weight Rating',
  '10 Clay Paky A.leda B-EYE K10 6,8° - 58,4° 14,5kg 0,45kW',
  '12 Clay Paky Sharpy 3,8° 19kg 0,35kW',
  '1 Smoke Factory Tour-Hazer II 18kg 1,5kW',
  '1 Stairville Fan-200 DMX 9,8kg 0W',
  '639,2kg 28,4kW',
  'Truss',
  '# Name Weight',
  '2 Global Truss F34 P Rectangular section, 1,5m (F34150P) (F34150P) 12kg',
  '1847,28kg',
  'Other',
  '# Type Name Weight Rating',
  '48 Panel Generic LED Panel 10kg 0,4kW',
  '40 Stage Deck Rectangular 2m x 1m, 1m 30kg',
  '2100kg 19,2kW',
]

const EXPECTED = [
  { section: 'Fixtures', quantity: 10, name: 'Clay Paky A.leda B-EYE K10' },
  { section: 'Fixtures', quantity: 12, name: 'Clay Paky Sharpy' },
  { section: 'Fixtures', quantity: 1, name: 'Smoke Factory Tour-Hazer II' },
  { section: 'Fixtures', quantity: 1, name: 'Stairville Fan-200 DMX' },
  { section: 'Truss', quantity: 2, name: 'Global Truss F34 P Rectangular section, 1,5m (F34150P) (F34150P)' },
  { section: 'Other', quantity: 48, name: 'Panel Generic LED Panel' },
  { section: 'Other', quantity: 40, name: 'Stage Deck Rectangular 2m x 1m, 1m' },
]

describe('parseReportLines', () => {
  it('reads the PDF report: title, sections and items without the extra columns and totals', () => {
    expect(parseReportLines(PDF_LINES)).toEqual({
      title: 'Deň obce Sečovská Polianka',
      subtitle: '5. septembra 2026 Areál Futbalového ihriska',
      items: EXPECTED,
    })
  })

  it('reads the HTML report the same way', () => {
    const html = `<html><body>
      <table><tr><td><img /></td><td>De&#328; obce Se&#269;ovsk&#225; Polianka Equipment Report</td></tr>
      <tr><td>5. septembra 2026 Are&#225;l Futbalov&#233;ho ihriska</td></tr></table>
      <table><tr class="heading"><td colspan="5">Fixtures</td></tr>
      <tr class="header"><td>#</td><td>Name</td><td>Optics</td><td>Weight</td><td>Rating</td></tr>
      <tr><td>12</td><td>Clay Paky Sharpy</td><td>3,8&#176;</td><td>19kg</td><td>0,35kW</td></tr>
      <tr><td>1</td><td>Smoke Factory Tour-Hazer II</td><td></td><td>18kg</td><td>1,5kW</td></tr>
      <tr class="summary"><td></td><td></td><td></td><td>639,2kg</td><td>28,4kW</td></tr></table>
      <table><tr class="heading"><td colspan="5">Other</td></tr>
      <tr class="header"><td>#</td><td>Type</td><td>Name</td><td>Weight</td><td>Rating</td></tr>
      <tr><td>40</td><td>Stage Deck</td><td>Rectangular 2m x 1m, 1m</td><td>30kg</td><td></td></tr></table>
    </body></html>`
    expect(parseReportLines(htmlReportLines(html))).toEqual({
      title: 'Deň obce Sečovská Polianka',
      subtitle: '5. septembra 2026 Areál Futbalového ihriska',
      items: [EXPECTED[1], EXPECTED[2], EXPECTED[6]],
    })
  })
})

const piece = (id: string, name: string, patch: Partial<Equipment> = {}) =>
  ({ id, name, manufacturer: '', model: '', quantity: 1, status: 'available', ...patch }) as Equipment

describe('matchReportItem', () => {
  const equipment = [
    piece('sharpy', 'Sharpy', { manufacturer: 'Clay Paky', model: 'Sharpy', quantity: 12 }),
    piece('hazer', 'Hazer Tour II', { manufacturer: 'Smoke Factory', model: 'Tour-Hazer' }),
    piece('panel', 'LED Panel'),
  ]

  it('knows remembered names first, then the same name or manufacturer and model', () => {
    expect(matchReportItem('Generic LED Panel', equipment, new Map([['generic led panel', 'panel']]))).toEqual({
      status: 'known',
      equipmentId: 'panel',
      via: 'alias',
    })
    expect(matchReportItem('Clay Paky Sharpy', equipment, new Map())).toEqual({ status: 'known', equipmentId: 'sharpy', via: 'name' })
  })

  it('only suggests a similar item and admits what it does not know', () => {
    expect(matchReportItem('Smoke Factory Tour-Hazer II', equipment, new Map())).toEqual({ status: 'suggested', equipmentId: 'hazer' })
    expect(matchReportItem('Stairville Fan-200 DMX', equipment, new Map())).toEqual({ status: 'unknown' })
    // alias na zmazanú techniku sa ignoruje, ostane len návrh podľa slov
    expect(matchReportItem('Generic LED Panel', equipment, new Map([['generic led panel', 'deleted']]))).toEqual({ status: 'suggested', equipmentId: 'panel' })
  })
})

describe('distribute', () => {
  it('spreads a count over pieces kept separately under one name', () => {
    const lights = [piece('a', 'Sharpy'), piece('b', 'Sharpy'), piece('c', 'Sharpy'), piece('x', 'Iné', { quantity: 5 })]
    expect(distribute(2, lights[0], lights)).toEqual(new Map([['a', 1], ['b', 1]]))
    expect(distribute(5, lights[0], lights)).toEqual(new Map([['a', 3], ['b', 1], ['c', 1]]))
    expect(distribute(3, lights[3], lights)).toEqual(new Map([['x', 3]]))
  })

  it('normalizes names for comparison', () => {
    expect(normalizeName(' Clay-Paky  Šarpy! ')).toBe('clay paky sarpy')
  })
})
