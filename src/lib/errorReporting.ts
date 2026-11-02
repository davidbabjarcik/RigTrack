import { getSupabase } from '@/lib/supabase/client'
import { APP_VERSION } from '@/lib/version'

export type ErrorSource = 'render' | 'error' | 'promise'

/** Chyby, ktoré nič nepokazili a len by zahlcovali prehľad (prehliadač, rozšírenia, zrušené požiadavky). */
const IGNORED = [/ResizeObserver loop/i, /^Script error\.?$/i, /AbortError/i, /The user aborted a request/i, /Load failed$/i, /NetworkError when attempting to fetch/i, /Failed to fetch$/i]

/** Text a zásobník z čohokoľvek, čo sa dá „vyhodiť“. */
export function describeError(error: unknown): { message: string; stack: string } {
  if (error instanceof Error) return { message: `${error.name}: ${error.message}`.slice(0, 1000), stack: (error.stack ?? '').slice(0, 8000) }
  if (typeof error === 'string') return { message: error.slice(0, 1000), stack: '' }
  if (error && typeof error === 'object' && 'message' in error) return { message: String((error as { message: unknown }).message).slice(0, 1000), stack: '' }
  try {
    return { message: JSON.stringify(error).slice(0, 1000) || 'Neznáma chyba', stack: '' }
  } catch {
    return { message: 'Neznáma chyba', stack: '' }
  }
}

export function shouldIgnore(message: string) {
  return IGNORED.some((pattern) => pattern.test(message))
}

const sent = new Set<string>()

function activeCompany() {
  try {
    return localStorage.getItem('rigtrack:active-company')
  } catch {
    return null
  }
}

/** Uloží chybu pre vývojára. Tá istá chyba sa za jedno otvorenie appky pošle len raz; neprihlásený nič nepošle. */
export function reportError(error: unknown, source: ErrorSource = 'error') {
  const { message, stack } = describeError(error)
  if (shouldIgnore(message)) return
  const key = `${message}|${stack.split('\n')[1] ?? ''}`
  if (sent.has(key) || sent.size >= 30) return
  sent.add(key)
  if (import.meta.env.DEV) return
  try {
    void getSupabase()
      .rpc('report_app_error', {
        _message: message,
        _stack: stack,
        _source: source,
        _page_url: (window.location.pathname + window.location.search).slice(0, 500),
        _app_version: APP_VERSION,
        _user_agent: navigator.userAgent.slice(0, 400),
        _company_id: activeCompany(),
      })
      .then(
        () => {},
        () => {},
      )
  } catch {
    // Hlásenie chyby nesmie spôsobiť ďalšiu chybu.
  }
}

/** Zachytí neošetrené chyby v prehliadači (volá sa raz pri štarte). */
export function installErrorReporting() {
  window.addEventListener('error', (event) => reportError(event.error ?? event.message, 'error'))
  window.addEventListener('unhandledrejection', (event) => reportError(event.reason, 'promise'))
}
