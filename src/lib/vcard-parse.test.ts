import { describe, expect, it } from 'vitest'
import { buildVCard, parseVCards } from './vcard'

describe('parseVCards', () => {
  it('reads an iPhone vCard 3.0', () => {
    const text = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      'N:Vzor;Ján;;;',
      'FN:Ján Vzor',
      'ORG:Ukážka s.r.o.;',
      'item1.TEL;type=CELL;type=VOICE;type=pref:+421 900 123 456',
      'TEL;type=WORK:+421 2 1234',
      'item2.EMAIL;type=INTERNET:jan@example.sk',
      'END:VCARD',
    ].join('\r\n')
    expect(parseVCards(text)).toEqual([{ name: 'Ján Vzor', org: 'Ukážka s.r.o.', phone: '+421 900 123 456', email: 'jan@example.sk' }])
  })

  it('falls back to N, joins folded lines and reads several cards', () => {
    const text = 'BEGIN:VCARD\nVERSION:2.1\nN:Novák;Ján\nTEL:0900\n 111\nEND:VCARD\nBEGIN:VCARD\nFN:Firma\\, a.s.\nEND:VCARD\n'
    expect(parseVCards(text)).toEqual([
      { name: 'Ján Novák', phone: '0900111' },
      { name: 'Firma, a.s.' },
    ])
  })

  it('round-trips what the app exports', () => {
    const [contact] = parseVCards(buildVCard({ name: 'Peter Malý', org: 'Mesto Stropkov', title: 'produkcia', phone: '+421 911 222 333', email: 'p@m.sk' }))
    expect(contact).toEqual({ name: 'Peter Malý', org: 'Mesto Stropkov', title: 'produkcia', phone: '+421911222333', email: 'p@m.sk' })
  })
})
