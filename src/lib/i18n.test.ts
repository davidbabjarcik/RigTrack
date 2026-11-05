import { describe, expect, it } from 'vitest'
import { getLang, LANG_STORAGE_KEY, setLang, tr } from './i18n'
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
})
