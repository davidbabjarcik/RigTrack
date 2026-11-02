import { getSupabase } from '@/lib/supabase/client'

export type AppError = {
  id: string
  fingerprint: string
  userEmail: string
  companyId: string | null
  source: 'render' | 'error' | 'promise'
  message: string
  stack: string
  pageUrl: string
  appVersion: string
  userAgent: string
  count: number
  firstAt: string
  lastAt: string
  resolvedAt: string | null
}

/** Jedna chyba naprieč ľuďmi: koľkokrát, koľkým ľuďom, kedy naposledy, v ktorých verziách a na ktorých stránkach. */
export type AppErrorGroup = {
  fingerprint: string
  message: string
  stack: string
  source: AppError['source']
  total: number
  users: string[]
  versions: string[]
  pages: string[]
  lastAt: string
  firstAt: string
  ids: string[]
  resolved: boolean
}

export const appErrorKeys = { list: ['developer', 'app-errors'] as const }

type Row = {
  id: string
  fingerprint: string
  user_email: string
  company_id: string | null
  source: AppError['source']
  message: string
  stack: string
  page_url: string
  app_version: string
  user_agent: string
  count: number
  first_at: string
  last_at: string
  resolved_at: string | null
}

export async function fetchAppErrors(): Promise<AppError[]> {
  const { data, error } = await getSupabase()
    .from('app_errors')
    .select('id, fingerprint, user_email, company_id, source, message, stack, page_url, app_version, user_agent, count, first_at, last_at, resolved_at')
    .order('last_at', { ascending: false })
    .limit(1000)
  if (error) throw error
  return (data as Row[]).map((row) => ({
    id: row.id,
    fingerprint: row.fingerprint,
    userEmail: row.user_email,
    companyId: row.company_id,
    source: row.source,
    message: row.message,
    stack: row.stack,
    pageUrl: row.page_url,
    appVersion: row.app_version,
    userAgent: row.user_agent,
    count: row.count,
    firstAt: row.first_at,
    lastAt: row.last_at,
    resolvedAt: row.resolved_at,
  }))
}

/** Označí chyby ako vyriešené (null = znova otvoriť). */
export async function resolveAppErrors(ids: string[], resolved: boolean) {
  const { error } = await getSupabase()
    .from('app_errors')
    .update({ resolved_at: resolved ? new Date().toISOString() : null })
    .in('id', ids)
  if (error) throw error
}

export async function deleteAppErrors(ids: string[]) {
  const { error } = await getSupabase().from('app_errors').delete().in('id', ids)
  if (error) throw error
}

const uniq = (values: string[]) => [...new Set(values.filter(Boolean))]

/** Zoskupí riadky podľa chyby; nevyriešené a najnovšie sú hore. */
export function groupAppErrors(errors: AppError[]): AppErrorGroup[] {
  const groups = new Map<string, AppError[]>()
  for (const item of errors) {
    const key = `${item.fingerprint}|${item.resolvedAt ? 'r' : 'o'}`
    groups.set(key, [...(groups.get(key) ?? []), item])
  }
  return [...groups.values()]
    .map((items) => {
      const latest = items.reduce((a, b) => (b.lastAt > a.lastAt ? b : a))
      return {
        fingerprint: latest.fingerprint,
        message: latest.message,
        stack: latest.stack,
        source: latest.source,
        total: items.reduce((sum, item) => sum + item.count, 0),
        users: uniq(items.map((item) => item.userEmail)),
        versions: uniq(items.map((item) => item.appVersion)).sort().reverse(),
        pages: uniq(items.map((item) => item.pageUrl)),
        lastAt: latest.lastAt,
        firstAt: items.reduce((min, item) => (item.firstAt < min ? item.firstAt : min), latest.firstAt),
        ids: items.map((item) => item.id),
        resolved: Boolean(latest.resolvedAt),
      }
    })
    .sort((a, b) => Number(a.resolved) - Number(b.resolved) || b.lastAt.localeCompare(a.lastAt))
}

export const SOURCE_LABELS: Record<AppError['source'], string> = {
  render: 'spadla stránka',
  error: 'chyba v prehliadači',
  promise: 'neošetrená požiadavka',
}
