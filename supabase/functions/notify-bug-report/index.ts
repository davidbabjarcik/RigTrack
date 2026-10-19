// RigTrack: e-mail o nahlásenej chybe (Supabase Edge Function, Deno).
//
// Aplikácia ju zavolá hneď po uložení hlásenia. Funkcia overí, že volá autor hlásenia,
// nájde príjemcov (vývojári aplikácie z app_developers a admini firmy) a pošle im e-mail cez Resend.
// Každé hlásenie sa ohlási len raz (notified_at).
//
// Nasadenie (raz):
//   supabase functions deploy notify-bug-report
//   supabase secrets set RESEND_API_KEY=re_... BUG_REPORT_FROM="RigTrack <chyby@tvoja-domena.sk>" APP_URL=https://<používateľ>.github.io/RigTrack
// SUPABASE_URL a SUPABASE_SERVICE_ROLE_KEY dodá Supabase sám; service-role kľúč nikdy neopúšťa server.

import { createClient } from 'jsr:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (request.method !== 'POST') return json(405, { error: 'Method not allowed' })

  const resendKey = Deno.env.get('RESEND_API_KEY')
  const from = Deno.env.get('BUG_REPORT_FROM')
  if (!resendKey || !from) return json(500, { error: 'E-mail nie je nastavený (RESEND_API_KEY, BUG_REPORT_FROM).' })

  const token = (request.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })
  const { data: caller } = await admin.auth.getUser(token)
  if (!caller.user) return json(401, { error: 'Neprihlásený' })

  let reportId = ''
  try {
    reportId = String((await request.json()).reportId ?? '')
  } catch {
    return json(400, { error: 'Chýba reportId' })
  }

  const { data: report } = await admin
    .from('bug_reports')
    .select('id, company_id, reporter_id, reporter_name, title, description, page_url, app_version, user_agent, screenshot_path, notified_at, created_at')
    .eq('id', reportId)
    .maybeSingle()
  // Ohlásiť smie len autor hlásenia, aby sa funkcia nedala zneužiť na rozosielanie.
  if (!report || report.reporter_id !== caller.user.id) return json(403, { error: 'Hlásenie nepatrí volajúcemu' })
  if (report.notified_at) return json(200, { sent: false, reason: 'already notified' })

  const developers = await admin.from('app_developers').select('user_id')
  const admins = report.company_id
    ? await admin.from('company_members').select('user_id').eq('company_id', report.company_id).in('role', ['admin', 'ceo'])
    : { data: [] as { user_id: string }[] }
  const ids = [...new Set([...(developers.data ?? []), ...(admins.data ?? [])].map((row) => row.user_id))]
  const { data: profiles } = await admin.from('profiles').select('email').in('id', ids)
  const to = [...new Set((profiles ?? []).map((row) => row.email as string).filter(Boolean))]
  if (to.length === 0) return json(200, { sent: false, reason: 'no recipients' })

  const company = report.company_id ? (await admin.from('companies').select('name').eq('id', report.company_id).maybeSingle()).data?.name : null
  const appUrl = (Deno.env.get('APP_URL') ?? '').replace(/\/$/, '')
  // Len čistý text: obsah hlásenia napísal používateľ, do HTML ho nevkladáme.
  const text = [
    `Nová nahlásená chyba v RigTracku${company ? ` (${company})` : ''}`,
    '',
    `Názov: ${report.title}`,
    `Nahlásil: ${report.reporter_name}`,
    `Kedy: ${new Date(report.created_at).toLocaleString('sk-SK', { timeZone: 'Europe/Bratislava' })}`,
    `Stránka: ${report.page_url}`,
    `Verzia: ${report.app_version}`,
    `Prehliadač: ${report.user_agent}`,
    report.screenshot_path ? 'Screenshot: priložený v aplikácii' : '',
    '',
    report.description,
    '',
    appUrl ? `Otvoriť hlásenia: ${appUrl}/bugs` : '',
  ]
    .filter((line, index, lines) => line !== '' || lines[index - 1] !== '')
    .join('\n')

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to, subject: `RigTrack – nahlásená chyba: ${report.title}`.slice(0, 200), text }),
  })
  if (!response.ok) return json(502, { error: 'E-mail sa nepodarilo odoslať', detail: await response.text() })

  await admin.from('bug_reports').update({ notified_at: new Date().toISOString() }).eq('id', report.id)
  return json(200, { sent: true, recipients: to.length })
})
