import { getSupabase } from '@/lib/supabase/client'

export type Note = { id: string; title: string; body: string; pinned: boolean; people: string[]; createdBy: string | null; authorName: string; updatedAt: string }

export const notesKey = (companyId: string) => ['company', companyId, 'notes'] as const

/** Firemné poznámky: pripnuté hore, potom najnovšie. */
export async function fetchNotes(companyId: string): Promise<Note[]> {
  const { data, error } = await getSupabase()
    .from('company_notes')
    .select('id, title, body, pinned, people, created_by, author_name, updated_at')
    .eq('company_id', companyId)
    .order('pinned', { ascending: false })
    .order('updated_at', { ascending: false })
  if (error) throw error
  return (data as { id: string; title: string; body: string; pinned: boolean; people: string[]; created_by: string | null; author_name: string; updated_at: string }[]).map((row) => ({
    id: row.id,
    title: row.title,
    body: row.body,
    pinned: row.pinned,
    people: row.people ?? [],
    createdBy: row.created_by,
    authorName: row.author_name,
    updatedAt: row.updated_at,
  }))
}
