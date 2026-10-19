import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, ExternalLink, MapPin, Phone } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { ErrorBlock, LoadingBlock } from '@/components/feedback/QueryState'
import { useAuth } from '@/features/auth/auth-context'
import { useCompany } from '@/features/companies/company-context'
import { memberName, useMembers } from '@/features/companies/useMembers'
import { useStaff } from '@/features/staff/useStaff'
import { formatDate } from '@/lib/format'
import { DAY_KIND_LABELS, eventDates, LINK_TAG_LABELS } from './plan'
import { fetchCrewDays, fetchLinks, fetchPlace, planKeys, useEventDays } from './planApi'
import { useEvents } from './useEvents'

const weekday = (iso: string) => new Date(iso).toLocaleDateString('sk-SK', { weekday: 'short', day: 'numeric', month: 'numeric' })

/** Harmonogram pre posádku na mobil: kedy a kde, program po dňoch, kto ide, kontakty a odkazy (rider, lightplot…). */
export function CrewSheetPage() {
  const { id = '' } = useParams()
  const company = useCompany().active!
  const companyId = company.companyId
  const userId = useAuth().session?.user.id
  const events = useEvents(companyId)
  const days = useEventDays(companyId, id)
  const place = useQuery({ queryKey: planKeys.place(companyId, id), queryFn: () => fetchPlace(companyId, id), retry: false })
  const crewDays = useQuery({ queryKey: ['company', companyId, 'events', id, 'crew-days'], queryFn: () => fetchCrewDays(companyId, id), retry: false })
  const links = useQuery({ queryKey: planKeys.links(companyId, id), queryFn: () => fetchLinks(companyId, id), retry: false })
  const members = useMembers(companyId)
  const staff = useStaff(companyId)

  if (events.isPending) return <LoadingBlock />
  const event = events.data?.find((item) => item.id === id)
  if (!event) return <ErrorBlock message="Event sa nenašiel." />

  const address = place.data?.address || event.venue
  const mapUrl = address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}` : null
  const plan = days.data ?? []
  const dates = eventDates(event.startsOn, event.endsOn)
  const phoneOf = (memberId: string | null) => (memberId ? staff.people.find((person) => person.memberId === memberId)?.phone : undefined)
  const crew = event.crew.filter((person) => person.response !== 'no')
  const onDay = (crewId: string, day: string) => {
    const assigned = crewDays.data?.[crewId] ?? []
    return assigned.length === 0 || assigned.includes(day)
  }
  const me = crew.find((person) => person.memberId === userId)

  return (
    <>
      <Link to={`/events/${id}`} className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden />
        Detail eventu
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight">{event.name}</h1>
      <p className="text-muted-foreground">{event.startsOn === event.endsOn ? formatDate(event.startsOn) : `${formatDate(event.startsOn)} – ${formatDate(event.endsOn)}`}</p>

      {address && (
        <a href={mapUrl!} target="_blank" rel="noreferrer noopener" className="mt-3 flex items-center gap-2 rounded-xl border bg-surface p-3 text-sm hover:bg-muted">
          <MapPin className="size-5 shrink-0 text-accent" aria-hidden />
          <span className="min-w-0 flex-1">
            <span className="block font-medium">{event.venue || address}</span>
            {event.venue && place.data?.address && <span className="block text-muted-foreground">{place.data.address}</span>}
          </span>
          <span className="shrink-0 text-accent">Navigovať</span>
        </a>
      )}

      {me && (
        <p className="mt-3 rounded-xl border border-accent/40 bg-accent/10 p-3 text-sm">
          <span className="font-medium">Ty ideš:</span>{' '}
          {(crewDays.data?.[me.id] ?? []).length > 0 ? crewDays.data![me.id].map(weekday).join(', ') : 'všetky dni'}
          {me.role && ` · ${me.role}`}
        </p>
      )}

      <section className="mt-6">
        <h2 className="mb-2 text-sm font-medium text-muted-foreground">Program</h2>
        <ul className="flex flex-col gap-2">
          {dates.map((day) => {
            const item = plan.find((entry) => entry.day === day)
            const people = crew.filter((person) => onDay(person.id, day))
            return (
              <li key={day} className="rounded-xl border bg-surface p-3 text-sm">
                <p className="font-medium">
                  {weekday(day)}
                  {item && ` · ${DAY_KIND_LABELS[item.kind]}`}
                  {item?.startsAt && ` · ${item.startsAt.slice(0, 5)}${item.endsAt ? `–${item.endsAt.slice(0, 5)}` : ''}`}
                </p>
                {item?.note && <p className="text-muted-foreground">{item.note}</p>}
                {people.length > 0 && (
                  <p className="mt-1 text-muted-foreground">
                    {people.map((person) => (person.memberId ? memberName(members.data, person.memberId) : person.name) || 'člen').join(', ')}
                  </p>
                )}
              </li>
            )
          })}
        </ul>
      </section>

      <section className="mt-6">
        <h2 className="mb-2 text-sm font-medium text-muted-foreground">Posádka ({crew.length})</h2>
        <ul className="divide-y rounded-xl border bg-surface text-sm">
          {crew.map((person) => {
            const phone = phoneOf(person.memberId)
            return (
              <li key={person.id} className="flex items-center gap-3 px-3 py-2">
                <span className="min-w-0 flex-1">
                  <span className="font-medium">{(person.memberId ? memberName(members.data, person.memberId) : person.name) || 'člen'}</span>
                  {person.role && <span className="text-muted-foreground"> · {person.role}</span>}
                </span>
                {phone && (
                  <a href={`tel:${phone.replace(/\s/g, '')}`} className="inline-flex items-center gap-1 text-accent">
                    <Phone className="size-4" aria-hidden />
                    {phone}
                  </a>
                )}
              </li>
            )
          })}
        </ul>
      </section>

      {(event.organizer || event.organizerPhone) && (
        <section className="mt-6">
          <h2 className="mb-2 text-sm font-medium text-muted-foreground">Organizátor</h2>
          <p className="rounded-xl border bg-surface p-3 text-sm">
            <span className="font-medium">{[event.organizer, event.organizerPerson].filter(Boolean).join(' – ')}</span>
            {event.organizerPhone && (
              <a href={`tel:${event.organizerPhone.replace(/\s/g, '')}`} className="ml-2 inline-flex items-center gap-1 text-accent">
                <Phone className="size-4" aria-hidden />
                {event.organizerPhone}
              </a>
            )}
          </p>
        </section>
      )}

      {(links.data ?? []).length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 text-sm font-medium text-muted-foreground">Odkazy</h2>
          <ul className="flex flex-col gap-1.5 text-sm">
            {links.data!.map((link) => (
              <li key={link.id}>
                <a href={link.url} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1.5 text-accent hover:underline">
                  <ExternalLink className="size-4" aria-hidden />
                  {LINK_TAG_LABELS[link.tag]}
                  {link.title && ` – ${link.title}`}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  )
}
