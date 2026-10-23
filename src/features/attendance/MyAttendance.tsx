import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { useAuth } from '@/features/auth/auth-context'
import { useEvents } from '@/features/events/useEvents'
import { useMyAttendance } from './api'
import { attendanceEnabled, currentMeeting, setAttendanceEnabled } from './model'
import { MyAttendanceCard } from './MyAttendanceCard'
import { WorkCard } from './WorkCard'
import { saveHome, useHome, workKeys } from './workApi'

/** Na Prehľade: stretávky eventov, rozbehnutá dochádzka a práca na firme / doma (len pri zapnutej dochádzke). */
export function MyAttendance({ companyId }: { companyId: string }) {
  const userId = useAuth().session?.user.id
  const [enabled] = useState(attendanceEnabled)
  const [now] = useState(() => Date.now())
  const mine = useMyAttendance(companyId, userId, enabled)
  const events = useEvents(companyId)
  if (!enabled || !userId) return null

  const cards =
    mine.data && events.data
      ? events.data.flatMap((event) => {
          const open = mine.data.open.find((item) => item.eventId === event.id) ?? null
          const crew = event.crew.some((person) => person.memberId === userId && person.response !== 'no')
          const meeting = currentMeeting(
            mine.data.meetings.filter((item) => item.eventId === event.id),
            now,
          )
          if (!open && !(crew && meeting)) return []
          return [<MyAttendanceCard key={event.id} companyId={companyId} event={event} meeting={meeting} open={open} showEvent />]
        })
      : []
  return (
    <section aria-label="Dochádzka" className="mb-6 flex flex-col gap-3">
      {cards}
      <WorkCard companyId={companyId} userId={userId} />
    </section>
  )
}

/** Moja adresa domov – miesto pre prácu doma. Vidím ju len ja a kto spravuje tím. */
function HomeAddress({ companyId, userId }: { companyId: string; userId: string }) {
  const queryClient = useQueryClient()
  const home = useHome(companyId, userId)
  const [address, setAddress] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)
  const value = address ?? home.data?.address ?? ''
  const save = useMutation({
    mutationFn: () => saveHome(companyId, userId, value),
    onSuccess: (found) => {
      setNotFound(!found)
      setAddress(null)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: workKeys.home(companyId) }),
  })
  if (home.isError) return null
  return (
    <form
      className="flex flex-wrap items-end gap-2 rounded-xl border bg-surface p-4"
      onSubmit={(event) => {
        event.preventDefault()
        save.mutate()
      }}
    >
      <Field
        label="Moja adresa domov (pre prácu doma)"
        className="min-w-56 flex-1"
        maxLength={200}
        placeholder="ulica, mesto"
        autoComplete="street-address"
        value={value}
        onChange={(event) => setAddress(event.target.value)}
      />
      <Button type="submit" disabled={save.isPending || home.isPending || value.trim() === (home.data?.address ?? '')}>
        {save.isPending ? 'Hľadám na mape…' : 'Uložiť'}
      </Button>
      <p className="basis-full text-xs text-muted-foreground">Vidíte ju len vy a kto spravuje tím. Práca doma sa uzná do 300 m od nej.</p>
      {notFound && <p className="basis-full text-sm text-accent">Adresu sa nepodarilo nájsť na mape – napíšte ju presnejšie (ulica, číslo, mesto).</p>}
      {save.isError && <p className="basis-full text-sm text-destructive">Adresu sa nepodarilo uložiť.</p>}
    </form>
  )
}

/** Nastavenie: dochádzka podľa polohy je dobrovoľná a platí pre tento mobil / prehliadač. */
export function AttendanceSettings({ companyId }: { companyId: string }) {
  const userId = useAuth().session?.user.id
  const [on, setOn] = useState(attendanceEnabled)
  return (
    <div className="flex flex-col gap-3">
      <label className="flex cursor-pointer items-start gap-3 rounded-xl border bg-surface p-4">
        <input
          type="checkbox"
          className="mt-0.5 size-5 shrink-0"
          checked={on}
          onChange={(event) => {
            setOn(event.target.checked)
            setAttendanceEnabled(event.target.checked)
          }}
        />
        <span>
          Dochádzka podľa polohy
          <span className="block text-sm text-muted-foreground">
            Na Prehľade sa ukáže „Som tu“ pri stretávke na evente a „Začať na firme / doma“ – odomkne sa, keď ste na mieste. Potom Prestávka, Čakám a
            Končím. Poloha sa zistí len pri otvorení appky a nikam sa neukladá. Platí pre tento mobil.{' '}
            <Link to="/attendance" className="text-accent hover:underline">
              Moja dochádzka
            </Link>
          </span>
        </span>
      </label>
      {userId && <HomeAddress companyId={companyId} userId={userId} />}
    </div>
  )
}
