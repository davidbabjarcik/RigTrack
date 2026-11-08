// RigTrack: kalendár eventov na odber (Supabase Edge Function, Deno).
//
// Kalendárové appky (Google, Apple, Outlook, TickTick…) sa neprihlasujú – odkaz obsahuje tajný kľúč,
// ktorý si používateľ vytvoril v appke. Funkcia ho overí v databáze (calendar_feed_events) a vráti .ics.
// Neplatný alebo zrušený odkaz = prázdny kalendár (nič neprezradí).
//
// Nasadenie: supabase functions deploy calendar-feed --no-verify-jwt

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { buildFeed, isFeedToken, type FeedEvent } from './feed.ts'

Deno.serve(async (request) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') return new Response('Method not allowed', { status: 405 })
  const url = new URL(request.url)
  // Kľúč v ?t=… alebo na konci cesty (…/calendar-feed/<kľúč>.ics) – niektoré appky chcú koncovku .ics.
  const token = (url.searchParams.get('t') ?? url.pathname.split('/').pop() ?? '').replace(/\.ics$/, '').toLowerCase()
  let events: FeedEvent[] = []
  if (isFeedToken(token)) {
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })
    const { data, error } = await admin.rpc('calendar_feed_events', { _token: token })
    if (error) return new Response('Kalendár sa nepodarilo načítať.', { status: 503, headers: { 'Retry-After': '600' } })
    events = (data ?? []) as FeedEvent[]
  }
  return new Response(request.method === 'HEAD' ? null : buildFeed(events), {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="rigtrack.ics"',
      'Cache-Control': 'private, max-age=900',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
    },
  })
})
