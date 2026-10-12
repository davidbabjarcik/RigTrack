import { describe, expect, it } from 'vitest'
import { looksLikeThomann, parseThomannInvoice, shortName } from './thomann'

// Riadky v poradí, v akom ich vráti čítanie PDF (dve strany, pätička, medzisúčet).
// Údaje zákazníka sú vymyslené.
const INVOICE = [
  '#_ AppendFile2 k:\\pdfmaschine\\vorlagen\\agb.pdf _#',
  'Invoice Nr.: 90000001',
  'Thomann GmbH, Hans-Thomann-Str. 1, D-96138 Burgebrach',
  'Firma s.r.o. Firma s.r.o.',
  'Order No.: 202600.000001 / CS_CZSK',
  'Invoice Nr.: 90000001',
  'Date: 08.08.2026',
  'Your customer no.: 1234567',
  'Pos. Article Amount Unit Unit Price Total Price',
  '001.00 358334 1 piece 14,88 EUR 14,88 EUR',
  'Varytec Mirror Ball Motor max. 4kg, Mirror Ball Motor max. 4kg, 1,75 RPM, Ideal for balls up to 4 kg, 1,75 rotation',
  'per minute, Dimensions (L x H ): 126 x 64 mm, Weight: 0,6 kg',
  '002.00 376918 1 piece 1.313,01 EUR 1.313,01 EUR',
  'Stairville Fan-200 DMX Wind Machine. Powerful Wind Generator designed for professional and',
  'semi-professional use in, clubs, TV studios, theaters and touring applications.',
  'Amount carried forward : 1.327,89 EUR',
  'Thomann GmbH info@thomann.de Geschäftsführer: Johann Thomann USt.-IdNr.: DE 257375233',
  'IBAN DE97 7705 0000 0000 1030 85',
  '#_ AppendFile2 k:\\pdfmaschine\\vorlagen\\agb.pdf _#',
  'Invoice Nr.: 90000001',
  'Page 2 of Invoice Nr.: 90000001 from 08.08.2026 to Meno (customer number: 1234567)',
  'Pos. Article Amount Unit Unit Price Total Price',
  '003.00 105218 12 piece 4,80 EUR 57,60 EUR',
  'Neutrik NL4 MMX speakON - speakON Barrel adapter, 4-pole, to connect two speakON cables',
  '004.00 498283 2 piece 18,62 EUR 37,24 EUR',
  'Kramer C-BM/BM-35 Cable 10.7 m; 3G HD-SDI BNC coax cable; constructed from RG-6',
  'Value of goods: 1.422,73 EUR',
  '3,00 % Discount: -42,68 EUR',
  'Sub-total: 1.380,05 EUR',
  'Net amount: 1.380,05 EUR',
  '1.380,07 EUR',
  'Total amount:',
  'Method of payment:',
  'Visa Card 1.380,07 EUR',
  'Thomann GmbH info@thomann.de Geschäftsführer: Johann Thomann USt.-IdNr.: DE 257375233',
]

describe('parseThomannInvoice', () => {
  const invoice = parseThomannInvoice(INVOICE)

  it('reads the header', () => {
    expect(invoice).toMatchObject({ supplier: 'Thomann', orderNumber: '90000001', orderedAt: '2026-08-08', currency: 'EUR' })
  })

  it('reads every line across the page break', () => {
    expect(invoice.items).toEqual([
      { articleNumber: '358334', name: 'Varytec Mirror Ball Motor max. 4kg', quantity: 1, listPrice: 14.88, unitPrice: 14.43 },
      { articleNumber: '376918', name: 'Stairville Fan-200 DMX Wind Machine', quantity: 1, listPrice: 1313.01, unitPrice: 1273.62 },
      { articleNumber: '105218', name: 'Neutrik NL4 MMX speakON', quantity: 12, listPrice: 4.8, unitPrice: 4.66 },
      { articleNumber: '498283', name: 'Kramer C-BM/BM-35 Cable 10.7 m', quantity: 2, listPrice: 18.62, unitPrice: 18.06 },
    ])
  })

  it('reads the discount and the amount paid', () => {
    expect(invoice.discount).toBe(42.68)
    expect(invoice.total).toBe(1380.07)
  })

  it('applies a discount printed under a single line only to that line', () => {
    const lines = [
      '001.00 172095 2 piece 39,84 EUR 79,68 EUR',
      '3,00 % -2,39 EUR',
      'Millenium Stand, black',
      '002.00 304888 1 piece 903,25 EUR 903,25 EUR',
      "Thon Case - 7mm plywood",
      'Value of goods: 980,54 EUR',
      'Method of payment:',
      'Open invoice 980,54 EUR',
    ]
    const result = parseThomannInvoice(lines)
    expect(result.items).toEqual([
      { articleNumber: '172095', name: 'Millenium Stand', quantity: 2, listPrice: 39.84, unitPrice: 38.65 },
      { articleNumber: '304888', name: 'Thon Case', quantity: 1, listPrice: 903.25, unitPrice: 903.25 },
    ])
    expect(result.discount).toBe(2.39)
    expect(result.total).toBe(980.54)
  })

  it('accepts a space after the minus sign of the discount', () => {
    const result = parseThomannInvoice(['001.00 1 1 piece 100,00 EUR 100,00 EUR', 'Vec', '3,00 % Discount: - 3,00 EUR'])
    expect(result.items[0].unitPrice).toBe(97)
  })

  it('returns no items for a document that is not an invoice', () => {
    expect(parseThomannInvoice(['Hello', 'World']).items).toEqual([])
  })
})

describe('helpers', () => {
  it('recognises a Thomann document', () => {
    expect(looksLikeThomann(INVOICE)).toBe(true)
    expect(looksLikeThomann(['Iný dodávateľ s.r.o.'])).toBe(false)
  })

  it('keeps abbreviations inside a short name', () => {
    expect(shortName('Varytec Mirror Ball Motor max. 4kg, more text')).toBe('Varytec Mirror Ball Motor max. 4kg')
  })
})
