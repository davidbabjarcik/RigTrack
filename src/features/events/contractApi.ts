import { useQuery } from '@tanstack/react-query'
import { getSupabase } from '@/lib/supabase/client'
import type { ContractKind, ContractSnapshot } from './contract'

// Uložené zmluvy k eventu (0177): číslo, obsah tak, ako bol pri uložení, a podpisy.

export type SavedContract = {
  id: string
  number: string
  kind: ContractKind
  snapshot: ContractSnapshot
  clientSigner: string
  clientSignature: string | null
  supplierSigner: string
  supplierSignature: string | null
  createdAt: string
  /** Tajný odkaz na podpis klientom (0179); null = ešte nevytvorený. */
  shareToken?: string | null
}

export const contractKeys = { ofEvent: (companyId: string, eventId: string) => ['company', companyId, 'events', eventId, 'contracts'] as const }

type Row = {
  id: string
  number: string
  kind: ContractKind
  data: ContractSnapshot
  client_signer: string
  client_signature: string | null
  supplier_signer: string
  supplier_signature: string | null
  created_at: string
  share_token?: string | null
}

// Odkaz na podpis (0179); bez migrácie sa zmluvy načítajú bez neho.
let shareColumn = ', share_token'

export async function fetchContracts(companyId: string, eventId: string): Promise<SavedContract[]> {
  const { data, error } = await getSupabase()
    .from('event_contracts')
    .select('id, number, kind, data, client_signer, client_signature, supplier_signer, supplier_signature, created_at' + shareColumn)
    .eq('company_id', companyId)
    .eq('event_id', eventId)
    .order('created_at', { ascending: false })
  if (error && shareColumn && /share_token/.test(error.message ?? '')) {
    shareColumn = ''
    return fetchContracts(companyId, eventId)
  }
  if (error) throw error
  return (data as unknown as Row[]).map((row) => ({
    id: row.id,
    number: row.number,
    kind: row.kind,
    snapshot: row.data,
    clientSigner: row.client_signer,
    clientSignature: row.client_signature,
    supplierSigner: row.supplier_signer,
    supplierSignature: row.supplier_signature,
    createdAt: row.created_at,
    shareToken: row.share_token ?? null,
  }))
}

/** Bez migrácie 0177 tabuľka chýba – história sa vtedy nezobrazí. */
export function useContracts(companyId: string, eventId: string) {
  return useQuery({ queryKey: contractKeys.ofEvent(companyId, eventId), queryFn: () => fetchContracts(companyId, eventId), retry: false })
}

/** Uloží zmluvu; číslo jej dá databáza. Vráti id a číslo. */
export async function saveContract(companyId: string, eventId: string, snapshot: ContractSnapshot) {
  const { data, error } = await getSupabase()
    .from('event_contracts')
    .insert({ company_id: companyId, event_id: eventId, kind: snapshot.terms.kind, data: snapshot })
    .select('id, number')
    .single()
  if (error) throw error
  return data as { id: string; number: string }
}

export async function signContract(id: string, side: 'client' | 'supplier', name: string, image: string) {
  const fields = side === 'client' ? { client_signer: name.trim(), client_signature: image } : { supplier_signer: name.trim(), supplier_signature: image }
  const { data, error } = await getSupabase().from('event_contracts').update(fields).eq('id', id).select('id')
  if (error) throw error
  if (data.length === 0) throw new Error('Not updated')
}

export async function deleteContract(id: string) {
  const { data, error } = await getSupabase().from('event_contracts').delete().eq('id', id).select('id')
  if (error) throw error
  if (data.length === 0) throw new Error('Not deleted')
}

/** Tajný odkaz na podpis zmluvy klientom (rovnaký pri opakovanom volaní). */
export async function shareContract(id: string): Promise<string> {
  const { data, error } = await getSupabase().rpc('share_contract', { _id: id })
  if (error) throw error
  return data as string
}

/** Adresa odkazu na podpis pre klienta. */
export const contractLink = (token: string) => `${window.location.origin}${import.meta.env.BASE_URL}z/${token}`

export type SharedContract = Omit<SavedContract, 'id' | 'shareToken' | 'snapshot'> & { snapshot: ContractSnapshot; companyName: string }

/** Zmluva cez odkaz (bez prihlásenia); null = odkaz neplatí. */
export async function fetchSharedContract(token: string): Promise<SharedContract | null> {
  const { data, error } = await getSupabase().rpc('get_shared_contract', { _token: token })
  if (error) throw error
  if (!data) return null
  const row = data as { number: string; kind: ContractKind; data: ContractSnapshot; createdAt: string; clientSigner: string; clientSignature: string | null; supplierSigner: string; supplierSignature: string | null; companyName: string }
  return {
    number: row.number,
    kind: row.kind,
    snapshot: row.data,
    createdAt: row.createdAt,
    clientSigner: row.clientSigner,
    clientSignature: row.clientSignature,
    supplierSigner: row.supplierSigner,
    supplierSignature: row.supplierSignature,
    companyName: row.companyName,
  }
}

export async function signSharedContract(token: string, name: string, image: string) {
  const { error } = await getSupabase().rpc('sign_shared_contract', { _token: token, _name: name.trim(), _image: image })
  if (error) throw error
}
