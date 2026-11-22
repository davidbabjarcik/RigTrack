import { getSupabase } from '@/lib/supabase/client'

export type ReviewLinks = { google: string; facebook: string; web: string }
export const EMPTY_LINKS: ReviewLinks = { google: '', facebook: '', web: '' }

export type EventRating = { eventId: string; token: string; stars: number | null; comment: string; ratedAt: string | null }

export const ratingKeys = {
  list: (companyId: string) => ['company', companyId, 'event-ratings'] as const,
  links: (companyId: string) => ['company', companyId, 'review-links'] as const,
}

/** Len https odkaz (to isté overuje databáza pri zobrazení klientovi). */
export const isSafeLink = (value: string) => value === '' || (/^https:\/\/[^\s<>"]+$/.test(value) && value.length >= 12 && value.length <= 500)

export async function fetchReviewLinks(companyId: string): Promise<ReviewLinks> {
  const { data, error } = await getSupabase().from('companies').select('review_links').eq('id', companyId).single()
  if (error) throw error
  const raw = ((data as { review_links?: Record<string, unknown> }).review_links ?? {}) as Record<string, unknown>
  const text = (key: keyof ReviewLinks) => (typeof raw[key] === 'string' ? (raw[key] as string) : '')
  return { google: text('google'), facebook: text('facebook'), web: text('web') }
}

export async function saveReviewLinks(companyId: string, links: ReviewLinks) {
  const clean = Object.fromEntries(Object.entries(links).map(([key, value]) => [key, value.trim()])) as ReviewLinks
  if (!Object.values(clean).every(isSafeLink)) throw new Error('Odkaz musí začínať https://')
  const { data, error } = await getSupabase().from('companies').update({ review_links: clean }).eq('id', companyId).select('id')
  if (error) throw error
  if (data.length === 0) throw new Error('Not updated')
}

export async function fetchEventRatings(companyId: string): Promise<EventRating[]> {
  const { data, error } = await getSupabase().from('event_ratings').select('event_id, token, stars, comment, rated_at').eq('company_id', companyId)
  if (error) throw error
  return (data ?? []).map((row) => ({ eventId: row.event_id, token: row.token, stars: row.stars, comment: row.comment, ratedAt: row.rated_at }))
}

export async function createEventRating(eventId: string): Promise<string> {
  const { data, error } = await getSupabase().rpc('create_event_rating', { _event_id: eventId })
  if (error) throw error
  return data as string
}

export const ratingLink = (token: string) => `${window.location.origin}${import.meta.env.BASE_URL}h/${token}`

export type PublicRating = {
  event: string
  startsOn: string
  endsOn: string
  companyName: string
  /** Logo firmy (od 0191; inak chýba). */
  logoPath?: string
  logoStyle?: string
  stars: number | null; comment: string; ratedAt: string | null; links: ReviewLinks }

export async function fetchPublicRating(token: string): Promise<PublicRating | null> {
  const { data, error } = await getSupabase().rpc('get_event_rating', { _token: token })
  if (error) throw error
  return (data as PublicRating | null) ?? null
}

export async function rateEvent(token: string, stars: number, comment: string) {
  const { error } = await getSupabase().rpc('rate_event', { _token: token, _stars: stars, _comment: comment.trim() })
  if (error) throw error
}

/** Priemer a počet hodnotení (len ohodnotené). */
export function ratingSummary(ratings: Pick<EventRating, 'stars'>[]) {
  const rated = ratings.filter((rating) => rating.stars !== null)
  const average = rated.length > 0 ? Math.round((rated.reduce((sum, rating) => sum + rating.stars!, 0) / rated.length) * 10) / 10 : null
  return { count: rated.length, average }
}
