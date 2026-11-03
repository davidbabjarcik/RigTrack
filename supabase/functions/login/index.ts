// RigTrack: prihlásenie s ochranou pred hádaním hesiel (Supabase Edge Function, Deno).
//
// POST { action: 'status', email? }          → { lockedUntil } – či je prihlásenie z tejto IP (a e-mailu) zablokované
// POST { email, password, captchaToken? }    → session zo Supabase Auth, alebo 401 / 429 { lockedUntil }
//
// Blokovanie je v databáze (migrácia 0134): 5 zlých pokusov na účet z jednej IP → 5 min, viac IP na jeden účet
// alebo veľa účtov z jednej IP tiež. Počas bloku sa heslo vôbec neoveruje (ani správne). Odpovede neprezrádzajú,
// či účet existuje. E-mail a IP sa ukladajú len ako HMAC odtlačok. Funkcia musí mať vypnuté overovanie JWT.

import { createClient } from 'jsr:@supabase/supabase-js@2'

const DEFAULT_ORIGINS = ['https://davidbabjarcik.github.io', 'http://localhost:5173', 'http://localhost:4173']
const allowedOrigins = (Deno.env.get('ALLOWED_ORIGINS') ?? '').split(',').map((value) => value.trim()).filter(Boolean)
const origins = allowedOrigins.length > 0 ? allowedOrigins : DEFAULT_ORIGINS

function corsFor(request: Request) {
  const origin = request.headers.get('origin') ?? ''
  return {
    'Access-Control-Allow-Origin': origins.includes(origin) ? origin : origins[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  }
}

const encoder = new TextEncoder()
let hmacKey: CryptoKey | null = null
async function fingerprint(value: string) {
  if (!hmacKey) {
    const secret = Deno.env.get('LOGIN_GUARD_SECRET') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    hmacKey = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  }
  const signature = await crypto.subtle.sign('HMAC', hmacKey, encoder.encode(value))
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, '0')).join('').slice(0, 64)
}

function clientIp(request: Request) {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  return forwarded || request.headers.get('cf-connecting-ip') || request.headers.get('x-real-ip') || 'unknown'
}

const LOCKED_MESSAGE = 'Príliš veľa neúspešných pokusov o prihlásenie. Z bezpečnostných dôvodov je prihlasovanie dočasne zablokované.'

Deno.serve(async (request) => {
  const cors = corsFor(request)
  const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (request.method !== 'POST') return json(405, { error: 'Method not allowed' })

  const url = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !anonKey || !serviceKey) return json(500, { error: 'Prihlásenie nie je nastavené.' })
  const db = createClient(url, serviceKey, { auth: { persistSession: false } })

  let body: { action?: string; email?: unknown; password?: unknown; captchaToken?: unknown }
  try {
    body = await request.json()
  } catch {
    return json(400, { error: 'Neplatná požiadavka.' })
  }
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase().slice(0, 320) : ''
  const ipHash = await fingerprint(`ip:${clientIp(request)}`)
  const emailHash = email ? await fingerprint(`email:${email}`) : ''

  // Stav blokovania (napr. po obnovení stránky) – zostávajúci čas podľa servera.
  if (body.action === 'status') {
    const { data, error } = email
      ? await db.rpc('login_guard_status', { _email_hash: emailHash, _ip_hash: ipHash })
      : await db.rpc('login_guard_ip_status', { _ip_hash: ipHash })
    if (error) return json(500, { error: 'Stav sa nepodarilo zistiť.' })
    return json(200, { lockedUntil: data ?? null, now: new Date().toISOString() })
  }

  const password = typeof body.password === 'string' ? body.password : ''
  if (!email || !password || password.length > 200) return json(400, { error: 'Zadajte e-mail a heslo.' })

  // Počas bloku sa heslo neoveruje vôbec.
  const locked = await db.rpc('login_guard_status', { _email_hash: emailHash, _ip_hash: ipHash })
  if (locked.error) return json(500, { error: 'Prihlásenie sa teraz nedá overiť. Skúste to o chvíľu.' })
  if (locked.data) return json(429, { error: LOCKED_MESSAGE, lockedUntil: locked.data, now: new Date().toISOString() })

  const response = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: anonKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password,
      ...(typeof body.captchaToken === 'string' && body.captchaToken ? { gotrue_meta_security: { captcha_token: body.captchaToken } } : {}),
    }),
  })
  const result = await response.json().catch(() => ({}))

  if (response.ok) {
    await db.rpc('login_guard_success', { _email_hash: emailHash, _ip_hash: ipHash })
    return json(200, { session: { access_token: result.access_token, refresh_token: result.refresh_token } })
  }

  const code = String(result.error_code ?? result.code ?? '')
  // Správne heslo, len nepotvrdený e-mail – nie je to zlý pokus.
  if (code === 'email_not_confirmed') return json(400, { error: 'Najprv potvrďte e-mail odkazom, ktorý sme vám poslali.', code })
  if (code === 'captcha_failed') return json(400, { error: 'Overenie, že nie ste robot, zlyhalo. Skúste to znova.', code })
  if (response.status === 429) return json(429, { error: 'Príliš veľa pokusov. Skúste to o chvíľu.' })
  if (response.status === 400 || response.status === 401 || response.status === 422) {
    const { data: until } = await db.rpc('login_guard_fail', { _email_hash: emailHash, _ip_hash: ipHash })
    if (until) return json(429, { error: LOCKED_MESSAGE, lockedUntil: until, now: new Date().toISOString() })
    // Rovnaká odpoveď pre neexistujúci účet aj zlé heslo.
    return json(401, { error: 'Nesprávny e-mail alebo heslo.' })
  }
  return json(502, { error: 'Prihlásenie zlyhalo. Skúste to znova.' })
})
