import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ErrorBlock, LoadingBlock } from '@/components/feedback/QueryState'
import { PageHeader } from '@/components/layout/PageHeader'
import { SelectField } from '@/components/ui/field'
import { useCompany } from '@/features/companies/company-context'
import { formatDateTime } from '@/lib/format'
import { getSupabase } from '@/lib/supabase/client'
import { can } from '@/lib/permissions'
import { ACTION_LABELS, describeChanges, ENTITIES, entryLink, type AuditAction, type AuditEntry } from './model'

const LIMIT = 200

async function fetchAudit(companyId: string, entity: string): Promise<AuditEntry[]> {
  let query = getSupabase()
    .from('audit_log')
    .select('id, actor_name, action, entity, entity_id, label, changed, created_at')
    .eq('company_id', companyId)
    .order('id', { ascending: false })
    .limit(LIMIT)
  if (entity) query = query.eq('entity', entity)
  const { data, error } = await query
  if (error) throw error
  const rows = data as {
    id: number
    actor_name: string
    action: AuditAction
    entity: string
    entity_id: string | null
    label: string
    changed: string[] | null
    created_at: string
  }[]
  return rows.map((row) => ({
    id: row.id,
    actorName: row.actor_name,
    action: row.action,
    entity: row.entity,
    entityId: row.entity_id,
    label: row.label,
    changed: row.changed ?? [],
    createdAt: row.created_at,
  }))
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
      <PageHeader title="História zmien" description={`Kto, kedy a čo zmenil — posledných ${LIMIT} záznamov`} />

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
