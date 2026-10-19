import { useMutation, useQuery } from '@tanstack/react-query'
import { FileSpreadsheet } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ErrorBlock, LoadingBlock } from '@/components/feedback/QueryState'
import { PageHeader } from '@/components/layout/PageHeader'
import { SelectField } from '@/components/ui/field'
import { useCompany } from '@/features/companies/company-context'
import { Button } from '@/components/ui/button'
import { downloadTable } from '@/lib/excelExport'
import { formatDateTime, todayIso } from '@/lib/format'
import { can } from '@/lib/permissions'
import { fetchAudit, LIMIT } from './api'
import { ACTION_LABELS, AUDIT_EXPORT_COLUMNS, auditExportRow, describeChanges, ENTITIES, entryLink, type AuditEntry } from './model'

/** Celá história (nie len posledných 200) po stránkach a stiahnutie do Excelu. */
async function exportAudit(companyId: string, entity: string) {
  const page = 1000
  const entries: AuditEntry[] = []
  for (let from = 0; ; from += page) {
    const chunk = await fetchAudit(companyId, entity, from, from + page - 1)
    entries.push(...chunk)
    if (chunk.length < page) break
  }
  const name = entity ? ENTITIES[entity]?.label.replace(/\s+/g, '-') : 'vsetko'
  await downloadTable(
    `historia-zmien-${name}-${todayIso()}.xlsx`,
    'História zmien',
    AUDIT_EXPORT_COLUMNS,
    entries.map((entry) => auditExportRow(entry, formatDateTime)),
  )
  return entries.length
}

export function AuditPage() {
  const company = useCompany().active!
  const isAdmin = can(company, 'audit.view')
  const [entity, setEntity] = useState('')
  const audit = useQuery({
    queryKey: ['company', company.companyId, 'audit', entity],
    queryFn: () => fetchAudit(company.companyId, entity),
    enabled: isAdmin,
  })
  const download = useMutation({ mutationFn: () => exportAudit(company.companyId, entity) })

  if (!isAdmin) {
    return (
      <>
        <PageHeader title="História zmien" />
        <ErrorBlock message="Históriu zmien vidí iba admin." />
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="História zmien"
        description={`Kto, kedy a čo zmenil — posledných ${LIMIT} záznamov`}
        action={
          <Button variant="outline" disabled={download.isPending} onClick={() => download.mutate()}>
            <FileSpreadsheet className="size-4" aria-hidden />
            {download.isPending ? 'Pripravujem…' : 'Export do Excelu'}
          </Button>
        }
      />
      {download.isError && (
        <p role="alert" className="mb-4 text-sm text-destructive">
          Export sa nepodaril.
        </p>
      )}

      <SelectField label="Čo zobraziť" hideLabel className="mb-4 sm:w-64" value={entity} onChange={(e) => setEntity(e.target.value)}>
        <option value="">Všetko</option>
        {Object.entries(ENTITIES).map(([table, info]) => (
          <option key={table} value={table}>
            {info.label}
          </option>
        ))}
      </SelectField>

      {audit.isPending ? (
        <LoadingBlock />
      ) : audit.isError ? (
        <ErrorBlock message="Históriu sa nepodarilo načítať." onRetry={() => void audit.refetch()} />
      ) : audit.data.length === 0 ? (
        <p className="rounded-xl border border-dashed bg-surface px-6 py-12 text-center text-sm text-muted-foreground">
          Zatiaľ žiadne zmeny. História sa začína písať od zapnutia tejto funkcie.
        </p>
      ) : (
        <ul className="divide-y overflow-hidden rounded-xl border bg-surface">
          {audit.data.map((entry) => {
            const link = entryLink(entry)
            const what = `${ENTITIES[entry.entity]?.label ?? entry.entity}${entry.label ? ` „${entry.label}“` : ''}`
            return (
              <li key={entry.id} className="px-4 py-3">
                <p className="break-words">
                  <span className="font-medium">{entry.actorName || 'Systém'}</span> {ACTION_LABELS[entry.action]}{' '}
                  {link ? (
                    <Link to={link} className="text-accent hover:underline">
                      {what}
                    </Link>
                  ) : (
                    what
                  )}
                </p>
                <p className="text-sm text-muted-foreground">
                  {formatDateTime(entry.createdAt)}
                  {entry.changed.length > 0 && ` · zmenené: ${describeChanges(entry.changed)}`}
                </p>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
