// RigTrack: push notifikácie na mobil (Supabase Edge Function, Deno).
//
// GET  → verejný VAPID kľúč (appka ho potrebuje na prihlásenie mobilu na upozornenia).
// POST → volá ho databáza (spúšťač z migrácie 0088 cez pg_net, alebo Database Webhook) pri novom riadku
//        v public.notifications; pošle upozornenie na všetky mobily daného človeka a odbery, ktoré už
//        neplatia (mobil sa odhlásil), zmaže.
//
// Nastavenie (raz): v appke Nastavenia → Vývojár → „Push upozornenia – nastavenie“ – sprievodca vygeneruje
// kľúče, dá odkazy do Supabase a SQL pre Vault. Funkcia musí mať vypnuté overovanie JWT (Verify JWT).

import { createClient } from 'jsr:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

type Notification = { id: string; user_id: string; title: string; body: string; url: string }

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const publicKey = Deno.env.get('VAPID_PUBLIC_KEY')
  const privateKey = Deno.env.get('VAPID_PRIVATE_KEY')
  if (!publicKey || !privateKey) return json(500, { error: 'Push nie je nastavený (VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY).' })

  // Verejný kľúč nie je tajomstvo – appka si ho vypýta pri zapnutí upozornení.
  if (request.method === 'GET') return json(200, { publicKey })
  if (request.method !== 'POST') return json(405, { error: 'Method not allowed' })

  // Volať smie len Database Webhook so spoločným tajomstvom.
  const secret = Deno.env.get('PUSH_WEBHOOK_SECRET')
  if (!secret || request.headers.get('x-webhook-secret') !== secret) return json(401, { error: 'Neplatné tajomstvo webhooku' })

  let record: Notification | null = null
  try {
    record = (await request.json()).record as Notification
  } catch {
    return json(400, { error: 'Chýba záznam' })
  }
  if (!record?.user_id) return json(400, { error: 'Chýba záznam' })

  webpush.setVapidDetails(Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@example.com', publicKey, privateKey)
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })
  const { data: subscriptions } = await admin.from('push_subscriptions').select('id, endpoint, p256dh, auth').eq('user_id', record.user_id)

  const payload = JSON.stringify({ title: record.title, body: record.body, url: record.url, tag: record.id })
  let sent = 0
  const gone: string[] = []
  for (const subscription of subscriptions ?? []) {
    try {
      await webpush.sendNotification({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } }, payload, { TTL: 24 * 3600 })
      sent += 1
    } catch (error) {
      const status = (error as { statusCode?: number }).statusCode
      // 404 / 410 = odber už neexistuje (odinštalovaná appka, zrušené povolenie).
      if (status === 404 || status === 410) gone.push(subscription.id)
    }
  }
  if (gone.length > 0) await admin.from('push_subscriptions').delete().in('id', gone)
  await admin.from('notifications').update({ sent_at: new Date().toISOString() }).eq('id', record.id)
  return json(200, { sent, removed: gone.length })
})
