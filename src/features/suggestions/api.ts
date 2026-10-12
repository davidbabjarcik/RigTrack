import { getSupabase } from '@/lib/supabase/client'

// Zodpovedá check constraint v 0017_suggestions.sql.
export const SUGGESTION_STATUSES = ['new', 'in_progress', 'done'] as const
export type SuggestionStatus = (typeof SUGGESTION_STATUSES)[number]

export const SUGGESTION_STATUS_LABELS: Record<SuggestionStatus, string> = {
  new: 'Nový',
  in_progress: 'Rieši sa',
  done: 'Hotové',
}

export type SuggestionComment = { id: string; body: string; authorName: string; createdBy: string | null; createdAt: string }

export type Suggestion = {
  id: string
  title: string
  body: string
  status: SuggestionStatus
  authorName: string
  createdBy: string | null
  createdAt: string
  comments: SuggestionComment[]
}

export const suggestionKeys = {
  list: (companyId: string) => ['company', companyId, 'suggestions'] as const,
}

/** Návrhy firmy aj s komentármi: nevybavené hore, v rámci skupiny od najnovších. */
export async function fetchSuggestions(companyId: string): Promise<Suggestion[]> {
  const db = getSupabase()
  const [suggestions, comments] = await Promise.all([
    db
      .from('suggestions')
      .select('id, title, body, status, author_name, created_by, created_at')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false }),
    db
      .from('suggestion_comments')
      .select('id, suggestion_id, body, author_name, created_by, created_at')
      .eq('company_id', companyId)
      .order('created_at'),
  ])
  const error = suggestions.error ?? comments.error
  if (error) throw error

  const commentRows = comments.data as {
    id: string
    suggestion_id: string
    body: string
    author_name: string
    created_by: string | null
    created_at: string
  }[]
  const rows = suggestions.data as {
    id: string
    title: string
    body: string
    status: SuggestionStatus
    author_name: string
    created_by: string | null
    created_at: string
  }[]
  return rows
    .map((row) => ({
      id: row.id,
      title: row.title,
      body: row.body,
      status: row.status,
      authorName: row.author_name,
      createdBy: row.created_by,
      createdAt: row.created_at,
      comments: commentRows
        .filter((comment) => comment.suggestion_id === row.id)
        .map((comment) => ({
          id: comment.id,
          body: comment.body,
          authorName: comment.author_name,
          createdBy: comment.created_by,
          createdAt: comment.created_at,
        })),
    }))
    .sort((a, b) => Number(a.status === 'done') - Number(b.status === 'done'))
}

export async function addSuggestion(companyId: string, title: string, body: string) {
  const { error } = await getSupabase().from('suggestions').insert({ company_id: companyId, title: title.trim(), body: body.trim() })
  if (error) throw error
}

export async function setSuggestionStatus(id: string, status: SuggestionStatus) {
  const { data, error } = await getSupabase().from('suggestions').update({ status }).eq('id', id).select('id')
  if (error) throw error
  if (data.length === 0) throw new Error('Not updated')
}

export async function deleteSuggestion(id: string) {
  const { data, error } = await getSupabase().from('suggestions').delete().eq('id', id).select('id')
  if (error) throw error
  if (data.length === 0) throw new Error('Not deleted')
}

export async function addComment(companyId: string, suggestionId: string, body: string) {
  const { error } = await getSupabase()
    .from('suggestion_comments')
    .insert({ company_id: companyId, suggestion_id: suggestionId, body: body.trim() })
  if (error) throw error
}

export async function deleteComment(id: string) {
  const { data, error } = await getSupabase().from('suggestion_comments').delete().eq('id', id).select('id')
  if (error) throw error
  if (data.length === 0) throw new Error('Not deleted')
}
