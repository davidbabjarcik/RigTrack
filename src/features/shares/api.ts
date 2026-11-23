import type { StageItem } from '@/features/stageplot/model'
import type { SynLink, SynNode } from '@/features/synoptic/model'
import { getSupabase } from '@/lib/supabase/client'

// Zdieľanie dokumentov akcie (rack, input / output list) – odkaz pre konkrétneho príjemcu, len na čítanie.

export type DocType = 'rack' | 'iolist' | 'stageplot' | 'synoptic'

export type DocShare = {
  id: string
  recipient: string
  token: string
  expiresOn: string | null
  revokedAt: string | null
  createdAt: string
  viewCount: number
  lastViewedAt: string | null
  lastViewedVersion: number | null
  views: { version: number; viewedAt: string }[]
}

export const shareKeys = { ofDoc: (companyId: string, docType: DocType, docId: string) => ['company', companyId, 'doc-shares', docType, docId] as const }
export const docLink = (token: string) => `${window.location.origin}${import.meta.env.BASE_URL}d/${token}`

type Row = {
  id: string
  recipient: string
  token: string
  expires_on: string | null
  revoked_at: string | null
  created_at: string
  view_count: number
  last_viewed_at: string | null
  last_viewed_version: number | null
  doc_share_views: { version: number; viewed_at: string }[] | null
}

/** Odkazy k dokumentu s posledným zobrazením; bez migrácie 0198 null. */
export async function fetchShares(companyId: string, docType: DocType, docId: string): Promise<DocShare[] | null> {
  const { data, error } = await getSupabase()
    .from('doc_shares')
    .select('id, recipient, token, expires_on, revoked_at, created_at, view_count, last_viewed_at, last_viewed_version, doc_share_views(version, viewed_at)')
    .eq('company_id', companyId)
    .eq('doc_type', docType)
    .eq('doc_id', docId)
    .order('created_at', { ascending: false })
  if (error) return null
  return (data as Row[]).map((row) => ({
    id: row.id,
    recipient: row.recipient,
    token: row.token,
    expiresOn: row.expires_on,
    revokedAt: row.revoked_at,
    createdAt: row.created_at,
    viewCount: row.view_count,
    lastViewedAt: row.last_viewed_at,
    lastViewedVersion: row.last_viewed_version,
    views: (row.doc_share_views ?? []).map((view) => ({ version: view.version, viewedAt: view.viewed_at })).sort((a, b) => b.viewedAt.localeCompare(a.viewedAt)),
  }))
}

export async function createShare(docType: DocType, docId: string, recipient: string, expiresOn: string | null): Promise<string> {
  const { data, error } = await getSupabase().rpc('create_doc_share', { _doc_type: docType, _doc_id: docId, _recipient: recipient.trim(), _expires_on: expiresOn })
  if (error) throw error
  return data as string
}

export async function revokeShare(shareId: string) {
  const { error } = await getSupabase().rpc('revoke_doc_share', { _share_id: shareId })
  if (error) throw error
}

/** Platnosť odkazu: aktívny, zrušený alebo prepadnutý (porovnanie s dnešným dňom). */
export function shareState(share: Pick<DocShare, 'revokedAt' | 'expiresOn'>, today: string): 'active' | 'revoked' | 'expired' {
  if (share.revokedAt) return 'revoked'
  if (share.expiresOn && share.expiresOn < today) return 'expired'
  return 'active'
}

// ------------------------------------------------------------------ stránka pre príjemcu

export type SharedInput = { channel: number; name: string; source: string; equipment_id: string | null; stagebox: string; stagebox_input: number | null; phantom: boolean; stand: string; insert_note: string; color: string; note: string }
export type SharedOutput = { number: number; name: string; kind: string; mix: string; destination: string; equipment_id: string | null; stereo: boolean; note: string }
export type SharedSlot = { side: 'front' | 'rear'; bottom_u: number; height_u: number; width: string; col: number; equipment_id: string | null; catalog_id: string | null; accessory: string | null; label: string; weight_kg: number | null; power_w: number | null }
export type SharedRack = { rack: { name: string; rack_type: string; units: number; depth_mm: number | null; rails: string; note: string }; slots: SharedSlot[] }
export type SharedIoList = { inputs: SharedInput[]; outputs: SharedOutput[] }
export type SharedSynoptic = { nodes: SynNode[]; links: SynLink[]; note: string }
export type SharedStagePlot = { plot: { width_m: number; depth_m: number; note: string }; items: StageItem[]; inputs: { channel: number; name: string }[] }

export type SharedDoc = {
  recipient: string
  title: string
  version: number
  savedAt: string
  previousVersion: number | null
  names: Record<string, string>
  companyName: string
  logoPath?: string
  logoStyle?: string
  contact?: string
  event: string | null
  startsOn: string | null
  endsOn: string | null
  venue: string | null
} & ({ docType: 'rack'; data: SharedRack; previous: SharedRack | null } | { docType: 'iolist'; data: SharedIoList; previous: SharedIoList | null }
  | { docType: 'stageplot'; data: SharedStagePlot; previous: SharedStagePlot | null }
  | { docType: 'synoptic'; data: SharedSynoptic; previous: SharedSynoptic | null })

export async function fetchSharedDoc(token: string): Promise<SharedDoc | null> {
  const { data, error } = await getSupabase().rpc('get_shared_doc', { _token: token })
  if (error) throw error
  return (data as SharedDoc | null) ?? null
}

/** Riadky, ktoré sú nové alebo zmenené oproti predošlej verzii (kľúč = kanál / výstup / pozícia v racku). */
export function changedKeys<T>(rows: T[], previous: T[] | null | undefined, key: (row: T) => string): Set<string> {
  if (!previous) return new Set()
  const before = new Map(previous.map((row) => [key(row), JSON.stringify(row)]))
  return new Set(rows.filter((row) => before.get(key(row)) !== JSON.stringify(row)).map(key))
}

/** Riadky z predošlej verzie, ktoré v novej už nie sú. */
export function removedRows<T>(rows: T[], previous: T[] | null | undefined, key: (row: T) => string): T[] {
  if (!previous) return []
  const now = new Set(rows.map(key))
  return previous.filter((row) => !now.has(key(row)))
}
