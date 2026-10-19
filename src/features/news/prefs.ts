import { getSupabase } from '@/lib/supabase/client'

export const prefsKey = (companyId: string) => ['company', companyId, 'notification-prefs'] as const

export async function fetchEmailNewEvent(companyId: string) {
  const { data, error } = await getSupabase().from('notification_prefs').select('email_new_event').eq('company_id', companyId).maybeSingle()
  if (error) throw error
  return Boolean((data as { email_new_event: boolean } | null)?.email_new_event)
}

export async function saveEmailNewEvent(companyId: string, value: boolean) {
  const db = getSupabase()
  const updated = await db.from('notification_prefs').update({ email_new_event: value }).eq('company_id', companyId).select('company_id')
  if (updated.error) throw updated.error
  if (updated.data.length === 0) {
    const inserted = await db.from('notification_prefs').insert({ company_id: companyId, email_new_event: value })
    if (inserted.error) throw inserted.error
  }
}
