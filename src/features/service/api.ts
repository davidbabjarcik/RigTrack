import { getSupabase } from '@/lib/supabase/client'
import type { ServiceFormValues, ServiceKind, ServiceRecord, ServiceStatus } from './model'

export const serviceKeys = {
  list: (companyId: string) => ['company', companyId, 'service'] as const,
}

type Row = {
  id: string
  equipment_id: string
  kind: ServiceKind
  status: ServiceStatus
  happened_on: string
  problem: string
  work_done: string
  hours: number | string | null
  cost: number | string | null
  technician: string
}

const toNumber = (value: number | string | null) => (value === null ? null : Number(value))

export async function fetchServiceRecords(companyId: string): Promise<ServiceRecord[]> {
  const { data, error } = await getSupabase()
    .from('service_records')
    .select('id, equipment_id, kind, status, happened_on, problem, work_done, hours, cost, technician')
    .eq('company_id', companyId)
    .order('happened_on', { ascending: false })
  if (error) throw error
  return (data as Row[]).map((row) => ({
    id: row.id,
    equipmentId: row.equipment_id,
    kind: row.kind,
    status: row.status,
    happenedOn: row.happened_on,
    problem: row.problem,
    workDone: row.work_done,
    hours: toNumber(row.hours),
    cost: toNumber(row.cost),
    technician: row.technician,
  }))
}

export async function saveServiceRecord(companyId: string, id: string | null, values: ServiceFormValues): Promise<string> {
  const fields = {
    kind: values.kind,
    status: values.status,
    happened_on: values.happenedOn,
    problem: values.problem,
    work_done: values.workDone,
    hours: values.hours ?? null,
    cost: values.cost ?? null,
    technician: values.technician,
  }
  const table = getSupabase().from('service_records')
  // Technika sa po vytvorení záznamu nemení: záznam patrí kusu, ktorý sa opravoval.
  const { data, error } = id
    ? await table.update(fields).eq('company_id', companyId).eq('id', id).select('id').single()
    : await table.insert({ ...fields, company_id: companyId, equipment_id: values.equipmentId }).select('id').single()
  if (error) throw error
  return (data as { id: string }).id
}

export async function deleteServiceRecord(companyId: string, id: string) {
  const { data, error } = await getSupabase().from('service_records').delete().eq('company_id', companyId).eq('id', id).select('id')
  if (error) throw error
  if (data.length === 0) throw new Error('Not deleted')
}
