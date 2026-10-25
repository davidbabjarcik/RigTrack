// Kľúčové slovo @todo (alebo @addtodo) v ľubovoľnom políčku: z políčka sa stane úloha „Doplniť: …“.
// Do číselného políčka (kg, ks…) sa „@“ napísať nedá, preto tam platí 31121800; v dátume 31. 12. 1800.

/** Číselné kľúčové slovo a dátum, ktorý znamená to isté. */
export const NUMBER_KEYWORD = '31121800'
export const DATE_KEYWORD = '1800-12-31'
const KEYWORDS = ['@addtodo', '@todo', NUMBER_KEYWORD]
const MAX_BUFFER = 12

/** Pridá stlačený znak do pamäte políčka; vráti novú pamäť a či sa práve dopísalo kľúčové slovo. */
export function pushKey(buffer: string, key: string): { buffer: string; hit: boolean } {
  let next: string
  if (key === 'Backspace') next = buffer.slice(0, -1)
  else if (key.length === 1) next = (buffer + key).slice(-MAX_BUFFER)
  else return { buffer, hit: false }
  const lower = next.toLowerCase()
  const hit = key.length === 1 && KEYWORDS.some((word) => lower.endsWith(word))
  return { buffer: hit ? '' : next, hit }
}

/** Odstráni kľúčové slovo z textu políčka (aj s medzerou pred ním). */
export const stripKeyword = (value: string) => value.replace(/\s?@(add)?todo\b/gi, '').replace(NUMBER_KEYWORD, '').trimEnd()

/** Obsahuje hodnota políčka kľúčové slovo (aby sa vedelo, či ho treba zmazať)? */
export const hasKeyword = (value: string) => /@(add)?todo/i.test(value) || value.includes(NUMBER_KEYWORD) || value === DATE_KEYWORD

/** Čistý názov políčka: „Hmotnosť (kg) *“ → „Hmotnosť (kg)“. */
export const cleanLabel = (text: string) => text.replace(/\*/g, '').replace(/\s+/g, ' ').trim()

/** Názov úlohy: „Doplniť: Hmotnosť (kg) – LED Par“. */
export function todoTitle(field: string, item: string) {
  const what = cleanLabel(field) || 'údaj'
  return item.trim() ? `Doplniť: ${what} – ${item.trim()}` : `Doplniť: ${what}`
}
