// Súhlas s ukladaním údajov v prehliadači (ePrivacy / GDPR). RigTrack nepoužíva cookies, analytiku ani reklamu –
// ukladá len do úložiska prehliadača (localStorage). Nevyhnutné položky (prihlásenie, vybraná firma, ochrana
// prihlásenia, offline pack list, samotný súhlas) idú vždy; funkčné (vzhľad, filtre, rozloženie, pripnuté položky)
// len so súhlasom. Bez súhlasu sa ich zápis vôbec nevykoná (strážca nižšie), takže F5 nič neobíde.

/** Pri zmene pravidiel sa zvýši – súhlas sa vypýta znova. */
export const CONSENT_VERSION = '2026-11-03'
const KEY = 'rigtrack:consent'

export type ConsentChoice = { functional: boolean; analytics: false; marketing: false }
export type ConsentRecord = ConsentChoice & { version: string; at: string; synced?: boolean }

/** Kľúče, ktoré appka potrebuje na fungovanie (bez súhlasu). Supabase si prihlásenie ukladá pod „sb-…“. */
const NECESSARY = [/^sb-/, /^rigtrack:consent$/, /^rigtrack:active-company$/, /^rigtrack:login-lock$/, /^rigtrack\.pack\./, /^rigtrack\.attendance\.enabled$/, /^rigtrack:stale-reload$/]
export const isNecessaryKey = (key: string) => NECESSARY.some((pattern) => pattern.test(key))
/** Funkčné = ostatné kľúče appky (rigtrack…). Cudzie kľúče appka nepoužíva. */
export const isFunctionalKey = (key: string) => /^rigtrack/.test(key) && !isNecessaryKey(key)

const rawSet = typeof Storage !== 'undefined' ? Storage.prototype.setItem : null

export function readConsent(): ConsentRecord | null {
  try {
    const record = JSON.parse(localStorage.getItem(KEY) ?? 'null') as ConsentRecord | null
    return record && record.version === CONSENT_VERSION ? record : null
  } catch {
    return null
  }
}

const functionalAllowed = () => readConsent()?.functional === true

/** Strážca: zápis funkčných kľúčov bez súhlasu sa zahodí (volá sa raz pri štarte appky). */
export function installStorageGuard() {
  if (!rawSet) return
  Storage.prototype.setItem = function guardedSetItem(this: Storage, key: string, value: string) {
    if (this === localStorage && isFunctionalKey(key) && !functionalAllowed()) return
    rawSet.call(this, key, value)
  }
}

/** Zmaže funkčné údaje (po odmietnutí alebo odvolaní súhlasu). */
export function clearFunctional() {
  try {
    for (const key of Object.keys(localStorage)) if (isFunctionalKey(key)) localStorage.removeItem(key)
  } catch {
    // bez úložiska nie je čo mazať
  }
}

const listeners = new Set<() => void>()
export const onConsentChange = (listener: () => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Uloží voľbu (verzia pravidiel + čas) a pri odmietnutí zmaže funkčné údaje. */
export function saveConsent(choice: Pick<ConsentChoice, 'functional'>): ConsentRecord {
  const record: ConsentRecord = { functional: choice.functional, analytics: false, marketing: false, version: CONSENT_VERSION, at: new Date().toISOString(), synced: false }
  try {
    rawSet?.call(localStorage, KEY, JSON.stringify(record))
  } catch {
    // bez úložiska platí voľba len do zatvorenia (lišta sa ukáže znova)
  }
  if (!record.functional) clearFunctional()
  listeners.forEach((listener) => listener())
  return record
}

export function markSynced() {
  const record = readConsent()
  if (!record || record.synced) return
  try {
    rawSet?.call(localStorage, KEY, JSON.stringify({ ...record, synced: true }))
  } catch {
    // nič
  }
}

/** Otvorí nastavenia súhlasu (odkaz v pätičke „Nastavenia ukladania“). */
export const openConsentSettings = () => window.dispatchEvent(new Event('rigtrack:consent-open'))
