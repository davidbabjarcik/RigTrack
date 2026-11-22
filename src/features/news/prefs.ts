import { getSupabase } from '@/lib/supabase/client'

export const prefsKey = (companyId: string) => ['company', companyId, 'notification-prefs'] as const

export type EmailPrefsValue = { newEvent: boolean; weekly: boolean }

/** Moje e-mailové nastavenia vo firme. Bez migrácie 0188 len e-mail o novom evente (týždenný = null). */
export async function fetchEmailPrefs(companyId: string): Promise<EmailPrefsValue & { weeklyReady: boolean }> {
  const db = getSupabase()
  const full = await db.from('notification_prefs').select('email_new_event, email_weekly').eq('company_id', companyId).maybeSingle()
  if (!full.error) {
    const row = full.data as { email_new_event: boolean; email_weekly: boolean } | null
    return { newEvent: Boolean(row?.email_new_event), weekly: Boolean(row?.email_weekly), weeklyReady: true }
  }
  if (!/email_weekly/.test(full.error.message ?? '')) throw full.error
  const { data, error } = await db.from('notification_prefs').select('email_new_event').eq('company_id', companyId).maybeSingle()
  if (error) throw error
  return { newEvent: Boolean((data as { email_new_event: boolean } | null)?.email_new_event), weekly: false, weeklyReady: false }
}

/** Uloží jednu voľbu (riadok sa založí pri prvej zmene). */
export async function saveEmailPref(companyId: string, patch: { email_new_event?: boolean; email_weekly?: boolean }) {
  const db = getSupabase()
  const updated = await db.from('notification_prefs').update(patch).eq('company_id', companyId).select('company_id')
  if (updated.error) throw updated.error
  if (updated.data.length === 0) {
    const inserted = await db.from('notification_prefs').insert({ company_id: companyId, ...patch })
    if (inserted.error) throw inserted.error
  }
}
