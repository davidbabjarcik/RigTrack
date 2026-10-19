import { z } from 'zod'

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
  widthCm: number | null
  lengthCm: number | null
  depthCm: number | null
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
}

export const CHECK_PRIORITIES = ['high', 'normal', 'low'] as const
export type CheckPriority = (typeof CHECK_PRIORITIES)[number]
export const CHECK_PRIORITY_LABELS: Record<CheckPriority, string> = { high: 'Vysoká', normal: 'Bežná', low: 'Nízka' }
/** Po koľkých dňoch bez kontroly treba case skontrolovať znova. */
export const CHECK_AFTER_DAYS: Record<CheckPriority, number> = { high: 14, normal: 60, low: 180 }

/** Treba case skontrolovať? Nikdy nekontrolovaný, alebo od poslednej kontroly prešlo viac dní, ako dovoľuje priorita. */
export function needsCheck(item: Pick<Case, 'lastCheck' | 'checkPriority'>, now = Date.now()) {
  if (!item.lastCheck) return true
  const days = (now - Date.parse(item.lastCheck.checkedAt)) / 86_400_000
  return days > CHECK_AFTER_DAYS[item.checkPriority ?? 'normal']
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
  sort: 'name' | 'priority' | 'lastCheck' | 'pieces'
}

export const NO_CASE_FILTER: CaseFilter = { search: '', locationId: '', owner: '', priority: '', check: '', labelCategory: '', content: '', sort: 'name' }

const plain = (value: string) => value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
const PRIORITY_ORDER: Record<CheckPriority, number> = { high: 0, normal: 1, low: 2 }

export function filterCases(items: Case[], filter: CaseFilter, pieces: Map<string, number>, now = Date.now()) {
  const words = plain(filter.search).split(/\s+/).filter(Boolean)
  const found = items.filter((item) => {
    if (filter.locationId && item.locationId !== filter.locationId) return false
    if (filter.owner === 'company' ? item.ownerStaffId : filter.owner && item.ownerStaffId !== filter.owner) return false
    if (filter.priority && (item.checkPriority ?? 'normal') !== filter.priority) return false
    if (filter.check === 'due' && !needsCheck(item, now)) return false
    if (filter.check === 'never' && item.lastCheck) return false
    if (filter.check === 'ok' && needsCheck(item, now)) return false
    if (filter.labelCategory && item.labelCategory !== filter.labelCategory) return false
    if (filter.content === 'empty' && (pieces.get(item.id) ?? 0) > 0) return false
    if (filter.content === 'filled' && (pieces.get(item.id) ?? 0) === 0) return false
    const haystack = plain([item.name, item.inventoryNumber, item.labelCategory, item.note].join(' '))
    return words.every((word) => haystack.includes(word))
  })
  const sorted = [...found]
  if (filter.sort === 'priority') sorted.sort((a, b) => PRIORITY_ORDER[a.checkPriority ?? 'normal'] - PRIORITY_ORDER[b.checkPriority ?? 'normal'] || Number(needsCheck(b, now)) - Number(needsCheck(a, now)))
  if (filter.sort === 'lastCheck') sorted.sort((a, b) => (a.lastCheck?.checkedAt ?? '').localeCompare(b.lastCheck?.checkedAt ?? ''))
  if (filter.sort === 'pieces') sorted.sort((a, b) => (pieces.get(b.id) ?? 0) - (pieces.get(a.id) ?? 0))
  return sorted
}

export type CaseCheck = {
  checkedAt: string
  checkedByName: string
  note: string
}

export const LABEL_CATEGORIES = ['Sound', 'Light', 'Cables', 'Video', 'Rigging', 'Power']

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
  note: text(2000),
  /** Vlastník: prázdne = firma, id karty zamestnanca, alebo „m-<id člena>“. */
  owner: z.string().optional(),
  checkPriority: z.enum(['high', 'normal', 'low']).optional(),
})

/** „120 × 60 × 40 cm“ z rozmerov, ktoré sú vyplnené; bez rozmerov prázdny text. */
export function formatDimensions(item: Pick<Case, 'widthCm' | 'lengthCm' | 'depthCm'>) {
  const sides = [item.widthCm, item.lengthCm, item.depthCm].filter((side) => side !== null)
  return sides.length > 0 ? `${sides.map((side) => String(side).replace('.', ',')).join(' × ')} cm` : ''
}

export type CaseFormValues = z.infer<typeof caseSchema>
