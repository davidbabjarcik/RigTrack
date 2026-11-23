import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Copy, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ErrorBlock, LoadingBlock } from '@/components/feedback/QueryState'
import { Button } from '@/components/ui/button'
import { Field, SelectField } from '@/components/ui/field'
import { useCompany } from '@/features/companies/company-context'
import { useEvents } from '@/features/events/useEvents'
import { formatDate } from '@/lib/format'
import { tf, tx } from '@/lib/i18n'
import { can } from '@/lib/permissions'
import { copyShowDocs, deleteTour, setEventTour, SHOW_DOC_LABELS, SHOW_DOCS, tourKeys, updateTour, useTourAssignments, useTours, type ShowDoc, type Tour } from './api'

function TourEditor({ tour, canEdit }: { tour: Tour; canEdit: boolean }) {
  const company = useCompany().active!
  const companyId = company.companyId
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const events = useEvents(companyId)
  const assignments = useTourAssignments(companyId)
  const [name, setName] = useState(tour.name)
  const [note, setNote] = useState(tour.note)
  const [source, setSource] = useState('')
  const [targets, setTargets] = useState<string[]>([])
  const [what, setWhat] = useState<ShowDoc[]>(['iolist', 'stageplot', 'synoptic'])
  const [notice, setNotice] = useState('')
  const stops = (events.data ?? []).filter((event) => assignments.data?.get(event.id) === tour.id).sort((a, b) => a.startsOn.localeCompare(b.startsOn))
  const free = (events.data ?? []).filter((event) => !assignments.data?.has(event.id) && event.status !== 'cancelled').sort((a, b) => a.startsOn.localeCompare(b.startsOn))
  const refresh = () => Promise.all([queryClient.invalidateQueries({ queryKey: tourKeys.events(companyId) }), queryClient.invalidateQueries({ queryKey: tourKeys.list(companyId) })])
  const save = useMutation({ mutationFn: () => updateTour(tour.id, name, note), onSettled: refresh })
  const assign = useMutation({ mutationFn: ({ eventId, tourId }: { eventId: string; tourId: string | null }) => setEventTour(eventId, tourId), onSettled: refresh })
  const remove = useMutation({ mutationFn: () => deleteTour(tour.id), onSuccess: () => navigate('/tours'), onSettled: refresh })
  const copy = useMutation({
    mutationFn: async () => {
      let done = 0
      for (const target of targets) {
        await copyShowDocs(source, target, what)
        done++
      }
      return done
    },
    onSuccess: async (done) => {
      setNotice(tf('Podklady skopírované do {0} akcií.', done))
      setTargets([])
      await queryClient.invalidateQueries({ queryKey: ['company', companyId, 'events'] })
    },
  })

  return (
    <div className="flex flex-col gap-5">
      <Link to="/tours" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden />{tx('Turné')}
      </Link>
      <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <Field label={tx('Názov turné')} maxLength={120} disabled={!canEdit} value={name} onChange={(e) => setName(e.target.value)} />
        <Field label={tx('Poznámka')} maxLength={1000} disabled={!canEdit} value={note} onChange={(e) => setNote(e.target.value)} />
        {canEdit && (
          <div className="flex gap-2">
            <Button size="sm" disabled={save.isPending || !name.trim() || (name === tour.name && note === tour.note)} onClick={() => save.mutate()}>{tx('Uložiť')}</Button>
            <Button size="sm" variant="ghost" aria-label={tx('Odstrániť turné')} onClick={() => window.confirm(tx('Odstrániť turné? Akcie ostanú, len sa od turné odpoja.')) && remove.mutate()}>
              <Trash2 className="size-4" aria-hidden />
            </Button>
          </div>
        )}
      </div>

      <section>
        <h2 className="mb-2 font-semibold">{tf('Zastávky ({0})', stops.length)}</h2>
        {stops.length > 0 && (
          <ol className="mb-3 divide-y overflow-hidden rounded-xl border bg-surface text-sm">
            {stops.map((event, index) => (
              <li key={event.id} className="flex items-center gap-3 px-3 py-2">
                <span className="w-6 shrink-0 font-mono text-muted-foreground">{index + 1}.</span>
                <Link to={`/events/${event.id}`} className="min-w-0 flex-1 hover:underline">
                  <span className="block font-medium">{event.name}</span>
                  <span className="block text-muted-foreground">{[event.startsOn === event.endsOn ? formatDate(event.startsOn) : `${formatDate(event.startsOn)} – ${formatDate(event.endsOn)}`, event.venue].filter(Boolean).join(' · ')}</span>
                </Link>
                {canEdit && (
                  <Button size="sm" variant="ghost" aria-label={tf('Odobrať {0} z turné', event.name)} onClick={() => assign.mutate({ eventId: event.id, tourId: null })}>
                    <X className="size-4" aria-hidden />
                  </Button>
                )}
              </li>
            ))}
          </ol>
        )}
        {canEdit && free.length > 0 && (
          <SelectField label={tx('Pridať akciu do turné')} className="max-w-md" value="" onChange={(e) => e.target.value && assign.mutate({ eventId: e.target.value, tourId: tour.id })}>
            <option value="">—</option>
            {free.map((event) => (
              <option key={event.id} value={event.id}>{`${formatDate(event.startsOn)} – ${event.name}`}</option>
            ))}
          </SelectField>
        )}
      </section>

      {canEdit && stops.length > 1 && (
        <section className="flex flex-col gap-3 rounded-xl border bg-surface p-3">
          <h2 className="font-semibold">{tx('Kopírovať podklady medzi zastávkami')}</h2>
          <SelectField label={tx('Z akcie')} className="max-w-md" value={source} onChange={(e) => { setSource(e.target.value); setTargets((value) => value.filter((id) => id !== e.target.value)) }}>
            <option value="">—</option>
            {stops.map((event) => (
              <option key={event.id} value={event.id}>{`${formatDate(event.startsOn)} – ${event.name}`}</option>
            ))}
          </SelectField>
          {source && (
            <>
              <fieldset>
                <legend className="mb-1 text-sm font-medium">{tx('Do akcií (ich podklady sa nahradia)')}</legend>
                <div className="flex flex-col gap-1">
                  {stops.filter((event) => event.id !== source).map((event) => (
                    <label key={event.id} className="flex items-center gap-2 text-sm">
                      <input type="checkbox" className="size-4" checked={targets.includes(event.id)} onChange={(e) => setTargets((value) => (e.target.checked ? [...value, event.id] : value.filter((id) => id !== event.id)))} />
                      {`${formatDate(event.startsOn)} – ${event.name}`}
                    </label>
                  ))}
                </div>
              </fieldset>
              <fieldset>
                <legend className="mb-1 text-sm font-medium">{tx('Čo kopírovať')}</legend>
                <div className="flex flex-col gap-1">
                  {SHOW_DOCS.map((doc) => (
                    <label key={doc} className="flex items-center gap-2 text-sm">
                      <input type="checkbox" className="size-4" checked={what.includes(doc)} onChange={(e) => setWhat((value) => (e.target.checked ? [...value, doc] : value.filter((item) => item !== doc)))} />
                      {tx(SHOW_DOC_LABELS[doc])}
                    </label>
                  ))}
                </div>
              </fieldset>
              <div>
                <Button size="sm" disabled={copy.isPending || targets.length === 0 || what.length === 0} onClick={() => window.confirm(tf('Nahradiť podklady v {0} akciách?', targets.length)) && copy.mutate()}>
                  <Copy className="size-4" aria-hidden />{tf('Kopírovať do {0} akcií', targets.length)}
                </Button>
              </div>
            </>
          )}
          {notice && <p role="status" className="text-sm text-emerald-700 dark:text-emerald-400">{notice}</p>}
          {copy.isError && <p role="alert" className="text-sm text-destructive">{tx('Kopírovanie sa nepodarilo.')}</p>}
        </section>
      )}
      {(save.isError || assign.isError || remove.isError) && <p role="alert" className="text-sm text-destructive">{tx('Zmena sa nepodarila.')}</p>}
    </div>
  )
}

/** Detail turné (/tours/:id): zastávky a kopírovanie podkladov. */
export function TourDetailPage() {
  const { id = '' } = useParams()
  const company = useCompany().active!
  const tours = useTours(company.companyId)
  if (tours.isPending) return <LoadingBlock />
  const tour = tours.data?.find((item) => item.id === id)
  if (!tour) return <ErrorBlock message={tx('Turné neexistuje alebo k nemu nemáte prístup.')} />
  return <TourEditor key={tour.id} tour={tour} canEdit={can(company, 'events.edit')} />
}
