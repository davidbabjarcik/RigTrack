import { useQuery } from '@tanstack/react-query'
import { getSupabase } from '@/lib/supabase/client'

/** Veľkosť QR štítkov na A4: koľko sa ich zmestí na stranu (väčšie sa ľahšie skenujú aj iPhonom). */
export const QR_SIZES = ['small', 'medium', 'large', 'xl', 'custom'] as const
export type QrSize = (typeof QR_SIZES)[number]
export const QR_SIZE_LABELS: Record<QrSize, string> = { small: 'Malé – 20 na A4', medium: 'Stredné – 12 na A4', large: 'Veľké – 6 na A4', xl: 'Najväčšie – 2 na A4', custom: 'Vlastná (mm)' }

/** Vlastná veľkosť QR v mm (strana štvorca); A4 má na šírku 190 mm využiteľnej plochy. */
export const QR_MM_MIN = 15
export const QR_MM_MAX = 180
export const clampQrMm = (value: number) => Math.min(QR_MM_MAX, Math.max(QR_MM_MIN, Math.round(value) || 50))

/** Nastavenia firmy pre tlač a kľúčové slová (0120). */
export type CompanyPrefs = {
  /** Kam sa tlačia QR štítky: A4 (väčšie, skenujú sa aj iPhonom) alebo štítkovač Brother. */
  qrTarget?: 'a4' | 'brother'
  qrSize?: QrSize
  /** Pri vlastnej veľkosti: strana QR v mm. */
  qrMm?: number
  /** Komu sa priradí úloha z @todo / @toprint; prázdne = tomu, kto ho napísal. */
  todoAssignees?: string[]
  toprintAssignees?: string[]
}

export const printKeys = {
  prefs: (companyId: string) => ['company', companyId, 'company-prefs'] as const,
  queue: (companyId: string) => ['company', companyId, 'print-queue'] as const,
}

/** Bez migrácie 0120 prázdne nastavenia (platí predvolené správanie). */
export async function fetchCompanyPrefs(companyId: string): Promise<CompanyPrefs> {
  const { data, error } = await getSupabase().from('company_prefs').select('prefs').eq('company_id', companyId).maybeSingle()
  if (error) return {}
  return ((data as { prefs: CompanyPrefs } | null)?.prefs ?? {}) as CompanyPrefs
}

export function useCompanyPrefs(companyId: string | undefined) {
  return useQuery({ queryKey: printKeys.prefs(companyId ?? ''), queryFn: () => fetchCompanyPrefs(companyId!), enabled: Boolean(companyId), staleTime: 5 * 60_000 })
}

/** Uloží nastavenia firmy (zlúči so starými). Nie upsert – ten by menil aj kľúč. */
export async function saveCompanyPrefs(companyId: string, current: CompanyPrefs, patch: Partial<CompanyPrefs>) {
  const prefs = { ...current, ...patch }
  const db = getSupabase()
  const updated = await db.from('company_prefs').update({ prefs, updated_at: new Date().toISOString() }).eq('company_id', companyId).select('company_id')
  if (updated.error) throw updated.error
  if (updated.data.length > 0) return
  const { error } = await db.from('company_prefs').insert({ company_id: companyId, prefs })
  if (error) throw error
}

/** Čo sa tlačí: QR štítok, páska Brother, štítok case (A5/A4) alebo hárok s obsahom case. */
export type PrintLabel = 'qr' | 'tape' | 'case_label' | 'content'
export type PrintItem = { id: string; kind: 'equipment' | 'case'; targetId: string; label: PrintLabel; note: string; createdAt: string }

export async function fetchPrintQueue(companyId: string): Promise<PrintItem[]> {
  const { data, error } = await getSupabase().from('print_queue').select('id, kind, target_id, label, note, created_at').eq('company_id', companyId).order('created_at')
  if (error) throw error
  return (data as { id: string; kind: PrintItem['kind']; target_id: string; label: PrintItem['label']; note: string; created_at: string }[]).map((row) => ({
    id: row.id,
    kind: row.kind,
    targetId: row.target_id,
    label: row.label,
    note: row.note,
    createdAt: row.created_at,
  }))
}

export function usePrintQueue(companyId: string) {
  return useQuery({ queryKey: printKeys.queue(companyId), queryFn: () => fetchPrintQueue(companyId), retry: false })
}

/** Pridá štítky do tlačovej fronty; čo už vo fronte je, sa preskočí. */
export async function addToPrintQueue(companyId: string, items: { kind: PrintItem['kind']; targetId: string; label?: PrintItem['label']; note?: string }[]) {
  const rows = items.map((item) => ({ company_id: companyId, kind: item.kind, target_id: item.targetId, label: item.label ?? 'qr', note: (item.note ?? '').slice(0, 200) }))
  const { error } = await getSupabase().from('print_queue').upsert(rows, { onConflict: 'company_id,kind,target_id,label', ignoreDuplicates: true })
  if (error) throw error
}

export async function removeFromPrintQueue(companyId: string, ids: string[]) {
  if (ids.length === 0) return
  const { error } = await getSupabase().from('print_queue').delete().eq('company_id', companyId).in('id', ids)
  if (error) throw error
}
