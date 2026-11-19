import { PaperSheet } from '@/components/print/PaperSheet'
import { PrintButton } from '@/components/print/PrintButton'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Check, X } from 'lucide-react'
import { useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/format'
import { fetchSharedOffer, respondSharedOffer } from './api'
import { OfferDocument } from './OfferDocument'

const PRINT_CSS = `
@page { size: A4; margin: 14mm; @top-left { content: ""; } @top-center { content: ""; } @top-right { content: ""; } @bottom-left { content: ""; } @bottom-center { content: ""; } @bottom-right { content: ""; } }
@media print { html, body { background: #fff !important; } }
`

/** Ponuka pre klienta cez odkaz (bez prihlásenia): prečítať, vytlačiť, potvrdiť alebo odmietnuť. */
export function SharedOfferPage() {
  const sheet = useRef<HTMLDivElement>(null)
  const { token = '' } = useParams()
  const offer = useQuery({ queryKey: ['shared-offer', token], queryFn: () => fetchSharedOffer(token), retry: false })
  const [note, setNote] = useState('')
  const respond = useMutation({ mutationFn: (accept: boolean) => respondSharedOffer(token, accept, note), onSuccess: () => void offer.refetch() })

  if (offer.isPending) return <p className="p-8 text-center text-sm text-neutral-600">Načítavam ponuku…</p>
  if (offer.isError || !offer.data) {
    return <p className="p-8 text-center text-sm text-neutral-600">Ponuka sa nenašla. Odkaz už nemusí platiť – kontaktujte toho, kto vám ho poslal.</p>
  }
  const data = offer.data
  const answered = data.respondedAt

  return (
    <div className="min-h-dvh bg-neutral-100 py-6 text-black print:bg-white print:py-0">
      <style>{PRINT_CSS}</style>
      <div className="mx-auto mb-4 flex max-w-[210mm] flex-wrap items-center justify-between gap-3 px-4 print:hidden">
        <p className="text-sm text-neutral-600">Cenová ponuka od {data.issuer.name || data.companyName}</p>
        <PrintButton sheet={sheet} fileName="cenova-ponuka" marginMm={14} variant="outline" label="Tlačiť / uložiť ako PDF" />
      </div>
      <PaperSheet sheetRef={sheet} marginMm={14}>
        <OfferDocument offer={data} />
      </PaperSheet>
      <div className="mx-auto mt-4 max-w-[210mm] px-4 print:hidden">
        {answered ? (
          <p className={`rounded-lg p-4 text-sm ${data.status === 'accepted' ? 'bg-emerald-100 text-emerald-900' : 'bg-neutral-200'}`}>
            {data.status === 'accepted' ? 'Ponuku ste potvrdili' : 'Ponuku ste odmietli'} {formatDate(answered.slice(0, 10))}.
            {data.responseNote && ` Poznámka: ${data.responseNote}`}
          </p>
        ) : (
          <div className="flex flex-col gap-3 rounded-lg bg-white p-4 shadow">
            <p className="font-medium">Súhlasíte s ponukou?</p>
            <textarea
              aria-label="Poznámka pre dodávateľa"
              className="min-h-20 rounded-md border border-neutral-300 p-2 text-sm"
              maxLength={1000}
              placeholder="Poznámka (nepovinné) – napr. zmena termínu alebo rozsahu"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              <Button disabled={respond.isPending} onClick={() => window.confirm('Potvrdiť ponuku?') && respond.mutate(true)}>
                <Check className="size-4" aria-hidden />
                Potvrdiť ponuku
              </Button>
              <Button variant="outline" disabled={respond.isPending} onClick={() => window.confirm('Odmietnuť ponuku?') && respond.mutate(false)}>
                <X className="size-4" aria-hidden />
                Odmietnuť
              </Button>
            </div>
            {respond.isError && <p className="text-sm text-red-700">Odpoveď sa nepodarilo odoslať. Skúste to znova.</p>}
          </div>
        )}
      </div>
    </div>
  )
}
