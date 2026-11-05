import { describe, expect, it } from 'vitest'
import { getLang, i18nReady, LANG_STORAGE_KEY, setLang, tf, tr, tx } from './i18n'
import en from './i18n-en.json'
import { localizeNav, NAV_ITEMS } from './navigation'

describe('i18n', () => {
  it('switches the language, remembers it and translates', () => {
    expect(getLang()).toBe('sk')
    expect(tr('Uložiť', 'Save')).toBe('Uložiť')
    setLang('en')
    expect(tr('Uložiť', 'Save')).toBe('Save')
    expect(localStorage.getItem(LANG_STORAGE_KEY)).toBe('en')
    expect(document.documentElement.lang).toBe('en')
    expect(localizeNav(NAV_ITEMS.find((item) => item.id === 'warehouse')!, 'en').label).toBe('Warehouse')
    setLang('sk')
  })

  it('has an English name for every menu item', () => {
    expect(NAV_ITEMS.filter((item) => localizeNav(item, 'en').label === item.label).map((item) => item.id)).toEqual([])
  })

  it('translates from the dictionary once English is loaded', async () => {
    expect(tx('Uložiť')).toBe('Uložiť')
    setLang('en')
    await i18nReady()
    expect(tx('Uložiť')).toBe('Save')
    expect(tx('Text, ktorý v slovníku nie je')).toBe('Text, ktorý v slovníku nie je')
    expect(tf('Upraviť {0}', 'K10')).toBe('Edit K10')
    setLang('sk')
    expect(tf('Upraviť {0}', 'K10')).toBe('Upraviť K10')
  })

  it('keeps the dictionary consistent', () => {
    const entries = Object.entries(en as Record<string, string>)
    const holes = (text: string) => (text.match(/\{\d+\}/g) ?? []).sort().join()
    expect(entries.filter(([, value]) => !value.trim()).map(([key]) => key)).toEqual([])
    expect(entries.filter(([key, value]) => holes(key) !== holes(value)).map(([key]) => key)).toEqual([])
  })
})
