import { useQuery } from '@tanstack/react-query'
import { getSupabase } from '@/lib/supabase/client'

export type FeedScope = 'mine' | 'all'
export type CalendarFeed = { id: string; scope: FeedScope; createdAt: string; lastUsedAt: string | null }

export const feedKeys = { list: (companyId: string) => ['company', companyId, 'calendar-feeds'] as const }

/** Moje odkazy na kalendár v tejto firme (0167); bez migrácie prázdne. */
export async function fetchCalendarFeeds(companyId: string): Promise<CalendarFeed[]> {
  const { data, error } = await getSupabase().from('calendar_feeds').select('id, scope, created_at, last_used_at').eq('company_id', companyId).order('created_at')
  if (error) throw error
  return (data as { id: string; scope: FeedScope; created_at: string; last_used_at: string | null }[]).map((row) => ({ id: row.id, scope: row.scope, createdAt: row.created_at, lastUsedAt: row.last_used_at }))
}

export function useCalendarFeeds(companyId: string) {
  return useQuery({ queryKey: feedKeys.list(companyId), queryFn: () => fetchCalendarFeeds(companyId), retry: false })
}

/** Nový tajný odkaz (starý rovnakého druhu prestane fungovať). Kľúč sa ukáže len teraz – v databáze je iba odtlačok. */
export async function createCalendarFeed(companyId: string, scope: FeedScope, appUrl: string) {
  const { data, error } = await getSupabase().rpc('create_calendar_feed', { _company_id: companyId, _scope: scope, _app_url: appUrl })
  if (error) throw error
  return feedUrl(data as string)
}

export async function deleteCalendarFeed(id: string) {
  const { error } = await getSupabase().from('calendar_feeds').delete().eq('id', id)
  if (error) throw error
}

/** Adresa kalendára (Edge funkcia calendar-feed) – koncovka .ics kvôli appkám, ktoré ju vyžadujú. */
export function feedUrl(token: string, base = import.meta.env.VITE_SUPABASE_URL as string | undefined) {
  return `${(base ?? '').replace(/\/$/, '')}/functions/v1/calendar-feed/${token}.ics`
}

/** webcal:// otvorí odber priamo v kalendári telefónu (iPhone, Mac, Outlook). */
export const webcalUrl = (url: string) => url.replace(/^https?:\/\//, 'webcal://')
/** Google Kalendár: otvorí potvrdenie odberu (webcal:// nezakódovaný – v tomto tvare ho Google prijme). */
export const googleSubscribeUrl = (url: string) => `https://www.google.com/calendar/render?cid=${webcalUrl(url)}`
