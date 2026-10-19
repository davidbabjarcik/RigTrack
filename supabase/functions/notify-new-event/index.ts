// RigTrack: e-mail o novom evente (Supabase Edge Function, Deno).
//
// Aplikácia ju zavolá po založení eventu. Funkcia overí, že volajúci je členom firmy, a pošle e-mail
// adminom a CEO firmy, ktorí si v Nastaveniach → Účet zapli „E-mail pri novom evente“.
// Každý event sa ohlási len raz (events.emailed_at).
//
// Nasadenie (raz): supabase functions deploy notify-new-event
// Používa rovnaké tajomstvá ako notify-bug-report (RESEND_API_KEY, BUG_REPORT_FROM, APP_URL).

import { createClient } from 'jsr:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

const date = (iso: string) => iso.split('-').reverse().map(Number).join('. ')

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

  let eventId = ''
  try {
    eventId = String((await request.json()).eventId ?? '')
  } catch {
    return json(400, { error: 'Chýba eventId' })
  }

  const { data: event } = await admin
    .from('events')
    .select('id, company_id, name, venue, client, starts_on, ends_on, emailed_at')
    .eq('id', eventId)
    .maybeSingle()
  if (!event) return json(404, { error: 'Event neexistuje' })
  const { data: membership } = await admin.from('company_members').select('user_id').eq('company_id', event.company_id).eq('user_id', caller.user.id).maybeSingle()
  if (!membership) return json(403, { error: 'Volajúci nie je členom firmy' })
  if (event.emailed_at) return json(200, { sent: false, reason: 'already notified' })

  const { data: leaders } = await admin.from('company_members').select('user_id').eq('company_id', event.company_id).in('role', ['admin', 'ceo'])
  const { data: prefs } = await admin.from('notification_prefs').select('user_id').eq('company_id', event.company_id).eq('email_new_event', true)
  const wanted = new Set((prefs ?? []).map((row) => row.user_id))
  const ids = (leaders ?? []).map((row) => row.user_id).filter((id) => wanted.has(id) && id !== caller.user!.id)
  if (ids.length === 0) return json(200, { sent: false, reason: 'no recipients' })
  const { data: profiles } = await admin.from('profiles').select('id, email, full_name').in('id', [...ids, caller.user.id])
  const author = (profiles ?? []).find((row) => row.id === caller.user!.id)
  const recipients = [...new Set((profiles ?? []).filter((row) => ids.includes(row.id)).map((row) => row.email as string).filter(Boolean))]
  if (recipients.length === 0) return json(200, { sent: false, reason: 'no recipients' })

  const { data: company } = await admin.from('companies').select('name').eq('id', event.company_id).maybeSingle()
  const appUrl = (Deno.env.get('APP_URL') ?? '').replace(/\/$/, '')
  const when = event.starts_on === event.ends_on ? date(event.starts_on) : `${date(event.starts_on)} – ${date(event.ends_on)}`
  const text = [
    `Nový event vo firme ${company?.name ?? ''}`.trim(),
    '',
    `Názov: ${event.name}`,
    `Termín: ${when}`,
    event.venue ? `Miesto: ${event.venue}` : '',
    event.client ? `Klient: ${event.client}` : '',
    `Pridal: ${author?.full_name || caller.user.email}`,
    '',
    appUrl ? `Otvoriť: ${appUrl}/events/${event.id}` : '',
    '',
    'E-maily o nových eventoch vypnete v RigTracku: Nastavenia → Účet.',
  ]
    .filter((line, index, lines) => line !== '' || lines[index - 1] !== '')
    .join('\n')

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: recipients, subject: `RigTrack – nový event: ${event.name} (${when})`.slice(0, 200), text }),
  })
  if (!response.ok) return json(502, { error: 'E-mail sa nepodarilo odoslať', detail: await response.text() })

  await admin.from('events').update({ emailed_at: new Date().toISOString() }).eq('id', event.id)
  return json(200, { sent: true, recipients: recipients.length })
})
