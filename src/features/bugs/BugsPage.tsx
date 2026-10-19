import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { isAdminRole } from '@/lib/roles'
import { Bug, ChevronDown, ExternalLink, Image, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { ErrorBlock, LoadingBlock } from '@/components/feedback/QueryState'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button, LinkButton } from '@/components/ui/button'
import { SelectField, TextareaField } from '@/components/ui/field'
import { useAuth } from '@/features/auth/auth-context'
import { useCompany } from '@/features/companies/company-context'
import { formatDateTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import { bugKeys, deleteBugReport, fetchBugReports, fetchIsDeveloper, screenshotUrl, updateBugReport } from './api'
import { BUG_STATUS_LABELS, BUG_STATUSES, sortReports, type BugReport, type BugStatus } from './model'

const TONES: Record<BugStatus, string> = {
  new: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200',
  in_progress: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200',
  resolved: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
  wontfix: 'bg-muted text-muted-foreground',
}

function ReportItem({ report, canManage, canDelete, companyName }: { report: BugReport; canManage: boolean; canDelete: boolean; companyName: string | null }) {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(report.status === 'new')
  const [status, setStatus] = useState<BugStatus>(report.status)
  const [response, setResponse] = useState(report.response)
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['company'] })
  const save = useMutation({ mutationFn: () => updateBugReport(report.id, status, response), onSettled: refresh })
  const remove = useMutation({ mutationFn: () => deleteBugReport(report), onSettled: refresh })
  const shot = useMutation({ mutationFn: async () => window.open(await screenshotUrl(report.screenshotPath), '_blank', 'noopener') })

  return (
    <li className="rounded-xl border bg-surface">
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-start gap-3 p-4 text-left" aria-expanded={open}>
        <Bug className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="block font-medium break-words">{report.title}</span>
          <span className="block text-sm text-muted-foreground">
            {[report.reporterName, companyName, formatDateTime(report.createdAt), report.appVersion && `v${report.appVersion}`].filter(Boolean).join(' · ')}
          </span>
        </span>
        <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-xs font-medium', TONES[report.status])}>{BUG_STATUS_LABELS[report.status]}</span>
        <ChevronDown className={cn('size-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')} aria-hidden />
      </button>
      {open && (
        <div className="flex flex-col gap-3 border-t p-4 text-sm">
          {report.description && <p className="whitespace-pre-wrap">{report.description}</p>}
          <dl className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
            {report.pageUrl && (
              <div>
                <dt className="inline">Stránka: </dt>
                <dd className="inline break-all">{report.pageUrl}</dd>
              </div>
            )}
            <div className="sm:col-span-2">
              <dt className="inline">Prehliadač: </dt>
              <dd className="inline break-all">{report.userAgent}</dd>
            </div>
            <div>
              <dt className="inline">E-mail: </dt>
              <dd className="inline">{report.notifiedAt ? `odoslaný ${formatDateTime(report.notifiedAt)}` : 'neodoslaný'}</dd>
            </div>
          </dl>
          {report.screenshotPath && canManage && (
            <Button variant="outline" size="sm" className="self-start" disabled={shot.isPending} onClick={() => shot.mutate()}>
              <Image className="size-4" aria-hidden />
              Otvoriť screenshot
              <ExternalLink className="size-3.5" aria-hidden />
            </Button>
          )}
          {!canManage && report.response && (
            <p className="rounded-lg bg-muted p-3">
              <span className="font-medium">Odpoveď: </span>
              {report.response}
            </p>
          )}
          {canManage && (
            <div className="flex flex-col gap-2 rounded-lg border p-3">
              <SelectField label="Stav" className="w-56" value={status} onChange={(event) => setStatus(event.target.value as BugStatus)}>
                {BUG_STATUSES.map((option) => (
                  <option key={option} value={option}>
                    {BUG_STATUS_LABELS[option]}
                  </option>
                ))}
              </SelectField>
              <TextareaField label="Odpoveď pre autora (nepovinné)" rows={2} maxLength={2000} value={response} onChange={(event) => setResponse(event.target.value)} />
              <div className="flex flex-wrap gap-2">
                <Button size="sm" disabled={save.isPending || (status === report.status && response === report.response)} onClick={() => save.mutate()}>
                  {save.isPending ? 'Ukladám…' : 'Uložiť'}
                </Button>
                {canDelete && (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={remove.isPending}
                    onClick={() => {
                      if (window.confirm('Zmazať hlásenie natrvalo?')) remove.mutate()
                    }}
                  >
                    <Trash2 className="size-4" aria-hidden />
                    Zmazať
                  </Button>
                )}
              </div>
              {(save.isError || remove.isError) && <p className="text-destructive">Zmena sa nepodarila.</p>}
            </div>
          )}
        </div>
      )}
    </li>
  )
}

/** Hlásenia chýb: autor vidí svoje, admin firmy jej, vývojár všetky; admin a vývojár menia stav. */
export function BugsPage() {
  const company = useCompany()
  const active = company.active!
  const userId = useAuth().session!.user.id
  const location = useLocation()
  const reports = useQuery({ queryKey: bugKeys.list(active.companyId), queryFn: fetchBugReports })
  const developer = useQuery({ queryKey: bugKeys.developer, queryFn: fetchIsDeveloper })
  const [filter, setFilter] = useState<BugStatus | 'open' | ''>('open')

  if (reports.isPending) return <LoadingBlock />
  if (reports.isError) return <ErrorBlock message="Hlásenia sa nepodarilo načítať. Ak ste ešte nespustili migráciu 0048, urobte to." onRetry={() => void reports.refetch()} />

  const isDeveloper = developer.data === true
  const canManage = (report: BugReport) => isDeveloper || (report.companyId !== null && company.memberships.some((m) => m.companyId === report.companyId && isAdminRole(m.role)))
  const companyName = (id: string | null) => (id ? (company.memberships.find((m) => m.companyId === id)?.companyName ?? null) : null)
  const visible = sortReports(reports.data).filter((report) =>
    filter === 'open' ? report.status === 'new' || report.status === 'in_progress' : filter ? report.status === filter : true,
  )
  const counts = reports.data.filter((report) => report.status === 'new' && report.reporterId !== userId).length

  return (
    <>
      <PageHeader
        title="Hlásenia chýb"
        description={isDeveloper ? 'Ste vývojár: vidíte hlásenia zo všetkých firiem.' : counts > 0 ? `${counts} nových od ostatných` : undefined}
        action={
          <LinkButton to={`/bugs/new?from=${encodeURIComponent(location.pathname)}`}>
            <Plus className="size-4" aria-hidden />
            Nahlásiť chybu
          </LinkButton>
        }
      />
      <SelectField label="Zobraziť" hideLabel className="mb-4 w-56" value={filter} onChange={(event) => setFilter(event.target.value as BugStatus | 'open' | '')}>
        <option value="open">Nové a riešené</option>
        {BUG_STATUSES.map((status) => (
          <option key={status} value={status}>
            {BUG_STATUS_LABELS[status]}
          </option>
        ))}
        <option value="">Všetky</option>
      </SelectField>
      {visible.length === 0 ? (
        <p className="rounded-xl border border-dashed bg-surface p-8 text-center text-sm text-muted-foreground">Žiadne hlásenia.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {visible.map((report) => (
            <ReportItem key={report.id} report={report} canManage={canManage(report)} canDelete={isDeveloper} companyName={companyName(report.companyId)} />
          ))}
        </ul>
      )}
    </>
  )
}
