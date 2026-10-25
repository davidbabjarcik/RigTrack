// Pripnuté firmy na „Vyberte firmu“ – uložené pri účte (0097), rovnaké na každom zariadení.
// Bez migrácie sa použije pamäť prehliadača ako doteraz.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getSupabase } from '@/lib/supabase/client'

const pinKey = (userId: string) => `rigtrack:pinned-companies:${userId}`
const keys = { pins: (userId: string) => ['company-pins', userId] as const }

function localPins(userId: string): string[] {
  try {
    const saved = JSON.parse(localStorage.getItem(pinKey(userId)) ?? '[]') as unknown
    return Array.isArray(saved) ? saved.filter((id): id is string => typeof id === 'string') : []
  } catch {
    return []
  }
}

type Pins = { ids: string[]; inDatabase: boolean }

async function fetchPins(userId: string): Promise<Pins> {
  const { data, error } = await getSupabase().from('company_pins').select('company_id').eq('user_id', userId)
  if (error) return { ids: localPins(userId), inDatabase: false }
  const ids = (data as { company_id: string }[]).map((row) => row.company_id)
  // Prvé načítanie po migrácii: doterajšie pripnutia z prehliadača sa prenesú k účtu.
  const local = localPins(userId).filter((id) => !ids.includes(id))
  if (local.length > 0) {
    const moved = await getSupabase().from('company_pins').insert(local.map((company_id) => ({ company_id })))
    if (!moved.error) {
      try {
        localStorage.removeItem(pinKey(userId))
      } catch {
        // nevadí
      }
      return { ids: [...ids, ...local], inDatabase: true }
    }
  }
  return { ids, inDatabase: true }
}

export function useCompanyPins(userId: string) {
  const queryClient = useQueryClient()
  const pins = useQuery({ queryKey: keys.pins(userId), queryFn: () => fetchPins(userId), staleTime: 5 * 60_000 })
  const toggle = useMutation({
    mutationFn: async (companyId: string) => {
      const current = pins.data ?? { ids: [], inDatabase: false }
      const pinned = current.ids.includes(companyId)
      if (current.inDatabase) {
        const table = getSupabase().from('company_pins')
        const { error } = pinned ? await table.delete().eq('user_id', userId).eq('company_id', companyId) : await table.insert({ company_id: companyId })
        if (error) throw error
      } else {
        const next = pinned ? current.ids.filter((id) => id !== companyId) : [...current.ids, companyId]
        try {
          localStorage.setItem(pinKey(userId), JSON.stringify(next))
        } catch {
          // Bez úložiska sa pripnutie len nezapamätá.
        }
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: keys.pins(userId) }),
  })
  return { pins: pins.data?.ids ?? [], toggle: (companyId: string) => toggle.mutate(companyId) }
}
