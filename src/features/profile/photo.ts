// Moja fotka: patrí do karty zamestnanca v každej mojej firme (fotky ležia v priečinku firmy).
import { useQuery } from '@tanstack/react-query'
import { discardPhotoFile, fetchPhotoUrl, storeCompanyPhoto } from '@/features/equipment/photo'
import { getSupabase } from '@/lib/supabase/client'

export type MyCard = { id: string; companyId: string; photoPath: string }

export const myPhotoKeys = { all: (userId: string) => ['my-photo', userId] as const }

/** Fotka na ukážku: prvá karta, ktorá nejakú má. */
export const shownPhoto = (cards: MyCard[]) => cards.find((card) => card.photoPath)?.photoPath ?? ''

export async function fetchMyCards(userId: string): Promise<MyCard[]> {
  const { data, error } = await getSupabase().from('staff').select('id, company_id, photo_path').eq('member_id', userId)
  if (error) throw error
  return (data as { id: string; company_id: string; photo_path: string }[]).map((row) => ({ id: row.id, companyId: row.company_id, photoPath: row.photo_path }))
}

export function useMyPhoto(userId: string) {
  return useQuery({
    queryKey: myPhotoKeys.all(userId),
    queryFn: async () => {
      const cards = await fetchMyCards(userId)
      const path = shownPhoto(cards)
      return { cards, path, url: path ? await fetchPhotoUrl(path).catch(() => '') : '' }
    },
    retry: false,
    staleTime: 30 * 60_000,
  })
}

/** Nahrá fotku do každej mojej firmy; vráti firmy, kde sa to nepodarilo. */
export async function setMyPhoto(cards: MyCard[], file: File): Promise<string[]> {
  const failed: string[] = []
  for (const card of cards) {
    try {
      const path = await storeCompanyPhoto(card.companyId, `staff-${card.id}`, file, { thumb: true })
      const { error } = await getSupabase().from('staff').update({ photo_path: path }).eq('id', card.id)
      if (error) throw error
      if (card.photoPath) await discardPhotoFile(card.photoPath).catch(() => {})
    } catch {
      failed.push(card.companyId)
    }
  }
  return failed
}

export async function clearMyPhoto(cards: MyCard[]) {
  for (const card of cards.filter((item) => item.photoPath)) {
    const { error } = await getSupabase().from('staff').update({ photo_path: '' }).eq('id', card.id)
    if (error) throw error
    await discardPhotoFile(card.photoPath).catch(() => {})
  }
}
