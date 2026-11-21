import { useMutation, useQuery } from '@tanstack/react-query'
import { ExternalLink, Star } from 'lucide-react'
import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import { fetchPublicRating, rateEvent, type ReviewLinks } from './ratingApi'

const LINK_LABELS: Record<keyof ReviewLinks, string> = { google: 'Ohodnotiť na Google', facebook: 'Ohodnotiť na Facebooku', web: 'Ohodnotiť na našom webe' }

/**
 * Hodnotenie akcie klientom cez odkaz (bez prihlásenia): 1–5 hviezdičiek a poznámka, raz. Kto dá 4–5, uvidí odkazy
 * na recenzie firmy (Google, Facebook, web); hodnotenie samo nikam von nejde.
 */
export function RatingPage() {
  const { token = '' } = useParams()
  const rating = useQuery({ queryKey: ['event-rating', token], queryFn: () => fetchPublicRating(token), retry: false })
  const [stars, setStars] = useState(0)
  const [comment, setComment] = useState('')
  const send = useMutation({ mutationFn: () => rateEvent(token, stars, comment), onSuccess: () => void rating.refetch() })

  if (rating.isPending) return <p className="min-h-dvh bg-background p-8 text-center text-sm text-muted-foreground">Načítavam…</p>
  if (rating.isError || !rating.data) {
    return <p className="min-h-dvh bg-background p-8 text-center text-sm text-muted-foreground">Odkaz na hodnotenie sa nenašiel. Kontaktujte toho, kto vám ho poslal.</p>
  }
  const data = rating.data
  const when = data.startsOn === data.endsOn ? formatDate(data.startsOn) : `${formatDate(data.startsOn)} – ${formatDate(data.endsOn)}`
  const links = (Object.keys(LINK_LABELS) as (keyof ReviewLinks)[]).filter((key) => data.links?.[key])

  return (
    <div className="min-h-dvh bg-background text-foreground">
    <main className="mx-auto flex w-full max-w-xl flex-col gap-5 px-4 py-10 sm:py-16">
      <header>
        <p className="text-sm text-muted-foreground">{data.companyName}</p>
        <h1 className="mt-1 text-2xl font-semibold">Ako sme sa vám páčili?</h1>
        <p className="mt-1 text-muted-foreground">{data.event} · {when}</p>
      </header>

      {data.ratedAt ? (
        <section className="flex flex-col gap-4 rounded-xl border bg-surface p-4 shadow-sm">
          <p className="text-lg">Ďakujeme za hodnotenie {'★'.repeat(data.stars ?? 0)}{'☆'.repeat(5 - (data.stars ?? 0))}</p>
          {(data.stars ?? 0) >= 4 && links.length > 0 && (
            <>
              <p className="text-sm text-muted-foreground">Pomôžete nám ešte jedným ťuknutím? Napíšte pár slov aj verejne – ďalší klienti nás tak ľahšie nájdu.</p>
              <div className="flex flex-col gap-2">
                {links.map((key) => (
                  <a key={key} href={data.links[key]} target="_blank" rel="noopener noreferrer" className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-primary px-4 font-medium text-primary-foreground hover:opacity-90">
                    <ExternalLink className="size-4" aria-hidden />
                    {LINK_LABELS[key]}
                  </a>
                ))}
              </div>
            </>
          )}
          {(data.stars ?? 0) < 4 && <p className="text-sm text-muted-foreground">Mrzí nás, že nie všetko bolo podľa predstáv. Vaše hodnotenie sme dostali a ozveme sa vám.</p>}
        </section>
      ) : (
        <form
          className="flex flex-col gap-4 rounded-xl border bg-surface p-4 shadow-sm"
          onSubmit={(submitted) => {
            submitted.preventDefault()
            if (stars > 0) send.mutate()
          }}
        >
          <fieldset>
            <legend className="mb-2 text-sm font-medium">Hodnotenie</legend>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-label={`${value} z 5`}
                  aria-pressed={stars === value}
                  onClick={() => setStars(value)}
                  className="rounded-md p-1 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  <Star className={cn('size-10', value <= stars ? 'fill-amber-400 text-amber-500' : 'text-muted-foreground/40')} aria-hidden />
                </button>
              ))}
            </div>
          </fieldset>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Čo sa vám páčilo alebo čo zlepšiť (nepovinné)
            <textarea maxLength={1000} rows={4} className="rounded-lg border bg-background p-2 font-normal" value={comment} onChange={(changed) => setComment(changed.target.value)} />
          </label>
          <Button type="submit" className="h-12" disabled={stars === 0 || send.isPending}>Odoslať hodnotenie</Button>
          {send.isError && <p className="text-sm text-destructive">Hodnotenie sa nepodarilo odoslať. Skúste to znova.</p>}
        </form>
      )}
    </main>
    </div>
  )
}
