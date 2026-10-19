import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Handshake } from 'lucide-react'
import { useState } from 'react'
import { CollapsibleSection } from '@/components/layout/CollapsibleSection'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { formatDate } from '@/lib/format'
import { fetchSharedEvents, linkKeys, setPartnerPart } from './api'

const DAY_KINDS: Record<string, string> = { build: 'stavba', show: 'event', teardown: 'balenie', travel: 'cesta', rest: 'voľno' }

/** Eventy, ktoré s nami zdieľajú prepojené firmy; zapíšeme, čo dodáme my. */
export function SharedEventsSection({ companyId, canEdit }: { companyId: string; canEdit: boolean }) {
  const queryClient = useQueryClient()
  const key = linkKeys.sharedEvents(companyId)
  const events = useQuery({ queryKey: key, queryFn: () => fetchSharedEvents(companyId), retry: false })
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const save = useMutation({ mutationFn: (eventId: string) => setPartnerPart(eventId, companyId, draft), onSuccess: () => setEditing(null), onSettled: () => queryClient.invalidateQueries({ queryKey: key }) })
  if (!events.data || events.data.length === 0) return null

  return (
    <CollapsibleSection id="events.shared" title={`Spoločné eventy od prepojených firiem (${events.data.length})`}>
      <ul className="flex flex-col gap-2">
        {events.data.map((event) => (
          <li key={event.eventId} className="flex flex-col gap-1.5 rounded-xl border bg-surface p-4 text-sm">
            <p className="flex items-center gap-2 font-medium">
              <Handshake className="size-4 text-accent" aria-hidden />
              {event.name}
              <span className="font-normal text-muted-foreground">· {event.ownerName}</span>
            </p>
            <p className="text-muted-foreground">
              {[event.startsOn === event.endsOn ? formatDate(event.startsOn) : `${formatDate(event.startsOn)} – ${formatDate(event.endsOn)}`, event.venue, event.address].filter(Boolean).join(' · ')}
            </p>
            {event.days.length > 0 && (
              <p className="text-muted-foreground">
                {event.days.map((day) => `${formatDate(day.day)} ${DAY_KINDS[day.kind] ?? day.kind}${day.starts_at ? ` od ${day.starts_at.slice(0, 5)}` : ''}`).join(' · ')}
              </p>
            )}
            <p>
              <span className="text-muted-foreground">{event.ownerName} dodá: </span>
              {event.ownerPart || '—'}
            </p>
            {editing === event.eventId ? (
              <div className="flex flex-wrap items-end gap-2">
                <Field label="My dodáme" className="flex-1" maxLength={1000} value={draft} onChange={(e) => setDraft(e.target.value)} />
                <Button size="sm" disabled={save.isPending} onClick={() => save.mutate(event.eventId)}>
                  Uložiť
                </Button>
              </div>
            ) : (
              <p>
                <span className="text-muted-foreground">My dodáme: </span>
                {event.partnerPart || <span className="text-muted-foreground">zatiaľ nič</span>}
                {canEdit && (
                  <button
                    type="button"
                    className="ml-2 text-accent hover:underline"
                    onClick={() => {
                      setEditing(event.eventId)
                      setDraft(event.partnerPart)
                    }}
                  >
                    upraviť
                  </button>
                )}
              </p>
            )}
          </li>
        ))}
      </ul>
    </CollapsibleSection>
  )
}
