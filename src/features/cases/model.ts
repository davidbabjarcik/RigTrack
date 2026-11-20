import { z } from 'zod'
import { formatSides, WHEEL_PLACES, type WheelPlace } from '@/lib/dimensions'
import { CHECK_LEVEL_LABELS, DEFAULT_CHECK_DAYS, levelDays, type CheckLevel, type CheckLevelDays } from '@/features/checks/levels'

export type Case = {
  id: string
  name: string
  inventoryNumber: string
  locationId: string | null
  /** Číslo case v sade, napr. „1“ a „2“ pri blindroch v dvoch cases. */
  labelNumber: string
  /** Kategória vytlačená na štítku, napr. Sound, Light, Cables. */
  labelCategory: string
  /** Vlastný názov na štítku; použije sa, keď v case nie je označený hlavný prvok. */
  labelTitle: string
  /** Vlastná fotka na štítku (cesta v Storage); platí to isté. */
  labelPhotoPath: string
  weightKg: number | null
  /** Rozmery ako v sklade a pri nakladaní: pôdorys dĺžka × šírka a výška v „depth“. */
  /** Hĺbka – spredu dozadu (na obrazovke „Hĺbka“). */
  widthCm: number | null
  /** Šírka zľava doprava, pri pohľade spredu (na obrazovke „Šírka“). */
  lengthCm: number | null
  /** Výška od zeme hore (na obrazovke „Výška“). */
  depthCm: number | null
  /** Rozmery zmerané vrátane guľových rohov (0174); null = nevieme. */
  cornersIncluded?: boolean | null
  /** Kde má case kolieska (0174). */
  wheels?: WheelPlace
  /** Miesto na pláne skladu a pri regáli poschodie; null = case na pláne nie je. */
  spotId: string | null
  spotLevel: number | null
  note: string
  updatedAt: string
  lastCheck: CaseCheck | null
  /** Fotka case; prázdna = bez fotky. */
  photoPath: string
  /** Karta zamestnanca, ktorému case / rack patrí; prázdne = firma. */
  ownerStaffId?: string | null
  /** Ako veľmi treba obsah kontrolovať (0060); bez migrácie „normal“. */
  checkPriority?: CheckPriority
  /** Staré čísla (napr. pôvodné nálepky), podľa ktorých sa case dá nájsť (0078). */
  oldNumbers?: string
  /** Case alebo rack (0099); bez migrácie „case“. */
  kind?: CaseKind
  /** Výška racku v U (napr. 12). */
  rackUnits?: number | null
}

export const CASE_KINDS = ['case', 'rack', 'bag'] as const
export type CaseKind = (typeof CASE_KINDS)[number]
export const CASE_KIND_LABELS: Record<CaseKind, string> = { case: 'Case', rack: 'Rack', bag: 'Taška' }
/** Malými písmenami do textu: „8× case“, „2× taška“. */
export const kindWord = (kind: CaseKind | undefined) => (kind === 'rack' ? 'rack' : kind === 'bag' ? 'taška' : 'case')

/** „Rack 12U“, „Rack“ alebo „Case“. */
export const kindLabel = (item: Pick<Case, 'kind' | 'rackUnits'>) =>
  item.kind === 'rack' ? `Rack${item.rackUnits ? ` ${item.rackUnits}U` : ''}` : item.kind === 'bag' ? 'Taška' : 'Case'

const NUMBER_SUFFIX = /^(.*?)\s*(?:#|č\.\s*)?(\d+)$/

/** Číslo case v sade: „Číslo case na štítku“, inak číslo na konci názvu („Beam case 4“). */
export function caseNumber(item: Pick<Case, 'name' | 'labelNumber'>) {
  return item.labelNumber.trim() || NUMBER_SUFFIX.exec(item.name.trim())?.[2] || ''
}

/** Typ case bez poradového čísla: „Beam case 4“ → „Beam case“. */
export function caseBaseName(item: Pick<Case, 'name' | 'labelNumber'>) {
  const name = item.name.trim()
  const match = NUMBER_SUFFIX.exec(name)
  return (match && match[1].trim() && (!item.labelNumber.trim() || item.labelNumber.trim() === match[2]) ? match[1] : name).trim()
}

/** Názov s číslom v sade: „Beam case #4“. */
export function caseTitle(item: Pick<Case, 'name' | 'labelNumber'>) {
  const number = caseNumber(item)
  return number ? `${caseBaseName(item)} #${number}` : item.name
}

export type CaseGroup = { key: string; name: string; items: Case[] }

/** Rovnaké cases (rovnaký názov bez čísla) pod jeden riadok, zoradené podľa čísla; poradie skupín ostáva. */
export function groupCases(items: Case[]): CaseGroup[] {
  const groups = new Map<string, CaseGroup>()
  for (const item of items) {
    const name = caseBaseName(item)
    const key = plain(name)
    const group = groups.get(key) ?? { key, name, items: [] }
    group.items.push(item)
    groups.set(key, group)
  }
  for (const group of groups.values()) {
    group.items.sort((a, b) => (Number(caseNumber(a)) || 0) - (Number(caseNumber(b)) || 0) || a.name.localeCompare(b.name, 'sk'))
  }
  return [...groups.values()]
}

/** Úroveň kontroly case (spoločná s prevádzkovými hodinami; dni nastaví admin v Nastaveniach). */
export const CHECK_PRIORITIES = ['high', 'normal', 'low', 'none'] as const
export type CheckPriority = CheckLevel
export const CHECK_PRIORITY_LABELS = CHECK_LEVEL_LABELS

/** Treba case skontrolovať? Úroveň „žiadna“ nikdy; inak nikdy nekontrolovaný alebo prešlo viac dní, ako dovoľuje úroveň. */
export function needsCheck(item: Pick<Case, 'lastCheck' | 'checkPriority'>, now = Date.now(), days: CheckLevelDays = DEFAULT_CHECK_DAYS) {
  const limit = levelDays(item.checkPriority ?? 'normal', days)
  if (limit === null) return false
  if (!item.lastCheck) return true
  return (now - Date.parse(item.lastCheck.checkedAt)) / 86_400_000 > limit
}

export type CaseFilter = {
  search: string
  locationId: string
  /** Prázdne = všetci, „company“ = firemné, inak id karty zamestnanca. */
  owner: string
  priority: CheckPriority | ''
  /** „due“ = treba skontrolovať, „never“ = nikdy nekontrolované, „ok“ = skontrolované načas. */
  check: '' | 'due' | 'never' | 'ok'
  labelCategory: string
  /** „empty“ = prázdne cases, „filled“ = s technikou. */
  content: '' | 'empty' | 'filled'
  /** Len cases alebo len racky. */
  kind?: CaseKind | ''
  sort: 'name' | 'priority' | 'lastCheck' | 'pieces'
}

export const NO_CASE_FILTER: CaseFilter = { search: '', locationId: '', owner: '', priority: '', check: '', labelCategory: '', content: '', sort: 'name' }

const plain = (value: string) => value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
const PRIORITY_ORDER: Record<CheckPriority, number> = { high: 0, normal: 1, low: 2, none: 3 }

export function filterCases(items: Case[], filter: CaseFilter, pieces: Map<string, number>, now = Date.now(), days: CheckLevelDays = DEFAULT_CHECK_DAYS) {
  const words = plain(filter.search).split(/\s+/).filter(Boolean)
  const found = items.filter((item) => {
    if (filter.locationId && item.locationId !== filter.locationId) return false
    if (filter.owner === 'company' ? item.ownerStaffId : filter.owner && item.ownerStaffId !== filter.owner) return false
    if (filter.priority && (item.checkPriority ?? 'normal') !== filter.priority) return false
    if (filter.check === 'due' && !needsCheck(item, now, days)) return false
    if (filter.check === 'never' && item.lastCheck) return false
    if (filter.check === 'ok' && needsCheck(item, now, days)) return false
    if (filter.labelCategory && item.labelCategory !== filter.labelCategory) return false
    if (filter.content === 'empty' && (pieces.get(item.id) ?? 0) > 0) return false
    if (filter.content === 'filled' && (pieces.get(item.id) ?? 0) === 0) return false
    if (filter.kind && (item.kind ?? 'case') !== filter.kind) return false
    const haystack = plain([item.name, item.inventoryNumber, item.labelNumber, item.oldNumbers ?? '', item.labelCategory, item.note].join(' '))
    return words.every((word) => haystack.includes(word))
  })
  const sorted = [...found]
  if (filter.sort === 'priority') sorted.sort((a, b) => PRIORITY_ORDER[a.checkPriority ?? 'normal'] - PRIORITY_ORDER[b.checkPriority ?? 'normal'] || Number(needsCheck(b, now, days)) - Number(needsCheck(a, now, days)))
  if (filter.sort === 'lastCheck') sorted.sort((a, b) => (a.lastCheck?.checkedAt ?? '').localeCompare(b.lastCheck?.checkedAt ?? ''))
  if (filter.sort === 'pieces') sorted.sort((a, b) => (pieces.get(b.id) ?? 0) - (pieces.get(a.id) ?? 0))
  return sorted
}

export type CaseCheck = {
  checkedAt: string
  checkedByName: string
  note: string
}

export const LABEL_CATEGORIES = ['Sound', 'Light', 'Cables', 'Video', 'Truss', 'Stage', 'Rigging', 'Power']

const text = (max: number) => z.string().trim().max(max, `Najviac ${max} znakov`)
const size = (max: number) => z.number('Zadajte číslo').positive('Musí byť viac ako 0').max(max).optional()

// Limity zodpovedajú check constraints v 0003_cases.sql.
export const caseSchema = z.object({
  name: text(120).min(1, 'Zadajte názov'),
  inventoryNumber: text(40),
  location: text(80),
  labelNumber: text(20),
  labelCategory: text(40),
  weightKg: size(10000),
  widthCm: size(10000),
  lengthCm: size(10000),
  depthCm: size(10000),
  cornersIncluded: z.enum(['yes', 'no', '']).optional(),
  wheels: z.enum(WHEEL_PLACES).optional(),
  note: text(2000),
  /** Vlastník: prázdne = firma, id karty zamestnanca, alebo „m-<id člena>“. */
  owner: z.string().optional(),
  checkPriority: z.enum(['high', 'normal', 'low', 'none']).optional(),
  oldNumbers: text(200).optional(),
  kind: z.enum(CASE_KINDS).optional(),
  rackUnits: z.number('Zadajte číslo').int('Celé číslo').min(1, 'Aspoň 1U').max(60, 'Najviac 60U').optional(),
})

/** „120 × 60 × 40 cm“ z rozmerov, ktoré sú vyplnené; bez rozmerov prázdny text. */
export function formatDimensions(item: Pick<Case, 'widthCm' | 'lengthCm' | 'depthCm' | 'cornersIncluded'>) {
  return formatSides({ width: item.lengthCm, depth: item.widthCm, height: item.depthCm }, { corners: item.cornersIncluded })
}

export type CaseFormValues = z.infer<typeof caseSchema>

/**
 * Názov a číslo kópie case: ďalšie číslo v sade. „Beam case 3“ → „Beam case 4“; pri rovnakom názve
 * a čísle len na štítku ostane názov a číslo na štítku bude ďalšie.
 */
export function duplicateName(source: Pick<Case, 'name' | 'labelNumber'>, all: Pick<Case, 'name' | 'labelNumber'>[]) {
  const base = caseBaseName(source)
  const next = Math.max(0, ...all.filter((item) => plain(caseBaseName(item)) === plain(base)).map((item) => Number(caseNumber(item)) || 1)) + 1
  const numberedName = NUMBER_SUFFIX.test(source.name.trim()) && caseBaseName(source) !== source.name.trim()
  return numberedName
    ? { name: `${base} ${next}`, labelNumber: source.labelNumber.trim() ? String(next) : '' }
    : { name: source.name, labelNumber: String(next) }
}

/**
 * Odtlačok obsahu case pre hárok s obsahom: čo v ňom je, koľko kusov a ktoré čísla kusov. Ak sa po tlači hárku
 * zmení, hárok treba vytlačiť znova. Krátky text (nie šifrovanie), poradie položiek nehrá rolu.
 */
export type ContentGear = { id: string; name: string; caseId: string | null; quantity: number; unitIds?: number[] }

export function caseContentHash(caseId: string, equipment: ContentGear[]) {
  const text = equipment
    .filter((item) => item.caseId === caseId)
    .map((item) => `${item.id}:${item.name.trim()}:${item.quantity}:${[...(item.unitIds ?? [])].sort((a, b) => a - b).join(',')}`)
    .sort()
    .join('|')
  // FNV-1a (32 bit) dvakrát s iným základom – na rozlíšenie obsahu stačí.
  const fnv = (seed: number) => {
    let hash = seed
    for (let index = 0; index < text.length; index++) {
      hash ^= text.charCodeAt(index)
      hash = Math.imul(hash, 16777619) >>> 0
    }
    return hash.toString(16).padStart(8, '0')
  }
  return `${fnv(2166136261)}${fnv(0x9747b28c)}`
}

/** Stav tlače hárku s obsahom: kedy bol vytlačený a či sa obsah case odvtedy zmenil (vtedy treba nový hárok). */
export function contentPrintState(printed: { printedAt?: string; contentHash?: string } | undefined, caseId: string, equipment: ContentGear[]) {
  if (!printed) return { state: 'never' as const }
  const changed = Boolean(printed.contentHash) && printed.contentHash !== caseContentHash(caseId, equipment)
  return { state: changed ? ('changed' as const) : ('printed' as const), printedAt: printed.printedAt }
}
