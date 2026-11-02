import { useQuery } from '@tanstack/react-query'
import { getSupabase } from '@/lib/supabase/client'

/** Pravidlo limitu hodín (napr. Výbojka 1500 h) alebo revízie (napr. elektro každých 12 mesiacov); 0122. */
export type MaintenanceRule = {
  id: string
  kind: 'hours' | 'revision'
  name: string
  /** Pri hodinách: počítadlo ('' = prevádzkové hodiny). */
  counter: string
  limitHours: number | null
  warnPercent: number
  intervalMonths: number | null
  warnDays: number
  kinds: string[]
  categoryIds: string[]
  equipmentIds: string[]
  createTask: boolean
  note: string
}

export type MaintenanceRuleInput = Omit<MaintenanceRule, 'id'>

/** Stav jednej veci (kusu) podľa pravidla – počíta databáza (maintenance_due). */
export type DueState = 'ok' | 'soon' | 'overdue' | 'unknown' | 'failed'
export type MaintenanceDue = {
  ruleId: string
  equipmentId: string
  unit: number | null
  state: DueState
  used: number | null
  limitHours: number | null
  lastDone: string | null
  dueOn: string | null
}

export type MaintenanceRecord = {
  id: string
  ruleId: string
  equipmentId: string
  unit: number | null
  doneOn: string
  hours: number | null
  result: 'ok' | 'fail'
  note: string
  authorName: string
}

export const maintenanceKeys = {
  all: (companyId: string) => ['company', companyId, 'maintenance'] as const,
  rules: (companyId: string) => ['company', companyId, 'maintenance', 'rules'] as const,
  due: (companyId: string) => ['company', companyId, 'maintenance', 'due'] as const,
  records: (companyId: string, equipmentIds: string[]) => ['company', companyId, 'maintenance', 'records', equipmentIds.join(',')] as const,
}

type RuleRow = {
  id: string
  kind: MaintenanceRule['kind']
  name: string
  counter: string
  limit_hours: number | string | null
  warn_percent: number
  interval_months: number | null
  warn_days: number
  kinds: string[]
  category_ids: string[]
  equipment_ids: string[]
  create_task: boolean
  note: string
}

const fromRow = (row: RuleRow): MaintenanceRule => ({
  id: row.id,
  kind: row.kind,
  name: row.name,
  counter: row.counter,
  limitHours: row.limit_hours === null ? null : Number(row.limit_hours),
  warnPercent: row.warn_percent,
  intervalMonths: row.interval_months,
  warnDays: row.warn_days,
  kinds: row.kinds,
  categoryIds: row.category_ids,
  equipmentIds: row.equipment_ids,
  createTask: row.create_task,
  note: row.note,
})

const toRow = (rule: MaintenanceRuleInput) => ({
  kind: rule.kind,
  name: rule.name.trim(),
  counter: rule.kind === 'hours' ? rule.counter.trim() : '',
  limit_hours: rule.kind === 'hours' ? rule.limitHours : null,
  warn_percent: rule.warnPercent,
  interval_months: rule.kind === 'revision' ? rule.intervalMonths : null,
  warn_days: rule.warnDays,
  kinds: rule.kinds,
  category_ids: rule.categoryIds,
  equipment_ids: rule.equipmentIds,
  create_task: rule.createTask,
  note: rule.note.trim(),
})

/** Bez migrácie 0122 prázdny zoznam (sekcie sa neukážu). */
export async function fetchMaintenanceRules(companyId: string): Promise<MaintenanceRule[]> {
  const { data, error } = await getSupabase()
    .from('maintenance_rules')
    .select('id, kind, name, counter, limit_hours, warn_percent, interval_months, warn_days, kinds, category_ids, equipment_ids, create_task, note')
    .eq('company_id', companyId)
    .order('name')
  if (error) {
    if (/maintenance_rules/.test(error.message ?? '')) return []
    throw error
  }
  return (data as RuleRow[]).map(fromRow)
}

export function useMaintenanceRules(companyId: string) {
  return useQuery({ queryKey: maintenanceKeys.rules(companyId), queryFn: () => fetchMaintenanceRules(companyId), retry: false, staleTime: 5 * 60_000 })
}

export async function saveMaintenanceRule(companyId: string, id: string | null, rule: MaintenanceRuleInput) {
  const table = getSupabase().from('maintenance_rules')
  const { error } = id ? await table.update(toRow(rule)).eq('company_id', companyId).eq('id', id) : await table.insert({ ...toRow(rule), company_id: companyId })
  if (error) throw error
}

export async function deleteMaintenanceRule(companyId: string, id: string) {
  const { error } = await getSupabase().from('maintenance_rules').delete().eq('company_id', companyId).eq('id', id)
  if (error) throw error
}

export async function fetchMaintenanceDue(companyId: string): Promise<MaintenanceDue[]> {
  const { data, error } = await getSupabase().rpc('maintenance_due', { _company_id: companyId })
  if (error) {
    if (/maintenance_due/.test(error.message ?? '')) return []
    throw error
  }
  type Row = { rule_id: string; equipment_id: string; unit: number | null; state: DueState; used: number | string | null; limit_hours: number | string | null; last_done: string | null; due_on: string | null }
  return ((data ?? []) as Row[]).map((row) => ({
    ruleId: row.rule_id,
    equipmentId: row.equipment_id,
    unit: row.unit,
    state: row.state,
    used: row.used === null ? null : Number(row.used),
    limitHours: row.limit_hours === null ? null : Number(row.limit_hours),
    lastDone: row.last_done,
    dueOn: row.due_on,
  }))
}

export function useMaintenanceDue(companyId: string, enabled = true) {
  return useQuery({ queryKey: maintenanceKeys.due(companyId), queryFn: () => fetchMaintenanceDue(companyId), enabled, retry: false, staleTime: 60_000 })
}

export async function fetchMaintenanceRecords(companyId: string, equipmentIds: string[]): Promise<MaintenanceRecord[]> {
  if (equipmentIds.length === 0) return []
  const { data, error } = await getSupabase()
    .from('maintenance_records')
    .select('id, rule_id, equipment_id, unit, done_on, hours, result, note, author_name')
    .eq('company_id', companyId)
    .in('equipment_id', equipmentIds)
    .order('done_on', { ascending: false })
    .order('created_at', { ascending: false })
  if (error) {
    if (/maintenance_records/.test(error.message ?? '')) return []
    throw error
  }
  type Row = { id: string; rule_id: string; equipment_id: string; unit: number | null; done_on: string; hours: number | string | null; result: 'ok' | 'fail'; note: string; author_name: string }
  return (data as Row[]).map((row) => ({
    id: row.id,
    ruleId: row.rule_id,
    equipmentId: row.equipment_id,
    unit: row.unit,
    doneOn: row.done_on,
    hours: row.hours === null ? null : Number(row.hours),
    result: row.result,
    note: row.note,
    authorName: row.author_name,
  }))
}

/** Zapíše výmenu / servis / revíziu (pre viac vecí naraz, napr. všetky dĺžky kábla). */
export async function addMaintenanceRecords(
  companyId: string,
  records: { ruleId: string; equipmentId: string; unit: number | null; doneOn: string; hours: number | null; result: 'ok' | 'fail'; note: string }[],
) {
  if (records.length === 0) return
  const rows = records.map((record) => ({
    company_id: companyId,
    rule_id: record.ruleId,
    equipment_id: record.equipmentId,
    unit: record.unit,
    done_on: record.doneOn,
    hours: record.hours,
    result: record.result,
    note: record.note.slice(0, 500),
  }))
  const { error } = await getSupabase().from('maintenance_records').insert(rows)
  if (error) throw error
}

export async function deleteMaintenanceRecord(companyId: string, id: string) {
  const { error } = await getSupabase().from('maintenance_records').delete().eq('company_id', companyId).eq('id', id)
  if (error) throw error
}

export const STATE_LABELS: Record<DueState, string> = {
  ok: 'v poriadku',
  soon: 'čoskoro',
  overdue: 'po limite',
  unknown: 'neznáme',
  failed: 'nevyhovela',
}

/** Text stavu pre človeka, napr. „1 010 / 1 000 h – prekročené“ alebo „revízia do 3. 5. 2027“. */
export function describeDue(due: MaintenanceDue, rule: MaintenanceRule, formatDate: (iso: string) => string, formatNumber: (value: number) => string) {
  if (rule.kind === 'hours') {
    if (due.used === null) return 'počítadlo ešte neodčítané'
    const text = `${formatNumber(due.used)} / ${formatNumber(rule.limitHours ?? 0)} h`
    return due.state === 'overdue' ? `${text} – limit prekročený` : due.state === 'soon' ? `${text} – blíži sa limit` : text
  }
  if (due.state === 'unknown') return 'revízia ešte nebola'
  if (due.state === 'failed') return `revízia ${formatDate(due.lastDone!)} nevyhovela`
  const next = due.dueOn ? formatDate(due.dueOn) : ''
  return due.state === 'overdue' ? `revízia po termíne (mala byť ${next})` : due.state === 'soon' ? `revízia do ${next}` : `ďalšia revízia ${next}`
}

/** Čo treba riešiť: prekročené, nevyhovené a blížiace sa; pri revíziách aj tie, čo ešte neboli. */
export function needsAttention(due: MaintenanceDue, rule: MaintenanceRule | undefined) {
  if (!rule) return false
  if (due.state === 'overdue' || due.state === 'failed' || due.state === 'soon') return true
  return due.state === 'unknown' && rule.kind === 'revision'
}

export const isLate = (state: DueState) => state === 'overdue' || state === 'failed' || state === 'unknown'
