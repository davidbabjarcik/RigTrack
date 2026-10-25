// Zvonček: moje upozornenia zo všetkých firiem (rovnaké, aké chodia ako push), prečítané a zmazanie (0090).
import { useQuery } from '@tanstack/react-query'
import { getSupabase } from '@/lib/supabase/client'

export type InboxItem = { id: string; companyId: string | null; title: string; body: string; url: string; createdAt: string; readAt: string | null }

export const inboxKeys = { all: (userId: string) => ['inbox', userId] as const }

const SHOWN = 40

export async function fetchInbox(userId: string): Promise<InboxItem[]> {
  const { data, error } = await getSupabase()
    .from('notifications')
    .select('id, company_id, title, body, url, created_at, read_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(SHOWN)
  if (error) throw error
  return (data as { id: string; company_id: string | null; title: string; body: string; url: string; created_at: string; read_at: string | null }[]).map((row) => ({
    id: row.id,
    companyId: row.company_id,
    title: row.title,
    body: row.body,
    url: row.url,
    createdAt: row.created_at,
    readAt: row.read_at,
  }))
}

/** Bez migrácie 0090 (stĺpec read_at) sa zvonček nezobrazí. */
export function useInbox(userId: string | undefined) {
  return useQuery({
    queryKey: inboxKeys.all(userId ?? ''),
    queryFn: () => fetchInbox(userId!),
    enabled: Boolean(userId),
    retry: false,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  })
}

export async function markRead(ids: string[]) {
  if (ids.length === 0) return
  const { error } = await getSupabase().from('notifications').update({ read_at: new Date().toISOString() }).in('id', ids)
  if (error) throw error
}

export async function deleteNotifications(ids: string[]) {
  if (ids.length === 0) return
  const { error } = await getSupabase().from('notifications').delete().in('id', ids)
  if (error) throw error
}

/** „pred 5 min“, „pred 3 h“, „včera“, inak dátum. */
export function timeAgo(iso: string, now = Date.now()) {
  const minutes = Math.max(0, Math.round((now - Date.parse(iso)) / 60_000))
  if (minutes < 1) return 'teraz'
  if (minutes < 60) return `pred ${minutes} min`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `pred ${hours} h`
  if (hours < 48) return 'včera'
  return new Date(iso).toLocaleDateString('sk-SK', { day: 'numeric', month: 'numeric' })
}
