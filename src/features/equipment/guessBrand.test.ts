import { describe, expect, it } from 'vitest'
import { guessBrand, thomannUrl } from './catalog'

describe('značka zo zoznamu a Thomann', () => {
  it('uhádne značku z výrobcu, názvu alebo modelu (celé slovo, najdlhšia zhoda)', () => {
    const brands = ['Avolites', 'Global Truss', 'Global', 'JBL']
    expect(guessBrand(brands, 'China', 'Avolites Quartz', 'Quartz')).toBe('Avolites')
    expect(guessBrand(brands, '', 'Global Truss F34 – 1m', '')).toBe('Global Truss')
    expect(guessBrand(brands, 'jbl', '', '')).toBe('JBL')
    expect(guessBrand(brands, 'Ukážka', 'Mikrofón', 'X1')).toBeUndefined()
  })

  it('odkaz na produkt podľa čísla artiklu', () => {
    expect(thomannUrl('123456')).toBe('https://www.thomann.de/intl/prod_AR_123456.html')
    expect(thomannUrl('F34 truss')).toBe('https://www.thomann.de/intl/search_dir.html?sw=F34%20truss')
  })
})
