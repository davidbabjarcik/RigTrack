import { useSyncExternalStore } from 'react'

// Jazyk appky (SK / EN). Dva spôsoby prekladu:
// – priamo pri texte: t('Uložiť', 'Save');
// – zo slovníka: tx('Uložiť') – anglický slovník (i18n-en.json, slovenský text → anglický) sa načíta len pri angličtine.
// Čo v slovníku chýba, ostáva po slovensky. Hárky na tlač, štítky a plagáty sú vždy po slovensky (rovnaké pre celú firmu).

export type Lang = 'sk' | 'en'
export const LANGS: { value: Lang; label: string }[] = [
  { value: 'sk', label: 'Slovenčina' },
  { value: 'en', label: 'English' },
]

/** Zvolený jazyk v prehliadači (funkčné úložisko – bez súhlasu sa nezapíše; v účte je uložený zvlášť). */
export const LANG_STORAGE_KEY = 'rigtrack:lang'

const isLang = (value: unknown): value is Lang => value === 'sk' || value === 'en'

function initialLang(): Lang {
  try {
    const stored = localStorage.getItem(LANG_STORAGE_KEY)
    if (isLang(stored)) return stored
  } catch {
    // bez úložiska podľa prehliadača
  }
  const browser = typeof navigator === 'undefined' ? '' : (navigator.language ?? '').toLowerCase()
  // Slovensky aj česky hovoriaci dostanú slovenčinu, ostatní angličtinu.
  return browser === '' || browser.startsWith('sk') || browser.startsWith('cs') ? 'sk' : 'en'
}

let current: Lang = initialLang()
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((listener) => listener())

let dict: Record<string, string> | null = null
let dictLoading: Promise<void> | null = null
function loadDict() {
  dictLoading ??= import('./i18n-en.json')
    .then((module) => {
      dict = module.default as Record<string, string>
      notify()
    })
    .catch(() => {
      dictLoading = null // skúsi sa znova pri ďalšom prepnutí
    })
  return dictLoading
}

/** Pred prvým vykreslením: pri angličtine počká na slovník (aby appka najprv neukázala slovenčinu). */
export function i18nReady(): Promise<void> {
  return current === 'en' ? loadDict() : Promise.resolve()
}

function apply(lang: Lang) {
  if (typeof document !== 'undefined') document.documentElement.lang = lang
}
apply(current)

export function getLang() {
  return current
}

/** Prepne jazyk (a zapamätá ho v prehliadači, ak to súhlas dovolí). */
export function setLang(lang: Lang) {
  if (!isLang(lang) || lang === current) return
  current = lang
  apply(lang)
  try {
    localStorage.setItem(LANG_STORAGE_KEY, lang)
  } catch {
    // platí do zatvorenia
  }
  if (lang === 'en') void loadDict()
  notify()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useLang(): Lang {
  return useSyncExternalStore(subscribe, getLang, getLang)
}

const langKey = () => (current === 'en' && dict ? 'en' : 'sk')

/** Kľúč pre koreň appky – pri zmene jazyka (a po načítaní slovníka) sa obrazovky vykreslia nanovo. */
export function useLangKey(): string {
  return useSyncExternalStore(subscribe, langKey, langKey)
}

/** Preklad zo slovníka, ak ho slovník má (inak undefined) – pre poistku v prehliadači (domTranslate). */
export function lookup(text: string): string | undefined {
  return current === 'en' && dict ? dict[text] : undefined
}

/** Text zo slovníka: tx('Uložiť') → „Save“ v angličtine; iné hodnoty než text vráti bez zmeny. */
export function tx<T>(text: T): T {
  if (current !== 'en' || typeof text !== 'string' || !dict) return text
  return (dict[text] ?? text) as T
}

/** Veta s hodnotami: tf('Zmazať „{0}“?', name) – v slovníku je kľúč so zástupnými {0}, {1}… */
export function tf(template: string, ...args: unknown[]): string {
  return tx(template).replace(/\{(\d+)\}/g, (match, index: string) => (Number(index) < args.length ? String(args[Number(index)]) : match))
}

export type Translate = (sk: string, en: string) => string

/** t('Uložiť', 'Save') podľa zvoleného jazyka. */
export function useT(): Translate {
  const lang = useLang()
  return (sk, en) => (lang === 'en' ? en : sk)
}

/** Mimo komponentov (napr. hlášky v kóde): podľa aktuálneho jazyka. */
export const tr: Translate = (sk, en) => (current === 'en' ? en : sk)
