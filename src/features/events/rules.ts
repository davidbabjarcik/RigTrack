import { z } from 'zod'
import { AUDIO_TYPE_LABELS, KIND_LABELS, type AudioType, type Equipment, type EquipmentKind, type Lookup } from '@/features/equipment/model'
import { getSupabase } from '@/lib/supabase/client'
import type { CompanyEvent } from './model'

// Pripomienky pri eventoch a výpožičkách: pravidlá „keď je tam X, pripomeň Y“.
// Napr. pasívne repro alebo zosilňovač → kabeláž NL4 (na každý kus jeden kábel); svetlá → case s hákmi.

export const MATCHER_TYPES = ['equipment', 'category', 'case', 'kind', 'audioType', 'name'] as const
export type MatcherType = (typeof MATCHER_TYPES)[number]
export const MATCHER_LABELS: Record<MatcherType, string> = {
  equipment: 'technika',
  category: 'kategória',
  case: 'case',
  kind: 'druh techniky',
  audioType: 'typ zvuku',
  name: 'názov obsahuje',
}

const matcher = z.object({ type: z.enum(MATCHER_TYPES), value: z.string().trim().min(1).max(120) })
export type Matcher = z.infer<typeof matcher>

/** Koľko treba: aspoň jeden kus, alebo `factor` kusov na každý kus toho, čo pravidlo spúšťa. */
export const AMOUNT_MODES = ['any', 'perPiece'] as const
export type AmountMode = (typeof AMOUNT_MODES)[number]
const amount = z.object({ mode: z.enum(AMOUNT_MODES), factor: z.number().min(0.1).max(100) })

export const ruleSchema = z.object({
  id: z.string().min(1).max(40),
  when: matcher,
  need: matcher,
  amount: amount.default({ mode: 'any', factor: 1 }),
  /** Vlastný text pripomienky; prázdny = zostaví sa sám. */
  message: z.string().trim().max(200),
})
export type EventRule = z.infer<typeof ruleSchema>
export const rulesSchema = z.array(ruleSchema).max(100)

/** Uložené pravidlá; poškodené sa vynechajú. */
export function readRules(raw: unknown): EventRule[] {
  if (!Array.isArray(raw)) return []
  return raw.flatMap((item) => {
    const parsed = ruleSchema.safeParse(item)
    return parsed.success ? [parsed.data] : []
  })
}

const plain = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()

/** Spĺňa technika podmienku? Pri case rozhoduje, v ktorom case technika je alebo s ktorým prišla na event. */
export function matches(item: Equipment, rule: Matcher, viaCase: string | null = null) {
  switch (rule.type) {
    case 'equipment':
      return item.id === rule.value
    case 'category':
      return item.categoryId === rule.value
    case 'case':
      return viaCase === rule.value || item.caseId === rule.value
    case 'kind':
      return item.kind === rule.value
    case 'audioType':
      return item.attributes.audioType === rule.value
    case 'name':
      return plain(`${item.name} ${item.manufacturer} ${item.model}`).includes(plain(rule.value))
  }
}

/** `missing` = koľko kusov chýba (pri „na každý kus“), inak 1. */
export type Reminder = { rule: EventRule; text: string; missing: number }
export type Line = { equipmentId: string; quantity: number; caseId: string | null }

/**
 * Pripomienky, ktoré platia pre zoznam techniky (event alebo výpožička): niečo spúšťa pravidlo
 * a to, čo k tomu treba, chýba úplne – alebo pri „na každý kus“ ho je menej, ako treba.
 * `where` je slovo do textu: „na evente“, „vo výpožičke“.
 */
export function reminders(lines: Line[], rules: EventRule[], equipment: Equipment[], describe: (matcher: Matcher) => string, where = 'na evente'): Reminder[] {
  const items = lines.flatMap((line) => {
    const item = equipment.find((candidate) => candidate.id === line.equipmentId)
    return item ? [{ item, quantity: line.quantity, viaCase: line.caseId }] : []
  })
  const count = (matcher: Matcher) => items.filter(({ item, viaCase }) => matches(item, matcher, viaCase)).reduce((sum, line) => sum + line.quantity, 0)
  const result: Reminder[] = []
  for (const rule of rules) {
    const triggers = count(rule.when)
    if (triggers === 0) continue
    const have = count(rule.need)
    if (rule.amount.mode === 'any') {
      if (have > 0) continue
      result.push({ rule, missing: 1, text: rule.message || `${capitalize(where)} je ${describe(rule.when)} – netreba aj ${describe(rule.need)}?` })
      continue
    }
    const needed = Math.ceil(triggers * rule.amount.factor - 1e-9)
    if (have >= needed) continue
    const detail = `${where} je ${triggers} × ${describe(rule.when)}, treba ${needed} × ${describe(rule.need)}, je ${have}`
    result.push({ rule, missing: needed - have, text: rule.message ? `${rule.message} (${detail})` : `${capitalize(detail)}.` })
  }
  return result
}

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)

/** Pripomienky pre event. */
export function eventReminders(event: Pick<CompanyEvent, 'equipment'>, rules: EventRule[], equipment: Equipment[], describe: (matcher: Matcher) => string) {
  return reminders(event.equipment, rules, equipment, describe, 'na evente')
}

/** Čitateľný popis podmienky: „kategória Zvuk“, „technika Kábel NL4 10 m“. */
export function describeMatcher(rule: Matcher, lookups: { equipment: Equipment[]; categories: Lookup[]; cases: { id: string; name: string }[] }) {
  switch (rule.type) {
    case 'equipment':
      return lookups.equipment.find((item) => item.id === rule.value)?.name ?? 'zmazaná technika'
    case 'category':
      return `kategória ${lookups.categories.find((item) => item.id === rule.value)?.name ?? '(zmazaná)'}`
    case 'case':
      return `case ${lookups.cases.find((item) => item.id === rule.value)?.name ?? '(zmazaný)'}`
    case 'kind':
      return (KIND_LABELS[rule.value as EquipmentKind] ?? rule.value).toLowerCase()
    case 'audioType':
      return (AUDIO_TYPE_LABELS[rule.value as AudioType] ?? rule.value).toLowerCase()
    case 'name':
      return `„${rule.value}“`
  }
}

// ---------------------------------------------------------------------------
// Uloženie
// ---------------------------------------------------------------------------

export const ruleKeys = { list: (companyId: string) => ['company', companyId, 'event-rules'] as const }

export async function fetchRules(companyId: string): Promise<EventRule[]> {
  const { data, error } = await getSupabase().from('event_rules').select('rules').eq('company_id', companyId).maybeSingle()
  if (error) throw error
  return readRules(data?.rules)
}

/** Najprv úprava, až potom vloženie: upsert by menil stĺpec kľúča, na ktorý nie je UPDATE. */
export async function saveRules(companyId: string, rules: EventRule[]) {
  const parsed = rulesSchema.parse(rules)
  const updated = await getSupabase().from('event_rules').update({ rules: parsed }).eq('company_id', companyId).select('company_id')
  if (updated.error) throw updated.error
  if (updated.data.length > 0) return
  const { error } = await getSupabase().from('event_rules').insert({ company_id: companyId, rules: parsed })
  if (error) throw error
}

// Pripomienku, ktorú niekto pri evente odklikol „Netreba“, si pamätá tento prehliadač.
/** Kľúč je id eventu, alebo „loan:id“ pri výpožičke. */
const dismissKey = (eventId: string) => `rigtrack:event-reminders-dismissed:${eventId}`

export function loadDismissed(eventId: string): string[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(dismissKey(eventId)) ?? '[]')
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : []
  } catch {
    return []
  }
}

export function saveDismissed(eventId: string, ids: string[]) {
  try {
    localStorage.setItem(dismissKey(eventId), JSON.stringify(ids))
  } catch {
    // bez úložiska platí len do zatvorenia karty
  }
}
