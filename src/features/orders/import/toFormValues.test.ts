import { describe, expect, it } from 'vitest'
import type { RememberedArticle } from '../model'
import type { ParsedInvoice } from './thomann'
import { invoiceToFormValues } from './toFormValues'

const invoice: ParsedInvoice = {
  supplier: 'Thomann',
  orderNumber: '90000001',
  orderedAt: '2026-08-08',
  currency: 'EUR',
  items: [
    { articleNumber: '100', name: 'Svetlo', quantity: 1, unitPrice: 300, listPrice: 310 },
    { articleNumber: '200', name: 'Kábel', quantity: 12, unitPrice: 4.66, listPrice: 4.8 },
    { articleNumber: '300', name: 'Hák', quantity: 16, unitPrice: 5, listPrice: 5 },
    { articleNumber: '400', name: 'Viazačky', quantity: 3, unitPrice: 6.23, listPrice: 6.42 },
    { articleNumber: '500', name: 'LED Par', quantity: 4, unitPrice: 90, listPrice: 90 },
    { articleNumber: '600', name: 'Gafa', quantity: 5, unitPrice: 12, listPrice: 12 },
  ],
  discount: 13.64,
  total: 441.19,
}

const remembered = new Map<string, RememberedArticle>([
  ['300', { mode: 'existing', equipmentId: 'equipment-hooks', category: 'Rigging' }],
  ['400', { mode: 'none', equipmentId: null, category: 'Spotrebný' }],
  ['500', { mode: 'separate', equipmentId: null, category: 'Svetlá' }],
  // technika z minulého nákupu už neexistuje
  ['600', { mode: 'bulk', equipmentId: null, category: '' }],
])

describe('invoiceToFormValues', () => {
  const values = invoiceToFormValues(invoice, remembered, '2026-10-12')

  it('copies the header', () => {
    expect(values).toMatchObject({ supplier: 'Thomann', orderNumber: '90000001', orderedAt: '2026-08-08', currency: 'EUR' })
  })

  it('defaults new goods by quantity and repeats the last decision for known goods', () => {
    expect(values.items.map((item) => [item.name, item.mode, item.equipmentId, item.category])).toEqual([
      ['Svetlo', 'separate', '', ''],
      ['Kábel', 'bulk', '', ''],
      ['Hák', 'existing', 'equipment-hooks', 'Rigging'],
      ['Viazačky', 'none', '', 'Spotrebný'],
      ['LED Par', 'separate', '', 'Svetlá'],
      ['Gafa', 'bulk', '', ''],
    ])
  })

  it('keeps article numbers and net prices', () => {
    expect(values.items[1]).toMatchObject({ articleNumber: '200', quantity: 12, unitPrice: 4.66 })
  })

  it('explains the discount and the paid amount in the note', () => {
    expect(values.note).toContain('po zľave')
    expect(values.note).toContain('441,19')
  })

  it('falls back to today and EUR when the invoice lacks them', () => {
    const bare = invoiceToFormValues({ ...invoice, orderedAt: null, currency: 'XXX', discount: 0, total: null }, new Map(), '2026-10-12')
    expect(bare).toMatchObject({ orderedAt: '2026-10-12', currency: 'EUR', note: '' })
  })
})
