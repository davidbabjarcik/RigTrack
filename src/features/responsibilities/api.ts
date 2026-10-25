// Zodpovedné osoby (0089): kto zodpovedá za druh techniky alebo konkrétne case a čo má robiť.
import { useQuery } from '@tanstack/react-query'
import { getSupabase } from '@/lib/supabase/client'

export type Responsibility = {
  id: string
  name: string
  /** Druhy techniky (light, audio…), za ktoré zodpovedá. */
  kinds: string[]
  caseIds: string[]
  memberIds: string[]
  /** Odčítať prevádzkové hodiny každých N dní (null = nie). */
  hoursEveryDays: number | null
  /** Skontrolovať case každých N dní (null = nie). */
  checkEveryDays: number | null
  note: string
}
export type ResponsibilityFields = Omit<Responsibility, 'id'>
export type ResponsibilityTask = { responsibilityId: string; name: string; task: 'hours' | 'check'; dueCount: number; items: string[] }

export const responsibilityKeys = {
  list: (companyId: string) => ['company', companyId, 'responsibilities'] as const,
  mine: (companyId: string) => ['company', companyId, 'responsibilities', 'mine'] as const,
}

type Row = { id: string; name: string; kinds: string[]; case_ids: string[]; member_ids: string[]; hours_every_days: number | null; check_every_days: number | null; note: string }

export async function fetchResponsibilities(companyId: string): Promise<Responsibility[]> {
  const { data, error } = await getSupabase()
    .from('responsibilities')
    .select('id, name, kinds, case_ids, member_ids, hours_every_days, check_every_days, note')
    .eq('company_id', companyId)
    .order('name')
  if (error) throw error
  return (data as Row[]).map((row) => ({
    id: row.id,
    name: row.name,
    kinds: row.kinds,
    caseIds: row.case_ids,
    memberIds: row.member_ids,
    hoursEveryDays: row.hours_every_days,
    checkEveryDays: row.check_every_days,
    note: row.note,
  }))
}

/** Bez migrácie 0089 prázdny zoznam (nič sa neukáže). */
export function useResponsibilities(companyId: string) {
  return useQuery({ queryKey: responsibilityKeys.list(companyId), queryFn: () => fetchResponsibilities(companyId), retry: false, staleTime: 5 * 60_000 })
}

export async function saveResponsibility(companyId: string, id: string | null, fields: ResponsibilityFields) {
  const row = {
    name: fields.name.trim(),
    kinds: fields.kinds,
    case_ids: fields.caseIds,
    member_ids: fields.memberIds,
    hours_every_days: fields.hoursEveryDays,
    check_every_days: fields.checkEveryDays,
    note: fields.note.trim(),
  }
  const table = getSupabase().from('responsibilities')
  const { error } = id ? await table.update(row).eq('company_id', companyId).eq('id', id) : await table.insert({ ...row, company_id: companyId })
  if (error) throw error
}

export async function deleteResponsibility(companyId: string, id: string) {
  const { error } = await getSupabase().from('responsibilities').delete().eq('company_id', companyId).eq('id', id)
  if (error) throw error
}

export async function fetchMyResponsibilityTasks(companyId: string): Promise<ResponsibilityTask[]> {
  const { data, error } = await getSupabase().rpc('my_responsibility_tasks', { _company_id: companyId })
  if (error) throw error
  return (data as { responsibility_id: string; name: string; task: 'hours' | 'check'; due_count: number; items: string[] }[]).map((row) => ({
    responsibilityId: row.responsibility_id,
    name: row.name,
    task: row.task,
    dueCount: row.due_count,
    items: row.items ?? [],
  }))
}

/** Zodpovednosti, pod ktoré patrí case (zvolený case, alebo je v ňom technika daného druhu) alebo kus techniky. */
export function responsibilitiesFor(list: Responsibility[], target: { caseId?: string | null; kinds?: string[] }) {
  return list.filter(
    (item) => (target.caseId && item.caseIds.includes(target.caseId)) || (target.kinds ?? []).some((kind) => item.kinds.includes(kind)),
  )
}
