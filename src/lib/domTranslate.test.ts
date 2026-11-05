import { afterEach, describe, expect, it } from 'vitest'
import { PRINT_PATH, startDomTranslation } from './domTranslate'
import { i18nReady, setLang } from './i18n'

const tick = () => new Promise((resolve) => setTimeout(resolve, 0))

afterEach(() => {
  setLang('sk')
  document.body.innerHTML = ''
})

describe('domTranslate', () => {
  it('translates known texts and descriptions, keeps field values and marked parts', async () => {
    setLang('en')
    await i18nReady()
    document.body.innerHTML = '<p> Metrov káblov </p><input placeholder="Hľadať" value="Metrov káblov"><div data-no-translate>Metrov káblov</div><span>Niečo vlastné</span>'
    const stop = startDomTranslation()
    expect(document.querySelector('p')!.textContent).toBe(' Cable metres ')
    expect(document.querySelector('input')!.getAttribute('placeholder')).toBe('Search')
    expect(document.querySelector('input')!.value).toBe('Metrov káblov')
    expect(document.querySelector('[data-no-translate]')!.textContent).toBe('Metrov káblov')
    expect(document.querySelector('span')!.textContent).toBe('Niečo vlastné')
    // Text pridaný neskôr (napr. po načítaní dát) sa preloží tiež.
    const later = document.createElement('b')
    later.textContent = 'Moje úlohy'
    document.body.appendChild(later)
    await tick()
    expect(later.textContent).toBe('My tasks')
    stop()
  })

  it('recognises print pages', () => {
    expect(PRINT_PATH.test('/events/abc/print')).toBe(true)
    expect(PRINT_PATH.test('/o/token123')).toBe(true)
    expect(PRINT_PATH.test('/cases/abc/label')).toBe(true)
    expect(PRINT_PATH.test('/events/abc')).toBe(false)
    expect(PRINT_PATH.test('/demo')).toBe(false)
  })
})
