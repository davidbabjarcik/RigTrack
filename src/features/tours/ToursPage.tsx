import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronRight, Plus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ErrorBlock, LoadingBlock } from '@/components/feedback/QueryState'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { useCompany } from '@/features/companies/company-context'
import { useEvents } from '@/features/events/useEvents'
import { formatDate } from '@/lib/format'
import { tf, tx } from '@/lib/i18n'
import { can } from '@/lib/permissions'
import { createTour, tourKeys, useTourAssignments, useTours } from './api'

/** Turné firmy: série akcií so spoločnými podkladmi. */
export function ToursPage() {
  const company = useCompany().active!
  const companyId = company.companyId
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const tours = useTours(companyId)
  const assignments = useTourAssignments(companyId)
  const events = useEvents(companyId)
  const [name, setName] = useState('')
  const canEdit = can(company, 'events.edit')
  const create = useMutation({
    mutationFn: () => createTour(companyId, name, ''),
    onSuccess: async (id) => {
      await queryClient.invalidateQueries({ queryKey: tourKeys.list(companyId) })
      navigate(`/tours/${id}`)
    },
  })
  if (tours.isPending) return <LoadingBlock />
  if (!tours.data) return <ErrorBlock message={tx('Turné sa nepodarilo načítať (migrácia 0203).')} />
  const eventsOf = (tourId: string) => (events.data ?? []).filter((event) => assignments.data?.get(event.id) === tourId).sort((a, b) => a.startsOn.localeCompare(b.startsOn))

  return (
    <>
      <PageHeader title={tx('Turné')} description={tx('Séria akcií s rovnakými podkladmi – input list, stage plán, synoptika, HF plán a harmonogram sa skopírujú na ďalšie zastávky.')} />
      {canEdit && (
        <form
          onSubmit={(event: FormEvent) => {
            event.preventDefault()
            if (name.trim()) create.mutate()
          }}
          className="mb-4 flex flex-wrap items-end gap-2"
        >
          <Field label={tx('Nové turné')} className="min-w-56 flex-1" maxLength={120} placeholder={tx('napr. Ukážkové jarné turné')} value={name} onChange={(e) => setName(e.target.value)} />
          <Button type="submit" className="mb-0.5" disabled={create.isPending || !name.trim()}>
            <Plus className="size-4" aria-hidden />{tx('Vytvoriť')}
          </Button>
        </form>
      )}
      {tours.data.length === 0 ? (
        <p className="text-sm text-muted-foreground">{tx('Zatiaľ žiadne turné.')}</p>
      ) : (
        <ul className="divide-y overflow-hidden rounded-xl border bg-surface">
          {tours.data.map((tour) => {
            const list = eventsOf(tour.id)
            return (
              <li key={tour.id}>
                <Link to={`/tours/${tour.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-muted">
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{tour.name}</span>
                    <span className="block text-sm text-muted-foreground">
                      {list.length > 0 ? tf('{0} zastávok · {1} – {2}', list.length, formatDate(list[0].startsOn), formatDate(list.at(-1)!.endsOn)) : tx('bez akcií')}
                    </span>
                  </span>
                  <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
                </Link>
              </li>
            )
          })}
        </ul>
      )}
      {create.isError && <p role="alert" className="mt-2 text-sm text-destructive">{tx('Turné sa nepodarilo vytvoriť.')}</p>}
    </>
  )
}
