import { useQuery, useQueryClient } from '@tanstack/react-query'
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

/** Čo sa tlačí: QR štítok, páska Brother, štítok case (A5/A4), hárok s obsahom case alebo plagát inventára (poster:druh). */
export type PrintLabel = 'qr' | 'tape' | 'case_label' | 'content' | 'patch' | 'dmx' | 'ip' | 'mac' | `poster:${string}`
/** Plagát inventára je vo fronte ako kind „poster“ s id firmy a druhom techniky v label (0131). */
export type PrintItem = { id: string; kind: 'equipment' | 'case' | 'spot' | 'poster' | 'event' | 'network'; targetId: string; label: PrintLabel; note: string; createdAt: string; format?: PrintFormat }
/** Papier a orientácia uložené pri pridaní do fronty (0139); prázdne = podľa nastavení pri tlači. */
export type PrintFormat = '' | 'A4-portrait' | 'A4-landscape' | 'A5-portrait' | 'A5-landscape'
export const formatOf = (paper: 'A4' | 'A5', landscape: boolean): PrintFormat => `${paper}-${landscape ? 'landscape' : 'portrait'}`
export const FORMAT_LABELS: Record<Exclude<PrintFormat, ''>, string> = { 'A4-portrait': 'A4 na výšku', 'A4-landscape': 'A4 na šírku', 'A5-portrait': 'A5 na výšku', 'A5-landscape': 'A5 na šírku' }
/** Parametre adresy pre tlačovú stránku podľa formátu (?paper=A5&landscape=1). */
export const formatParams = (format: PrintFormat | undefined) => {
  if (!format) return ''
  const [paper, orientation] = format.split('-')
  return `paper=${paper}&landscape=${orientation === 'landscape' ? 1 : 0}`
}

export async function fetchPrintQueue(companyId: string): Promise<PrintItem[]> {
  const select = (columns: string) => getSupabase().from('print_queue').select(columns).eq('company_id', companyId).order('created_at')
  let { data, error } = await select('id, kind, target_id, label, note, created_at, format')
  // Bez migrácie 0139 nie je formát.
  if (error && /format/.test(error.message)) ({ data, error } = await select('id, kind, target_id, label, note, created_at'))
  if (error) throw error
  return (data as unknown as { id: string; kind: PrintItem['kind']; target_id: string; label: PrintItem['label']; note: string; created_at: string; format?: PrintFormat }[]).map((row) => ({
    format: row.format ?? '',
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
export async function addToPrintQueue(companyId: string, items: { kind: PrintItem['kind']; targetId: string; label?: PrintItem['label']; note?: string; format?: PrintFormat }[]) {
  const rows = items.map((item) => ({ company_id: companyId, kind: item.kind, target_id: item.targetId, label: item.label ?? 'qr', note: (item.note ?? '').slice(0, 200), ...(item.format ? { format: item.format } : {}) }))
  const { error } = await getSupabase().from('print_queue').upsert(rows, { onConflict: 'company_id,kind,target_id,label', ignoreDuplicates: true })
  // Bez migrácie 0139 sa formát neuloží.
  if (error && /format/.test(error.message)) {
    const retry = await getSupabase().from('print_queue').upsert(rows.map(({ format: _f, ...row }) => (void _f, row)), { onConflict: 'company_id,kind,target_id,label', ignoreDuplicates: true })
    if (retry.error) throw retry.error
    return
  }
  if (error) throw error
}

/**
 * Čo už má vytlačený štítok (0123); bez migrácie null. Od 0178 aj kedy a odtlačok obsahu (pri hárku s obsahom
 * case), podľa ktorého appka pozná, že sa obsah od tlače zmenil.
 */
export type PrintedLabel = { kind: PrintItem['kind']; targetId: string; label: PrintLabel; printedAt?: string; contentHash?: string }

let printedDetails = true

export async function fetchPrintedLabels(companyId: string): Promise<PrintedLabel[] | null> {
  const columns = printedDetails ? 'kind, target_id, label, printed_at, content_hash' : 'kind, target_id, label'
  const { data, error } = await getSupabase().from('printed_labels').select(columns).eq('company_id', companyId)
  if (error && printedDetails && /content_hash|printed_at/.test(error.message ?? '')) {
    printedDetails = false
    return fetchPrintedLabels(companyId)
  }
  if (error) return null
  return (data as unknown as { kind: PrintItem['kind']; target_id: string; label: PrintLabel; printed_at?: string; content_hash?: string }[]).map((row) => ({
    kind: row.kind,
    targetId: row.target_id,
    label: row.label,
    printedAt: row.printed_at,
    contentHash: row.content_hash ?? '',
  }))
}

export function usePrintedLabels(companyId: string) {
  return useQuery({ queryKey: [...printKeys.queue(companyId), 'printed'], queryFn: () => fetchPrintedLabels(companyId), retry: false })
}

/**
 * Zapamätá, že štítky sú vytlačené (alebo už nalepené). Od 0178 sa pri opätovnej tlači obnoví dátum a odtlačok
 * obsahu; bez migrácie sa len zapíše, že vytlačené sú (duplicity sa preskočia).
 */
export async function markPrinted(companyId: string, items: PrintedLabel[]) {
  if (items.length === 0) return
  await recordPrinted(companyId, items)
  // Vytlačené zmizne aj z tlačovej fronty.
  await clearFromPrintQueue(companyId, items).catch(() => undefined)
}

async function recordPrinted(companyId: string, items: PrintedLabel[]) {
  const viaRpc = await getSupabase().rpc('mark_printed', {
    _company_id: companyId,
    _items: items.map((item) => ({ kind: item.kind, target_id: item.targetId, label: item.label, content_hash: item.contentHash ?? '' })),
  })
  if (!viaRpc.error) return
  if (!/mark_printed|PGRST202|function/i.test(`${viaRpc.error.code ?? ''} ${viaRpc.error.message ?? ''}`)) throw viaRpc.error
  const rows = items.map((item) => ({ company_id: companyId, kind: item.kind, target_id: item.targetId, label: item.label }))
  for (let index = 0; index < rows.length; index += 500) {
    const { error } = await getSupabase().from('printed_labels').upsert(rows.slice(index, index + 500), { onConflict: 'company_id,kind,target_id,label', ignoreDuplicates: true })
    if (error) throw error
  }
}

/** Čo sa vytlačilo – položky fronty s týmto druhom, cieľom a štítkom sa zmažú. */
export type QueueEntry = { kind: PrintItem['kind']; targetId: string; label: PrintLabel }

/**
 * Po vytlačení alebo stiahnutí PDF / ZIP zmaže z tlačovej fronty to, čo sa práve vytlačilo (ostatné ostane).
 * Mazať smie každý člen firmy (rovnako ako tlačidlom „Vytlačené – vyprázdniť“).
 */
export async function clearFromPrintQueue(companyId: string, entries: QueueEntry[]) {
  const groups = new Map<string, { kind: QueueEntry['kind']; label: PrintLabel; ids: Set<string> }>()
  for (const entry of entries) {
    const key = `${entry.kind}|${entry.label}`
    const group = groups.get(key) ?? { kind: entry.kind, label: entry.label, ids: new Set<string>() }
    group.ids.add(entry.targetId)
    groups.set(key, group)
  }
  for (const group of groups.values()) {
    const { error } = await getSupabase().from('print_queue').delete().eq('company_id', companyId).eq('kind', group.kind).eq('label', group.label).in('target_id', [...group.ids])
    if (error) throw error
  }
}

/** Zmaže vytlačené z fronty a obnoví ju; chyba sa ignoruje (položku zmažete aj ručne). */
export function useClearPrinted(companyId: string) {
  const queryClient = useQueryClient()
  return (entries: QueueEntry[]) => {
    if (entries.length === 0) return
    void clearFromPrintQueue(companyId, entries)
      .then(() => queryClient.invalidateQueries({ queryKey: printKeys.queue(companyId) }))
      .catch(() => undefined)
  }
}

export async function removeFromPrintQueue(companyId: string, ids: string[]) {
  if (ids.length === 0) return
  const { error } = await getSupabase().from('print_queue').delete().eq('company_id', companyId).in('id', ids)
  if (error) throw error
}
