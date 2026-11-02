// Kľúčové slovo @todo (alebo @addtodo) v ľubovoľnom políčku: z políčka sa stane úloha „Doplniť: …“.
// @toprint: úloha „Vytlačiť: …“ a štítok do tlačovej fronty (napr. pri čísle case).
// Do číselného políčka (kg, ks…) sa „@“ napísať nedá, preto tam platí 31121800 (@todo) a 01001800 (@toprint);
// v dátume 31. 12. 1800 (@todo) a 1. 1. 1800 (@toprint).

/** Číselné kľúčové slovo a dátum, ktorý znamená to isté. */
export const NUMBER_KEYWORD = '31121800'
export const PRINT_NUMBER_KEYWORD = '01001800'
export const PRINT_DATE_KEYWORD = '1800-01-01'
export const DATE_KEYWORD = '1800-12-31'
const KEYWORDS: { word: string; kind: KeywordKind }[] = [
  { word: '@addtodo', kind: 'todo' },
  { word: '@todo', kind: 'todo' },
  { word: NUMBER_KEYWORD, kind: 'todo' },
  { word: '@toprint', kind: 'print' },
  { word: PRINT_NUMBER_KEYWORD, kind: 'print' },
]
const MAX_BUFFER = 12

/** Čo kľúčové slovo spraví: úloha „Doplniť“ (todo), alebo „Vytlačiť“ + tlačová fronta (print). */
export type KeywordKind = 'todo' | 'print'

/** Pridá stlačený znak do pamäte políčka; vráti novú pamäť a ktoré kľúčové slovo sa práve dopísalo (alebo null). */
export function pushKey(buffer: string, key: string): { buffer: string; hit: KeywordKind | null } {
  let next: string
  if (key === 'Backspace') next = buffer.slice(0, -1)
  else if (key.length === 1) next = (buffer + key).slice(-MAX_BUFFER)
  else return { buffer, hit: null }
  const lower = next.toLowerCase()
  const hit = key.length === 1 ? (KEYWORDS.find((item) => lower.endsWith(item.word))?.kind ?? null) : null
  return { buffer: hit ? '' : next, hit }
}

/** Odstráni kľúčové slová z textu políčka (aj s medzerou pred nimi). */
export const stripKeyword = (value: string) =>
  value.replace(/\s?@(add)?todo\b/gi, '').replace(/\s?@toprint\b/gi, '').replace(NUMBER_KEYWORD, '').replace(PRINT_NUMBER_KEYWORD, '').replace(/^1001800$/, '').trimEnd()

/** Obsahuje hodnota políčka kľúčové slovo (aby sa vedelo, či ho treba zmazať)? */
export const hasKeyword = (value: string) => /@(add)?todo|@toprint/i.test(value) || value.includes(NUMBER_KEYWORD) || value.includes(PRINT_NUMBER_KEYWORD) || value === '1001800' || value === DATE_KEYWORD || value === PRINT_DATE_KEYWORD

/** Čo sa má vytlačiť podľa adresy stránky: technika alebo case (/equipment/:id, /cases/:id aj ich úprava). */
export function printTargetFromPath(path: string): { kind: 'equipment' | 'case'; id: string } | null {
  const match = /^\/(equipment|cases)\/([0-9a-f-]{36})(?:\/|$)/i.exec(path)
  return match ? { kind: match[1] === 'cases' ? 'case' : 'equipment', id: match[2] } : null
}

/** Názov úlohy na tlač: „Vytlačiť: Číslo case – Beam case“. */
export function printTitle(field: string, item: string) {
  const what = cleanLabel(field) || 'štítok'
  return item.trim() ? `Vytlačiť: ${what} – ${item.trim()}` : `Vytlačiť: ${what}`
}

/** Čistý názov políčka: „Hmotnosť (kg) *“ → „Hmotnosť (kg)“. */
export const cleanLabel = (text: string) => text.replace(/\*/g, '').replace(/\s+/g, ' ').trim()

/** Názov úlohy: „Doplniť: Hmotnosť (kg) – LED Par“. */
export function todoTitle(field: string, item: string) {
  const what = cleanLabel(field) || 'údaj'
  return item.trim() ? `Doplniť: ${what} – ${item.trim()}` : `Doplniť: ${what}`
}
