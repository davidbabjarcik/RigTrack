import { useMutation, useQuery } from '@tanstack/react-query'
import { CalendarCheck, CalendarX } from 'lucide-react'
import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { formatDate, todayIso } from '@/lib/format'
import { fetchCrewInvite, respondCrewInvite } from './crewInviteApi'

const time = (value: string | null) => (value ?? '').slice(0, 5)

/** Pozvánka na event cez odkaz (bez prihlásenia): termín, miesto a rola; potvrdiť alebo napísať, prečo nie. */
export function CrewInvitePage() {
  const { token = '' } = useParams()
  const invite = useQuery({ queryKey: ['crew-invite', token], queryFn: () => fetchCrewInvite(token), retry: false })
  const [declining, setDeclining] = useState(false)
  const [note, setNote] = useState('')
  const respond = useMutation({
    mutationFn: ({ response, text }: { response: 'yes' | 'no'; text: string }) => respondCrewInvite(token, response, text),
    onSuccess: () => {
      setDeclining(false)
      void invite.refetch()
    },
  })

  if (invite.isPending) return <p className="min-h-dvh bg-background p-8 text-center text-sm text-muted-foreground">Načítavam pozvánku…</p>
  if (invite.isError || !invite.data) {
    return <p className="min-h-dvh bg-background p-8 text-center text-sm text-muted-foreground">Pozvánka sa nenašla. Odkaz už nemusí platiť – kontaktujte toho, kto vám ho poslal.</p>
  }
  const data = invite.data
  const when = data.startsOn === data.endsOn ? formatDate(data.startsOn) : `${formatDate(data.startsOn)} – ${formatDate(data.endsOn)}`
  const times = [time(data.getInTime) && `príchod ${time(data.getInTime)}`, time(data.showTime) && `začiatok ${time(data.showTime)}`, time(data.showEndTime) && `koniec ${time(data.showEndTime)}`].filter(Boolean)
  const closed = data.status === 'cancelled' || data.endsOn < todayIso()

  return (
    <div className="min-h-dvh bg-background text-foreground">
    <main className="mx-auto flex w-full max-w-xl flex-col gap-5 px-4 py-10 sm:py-16">
      <header>
        <p className="text-sm text-muted-foreground">{data.companyName} vás pozýva</p>
        <h1 className="mt-1 text-2xl font-semibold">{data.event}</h1>
      </header>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-xl border bg-surface p-4 shadow-sm text-sm">
        <dt className="text-muted-foreground">Kto</dt>
        <dd>{[data.name, data.role].filter(Boolean).join(' · ') || '—'}</dd>
        <dt className="text-muted-foreground">Kedy</dt>
        <dd>{when}</dd>
        {times.length > 0 && (
          <>
            <dt className="text-muted-foreground">Časy</dt>
            <dd>{times.join(' · ')}</dd>
          </>
        )}
        {data.venue && (
          <>
            <dt className="text-muted-foreground">Kde</dt>
            <dd>{data.venue}</dd>
          </>
        )}
      </dl>

      {data.response !== 'pending' && (
        <p role="status" className={`rounded-xl p-3 text-sm ${data.response === 'yes' ? 'bg-emerald-500/15' : 'bg-destructive/10'}`}>
          {data.response === 'yes' ? 'Potvrdili ste, že môžete. Ďakujeme!' : `Odpísali ste, že nemôžete${data.responseNote ? `: ${data.responseNote}` : '.'}`}
        </p>
      )}
      {data.status === 'cancelled' ? (
        <p className="text-sm text-muted-foreground">Event je zrušený.</p>
      ) : closed ? (
        <p className="text-sm text-muted-foreground">Event už skončil.</p>
      ) : declining ? (
        <form
          className="flex flex-col gap-2"
          onSubmit={(submitted) => {
            submitted.preventDefault()
            if (note.trim()) respond.mutate({ response: 'no', text: note })
          }}
        >
          <label className="text-sm font-medium" htmlFor="decline-note">Prečo nemôžete?</label>
          <input id="decline-note" maxLength={300} autoFocus className="h-11 rounded-lg border bg-background px-3" value={note} onChange={(changed) => setNote(changed.target.value)} />
          <div className="flex gap-2">
            <Button type="submit" disabled={respond.isPending || !note.trim()}>Odoslať</Button>
            <Button variant="ghost" onClick={() => setDeclining(false)}>Späť</Button>
          </div>
        </form>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button className="h-12 px-5" disabled={respond.isPending || data.response === 'yes'} onClick={() => respond.mutate({ response: 'yes', text: '' })}>
            <CalendarCheck className="size-5" aria-hidden />
            Môžem
          </Button>
          <Button className="h-12 px-5" variant="outline" disabled={respond.isPending} onClick={() => setDeclining(true)}>
            <CalendarX className="size-5" aria-hidden />
            Nemôžem
          </Button>
        </div>
      )}
      {respond.isError && <p className="text-sm text-destructive">Odpoveď sa nepodarilo uložiť. Skúste to znova.</p>}
    </main>
    </div>
  )
}
