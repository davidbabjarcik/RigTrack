// Môj kalendár naprieč firmami: akcie, kde som v posádke, a ktoré sa časovo prekrývajú.
import { useQuery } from '@tanstack/react-query'
import { getSupabase } from '@/lib/supabase/client'

export type MyEvent = {
  id: string
  companyId: string
  name: string
  startsOn: string
  endsOn: string
  venue: string
  cancelled: boolean
  /** Moja odpoveď v posádke. */
  response: 'pending' | 'yes' | 'no'
}

/** Ku každej akcii tie, s ktorými sa prekrýva (zrušené a odmietnuté sa nerátajú). */
export function overlaps(events: MyEvent[]): Map<string, MyEvent[]> {
  const live = events.filter((event) => !event.cancelled && event.response !== 'no')
  const result = new Map<string, MyEvent[]>()
  for (const event of live) {
    const clash = live.filter((other) => other.id !== event.id && other.startsOn <= event.endsOn && other.endsOn >= event.startsOn)
    if (clash.length > 0) result.set(event.id, clash)
  }
  return result
}

/** Akcie zoskupené po mesiacoch („2026-11“), zoradené podľa začiatku. */
export function byMonth(events: MyEvent[]) {
  const groups = new Map<string, MyEvent[]>()
  for (const event of [...events].sort((a, b) => a.startsOn.localeCompare(b.startsOn) || a.name.localeCompare(b.name, 'sk'))) {
    const key = event.startsOn.slice(0, 7)
    groups.set(key, [...(groups.get(key) ?? []), event])
  }
  return [...groups]
}

export async function fetchMyEvents(userId: string): Promise<MyEvent[]> {
  const db = getSupabase()
  const crew = await db.from('event_crew').select('event_id, response').eq('member_id', userId)
  if (crew.error) throw crew.error
  const rows = crew.data as { event_id: string; response: MyEvent['response'] }[]
  const ids = [...new Set(rows.map((row) => row.event_id))]
  if (ids.length === 0) return []
  const events = await db.from('events').select('id, company_id, name, starts_on, ends_on, venue, status').in('id', ids)
  if (events.error) throw events.error
  return (events.data as { id: string; company_id: string; name: string; starts_on: string; ends_on: string; venue: string; status: string }[]).map((row) => ({
    id: row.id,
    companyId: row.company_id,
    name: row.name,
    startsOn: row.starts_on,
    endsOn: row.ends_on,
    venue: row.venue,
    cancelled: row.status === 'cancelled',
    response: rows.find((item) => item.event_id === row.id)?.response ?? 'pending',
  }))
}

export function useMyEvents(userId: string) {
  return useQuery({ queryKey: ['my-events', userId], queryFn: () => fetchMyEvents(userId), retry: false, staleTime: 60_000 })
}
