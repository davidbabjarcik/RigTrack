import { describe, expect, it } from 'vitest'
import { orderColumns, textShade, buildCableMatrix } from './contentSheet'

const cable = (connector: string, lengthM: number, quantity: number) => ({
  name: `${connector} ${lengthM} m`,
  kind: 'cable' as const,
  quantity,
  attributes: { connector, lengthM },
})

describe('buildCableMatrix', () => {
  const matrix = buildCableMatrix([
    cable('powerCON prepojovací', 1, 4),
    cable('powerCON napájací', 1, 8),
    cable('powerCON prepojovací', 1.5, 6),
    cable('powerCON prepojovací', 1, 2),
    cable('powerCON napájací', 10, 3),
    { name: 'Redukcia powerCON–Schuko', kind: 'general', quantity: 2, attributes: {} },
    { name: 'Redukcia powerCON–Schuko', kind: 'general', quantity: 1, attributes: {} },
    { name: 'Kábel bez dĺžky', kind: 'cable', quantity: 5, attributes: { connector: 'XLR' } },
  ])

  it('makes one column per cable type and one row per length, shortest first', () => {
    expect(matrix.columns).toEqual(['powerCON napájací', 'powerCON prepojovací'])
    expect(matrix.rows.map((row) => row.lengthM)).toEqual([1, 1.5, 10])
  })

  it('sums pieces of the same type and length and leaves gaps at zero', () => {
    expect(matrix.rows.map((row) => row.counts)).toEqual([
      [8, 6],
      [0, 6],
      [3, 0],
    ])
  })

  it('lists everything else, including cables without a length, merged by name', () => {
    expect(matrix.others).toEqual([
      { name: 'Kábel bez dĺžky', quantity: 5 },
      { name: 'Redukcia powerCON–Schuko', quantity: 3 },
    ])
  })

  it('groups cables without a connector into one generic column', () => {
    const plain = buildCableMatrix([{ name: 'Kábel 3 m', kind: 'cable', quantity: 2, attributes: { lengthM: 3 } }])
    expect(plain.columns).toEqual(['Kábel'])
    expect(plain.rows).toEqual([{ lengthM: 3, counts: [2] }])
  })

  it('keeps a photo for accessory cards', () => {
    const matrix = buildCableMatrix([
      { name: 'Redukcia', kind: 'general', quantity: 2, attributes: {} },
      { name: 'Redukcia', kind: 'general', quantity: 1, attributes: {}, photoPath: 'p.jpg' },
    ])
    expect(matrix.others).toEqual([{ name: 'Redukcia', quantity: 3, photoPath: 'p.jpg' }])
  })

  it('returns an empty table for an empty case', () => {
    expect(buildCableMatrix([])).toEqual({ columns: [], rows: [], others: [] })
  })

  it('orders cable types by choice', () => {
    const matrix = { columns: ['Jack', 'XLR'], rows: [{ lengthM: 1, counts: [2, 5] }], others: [] }
    expect(orderColumns(matrix, ['XLR'])).toEqual({ columns: ['XLR', 'Jack'], rows: [{ lengthM: 1, counts: [5, 2] }], others: [] })
    expect(orderColumns(matrix, [])).toEqual(matrix)
  })

  it('darkens light colours for text and keeps dark ones', () => {
    expect(textShade('#1400ff')).toBe('#1400ff')
    const yellow = textShade('#ffff00')
    expect(yellow).not.toBe('#ffff00')
    expect(yellow.slice(1, 3)).toBe(yellow.slice(3, 5))
  })

  it('puts cables marked as accessory among the cards', () => {
    const matrix = buildCableMatrix([
      { name: 'XLR 5 m', kind: 'cable', quantity: 4, attributes: { lengthM: 5, connector: 'XLR' } },
      { name: 'Jack 3 m', kind: 'cable', quantity: 2, attributes: { lengthM: 3, connector: 'Jack', sheetAccessory: true } },
    ])
    expect(matrix.columns).toEqual(['XLR'])
    expect(matrix.others).toEqual([])
    expect(matrix.accessories).toEqual([{ name: 'Jack 3 m', quantity: 2 }])
  })

  it('counts variants with their type and lists them', () => {
    const matrix = buildCableMatrix([
      { name: 'Jack 3 m', kind: 'cable', quantity: 4, attributes: { lengthM: 3, connector: 'Jack' } },
      { name: 'Jack stereo 3 m', kind: 'cable', quantity: 2, attributes: { lengthM: 3, connector: 'Jack', cableVariant: 'stereo' } },
      { name: 'Jack silent 3 m', kind: 'cable', quantity: 1, attributes: { lengthM: 3, connector: 'Jack', cableVariant: 'Silent' } },
      { name: 'XLR 3 m', kind: 'cable', quantity: 5, attributes: { lengthM: 3, connector: 'XLR' } },
    ])
    expect(matrix.rows).toEqual([{ lengthM: 3, counts: [7, 5], variants: ['z toho 2× STEREO, 1× SILENT', ''] }])
    expect(orderColumns(matrix, ['XLR']).rows[0].variants).toEqual(['', 'z toho 2× STEREO, 1× SILENT'])
  })
})
