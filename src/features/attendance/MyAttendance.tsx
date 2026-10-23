import { useState } from 'react'
import { useAuth } from '@/features/auth/auth-context'
import { useEvents } from '@/features/events/useEvents'
import { useMyAttendance } from './api'
import { attendanceEnabled, currentMeeting, setAttendanceEnabled } from './model'
import { MyAttendanceCard } from './MyAttendanceCard'

/** Na Prehľade: rozbehnutá dochádzka alebo stretávka, na ktorú sa teraz dá prihlásiť (len pri zapnutej dochádzke). */
export function MyAttendance({ companyId }: { companyId: string }) {
  const userId = useAuth().session?.user.id
  const [enabled] = useState(attendanceEnabled)
  const [now] = useState(() => Date.now())
  const mine = useMyAttendance(companyId, userId, enabled)
  const events = useEvents(companyId)
  if (!enabled || !mine.data || !events.data) return null

  const cards = events.data.flatMap((event) => {
    const open = mine.data.open.find((item) => item.eventId === event.id) ?? null
    const crew = event.crew.some((person) => person.memberId === userId && person.response !== 'no')
    const meeting = currentMeeting(
      mine.data.meetings.filter((item) => item.eventId === event.id),
      now,
    )
    if (!open && !(crew && meeting)) return []
    return [<MyAttendanceCard key={event.id} companyId={companyId} event={event} meeting={meeting} open={open} showEvent />]
  })
  if (cards.length === 0) return null
  return (
    <section aria-label="Dochádzka" className="mb-6 flex flex-col gap-3">
      {cards}
    </section>
  )
}

/** Nastavenie: dochádzka podľa polohy je dobrovoľná a platí pre tento mobil / prehliadač. */
export function AttendanceSettings() {
  const [on, setOn] = useState(attendanceEnabled)
  return (
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
          Pri stretávke na evente sa na Prehľade ukáže „Som tu“ – odomkne sa, keď ste na mieste. Potom Prestávka, Čakám a Končím; čas sa sám zapíše do
          výkazu. Poloha sa zistí len pri otvorení appky a nikam sa neukladá. Platí pre tento mobil.
        </span>
      </span>
    </label>
  )
}
