import { readFileSync } from 'node:fs'
import type { Page, Route } from '@playwright/test'

// Náhradný Supabase pre test v prehliadači: jeden prihlásený admin v jednej vymyslenej firme, inak prázdne dáta.
export const FAKE_SUPABASE = 'http://127.0.0.1:54321'
const USER_ID = '00000000-0000-4000-8000-000000000001'
export const COMPANY_ID = '00000000-0000-4000-8000-0000000000c1'
const user = { id: USER_ID, aud: 'authenticated', role: 'authenticated', email: 'tester@example.com', email_confirmed_at: '2026-01-01T00:00:00Z', app_metadata: { provider: 'email' }, user_metadata: { full_name: 'Tester' }, created_at: '2026-01-01T00:00:00Z' }

const base64url = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url')
const expiresAt = Math.floor(Date.now() / 1000) + 24 * 3600
const accessToken = `${base64url({ alg: 'HS256', typ: 'JWT' })}.${base64url({ sub: USER_ID, role: 'authenticated', aud: 'authenticated', exp: expiresAt, email: user.email })}.e2e`
const session = { access_token: accessToken, refresh_token: 'e2e-refresh', token_type: 'bearer', expires_in: 86400, expires_at: expiresAt, user }

const consentVersion = readFileSync('src/lib/consent.ts', 'utf8').match(/CONSENT_VERSION = '([^']+)'/)?.[1] ?? ''

/** Prihlásenie a súhlas sú už v prehliadači uložené – appka sa otvorí rovno vo firme. */
export async function signIn(page: Page) {
  await page.addInitScript(
    ({ session, consent, company }) => {
      localStorage.setItem('sb-127-auth-token', JSON.stringify(session))
      localStorage.setItem('rigtrack:consent', JSON.stringify({ functional: true, analytics: false, marketing: false, version: consent, at: new Date().toISOString(), synced: true }))
      localStorage.setItem('rigtrack:active-company', company)
    },
    { session, consent: consentVersion, company: COMPANY_ID },
  )
}

/** Odpovede pre tabuľky, ktoré appka pri štarte potrebuje vyplnené. */
function tableRows(table: string, fixtures: Record<string, unknown[]>): unknown[] {
  if (fixtures[table]) return fixtures[table]
  if (table === 'company_members') return [{ role: 'admin', company: { id: COMPANY_ID, name: 'Ukážková firma' }, user_id: USER_ID, company_id: COMPANY_ID }]
  if (table === 'profiles') return [{ id: USER_ID, full_name: 'Tester', email: user.email }]
  return []
}

const json = (route: Route, status: number, body: unknown, headers: Record<string, string> = {}) =>
  route.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*', 'access-control-expose-headers': 'content-range', ...headers }, body: JSON.stringify(body) })

/** Všetky volania na databázu: čítania vrátia prázdno, zápisy „prejdú“, nič neodíde von. */
export async function fakeBackend(page: Page, fixtures: Record<string, unknown[]> = {}) {
  const requests: string[] = []
  await page.route(`${FAKE_SUPABASE}/**`, async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    requests.push(`${request.method()} ${url.pathname}`)
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' } })
    if (url.pathname.startsWith('/auth/v1/user')) return json(route, 200, user)
    if (url.pathname.startsWith('/auth/v1/token')) return json(route, 200, session)
    if (url.pathname.startsWith('/auth/v1/')) return json(route, 200, {})
    if (url.pathname.startsWith('/storage/v1/')) return json(route, 200, [])
    if (url.pathname.startsWith('/functions/v1/')) return json(route, 200, {})
    if (url.pathname.startsWith('/rest/v1/rpc/')) {
      const name = url.pathname.split('/').pop()
      if (name === 'my_permissions') return json(route, 200, [])
      return json(route, 200, [])
    }
    if (url.pathname.startsWith('/rest/v1/')) {
      const table = url.pathname.slice('/rest/v1/'.length)
      if (request.method() === 'HEAD') return route.fulfill({ status: 200, headers: { 'content-range': '0-0/0', 'access-control-allow-origin': '*', 'access-control-expose-headers': 'content-range' } })
      if (request.method() !== 'GET') return json(route, 201, [])
      const rows = tableRows(table, fixtures)
      // .single() / .maybeSingle(): jeden riadok, alebo „nenájdené“ (maybeSingle z toho spraví null).
      if ((request.headers()['accept'] ?? '').includes('vnd.pgrst.object')) {
        return rows.length === 1 ? json(route, 200, rows[0]) : json(route, 406, { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned', details: 'The result contains 0 rows', hint: null })
      }
      return json(route, 200, rows, { 'content-range': `0-${Math.max(rows.length - 1, 0)}/${rows.length}` })
    }
    return route.fulfill({ status: 404, body: '' })
  })
  // Živé zmeny (realtime) v teste netreba.
  await page.routeWebSocket(/\/realtime\//, (ws) => ws.close())
  return requests
}
