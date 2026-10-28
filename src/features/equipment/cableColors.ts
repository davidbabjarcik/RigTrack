import { getSupabase } from '@/lib/supabase/client'

// Farebný kód dĺžok káblov: každá dĺžka má vo firme svoju farbu (páska na konektore)
// a jej názov, ktorý sa tlačí na hárok FLIGHTCASE CONTENT.

/**
 * Typ kábla s vlastnými farbami dĺžok: zabudované XLR / DMX, powerCON, 230 V, alebo vlastný typ (text, napr. „Káblovka“,
 * platí pre káble, ktorých konektor / typ ho obsahuje). '' = spoločné farby (a záloha, kým typ nemá vlastnú farbu).
 */
export const BUILTIN_CABLE_TYPES = ['xlr', 'powercon', '230'] as const
export const CABLE_COLOR_TYPES = [...BUILTIN_CABLE_TYPES, ''] as const
export type CableColorType = string
const BUILTIN_LABELS: Record<string, string> = { xlr: 'XLR / DMX', powercon: 'powerCON', '230': '230 V (Schuko, CEE)', '': 'Spoločné – všetky káble' }
export const isBuiltinCableType = (type: string) => type in BUILTIN_LABELS
/** Názov typu na obrazovke: zabudovaný má popis, vlastný je svoj text. */
export const cableTypeLabel = (type: string) => BUILTIN_LABELS[type] ?? type

export type CableColor = { lengthM: number; name: string; color: string; cableType?: CableColorType }

/** Predloha farieb dĺžok (bežný farebný kód káblov); doplní len dĺžky, ktoré ešte farbu nemajú. */
export const PRESET_COLORS: CableColor[] = [
  { lengthM: 1, name: 'zelená', color: '#00a651' },
  { lengthM: 2, name: 'žltá', color: '#ffd400' },
  { lengthM: 3, name: 'červená', color: '#e30613' },
  { lengthM: 5, name: 'fialová', color: '#7b2cbf' },
  { lengthM: 8, name: 'béžová', color: '#f2e2a0' },
  { lengthM: 10, name: 'modrá', color: '#0072ce' },
  { lengthM: 15, name: 'oranžová', color: '#ff8c00' },
]

/** Zabudovaný typ kábla podľa konektora: XLR a DMX, powerCON, 230 V (Schuko, CEE, predlžovačky); inak ''. */
export function cableColorType(connector: string | undefined): CableColorType {
  const value = (connector ?? '').toLowerCase()
  if (/xlr|dmx/.test(value)) return 'xlr'
  if (/powercon|true1/.test(value)) return 'powercon'
  if (/schuko|cee|230|zásuv|predlž|napájac/.test(value)) return '230'
  return ''
}

/**
 * Typ kábla s vlastnými farbami pre konektor: najprv vlastný typ, ktorého text konektor obsahuje (napr. „Káblovka“),
 * potom zabudovaný (XLR, powerCON, 230 V).
 */
export function resolveCableType(colors: CableColor[], connector: string | undefined, extra: string[] = []): CableColorType {
  const value = (connector ?? '').toLowerCase()
  const custom = [...new Set([...colors.map((color) => color.cableType ?? ''), ...extra])]
    .filter((type) => type && !isBuiltinCableType(type))
    .sort((a, b) => b.length - a.length)
    .find((type) => value.includes(type.toLowerCase()))
  return custom ?? cableColorType(connector)
}

/** Farba dĺžky pre konektor: najprv farba typu kábla (vlastného alebo zabudovaného), inak spoločná. */
export function findCableColor(colors: CableColor[], connector: string | undefined, lengthM: number) {
  const value = (connector ?? '').toLowerCase()
  const types = [
    ...[...new Set(colors.map((color) => color.cableType ?? ''))]
      .filter((type) => type && !isBuiltinCableType(type) && value.includes(type.toLowerCase()))
      .sort((a, b) => b.length - a.length),
    cableColorType(connector),
  ]
  for (const type of types) {
    const found = colors.find((color) => (color.cableType ?? '') === type && color.lengthM === lengthM)
    if (found) return found
  }
  return colors.find((color) => !color.cableType && color.lengthM === lengthM)
}

const HEX = /^#[0-9a-f]{6}$/

/** „00A651“ aj „#00a651“ → „#00a651“; iný text vráti null. */
export function parseHexColor(text: string) {
  const value = text.trim().toLowerCase()
  const withHash = value.startsWith('#') ? value : `#${value}`
  return HEX.test(withHash) ? withHash : null
}

export const cableColorKeys = {
  list: (companyId: string) => ['company', companyId, 'cable-colors'] as const,
}

// Bez migrácie 0113 tabuľka nemá typ kábla – všetky farby sú spoločné.
let hasTypeColumn = true

export async function fetchCableColors(companyId: string): Promise<CableColor[]> {
  const db = getSupabase()
  let result: { data: unknown; error: { message: string } | null } = await db.from('cable_colors').select('length_m, name, color, cable_type').eq('company_id', companyId).order('length_m')
  if (result.error && /cable_type/.test(result.error.message)) {
    hasTypeColumn = false
    result = await db.from('cable_colors').select('length_m, name, color').eq('company_id', companyId).order('length_m')
  }
  if (result.error) throw result.error
  const rows = result.data as { length_m: number | string; name: string; color: string; cable_type?: CableColorType }[]
  return rows.map((row) => ({ lengthM: Number(row.length_m), name: row.name, color: row.color, cableType: row.cable_type ?? '' }))
}

/** Dá sa ukladať farba pre typ kábla (je migrácia 0113)? */
export const cableTypesSupported = () => hasTypeColumn

/**
 * Založí farbu pre dĺžku, alebo zmení existujúcu.
 * Zámerne nie upsert: ten by prepisoval aj company_id a length_m, na čo používateľ
 * nemá (a nemá mať) oprávnenie, a databáza by celý zápis odmietla.
 */
export async function saveCableColor(companyId: string, color: CableColor) {
  const db = getSupabase()
  const fields = { color: color.color.toLowerCase(), name: color.name.trim() }
  const type = hasTypeColumn ? { cable_type: color.cableType ?? '' } : {}
  let query = db.from('cable_colors').update(fields).eq('company_id', companyId).eq('length_m', color.lengthM)
  if (hasTypeColumn) query = query.eq('cable_type', color.cableType ?? '')
  const updated = await query.select('length_m')
  if (updated.error) throw updated.error
  if (updated.data.length > 0) return

  const inserted = await db.from('cable_colors').insert({ company_id: companyId, length_m: color.lengthM, ...type, ...fields })
  if (inserted.error) throw inserted.error
}

export async function deleteCableColor(companyId: string, color: Pick<CableColor, 'lengthM' | 'cableType'>) {
  let query = getSupabase().from('cable_colors').delete().eq('company_id', companyId).eq('length_m', color.lengthM)
  if (hasTypeColumn) query = query.eq('cable_type', color.cableType ?? '')
  const { error } = await query
  if (error) throw error
}
