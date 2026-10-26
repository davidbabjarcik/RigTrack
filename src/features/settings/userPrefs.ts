// Osobné nastavenia účtu (0099 user_prefs): farby priorít úloh, bloky na Prehľade.
// Bez migrácie sa uložia len v tomto prehliadači.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/auth-context'
import { getSupabase } from '@/lib/supabase/client'

export type UserPrefs = {
  /** Farby priorít úloh (hex); chýbajúce = predvolené. */
  priorityColors?: Partial<Record<string, string>>
  /** Bloky v stĺpci na Prehľade v poradí; chýbajúce = predvolené. */
  dashboardWidgets?: string[]
  /** Zobrazenie úloh. */
  tasksView?: 'list' | 'kanban'
  /** Podľa čoho sú stĺpce kanbanu úloh. */
  tasksBoardBy?: 'status' | 'priority' | 'category' | 'person' | 'due'
  /** Triedenie úloh. */
  tasksSort?: 'smart' | 'due' | 'priority' | 'title' | 'newest'
}

const LOCAL_KEY = 'rigtrack.prefs'
export const prefsKey = (userId: string) => ['user-prefs', userId] as const

function readLocal(): UserPrefs {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) ?? '{}') as UserPrefs
  } catch {
    return {}
  }
}

function writeLocal(prefs: UserPrefs) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(prefs))
  } catch {
    // Bez úložiska sa nastavenie len nezapamätá.
  }
}

export async function fetchPrefs(): Promise<UserPrefs> {
  const { data, error } = await getSupabase().from('user_prefs').select('prefs').maybeSingle()
  if (error) return readLocal()
  return { ...readLocal(), ...((data as { prefs: UserPrefs } | null)?.prefs ?? {}) }
}

export async function savePrefs(userId: string, prefs: UserPrefs) {
  writeLocal(prefs)
  const { error } = await getSupabase().from('user_prefs').upsert({ user_id: userId, prefs, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
  // Bez migrácie 0099 ostane nastavenie aspoň v prehliadači.
  if (error && !/user_prefs/.test(error.message ?? '')) throw error
}

/** Nastavenia prihláseného účtu a zmena časti z nich. */
export function useUserPrefs() {
  const userId = useAuth().session?.user.id ?? ''
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: prefsKey(userId), queryFn: fetchPrefs, enabled: Boolean(userId), staleTime: 10 * 60_000, placeholderData: readLocal })
  const prefs = query.data ?? {}
  const mutation = useMutation({
    mutationFn: (next: UserPrefs) => savePrefs(userId, next),
    onMutate: (next) => queryClient.setQueryData(prefsKey(userId), next),
  })
  const update = (patch: Partial<UserPrefs>) => mutation.mutate({ ...prefs, ...patch })
  return { prefs, update, saving: mutation.isPending }
}
