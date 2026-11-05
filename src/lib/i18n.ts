import { useSyncExternalStore } from 'react'

// Jazyk appky (SK / EN). Preklad je priamo pri texte: t('Uložiť', 'Save'). Čo ešte nie je preložené, ostáva
// po slovensky. Hárky na tlač, štítky a plagáty sú vždy po slovensky (rovnaké pre celú firmu).

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
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useLang(): Lang {
  return useSyncExternalStore(subscribe, getLang, getLang)
}

export type Translate = (sk: string, en: string) => string

/** t('Uložiť', 'Save') podľa zvoleného jazyka. */
export function useT(): Translate {
  const lang = useLang()
  return (sk, en) => (lang === 'en' ? en : sk)
}

/** Mimo komponentov (napr. hlášky v kóde): podľa aktuálneho jazyka. */
export const tr: Translate = (sk, en) => (current === 'en' ? en : sk)
