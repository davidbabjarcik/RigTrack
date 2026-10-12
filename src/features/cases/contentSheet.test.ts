import { describe, expect, it } from 'vitest'
import { buildCableMatrix } from './contentSheet'

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

  it('returns an empty table for an empty case', () => {
    expect(buildCableMatrix([])).toEqual({ columns: [], rows: [], others: [] })
  })
})
