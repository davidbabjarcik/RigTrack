import { z } from 'zod'

// Nahlásené chyby. Zodpovedá tabuľke bug_reports (0048).

export const BUG_STATUSES = ['new', 'in_progress', 'resolved', 'wontfix'] as const
export type BugStatus = (typeof BUG_STATUSES)[number]
export const BUG_STATUS_LABELS: Record<BugStatus, string> = {
  new: 'Nové',
  in_progress: 'Rieši sa',
  resolved: 'Vyriešené',
  wontfix: 'Nebude sa riešiť',
}

export type BugReport = {
  id: string
  companyId: string | null
  reporterId: string | null
  reporterName: string
  title: string
  description: string
  pageUrl: string
  appVersion: string
  userAgent: string
  screenshotPath: string
  status: BugStatus
  response: string
  notifiedAt: string | null
  createdAt: string
}

export const bugSchema = z.object({
  title: z.string().trim().min(1, 'Napíšte, čo nefunguje').max(160, 'Najviac 160 znakov'),
  description: z.string().trim().max(4000, 'Najviac 4000 znakov'),
  /** Stránka, z ktorej človek prišiel nahlásiť chybu. */
  pageUrl: z.string().max(500),
})
export type BugFormValues = z.infer<typeof bugSchema>

/** Nové a rozpracované hlásenia od iných (na upozornenie). */
export function openReports(reports: BugReport[], userId: string) {
  return reports.filter((report) => report.status === 'new' && report.reporterId !== userId)
}

/** Zoradenie: nové a rozpracované hore, potom podľa dátumu od najnovšieho. */
export function sortReports(reports: BugReport[]) {
  const rank = (status: BugStatus) => (status === 'new' ? 0 : status === 'in_progress' ? 1 : 2)
  return [...reports].sort((a, b) => rank(a.status) - rank(b.status) || b.createdAt.localeCompare(a.createdAt))
}
