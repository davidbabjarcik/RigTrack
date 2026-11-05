// Po nasadení novej verzie majú súbory stránok nové názvy. Otvorená stará verzia appky potom pri prechode na inú
// stránku siahne po súbore, ktorý už na serveri nie je („Failed to fetch dynamically imported module“). Vtedy stačí
// stránku raz obnoviť – načíta sa nová verzia. Aby sa to nezacyklilo, obnoví sa najviac raz za 30 sekúnd.

const KEY = 'rigtrack:stale-reload'
const PAUSE_MS = 30_000

/** Chyba je „starý súbor po novej verzii“ (rôzne prehliadače ju hlásia inak). */
export function isStaleChunkError(error: unknown): boolean {
  const text = error instanceof Error ? `${error.name} ${error.message}` : String(error ?? '')
  return /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|ChunkLoadError|Unable to preload CSS/i.test(text)
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
  reload()
  return true
}

/** Vite hlási zlyhané načítanie súborov stránky udalosťou vite:preloadError. */
export function installStaleChunkReload() {
  window.addEventListener('vite:preloadError', (event) => {
    if (reloadForNewVersion()) event.preventDefault()
  })
}
