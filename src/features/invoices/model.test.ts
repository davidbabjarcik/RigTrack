import { describe, expect, it } from 'vitest'
import { EMPTY_ISSUER } from '@/features/offers/model'
import { draftFromOffer, dueAfter, invoiceState, invoiceTotals, variableSymbol } from './model'

const offer = (vatMode: 'with' | 'plus' | 'none', vatPayer = true) => ({
  id: 'o1',
  eventId: 'e1',
  number: 'CP-7',
  title: 'Ukážková svadba',
  client: { name: 'Ukážkový klient', address: 'Ukážková 1', ico: '123', dic: '456', contact: '' },
  issuer: { ...EMPTY_ISSUER, name: 'Ukážková s.r.o.', vatPayer },
  vatMode,
  vatPct: 23,
  totalOverride: 1230,
  sections: [],
})

describe('faktúry', () => {
  it('súčty po sadzbách DPH', () => {
    const totals = invoiceTotals([
      { quantity: 2, unitPrice: 100, vatRate: 23 },
      { quantity: 1, unitPrice: 50.5, vatRate: 19 },
      { quantity: 1, unitPrice: -20, vatRate: 23 },
    ])
    expect(totals.rates).toEqual([{ rate: 23, base: 180, vat: 41.4 }, { rate: 19, base: 50.5, vat: 9.6 }])
    expect(totals).toMatchObject({ net: 230.5, vat: 51, total: 281.5 })
  })

  it('z ponuky: cena s DPH sa prepočíta na základ, záloha je podiel, konečná odpočíta zaplatenú zálohu', () => {
    const advance = draftFromOffer(offer('with'), 'advance', '2026-11-21')
    expect(advance.lines).toEqual([{ label: 'Záloha 50 % – Podľa cenovej ponuky č. CP-7 – Ukážková svadba', quantity: 1, unit: 'ks', unitPrice: 500, vatRate: 23 }])
    expect(advance.dueOn).toBe('2026-12-05')
    const final = draftFromOffer(offer('with'), 'final', '2026-11-21', [
      { number: '20260001', totalNet: 500, paidOn: '2026-11-22', cancelledAt: null, kind: 'advance', offerId: 'o1', lines: [{ label: '', quantity: 1, unit: 'ks', unitPrice: 500, vatRate: 23 }] },
      { number: '20260002', totalNet: 500, paidOn: null, cancelledAt: null, kind: 'advance', offerId: 'o1', lines: [] },
    ])
    expect(final.lines.map((line) => line.unitPrice)).toEqual([1000, -500])
    expect(invoiceTotals(final.lines).total).toBe(615)
  })

  it('neplatiteľ DPH bez dane, cena + DPH ostáva základom', () => {
    expect(draftFromOffer(offer('none', false), 'final', '2026-11-21').lines[0]).toMatchObject({ unitPrice: 1230, vatRate: 0 })
    expect(draftFromOffer(offer('plus'), 'final', '2026-11-21').lines[0]).toMatchObject({ unitPrice: 1230, vatRate: 23 })
  })

  it('stav, splatnosť a variabilný symbol', () => {
    expect(invoiceState({ paidOn: null, cancelledAt: null, dueOn: '2026-11-20' }, '2026-11-21')).toBe('overdue')
    expect(invoiceState({ paidOn: '2026-11-19', cancelledAt: null, dueOn: '2026-11-20' }, '2026-11-21')).toBe('paid')
    expect(dueAfter('2026-12-25', 14)).toBe('2027-01-08')
    expect(variableSymbol('20260001')).toBe('20260001')
  })
})
