import { useQuery } from '@tanstack/react-query'
import { getSupabase } from '@/lib/supabase/client'
import { isMissingColumn } from '@/lib/supabase/errors'

export const REQUEST_STATUSES = ['open', 'in_progress', 'done', 'rejected'] as const
export type RequestStatus = (typeof REQUEST_STATUSES)[number]
export const REQUEST_STATUS_LABELS: Record<RequestStatus, string> = { open: 'Nové', in_progress: 'Rieši sa', done: 'Vybavené', rejected: 'Zamietnuté' }

export const REQUEST_PRIORITIES = ['high', 'normal', 'low'] as const
export type RequestPriority = (typeof REQUEST_PRIORITIES)[number]
export const REQUEST_PRIORITY_LABELS: Record<RequestPriority, string> = { high: 'Vysoká', normal: 'Bežná', low: 'Nízka' }

/** Žiadosť o servis: nahlási ju ktokoľvek z firmy, vybavuje servis. */
export type ServiceRequest = {
  id: string
  equipmentId: string | null
  /** Auto (0067); bez migrácie vždy null. */
  vehicleId: string | null
  unitId: number | null
  title: string
  description: string
  priority: RequestPriority
  status: RequestStatus
  response: string
  requestedBy: string | null
  requestedByName: string
  createdAt: string
  resolvedAt: string | null
}

export type RequestFields = Pick<ServiceRequest, 'equipmentId' | 'vehicleId' | 'unitId' | 'title' | 'description' | 'priority'>

let vehicleColumn = ', vehicle_id'

export const requestKeys = { list: (companyId: string) => ['company', companyId, 'service-requests'] as const }

type Row = {
  id: string
  equipment_id: string | null
  vehicle_id?: string | null
  unit_id: number | null
  title: string
  description: string
  priority: RequestPriority
  status: RequestStatus
  response: string
  requested_by: string | null
  requested_by_name: string
  created_at: string
  resolved_at: string | null
}

/** Člen bez práva vidieť servis dostane len svoje žiadosti (rieši RLS). */
export async function fetchRequests(companyId: string): Promise<ServiceRequest[]> {
  const { data, error } = await getSupabase()
    .from('service_requests')
    .select('id, equipment_id, unit_id, title, description, priority, status, response, requested_by, requested_by_name, created_at, resolved_at' + vehicleColumn)
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .limit(500)
  if (vehicleColumn && isMissingColumn(error, 'vehicle_id')) {
    vehicleColumn = ''
    return fetchRequests(companyId)
  }
  if (error) throw error
  return (data as unknown as Row[]).map((row) => ({
    id: row.id,
    equipmentId: row.equipment_id,
    vehicleId: row.vehicle_id ?? null,
    unitId: row.unit_id,
    title: row.title,
    description: row.description,
    priority: row.priority,
    status: row.status,
    response: row.response,
    requestedBy: row.requested_by,
    requestedByName: row.requested_by_name,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at,
  }))
}

export function useServiceRequests(companyId: string) {
  return useQuery({ queryKey: requestKeys.list(companyId), queryFn: () => fetchRequests(companyId), retry: false })
}

export async function createRequest(companyId: string, fields: RequestFields) {
  const { error } = await getSupabase()
    .from('service_requests')
    .insert({
      company_id: companyId,
      equipment_id: fields.equipmentId,
      ...(fields.vehicleId ? { vehicle_id: fields.vehicleId } : {}),
      unit_id: fields.unitId,
      title: fields.title.trim(),
      description: fields.description.trim(),
      priority: fields.priority,
    })
  if (error) throw error
}

export async function updateRequest(id: string, patch: { status?: RequestStatus; response?: string; priority?: RequestPriority }) {
  const { data, error } = await getSupabase().from('service_requests').update(patch).eq('id', id).select('id')
  if (error) throw error
  if (data.length === 0) throw new Error('Not updated')
}

export async function deleteRequest(id: string) {
  const { data, error } = await getSupabase().from('service_requests').delete().eq('id', id).select('id')
  if (error) throw error
  if (data.length === 0) throw new Error('Not deleted')
}

/** Otvorené žiadosti (nové a riešené), najprv vysoká priorita, potom najstaršie. */
export function sortRequests(items: ServiceRequest[]) {
  const order: Record<RequestPriority, number> = { high: 0, normal: 1, low: 2 }
  const active = (item: ServiceRequest) => (item.status === 'open' || item.status === 'in_progress' ? 0 : 1)
  return [...items].sort(
    (a, b) => active(a) - active(b) || (active(a) === 0 ? order[a.priority] - order[b.priority] || a.createdAt.localeCompare(b.createdAt) : b.createdAt.localeCompare(a.createdAt)),
  )
}
