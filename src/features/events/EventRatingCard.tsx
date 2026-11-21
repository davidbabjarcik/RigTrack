import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Copy, Mail, Star } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/format'
import { tf, tx } from '@/lib/i18n'
import type { CompanyEvent } from './model'
import { createEventRating, fetchEventRatings, ratingKeys, ratingLink } from './ratingApi'

const starsText = (stars: number | null) => '★'.repeat(stars ?? 0) + '☆'.repeat(5 - (stars ?? 0))

/**
 * Po evente: požiadať klienta o hodnotenie (odkaz na skopírovanie alebo e-mail organizátorovi) a jeho hodnotenie,
 * keď príde. Odkaz vytvorí len ten, kto upravuje eventy.
 */
export function EventRatingCard({ companyId, event, canEdit }: { companyId: string; event: CompanyEvent; canEdit: boolean }) {
  const queryClient = useQueryClient()
  const ratings = useQuery({ queryKey: ratingKeys.list(companyId), queryFn: () => fetchEventRatings(companyId), retry: false })
  const [copied, setCopied] = useState(false)
  const create = useMutation({ mutationFn: () => createEventRating(event.id), onSettled: () => queryClient.invalidateQueries({ queryKey: ratingKeys.list(companyId) }) })
  if (ratings.isError || ratings.isPending) return null
  const rating = ratings.data.find((item) => item.eventId === event.id)

  if (rating?.ratedAt) {
    return (
      <section className="mb-4 rounded-xl border bg-surface p-4" aria-label={tx('Hodnotenie od klienta')}>
        <p className="flex flex-wrap items-center gap-2 font-medium">
          <Star className="size-4 fill-amber-400 text-amber-500" aria-hidden />
          {tx('Hodnotenie od klienta:')} <span className="text-amber-600">{starsText(rating.stars)}</span>
          <span className="text-sm font-normal text-muted-foreground">{formatDate(rating.ratedAt.slice(0, 10))}</span>
        </p>
        {rating.comment && <p className="mt-1 text-sm whitespace-pre-wrap">{rating.comment}</p>}
      </section>
    )
  }
  if (!canEdit) return null
  const token = rating?.token ?? create.data
  const url = token ? ratingLink(token) : ''
  const mail = event.organizerEmail && url
    ? `mailto:${encodeURIComponent(event.organizerEmail)}?subject=${encodeURIComponent(tf('Ako sa vám páčil event {0}?', event.name))}&body=${encodeURIComponent(tf('Dobrý deň, budeme radi za krátke hodnotenie: {0}', url))}`
    : ''
  const copy = () =>
    void navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    })

  return (
    <section className="mb-4 flex flex-col gap-2 rounded-xl border border-amber-500/40 bg-amber-500/5 p-4" aria-label={tx('Hodnotenie od klienta')}>
      <p className="flex items-center gap-2 font-medium">
        <Star className="size-4 text-amber-500" aria-hidden />
        {url ? tx('Odkaz na hodnotenie pre klienta') : tx('Event skončil – požiadajte klienta o hodnotenie')}
      </p>
      {url ? (
        <div className="flex flex-wrap items-center gap-2">
          <input aria-label={tx('Odkaz na hodnotenie pre klienta')} readOnly className="h-9 min-w-0 flex-1 rounded-lg border bg-background px-2 text-sm" value={url} onFocus={(focused) => focused.target.select()} />
          <Button size="sm" variant="outline" onClick={copy}>
            {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
            {copied ? tx('Skopírované') : tx('Kopírovať')}
          </Button>
          {mail && (
            <a href={mail} className="inline-flex h-9 items-center gap-1 rounded-lg border px-3 text-sm font-medium hover:bg-muted">
              <Mail className="size-4" aria-hidden />{tx('Poslať e-mailom')}
            </a>
          )}
        </div>
      ) : (
        <div>
          <Button size="sm" disabled={create.isPending} onClick={() => create.mutate()}>{tx('Vytvoriť odkaz na hodnotenie')}</Button>
        </div>
      )}
      <p className="text-xs text-muted-foreground">{tx('Klient dá hviezdičky a poznámku. Kto dá 4–5, uvidí odkazy na vaše recenzie (Google, Facebook, web – nastavíte v Nastaveniach).')}</p>
      {create.isError && <p className="text-sm text-destructive">{tx('Odkaz sa nepodarilo vytvoriť (migrácia 0184).')}</p>}
    </section>
  )
}
