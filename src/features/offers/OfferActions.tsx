import { useMutation, useQueryClient } from '@tanstack/react-query'
import { CalendarPlus, Check, Copy, Link2, Link2Off } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { addEventEquipment, eventKeys, saveEvent, setEventEquipmentQuantity } from '@/features/events/api'
import { formatDate, todayIso } from '@/lib/format'
import { offerKeys, saveOffer, shareOffer, sharedOfferUrl, unshareOffer, useOffer, type OfferFields } from './api'

/** Pri uloženej ponuke: odkaz pre klienta (potvrdí / odmietne) a vytvorenie eventu z ponuky aj s technikou. */
export function OfferActions({ companyId, id, draft, canEdit }: { companyId: string; id: string; draft: OfferFields; canEdit: boolean }) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const offer = useOffer(companyId, id)
  const [copied, setCopied] = useState(false)
  const [eventForm, setEventForm] = useState<{ startsOn: string; endsOn: string } | null>(null)
  const refresh = () => Promise.all([queryClient.invalidateQueries({ queryKey: offerKeys.detail(companyId, id) }), queryClient.invalidateQueries({ queryKey: offerKeys.list(companyId) })])
  const share = useMutation({ mutationFn: () => shareOffer(id), onSettled: refresh })
  const unshare = useMutation({ mutationFn: () => unshareOffer(id), onSettled: refresh })
  const createEvent = useMutation({
    mutationFn: async (dates: { startsOn: string; endsOn: string }) => {
      const eventId = await saveEvent(companyId, null, {
        name: draft.title.trim() || 'Event z ponuky',
        client: draft.client.name.slice(0, 120),
        venue: draft.place,
        startsOn: dates.startsOn,
        endsOn: dates.endsOn,
        status: draft.status === 'accepted' ? 'confirmed' : 'planned',
        note: draft.number ? `Z cenovej ponuky č. ${draft.number}` : 'Z cenovej ponuky',
        organizer: draft.client.name.slice(0, 120),
        organizerPerson: draft.client.contact.slice(0, 120),
        organizerPhone: '',
        organizerEmail: '',
        description: '',
        getInTime: '',
        showTime: '',
        showEndTime: '',
        setting: '',
        power: '',
        powerCount: null,
        powerNote: '',
        weatherPlace: '',
      })
      // Technika z riadkov ceny (zo skladu) ide rovno na event.
      const gear = new Map<string, number>()
      for (const part of draft.sections.flatMap((section) => [section, ...section.parts])) {
        if (part.priceMode !== 'lines') continue
        for (const line of part.lines) if (line.equipmentId && line.quantity > 0) gear.set(line.equipmentId, (gear.get(line.equipmentId) ?? 0) + line.quantity)
      }
      for (const [equipmentId, quantity] of gear) {
        await addEventEquipment(companyId, eventId, equipmentId)
        if (quantity > 1) await setEventEquipmentQuantity(eventId, equipmentId, quantity)
      }
      await saveOffer(companyId, id, { ...draft, eventId })
      return eventId
    },
    onSuccess: async (eventId) => {
      await Promise.all([refresh(), queryClient.invalidateQueries({ queryKey: eventKeys.list(companyId) })])
      navigate(`/events/${eventId}`)
    },
  })

  const data = offer.data
  const url = data?.shareToken ? sharedOfferUrl(data.shareToken) : ''

  return (
    <section className="flex flex-col gap-3 rounded-xl border bg-surface p-4" aria-label="Odoslanie a event">
      {data?.respondedAt && (
        <p className={`rounded-lg p-3 text-sm ${data.status === 'accepted' ? 'bg-emerald-500/15' : 'bg-destructive/10'}`}>
          Klient ponuku {data.status === 'accepted' ? 'potvrdil' : 'odmietol'} {formatDate(data.respondedAt.slice(0, 10))}.
          {data.responseNote && ` Poznámka: ${data.responseNote}`}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {url ? (
          <>
            <input aria-label="Odkaz pre klienta" readOnly className="h-9 min-w-0 flex-1 rounded-lg border bg-background px-2 text-sm" value={url} onFocus={(e) => e.target.select()} />
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                void navigator.clipboard.writeText(url).then(() => {
                  setCopied(true)
                  window.setTimeout(() => setCopied(false), 1500)
                })
              }}
            >
              {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
              {copied ? 'Skopírované' : 'Kopírovať'}
            </Button>
            {canEdit && (
              <Button size="sm" variant="ghost" disabled={unshare.isPending} onClick={() => window.confirm('Zrušiť odkaz? Klient ponuku cez neho už neotvorí.') && unshare.mutate()}>
                <Link2Off className="size-4" aria-hidden />
                Zrušiť odkaz
              </Button>
            )}
          </>
        ) : (
          canEdit && (
            <Button size="sm" variant="outline" disabled={share.isPending} onClick={() => share.mutate()}>
              <Link2 className="size-4" aria-hidden />
              Odkaz pre klienta
            </Button>
          )
        )}
        {canEdit && !draft.eventId && !eventForm && (
          <Button size="sm" variant="outline" onClick={() => setEventForm({ startsOn: todayIso(), endsOn: todayIso() })}>
            <CalendarPlus className="size-4" aria-hidden />
            Vytvoriť event z ponuky
          </Button>
        )}
      </div>
      {!url && canEdit && <p className="text-xs text-muted-foreground">Klient si cez odkaz ponuku pozrie bez prihlásenia a potvrdí ju alebo odmietne; príde vám upozornenie.</p>}
      {eventForm && (
        <div className="flex flex-wrap items-end gap-2 rounded-lg border p-3">
          <Field label="Od" type="date" value={eventForm.startsOn} onChange={(e) => setEventForm({ startsOn: e.target.value, endsOn: e.target.value > eventForm.endsOn ? e.target.value : eventForm.endsOn })} />
          <Field label="Do" type="date" min={eventForm.startsOn} value={eventForm.endsOn} onChange={(e) => setEventForm({ ...eventForm, endsOn: e.target.value })} />
          <Button size="sm" disabled={createEvent.isPending || !eventForm.startsOn} onClick={() => createEvent.mutate(eventForm)}>
            {createEvent.isPending ? 'Vytváram…' : 'Vytvoriť event'}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setEventForm(null)}>
            Zrušiť
          </Button>
          <p className="w-full text-xs text-muted-foreground">Event dostane názov, miesto a klienta z ponuky; technika vybraná zo skladu v cenách sa pridá na event.</p>
        </div>
      )}
      {(share.isError || unshare.isError || createEvent.isError) && <p className="text-sm text-destructive">Nepodarilo sa. Táto časť databázy ešte nemusí byť pripravená (migrácia 0097).</p>}
    </section>
  )
}
