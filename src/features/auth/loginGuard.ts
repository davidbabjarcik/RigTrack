import { getSupabase } from '@/lib/supabase/client'

// Prihlásenie cez Edge Function `login` (migrácia 0134): blokovanie po zlých pokusoch rieši server, appka len
// ukazuje zostávajúci čas. Čas sa počíta od serverového času, takže ho neovplyvní ani posunuté hodiny v zariadení.

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined
/** Cloudflare Turnstile – verejný site key (prázdny VITE_TURNSTILE_SITE_KEY = bez overenia, napr. vlastné nasadenie). */
export const TURNSTILE_SITE_KEY = ((import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined) ?? '0x4AAAAAAFxqGMPpz_A-Wln_').trim()
/** E-mail, pri ktorom vznikol blok – aby odpočet pokračoval aj po obnovení stránky (len kým blok trvá). */
const LOCK_KEY = 'rigtrack:login-lock'

export type Lock = { until: number }

/** Koniec bloku v čase tohto zariadenia (podľa rozdielu oproti serveru). */
function toLock(lockedUntil: string | null | undefined, serverNow: string | undefined): Lock | null {
  if (!lockedUntil) return null
  const offset = serverNow ? Date.now() - Date.parse(serverNow) : 0
  return { until: Date.parse(lockedUntil) + offset }
}

async function call(body: Record<string, unknown>) {
  const response = await fetch(`${url}/functions/v1/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: key ?? '' },
    body: JSON.stringify(body),
  })
  const data = (await response.json().catch(() => ({}))) as { error?: string; code?: string; lockedUntil?: string | null; now?: string; session?: { access_token: string; refresh_token: string } }
  return { status: response.status, data }
}

function rememberLock(email: string | null) {
  try {
    if (email) localStorage.setItem(LOCK_KEY, email)
    else localStorage.removeItem(LOCK_KEY)
  } catch {
    // bez úložiska sa po obnovení stránky ukáže blok až pri ďalšom pokuse (server ho drží tak či tak)
  }
}

/** Je prihlásenie práve zablokované? (pri otvorení stránky: e-mail z posledného bloku, inak celá IP) */
export async function loginLockStatus(): Promise<Lock | null> {
  let email: string | null = null
  try {
    email = localStorage.getItem(LOCK_KEY)
  } catch {
    // bez úložiska sa pýtame len na blok celej IP
  }
  try {
    const { status, data } = await call({ action: 'status', ...(email ? { email } : {}) })
    if (status !== 200) return null
    const lock = toLock(data.lockedUntil, data.now)
    if (!lock) rememberLock(null)
    return lock
  } catch {
    return null
  }
}

export type SignInResult = { ok: true } | { ok: false; message: string; lock?: Lock | null; code?: string }

/** Prihlásenie s ochranou; bez nasadenej funkcie (404) klasicky cez Supabase Auth. */
export async function signInGuarded(email: string, password: string, captchaToken?: string): Promise<SignInResult> {
  let response: Awaited<ReturnType<typeof call>>
  try {
    response = await call({ email, password, ...(captchaToken ? { captchaToken } : {}) })
  } catch {
    return { ok: false, message: 'Prihlásenie zlyhalo – skontrolujte pripojenie a skúste to znova.' }
  }
  const { status, data } = response
  if (status === 404) {
    const { error } = await getSupabase().auth.signInWithPassword({ email, password, options: { captchaToken } })
    if (!error) return { ok: true }
    return { ok: false, code: error.code, message: error.code === 'email_not_confirmed' ? 'Najprv potvrďte e-mail odkazom, ktorý sme vám poslali.' : error.status === 400 ? 'Nesprávny e-mail alebo heslo.' : 'Prihlásenie zlyhalo. Skúste to znova.' }
  }
  if (status === 200 && data.session) {
    const { error } = await getSupabase().auth.setSession(data.session)
    if (error) return { ok: false, message: 'Prihlásenie zlyhalo. Skúste to znova.' }
    rememberLock(null)
    return { ok: true }
  }
  const lock = toLock(data.lockedUntil, data.now)
  if (lock) rememberLock(email.trim().toLowerCase())
  return { ok: false, message: data.error ?? 'Prihlásenie zlyhalo. Skúste to znova.', lock, code: data.code }
}

/** „04:59“ */
export function formatRemaining(ms: number) {
  const seconds = Math.max(0, Math.ceil(ms / 1000))
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
}
