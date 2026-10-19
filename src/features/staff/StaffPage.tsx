import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronRight, Phone, Plus, Search } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ErrorBlock, LoadingBlock } from '@/components/feedback/QueryState'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { useCompany } from '@/features/companies/company-context'
import { PhotoThumb } from '@/features/equipment/PhotoThumb'
import { usePhotoThumbs } from '@/features/equipment/usePhotoThumbs'
import { useEvents } from '@/features/events/useEvents'
import { formatDate, todayIso } from '@/lib/format'
import { can } from '@/lib/permissions'
import { cn } from '@/lib/utils'
import { saveStaff, staffKeys } from './api'
import { matchesPerson, unavailableOn, upcomingEvents, type Person, type Unavailability } from './model'
import { useStaff } from './useStaff'
import type { CompanyEvent } from '@/features/events/model'

/** Stav na dnes: nemôže / na evente / voľný. */
function todayStatus(person: Person, periods: Unavailability[], events: CompanyEvent[], today: string) {
  const away = unavailableOn(periods, person.staffId, today)
  if (away) return { tone: 'away', text: `Nemôže do ${formatDate(away.endsOn)}${away.note ? ` · ${away.note}` : ''}` }
  const event = upcomingEvents(events, person.memberId, today).find((item) => item.startsOn <= today)
  if (event) return { tone: 'busy', text: `Dnes na evente ${event.name}` }
  return { tone: 'free', text: 'Dnes voľný' }
}

const TONES: Record<string, string> = {
  away: 'text-destructive',
  busy: 'text-amber-700 dark:text-amber-300',
  free: 'text-emerald-700 dark:text-emerald-400',
}

/** Zamestnanci: tím s fotkou, pozíciou, kontaktom a tým, či dnes môže. */
export function StaffPage() {
  const company = useCompany().active!
  const companyId = company.companyId
  const canManage = can(company, 'staff.manage')
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const staff = useStaff(companyId)
  const events = useEvents(companyId)
  const [search, setSearch] = useState('')
  const [newName, setNewName] = useState('')
  const thumbs = usePhotoThumbs(
    companyId,
    staff.people.map((person) => person.photoPath),
  )
  const addPartTimer = useMutation({
    mutationFn: () => saveStaff(companyId, null, null, { name: newName, position: '', phone: '', email: '', skills: '', note: '', active: true }),
    onSuccess: async (id) => {
      await queryClient.invalidateQueries({ queryKey: staffKeys.list(companyId) })
      navigate(`/staff/${id}`)
    },
  })

  if (!can(company, 'staff.view')) return <ErrorBlock message="Na zoznam zamestnancov nemáte oprávnenie." />
  if (staff.isPending) return <LoadingBlock />
  if (staff.isError) return <ErrorBlock message="Zamestnancov sa nepodarilo načítať. Táto časť databázy ešte nie je pripravená – kontaktujte vývojára aplikácie." onRetry={() => void staff.refetch()} />

  const today = todayIso()
  const visible = staff.people.filter((person) => matchesPerson(person, search))
  function submit(event: FormEvent) {
    event.preventDefault()
    if (newName.trim()) addPartTimer.mutate()
  }

  return (
    <>
      <PageHeader title="Zamestnanci" description={`${staff.people.filter((person) => person.active).length} ľudí v tíme`} />

      <div className="relative mb-4">
        <Search className="pointer-events-none absolute top-3.5 left-3 size-4 text-muted-foreground" aria-hidden />
        <Field
          label="Hľadať"
          hideLabel
          type="search"
          placeholder="Meno, pozícia, zručnosť, telefón"
          className="[&_input]:pl-9"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {visible.map((person) => {
          const status = todayStatus(person, staff.unavailability, events.data ?? [], today)
          return (
            <li key={person.key} className={cn('rounded-xl border bg-surface', !person.active && 'opacity-60')}>
              <Link to={`/staff/${person.key}`} className="flex items-center gap-3 p-3 hover:bg-muted">
                <PhotoThumb url={thumbs[person.photoPath]} className="size-14 rounded-full" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{person.name}</span>
                  <span className="block truncate text-sm text-muted-foreground">
                    {[person.position || (person.isMember ? 'člen firmy' : 'brigádnik'), !person.active && 'neaktívny'].filter(Boolean).join(' · ')}
                  </span>
                  <span className={cn('block truncate text-xs', TONES[status.tone])}>{status.text}</span>
                </span>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              </Link>
              {person.phone && (
                <a href={`tel:${person.phone.replace(/\s/g, '')}`} className="flex items-center gap-2 border-t px-3 py-2 text-sm text-accent hover:bg-muted">
                  <Phone className="size-4" aria-hidden />
                  {person.phone}
                </a>
              )}
            </li>
          )
        })}
      </ul>
      {visible.length === 0 && <p className="rounded-xl border border-dashed bg-surface p-6 text-center text-sm text-muted-foreground">Nikto nezodpovedá hľadaniu.</p>}

      {canManage && (
        <form onSubmit={submit} className="mt-6 flex flex-wrap items-end gap-2 rounded-xl border bg-surface p-4">
          <Field
            label="Pridať brigádnika (bez účtu)"
            className="min-w-56 flex-1"
            placeholder="Meno a priezvisko"
            maxLength={120}
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
          />
          <Button type="submit" disabled={!newName.trim() || addPartTimer.isPending}>
            <Plus className="size-4" aria-hidden />
            Pridať
          </Button>
          <p className="w-full text-xs text-muted-foreground">Členovia s účtom sa zobrazujú sami; pozývajú sa v Nastaveniach → Členovia.</p>
        </form>
      )}
    </>
  )
}
