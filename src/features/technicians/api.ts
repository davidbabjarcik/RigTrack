import { useQuery } from '@tanstack/react-query'
import { getSupabase } from '@/lib/supabase/client'
import type { Technician, TechnicianFormValues } from './model'

export const technicianKeys = {
  list: (companyId: string) => ['company', companyId, 'technicians'] as const,
}

const COLUMNS = 'id, name, firm, phone, email, address, scope, specialization, note'

export async function fetchTechnicians(companyId: string): Promise<Technician[]> {
  const { data, error } = await getSupabase().from('service_technicians').select(COLUMNS).eq('company_id', companyId).order('name')
  if (error) throw error
  return data as Technician[]
}

/** Servisní technici firmy. Bez migrácie 0049 vráti chybu, ostatné stránky to ticho prežijú. */
export function useTechnicians(companyId: string) {
  return useQuery({ queryKey: technicianKeys.list(companyId), queryFn: () => fetchTechnicians(companyId), retry: false })
}

export async function saveTechnician(companyId: string, id: string | null, values: TechnicianFormValues) {
  const table = getSupabase().from('service_technicians')
  const { data, error } = id
    ? await table.update(values).eq('company_id', companyId).eq('id', id).select('id').single()
    : await table.insert({ ...values, company_id: companyId }).select('id').single()
  if (error) throw error
  return (data as { id: string }).id
}

export async function deleteTechnician(companyId: string, id: string) {
  const { data, error } = await getSupabase().from('service_technicians').delete().eq('company_id', companyId).eq('id', id).select('id')
  if (error) throw error
  if (data.length === 0) throw new Error('Not deleted')
}
