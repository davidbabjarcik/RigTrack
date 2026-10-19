import { useQuery } from '@tanstack/react-query'
import { getSupabase } from '@/lib/supabase/client'

export type NewsItem = { id: string; kind: 'event' | 'crew' | 'other'; title: string; link: string; actorId: string | null; actorName: string; createdAt: string }

export const newsKeys = {
  list: (companyId: string) => ['company', companyId, 'news'] as const,
  read: (companyId: string) => ['company', companyId, 'news', 'read'] as const,
}

export async function fetchNews(companyId: string): Promise<NewsItem[]> {
  const { data, error } = await getSupabase()
    .from('company_news')
    .select('id, kind, title, link, actor_id, actor_name, created_at')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .limit(30)
  if (error) throw error
  return (data as { id: string; kind: NewsItem['kind']; title: string; link: string; actor_id: string | null; actor_name: string; created_at: string }[]).map((row) => ({
    id: row.id,
    kind: row.kind,
    title: row.title,
    link: row.link,
    actorId: row.actor_id,
    actorName: row.actor_name,
    createdAt: row.created_at,
  }))
}

/** Do kedy má prihlásený novinky prečítané (null = ešte nič). */
export async function fetchReadUntil(companyId: string): Promise<string | null> {
  const { data, error } = await getSupabase().from('news_reads').select('read_until').eq('company_id', companyId).maybeSingle()
  if (error) throw error
  return (data as { read_until: string } | null)?.read_until ?? null
}

export async function markNewsRead(companyId: string) {
  const db = getSupabase()
  const now = new Date().toISOString()
  const updated = await db.from('news_reads').update({ read_until: now }).eq('company_id', companyId).select('company_id')
  if (updated.error) throw updated.error
  if (updated.data.length === 0) {
    const inserted = await db.from('news_reads').insert({ company_id: companyId, read_until: now })
    if (inserted.error) throw inserted.error
  }
}

/** Novinky a čo z nich je neprečítané. Bez migrácie 0057 ticho nič. */
export function useNews(companyId: string, userId: string) {
  const news = useQuery({ queryKey: newsKeys.list(companyId), queryFn: () => fetchNews(companyId), retry: false, refetchInterval: 5 * 60 * 1000 })
  const read = useQuery({ queryKey: newsKeys.read(companyId), queryFn: () => fetchReadUntil(companyId), retry: false })
  const items = news.data ?? []
  // Vlastné kroky (ja som pridal event) nie sú pre mňa novinka.
  const unread = read.isSuccess ? items.filter((item) => (!read.data || item.createdAt > read.data) && item.actorId !== userId) : []
  return { items, unread, readUntil: read.data ?? null, ready: news.isSuccess && read.isSuccess }
}
