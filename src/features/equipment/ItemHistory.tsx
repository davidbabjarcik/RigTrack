import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CollapsibleSection } from '@/components/layout/CollapsibleSection'
import { fetchAudit } from '@/features/audit/api'
import { ACTION_LABELS, describeChanges } from '@/features/audit/model'
import { INCIDENT_KIND_LABELS, SEVERITY_LABELS, useIncidents } from '@/features/incidents/api'
import { formatDate, formatDateTime, formatMoney } from '@/lib/format'

const SHOWN = 5

type Entry = { key: string; at: string; when: string; title: string; detail: string; to?: string; tone?: 'bad' }

/** Kto čo na technike menil (presun, stav, počet…) a zapísané škody – spolu podľa času. */
export function ItemHistory({ companyId, equipmentId, withChanges }: { companyId: string; equipmentId: string; withChanges: boolean }) {
  const [showAll, setShowAll] = useState(false)
  const changes = useQuery({
    queryKey: ['company', companyId, 'audit', 'equipment', equipmentId],
    queryFn: () => fetchAudit(companyId, 'equipment', 0, 99, equipmentId),
    enabled: withChanges,
    retry: false,
  })
  const incidents = useIncidents(companyId)

  const entries: Entry[] = [
    ...(withChanges ? (changes.data ?? []) : []).map((entry) => ({
      key: `a${entry.id}`,
      at: entry.createdAt,
      when: formatDateTime(entry.createdAt),
      title: `${entry.actorName || 'Niekto'} ${ACTION_LABELS[entry.action]}`,
      detail: entry.action === 'update' ? describeChanges(entry.changed) : entry.action === 'insert' ? 'založenie v evidencii' : '',
    })),
    ...(incidents.data ?? [])
      .filter((incident) => incident.equipmentId === equipmentId)
      .map((incident) => ({
        key: `i${incident.id}`,
        at: incident.occurredOn,
        when: formatDate(incident.occurredOn),
        title: `${INCIDENT_KIND_LABELS[incident.kind]}: ${incident.title}`,
        detail: [SEVERITY_LABELS[incident.severity], incident.cost !== null && formatMoney(incident.cost, 'EUR'), incident.resolved ? 'vyriešené' : 'nevyriešené'].filter(Boolean).join(' · '),
        to: '/incidents',
        tone: 'bad' as const,
      })),
  ].sort((a, b) => b.at.localeCompare(a.at))
  const visible = showAll ? entries : entries.slice(0, SHOWN)
  const loading = (withChanges && changes.isPending) || incidents.isPending

  return (
    <CollapsibleSection id="equipment.history" title={<>História zmien a škody ({entries.length})</>} className="mt-6">
      {loading ? (
        <p className="rounded-xl border bg-surface p-4 text-sm text-muted-foreground">Načítavam…</p>
      ) : entries.length === 0 ? (
        <p className="rounded-xl border border-dashed bg-surface p-4 text-sm text-muted-foreground">Zatiaľ žiadne zmeny ani škody.</p>
      ) : (
        <>
          <ol className="divide-y overflow-hidden rounded-xl border bg-surface text-sm">
            {visible.map((entry) => {
              const content = (
                <>
                  <span className="block text-muted-foreground">{entry.when}</span>
                  <span className={entry.tone === 'bad' ? 'font-medium text-destructive' : 'font-medium'}>{entry.title}</span>
                  {entry.detail && <span className="block text-muted-foreground">{entry.detail}</span>}
                </>
              )
              return (
                <li key={entry.key}>
                  {entry.to ? (
                    <Link to={entry.to} className="block px-4 py-3 hover:bg-muted">
                      {content}
                    </Link>
                  ) : (
                    <div className="px-4 py-3">{content}</div>
                  )}
                </li>
              )
            })}
          </ol>
          {entries.length > SHOWN && (
            <button type="button" className="mt-2 text-sm text-accent hover:underline" onClick={() => setShowAll(!showAll)}>
              {showAll ? 'Zobraziť len posledné' : `Zobraziť všetky (${entries.length})`}
            </button>
          )}
        </>
      )}
    </CollapsibleSection>
  )
}
