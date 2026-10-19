import { useQuery } from '@tanstack/react-query'
import { getSupabase } from '@/lib/supabase/client'

/** Úroveň kontroly: žiadna (nekontroluje sa), malá, stredná, veľká. Platí pre cases aj prevádzkové hodiny. */
export const CHECK_LEVELS = ['none', 'low', 'normal', 'high'] as const
export type CheckLevel = (typeof CHECK_LEVELS)[number]
export const CHECK_LEVEL_LABELS: Record<CheckLevel, string> = { none: 'Žiadna', low: 'Malá', normal: 'Stredná', high: 'Veľká' }

/** Po koľkých dňoch treba kontrolovať pri danej úrovni (nastaví admin v Nastaveniach). */
export type CheckLevelDays = { low: number; normal: number; high: number }
export const DEFAULT_CHECK_DAYS: CheckLevelDays = { low: 180, normal: 60, high: 14 }

/** Dni medzi kontrolami pre úroveň; „žiadna“ = null (nekontroluje sa). */
export function levelDays(level: CheckLevel, days: CheckLevelDays = DEFAULT_CHECK_DAYS) {
  return level === 'none' ? null : days[level]
}

export const checkLevelKeys = { days: (companyId: string) => ['company', companyId, 'check-levels'] as const }

export async function fetchCheckLevels(companyId: string): Promise<CheckLevelDays> {
  const { data, error } = await getSupabase().from('company_check_levels').select('low_days, normal_days, high_days').eq('company_id', companyId).maybeSingle()
  if (error) throw error
  const row = data as { low_days: number; normal_days: number; high_days: number } | null
  return row ? { low: row.low_days, normal: row.normal_days, high: row.high_days } : DEFAULT_CHECK_DAYS
}

/** Nastavenie úrovní firmy; kým sa nenačíta (alebo bez migrácie 0073), platia predvolené dni. */
export function useCheckLevels(companyId: string) {
  const query = useQuery({ queryKey: checkLevelKeys.days(companyId), queryFn: () => fetchCheckLevels(companyId), retry: false, staleTime: 10 * 60_000 })
  return { days: query.data ?? DEFAULT_CHECK_DAYS, query }
}

export async function saveCheckLevels(companyId: string, days: CheckLevelDays) {
  const { error } = await getSupabase()
    .from('company_check_levels')
    .upsert({ company_id: companyId, low_days: days.low, normal_days: days.normal, high_days: days.high }, { onConflict: 'company_id' })
  if (error) throw error
}
