import { shrinkImage } from '@/features/equipment/photo'
import { getSupabase } from '@/lib/supabase/client'
import { APP_VERSION } from '@/lib/version'
import type { BugFormValues, BugReport, BugStatus } from './model'

const BUCKET = 'bug-screenshots'

export const bugKeys = {
  list: (companyId: string) => ['company', companyId, 'bugs'] as const,
  developer: ['bugs', 'is-developer'] as const,
}

type Row = {
  id: string
  company_id: string | null
  reporter_id: string | null
  reporter_name: string
  title: string
  description: string
  page_url: string
  app_version: string
  user_agent: string
  screenshot_path: string
  status: BugStatus
  response: string
  notified_at: string | null
  created_at: string
}

/** Hlásenia, ktoré smie prihlásený vidieť (svoje; admin firmy jej; vývojár všetky). Rozhoduje databáza. */
export async function fetchBugReports(): Promise<BugReport[]> {
  const { data, error } = await getSupabase()
    .from('bug_reports')
    .select('id, company_id, reporter_id, reporter_name, title, description, page_url, app_version, user_agent, screenshot_path, status, response, notified_at, created_at')
    .order('created_at', { ascending: false })
    .limit(500)
  if (error) throw error
  return (data as Row[]).map((row) => ({
    id: row.id,
    companyId: row.company_id,
    reporterId: row.reporter_id,
    reporterName: row.reporter_name,
    title: row.title,
    description: row.description,
    pageUrl: row.page_url,
    appVersion: row.app_version,
    userAgent: row.user_agent,
    screenshotPath: row.screenshot_path,
    status: row.status,
    response: row.response,
    notifiedAt: row.notified_at,
    createdAt: row.created_at,
  }))
}

export async function fetchIsDeveloper(): Promise<boolean> {
  const { data, error } = await getSupabase().rpc('is_developer')
  if (error) throw error
  return Boolean(data)
}

/**
 * Uloží hlásenie (so screenshotom, ak je) a požiada server o e-mail.
 * Keď e-mail zlyhá (napr. ešte nie je nastavený), hlásenie ostane uložené a v aplikácii ho vidno.
 */
export async function createBugReport(companyId: string, values: BugFormValues, screenshot: File | null) {
  const db = getSupabase()
  let screenshotPath = ''
  if (screenshot) {
    screenshotPath = `${companyId}/${crypto.randomUUID()}.jpg`
    const upload = await db.storage.from(BUCKET).upload(screenshotPath, await shrinkImage(screenshot, 1920, 0.85), { contentType: 'image/jpeg' })
    if (upload.error) throw upload.error
  }
  const { data, error } = await db
    .from('bug_reports')
    .insert({
      company_id: companyId,
      title: values.title,
      description: values.description,
      page_url: values.pageUrl.slice(0, 500),
      app_version: APP_VERSION,
      user_agent: navigator.userAgent.slice(0, 400),
      screenshot_path: screenshotPath,
    })
    .select('id')
    .single()
  if (error) throw error
  const id = (data as { id: string }).id
  const notified = await db.functions.invoke('notify-bug-report', { body: { reportId: id } }).then(
    (result) => !result.error,
    () => false,
  )
  return { id, notified }
}

export async function updateBugReport(id: string, status: BugStatus, response: string) {
  const { data, error } = await getSupabase().from('bug_reports').update({ status, response: response.trim() }).eq('id', id).select('id')
  if (error) throw error
  if (data.length === 0) throw new Error('Not updated')
}

export async function deleteBugReport(report: Pick<BugReport, 'id' | 'screenshotPath'>) {
  const db = getSupabase()
  const { error } = await db.from('bug_reports').delete().eq('id', report.id)
  if (error) throw error
  if (report.screenshotPath) await db.storage.from(BUCKET).remove([report.screenshotPath])
}

/** Krátkodobý odkaz na screenshot (bucket je súkromný). */
export async function screenshotUrl(path: string) {
  const { data, error } = await getSupabase().storage.from(BUCKET).createSignedUrl(path, 600)
  if (error) throw error
  return data.signedUrl
}
