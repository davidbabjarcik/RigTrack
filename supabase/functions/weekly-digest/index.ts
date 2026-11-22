// RigTrack: týždenný e-mail (Supabase Edge Function, Deno).
//
// Databáza ju v pondelok ráno zavolá sama (pg_cron + pg_net, migrácia 0188) s hlavičkou x-webhook-secret.
// Podklady pripraví funkcia public.weekly_digest() – len pre ľudí, ktorí si e-mail zapli v Nastaveniach → Účet,
// a len to, na čo majú vo firme oprávnenie. Tu sa z nich zloží text a pošle cez Resend.
//
// Nasadenie (raz): supabase functions deploy weekly-digest --no-verify-jwt
// Tajomstvá: RESEND_API_KEY, BUG_REPORT_FROM, APP_URL (rovnaké ako pri ostatných e-mailoch) a WEEKLY_DIGEST_SECRET
// alebo PUSH_WEBHOOK_SECRET (to isté, čo je vo Vault).

import { createClient } from 'jsr:@supabase/supabase-js@2'

type Digest = {
  email: string
  name: string
  company: string
  companyId: string
  today: string
  events: { id: string; name: string; startsOn: string; endsOn: string; venue: string }[]
  invoices: { id: string; number: string; client: string | null; total: number; dueOn: string }[]
  maintenance: { equipmentId: string; name: string; rule: string; unit: number | null; state: string; dueOn: string | null }[]
  tasks: { id: string; title: string; dueOn: string; priority: string }[]
}

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
const date = (iso: string) => iso.split('-').reverse().map(Number).join('. ')
const money = (value: number) => `${Number(value).toFixed(2).replace('.', ',')} €`

/** Porovnanie tajomstva v konštantnom čase. */
function sameSecret(a: string, b: string) {
  if (!a || !b || a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

export function digestText(digest: Digest, appUrl: string) {
  const link = (path: string) => (appUrl ? `  ${appUrl}${path}` : '')
  const lines: string[] = [`Dobrý deň${digest.name ? `, ${digest.name}` : ''},`, '', `prehľad týždňa vo firme ${digest.company}:`, '']
  if (digest.events.length > 0) {
    lines.push(`AKCIE NA NAJBLIŽŠÍ TÝŽDEŇ (${digest.events.length})`)
    for (const event of digest.events) {
      const when = event.startsOn === event.endsOn ? date(event.startsOn) : `${date(event.startsOn)} – ${date(event.endsOn)}`
      lines.push(`- ${when}: ${event.name}${event.venue ? ` (${event.venue})` : ''}`, link(`/events/${event.id}`))
    }
    lines.push('')
  }
  if (digest.tasks.length > 0) {
    lines.push(`MOJE ÚLOHY (${digest.tasks.length})`)
    for (const task of digest.tasks) lines.push(`- ${task.dueOn < digest.today ? 'po termíne ' : 'do '}${date(task.dueOn)}: ${task.title}`)
    lines.push(link('/tasks'), '')
  }
  if (digest.invoices.length > 0) {
    lines.push(`FAKTÚRY PO SPLATNOSTI (${digest.invoices.length})`)
    for (const invoice of digest.invoices) {
      lines.push(`- ${invoice.number}${invoice.client ? ` · ${invoice.client}` : ''} · ${money(invoice.total)} · splatná ${date(invoice.dueOn)}`, link(`/invoices/${invoice.id}`))
    }
    lines.push('')
  }
  if (digest.maintenance.length > 0) {
    lines.push(`SERVIS A REVÍZIE (${digest.maintenance.length})`)
    for (const item of digest.maintenance) {
      const state = item.state === 'soon' ? 'čoskoro' : item.state === 'failed' ? 'neprešlo' : 'po termíne'
      lines.push(`- ${item.name}${item.unit ? ` #${item.unit}` : ''} – ${item.rule} (${state}${item.dueOn ? `, ${date(item.dueOn)}` : ''})`)
    }
    lines.push(link('/checks'), '')
  }
  lines.push('Týždenný e-mail vypnete v RigTracku: Nastavenia → Účet.')
  return lines.filter((line, index, all) => line !== '' || all[index - 1] !== '').join('\n')
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return json(405, { error: 'Method not allowed' })
  const secret = Deno.env.get('WEEKLY_DIGEST_SECRET') || Deno.env.get('PUSH_WEBHOOK_SECRET') || ''
  if (!sameSecret(request.headers.get('x-webhook-secret') ?? '', secret)) return json(401, { error: 'Unauthorized' })

  const resendKey = Deno.env.get('RESEND_API_KEY')
  const from = Deno.env.get('BUG_REPORT_FROM')
  if (!resendKey || !from) return json(500, { error: 'E-mail nie je nastavený (RESEND_API_KEY, BUG_REPORT_FROM).' })
  const appUrl = (Deno.env.get('APP_URL') ?? '').replace(/\/$/, '')

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })
  const { data, error } = await admin.rpc('weekly_digest')
  if (error) return json(500, { error: 'Podklady sa nepodarilo načítať' })

  let sent = 0
  let failed = 0
  for (const digest of (data ?? []) as Digest[]) {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [digest.email], subject: `RigTrack – prehľad týždňa (${digest.company})`.slice(0, 200), text: digestText(digest, appUrl) }),
    })
    if (response.ok) sent++
    else failed++
  }
  return json(200, { sent, failed })
})
