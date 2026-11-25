// Po nasadení novej verzie majú súbory stránok nové názvy. Otvorená stará verzia appky potom pri prechode na inú
// stránku siahne po súbore, ktorý už na serveri nie je („Failed to fetch dynamically imported module“). Vtedy stačí
// stránku raz obnoviť – načíta sa nová verzia. Aby sa to nezacyklilo, obnoví sa najviac raz za 30 sekúnd.

const KEY = 'rigtrack:stale-reload'
const PAUSE_MS = 30_000

// Keď sa stránka práve obnovuje na novú verziu, zlyhaný import stránky vráti prázdny modul a Safari hlási
// „undefined is not an object (evaluating '(await …import(…)).ChangelogPage')“. Taká chyba je len dôsledok
// obnovy – neukazuje sa ani neukladá.
let reloadingAt = 0
const RELOADING_MS = 15_000
export const staleReloadInProgress = () => reloadingAt > 0 && Date.now() - reloadingAt < RELOADING_MS

/** Chyba je „starý súbor po novej verzii“ (rôzne prehliadače ju hlásia inak) alebo jej dôsledok počas obnovy. */
export function isStaleChunkError(error: unknown): boolean {
  if (staleReloadInProgress()) return true
  const text = error instanceof Error ? `${error.name} ${error.message}` : String(error ?? '')
  return /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|ChunkLoadError|Unable to preload CSS|__vite__mapDeps/i.test(text)
}

/**
 * Offline úložisko appky (service worker) môže po novej verzii ešte podávať starú úvodnú stránku so starými názvami
 * súborov – obyčajné obnovenie potom nepomôže. Pred obnovením sa preto úložisko aktualizuje, a keď ani to nestačí,
 * vymaže (appka si ho pri ďalšom načítaní vytvorí znova). Dáta firmy sa tým nemažú – sú v databáze.
 */
export async function refreshOfflineCache(full: boolean) {
  try {
    const registrations = (await navigator.serviceWorker?.getRegistrations?.()) ?? []
    if (full) {
      await Promise.all(registrations.map((registration) => registration.unregister()))
      if (typeof caches !== 'undefined') await Promise.all((await caches.keys()).map((key) => caches.delete(key)))
    } else {
      await Promise.all(registrations.map((registration) => registration.update().catch(() => undefined)))
    }
  } catch {
    // Bez service workera stačí obyčajné obnovenie.
  }
}

const HARD_KEY = 'rigtrack:stale-hard-reload'

/** Druhý pokus, keď obyčajné obnovenie nepomohlo: vymaže offline úložisko a obnoví (najviac raz za 30 s). */
export function hardReloadForNewVersion(reload: () => void = () => window.location.reload()): boolean {
  try {
    if (Date.now() - Number(sessionStorage.getItem(HARD_KEY) ?? 0) < PAUSE_MS) return false
    sessionStorage.setItem(HARD_KEY, String(Date.now()))
  } catch {
    return false
  }
  void refreshOfflineCache(true).finally(reload)
  return true
}

/** Raz obnoví stránku; vráti false, ak sa už nedávno obnovovala (vtedy sa ukáže bežná chybová obrazovka). */
export function reloadForNewVersion(reload: () => void = () => window.location.reload()): boolean {
  let last = 0
  try {
    last = Number(sessionStorage.getItem(KEY) ?? 0)
  } catch {
    // bez úložiska rozhodne typ načítania nižšie
  }
  if (Date.now() - last < PAUSE_MS) return false
  // Keď sa úložisko nedá použiť a stránka sa práve obnovila, druhýkrát už nie.
  const navigation = performance.getEntriesByType?.('navigation')[0] as PerformanceNavigationTiming | undefined
  let stored: boolean
  try {
    sessionStorage.setItem(KEY, String(Date.now()))
    stored = sessionStorage.getItem(KEY) !== null
  } catch {
    stored = false
  }
  if (!stored && navigation?.type === 'reload') return false
  void refreshOfflineCache(false).finally(reload)
  return true
}

/** Vite hlási zlyhané načítanie súborov stránky udalosťou vite:preloadError. */
export function installStaleChunkReload() {
  window.addEventListener('vite:preloadError', (event) => {
    if (reloadForNewVersion()) {
      reloadingAt = Date.now()
      event.preventDefault()
    }
  })
}
