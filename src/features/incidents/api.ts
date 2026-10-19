import { useQuery } from '@tanstack/react-query'
import { getSupabase } from '@/lib/supabase/client'

export const INCIDENT_KINDS = ['damage', 'injury'] as const
export type IncidentKind = (typeof INCIDENT_KINDS)[number]
export const INCIDENT_KIND_LABELS: Record<IncidentKind, string> = { damage: 'Škoda', injury: 'Úraz' }

export const SEVERITIES = ['minor', 'medium', 'serious'] as const
export type Severity = (typeof SEVERITIES)[number]
export const SEVERITY_LABELS: Record<Severity, string> = { minor: 'Drobná', medium: 'Stredná', serious: 'Vážna' }

export const PAID_BY = ['', 'company', 'person', 'insurance', 'other'] as const
export type PaidBy = (typeof PAID_BY)[number]
export const PAID_BY_LABELS: Record<PaidBy, string> = { '': '— neurčené —', company: 'Firma', person: 'Človek', insurance: 'Poistka', other: 'Iné' }

export type Incident = {
  id: string
  kind: IncidentKind
  occurredOn: string
  memberId: string | null
  personName: string
  eventId: string | null
  equipmentId: string | null
  title: string
  description: string
  severity: Severity
  cost: number | null
  paidBy: PaidBy
  resolved: boolean
  createdBy: string | null
}

export type IncidentFields = Omit<Incident, 'id' | 'createdBy'>

export const incidentKeys = { list: (companyId: string) => ['company', companyId, 'incidents'] as const }

type Row = {
  id: string
  kind: IncidentKind
  occurred_on: string
  member_id: string | null
  person_name: string
  event_id: string | null
  equipment_id: string | null
  title: string
  description: string
  severity: Severity
  cost: number | string | null
  paid_by: PaidBy
  resolved: boolean
  created_by: string | null
}

/** Úrazy vidí len admin, dotknutý človek a ten, kto ich zapísal (rieši RLS). */
export async function fetchIncidents(companyId: string): Promise<Incident[]> {
  const { data, error } = await getSupabase()
    .from('incidents')
    .select('id, kind, occurred_on, member_id, person_name, event_id, equipment_id, title, description, severity, cost, paid_by, resolved, created_by')
    .eq('company_id', companyId)
    .order('occurred_on', { ascending: false })
  if (error) throw error
  return (data as Row[]).map((row) => ({
    id: row.id,
    kind: row.kind,
    occurredOn: row.occurred_on,
    memberId: row.member_id,
    personName: row.person_name,
    eventId: row.event_id,
    equipmentId: row.equipment_id,
    title: row.title,
    description: row.description,
    severity: row.severity,
    cost: row.cost === null ? null : Number(row.cost),
    paidBy: row.paid_by,
    resolved: row.resolved,
    createdBy: row.created_by,
  }))
}

export function useIncidents(companyId: string) {
  return useQuery({ queryKey: incidentKeys.list(companyId), queryFn: () => fetchIncidents(companyId), retry: false })
}

export async function saveIncident(companyId: string, id: string | null, fields: IncidentFields) {
  const row = {
    kind: fields.kind,
    occurred_on: fields.occurredOn,
    member_id: fields.memberId,
    person_name: fields.memberId ? '' : fields.personName.trim(),
    event_id: fields.eventId,
    equipment_id: fields.equipmentId,
    title: fields.title.trim(),
    description: fields.description.trim(),
    severity: fields.severity,
    cost: fields.cost,
    paid_by: fields.paidBy,
    resolved: fields.resolved,
  }
  const table = getSupabase().from('incidents')
  const { error } = id ? await table.update(row).eq('id', id) : await table.insert({ ...row, company_id: companyId })
  if (error) throw error
}

export async function deleteIncident(id: string) {
  const { error } = await getSupabase().from('incidents').delete().eq('id', id)
  if (error) throw error
}

export type IncidentStats = {
  damages: number
  injuries: number
  cost: number
  open: number
  byPerson: { key: string; memberId: string | null; name: string; damages: number; injuries: number; cost: number }[]
}

/** Počty škôd a úrazov, náklady a kto koľko (za rok „2026“, prázdne = všetko). */
export function incidentStats(items: Incident[], year: string, nameOf: (memberId: string) => string): IncidentStats {
  const chosen = items.filter((item) => item.occurredOn.startsWith(year))
  const people = new Map<string, IncidentStats['byPerson'][number]>()
  for (const item of chosen) {
    const key = item.memberId ?? (item.personName ? `name:${item.personName}` : '')
    if (!key) continue
    const person = people.get(key) ?? { key, memberId: item.memberId, name: item.memberId ? nameOf(item.memberId) : item.personName, damages: 0, injuries: 0, cost: 0 }
    if (item.kind === 'damage') person.damages += 1
    else person.injuries += 1
    person.cost += item.cost ?? 0
    people.set(key, person)
  }
  return {
    damages: chosen.filter((item) => item.kind === 'damage').length,
    injuries: chosen.filter((item) => item.kind === 'injury').length,
    cost: Math.round(chosen.reduce((sum, item) => sum + (item.cost ?? 0), 0) * 100) / 100,
    open: chosen.filter((item) => !item.resolved).length,
    byPerson: [...people.values()].sort((a, b) => b.damages + b.injuries - (a.damages + a.injuries) || b.cost - a.cost),
  }
}
