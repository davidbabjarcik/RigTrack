// Zakladanie firiem s povolením (0094): kto smie zakladať, žiadosti a schvaľovanie vývojárom.
import { useQuery } from '@tanstack/react-query'
import { getSupabase } from '@/lib/supabase/client'

export type CompanyRequest = { id: string; companyName: string; note: string; status: 'pending' | 'approved' | 'rejected'; createdAt: string }
export type PendingRequest = { id: string; userId: string; fullName: string; email: string; companyName: string; note: string; createdAt: string }

export const creationKeys = {
  can: (userId: string) => ['can-create-company', userId] as const,
  mine: (userId: string) => ['company-requests', userId] as const,
  pending: ['company-requests', 'pending'] as const,
}

/** Bez migrácie 0094 sa zakladanie neobmedzuje. */
export async function fetchCanCreateCompany(): Promise<boolean> {
  const { data, error } = await getSupabase().rpc('can_create_company')
  if (error) return true
  return data === true
}

export function useCanCreateCompany(userId: string) {
  return useQuery({ queryKey: creationKeys.can(userId), queryFn: fetchCanCreateCompany, staleTime: 60_000 })
}

export async function fetchMyRequests(userId: string): Promise<CompanyRequest[]> {
  const { data, error } = await getSupabase().from('company_requests').select('id, company_name, note, status, created_at').eq('user_id', userId).order('created_at', { ascending: false })
  if (error) throw error
  return (data as { id: string; company_name: string; note: string; status: CompanyRequest['status']; created_at: string }[]).map((row) => ({
    id: row.id,
    companyName: row.company_name,
    note: row.note,
    status: row.status,
    createdAt: row.created_at,
  }))
}

export async function sendCompanyRequest(companyName: string, note: string) {
  const { error } = await getSupabase().from('company_requests').insert({ company_name: companyName.trim(), note: note.trim() })
  if (error) throw error
}

export async function cancelCompanyRequest(id: string) {
  const { error } = await getSupabase().from('company_requests').delete().eq('id', id)
  if (error) throw error
}

export async function fetchPendingRequests(): Promise<PendingRequest[]> {
  const { data, error } = await getSupabase().rpc('pending_company_requests')
  if (error) throw error
  return (data as { id: string; user_id: string; full_name: string; email: string; company_name: string; note: string; created_at: string }[]).map((row) => ({
    id: row.id,
    userId: row.user_id,
    fullName: row.full_name,
    email: row.email,
    companyName: row.company_name,
    note: row.note,
    createdAt: row.created_at,
  }))
}

export async function decideCompanyRequest(id: string, approve: boolean) {
  const { error } = await getSupabase().rpc('decide_company_request', { _request_id: id, _approve: approve })
  if (error) throw error
}
