import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { CollapsibleSection } from '@/components/layout/CollapsibleSection'
import { Button } from '@/components/ui/button'
import { Field, SelectField } from '@/components/ui/field'
import { useAuth } from '@/features/auth/auth-context'
import { useCompanyProfile } from '@/features/companies/profile'
import { memberName, useMembers } from '@/features/companies/useMembers'
import type { CompanyEvent } from '@/features/events/model'
import { fetchPlace, fetchTravel, planKeys } from '@/features/events/planApi'
import { formatDate } from '@/lib/format'
import { attendanceKeys, correctAttendance, deleteAttendance, deleteMeeting, saveMeeting, useEventAttendance, useMeetings } from './api'
import {
  attendanceEnabled,
  currentMeeting,
  formatDistance,
  formatMinutes,
  isoToLocal,
  localToIso,
  PAUSE_LABELS,
  PLACE_KIND_LABELS,
  PLACE_KINDS,
  timeOf,
  workedMinutes,
  type Attendance,
  type PlaceKind,
} from './model'
import { MyAttendanceCard } from './MyAttendanceCard'

type Props = { companyId: string; event: CompanyEvent; canEdit: boolean }

const minutesOf = (value: string) => (value.trim() === '' ? 0 : Math.max(0, Math.min(1440, Math.round(Number(value)) || 0)))

/** Oprava dochádzky vedúcim: príchod, odchod, prestávky a čakanie. */
function CorrectForm({ attendance, onSave, onCancel, saving }: { attendance: Attendance; onSave: (fields: Parameters<typeof correctAttendance>[1]) => void; onCancel: () => void; saving: boolean }) {
  const start = isoToLocal(attendance.startedAt)
  const end = attendance.endedAt ? isoToLocal(attendance.endedAt) : null
  const [values, setValues] = useState({
    startDate: start.date,
    startTime: start.time,
    endDate: end?.date ?? start.date,
    endTime: end?.time ?? '',
    breaks: String(attendance.breakMinutes),
    waits: String(attendance.waitMinutes),
  })
  const set = (patch: Partial<typeof values>) => setValues((current) => ({ ...current, ...patch }))
  const startedAt = localToIso(values.startDate, values.startTime)
  const endedAt = values.endTime ? localToIso(values.endDate, values.endTime) : null
  const valid = Boolean(values.startDate && values.startTime) && (!endedAt || endedAt > startedAt)
  return (
    <div className="mt-2 grid gap-2 rounded-lg border bg-background p-3 sm:grid-cols-2">
      <Field label="Príchod – dátum" type="date" value={values.startDate} onChange={(e) => set({ startDate: e.target.value })} />
      <Field label="Príchod – čas" type="time" value={values.startTime} onChange={(e) => set({ startTime: e.target.value })} />
      <Field label="Odchod – dátum" type="date" value={values.endDate} onChange={(e) => set({ endDate: e.target.value })} />
      <Field label="Odchod – čas (prázdne = ešte pracuje)" type="time" value={values.endTime} onChange={(e) => set({ endTime: e.target.value })} />
      <Field label="Prestávky (min)" type="number" inputMode="numeric" min={0} value={values.breaks} onChange={(e) => set({ breaks: e.target.value })} />
      <Field label="Čakanie (min)" type="number" inputMode="numeric" min={0} value={values.waits} onChange={(e) => set({ waits: e.target.value })} />
      {!valid && <p className="text-sm text-destructive sm:col-span-2">Odchod musí byť po príchode.</p>}
      <div className="flex gap-2 sm:col-span-2">
        <Button size="sm" disabled={!valid || saving} onClick={() => onSave({ startedAt, endedAt, breakMinutes: minutesOf(values.breaks), waitMinutes: minutesOf(values.waits) })}>
          Uložiť
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          Zrušiť
        </Button>
      </div>
    </div>
  )
}

/** Stretávky eventu (kde a kedy) a dochádzka posádky. */
export function EventAttendanceSection({ companyId, event, canEdit }: Props) {
  const userId = useAuth().session?.user.id
  const queryClient = useQueryClient()
  const meetings = useMeetings(companyId, event.id)
  const attendance = useEventAttendance(companyId, event.id)
  const members = useMembers(companyId)
  const profile = useCompanyProfile(companyId)
  const place = useQuery({ queryKey: planKeys.place(companyId, event.id), queryFn: () => fetchPlace(companyId, event.id), retry: false, enabled: canEdit })
  const travel = useQuery({ queryKey: planKeys.travel(companyId, event.id), queryFn: () => fetchTravel(companyId, event.id), retry: false, enabled: canEdit })
  const [now] = useState(() => Date.now())
  const [enabled] = useState(attendanceEnabled)
  const [editing, setEditing] = useState<string | null>(null)
  const [form, setForm] = useState({ date: event.startsOn, time: '', placeKind: 'company' as PlaceKind, address: '', radius: '300', note: '' })
  const [notFound, setNotFound] = useState(false)
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: attendanceKeys.meetings(companyId, event.id) })
    void queryClient.invalidateQueries({ queryKey: attendanceKeys.ofEvent(companyId, event.id) })
    void queryClient.invalidateQueries({ queryKey: attendanceKeys.mine(companyId) })
  }

  // Adresa sa predvyplní podľa zvoleného miesta; dá sa prepísať.
  const suggested = (kind: PlaceKind, date: string) =>
    kind === 'company'
      ? (profile.data?.warehouseAddress || profile.data?.address || '')
      : kind === 'event'
        ? (place.data?.address || event.venue || '')
        : kind === 'hotel'
          ? (travel.data?.find((day) => day.date === date && day.stayPlace)?.stayPlace ?? travel.data?.find((day) => day.stayPlace)?.stayPlace ?? '')
          : ''
  const address = form.address || suggested(form.placeKind, form.date)

  const add = useMutation({
    mutationFn: () =>
      saveMeeting(companyId, event.id, {
        meetAt: localToIso(form.date, form.time),
        placeKind: form.placeKind,
        address,
        radiusM: Math.max(50, Math.min(5000, Number(form.radius) || 300)),
        note: form.note,
      }),
    onSuccess: (found) => {
      setNotFound(!found)
      setForm((current) => ({ ...current, time: '', address: '', note: '' }))
    },
    onSettled: refresh,
  })
  const removeMeeting = useMutation({ mutationFn: deleteMeeting, onSettled: refresh })
  const correct = useMutation({
    mutationFn: ({ id, fields }: { id: string; fields: Parameters<typeof correctAttendance>[1] }) => correctAttendance(id, fields),
    onSuccess: () => setEditing(null),
    onSettled: refresh,
  })
  const removeAttendance = useMutation({ mutationFn: deleteAttendance, onSettled: refresh })

  if (meetings.isError) {
    return canEdit ? (
      <CollapsibleSection id="event.attendance" title="Stretávka a dochádzka">
        <p className="rounded-xl border bg-surface p-4 text-sm text-muted-foreground">Táto časť databázy ešte nie je pripravená – kontaktujte vývojára aplikácie.</p>
      </CollapsibleSection>
    ) : null
  }
  const list = meetings.data ?? []
  const records = attendance.data ?? []
  const crew = event.crew.some((person) => person.memberId === userId && person.response !== 'no')
  const myOpen = records.find((item) => item.userId === userId && !item.endedAt) ?? null
  const meetingNow = currentMeeting(list, now)
  const showMine = enabled && crew && (myOpen || meetingNow)
  if (!canEdit && list.length === 0 && !showMine) return null

  return (
    <CollapsibleSection id="event.attendance" title={<>Stretávka a dochádzka ({list.length})</>}>
      {showMine && (
        <div className="mb-3">
          <MyAttendanceCard companyId={companyId} event={event} meeting={meetingNow} open={myOpen} />
        </div>
      )}
      {crew && !enabled && list.length > 0 && (
        <p className="mb-3 text-sm text-muted-foreground">Dochádzku podľa polohy si môžete zapnúť v Nastaveniach → Účet.</p>
      )}

      {list.length > 0 && (
        <ul className="mb-3 divide-y overflow-hidden rounded-xl border bg-surface">
          {list.map((meeting) => (
            <li key={meeting.id} className="flex items-start gap-3 px-4 py-3">
              <span className="min-w-0 flex-1 text-sm">
                <span className="block font-medium">
                  {formatDate(isoToLocal(meeting.meetAt).date)} o {timeOf(meeting.meetAt)} · {PLACE_KIND_LABELS[meeting.placeKind]}
                </span>
                <span className="block text-muted-foreground">
                  {[meeting.address, meeting.lat === null && meeting.address && 'bez polohy na mape', `polomer ${formatDistance(meeting.radiusM)}`, meeting.note].filter(Boolean).join(' · ')}
                </span>
              </span>
              {canEdit && (
                <Button variant="ghost" size="sm" aria-label="Zmazať stretávku" disabled={removeMeeting.isPending} onClick={() => window.confirm('Zmazať stretávku?') && removeMeeting.mutate(meeting.id)}>
                  <Trash2 className="size-4" aria-hidden />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      {canEdit && (
        <form
          className="mb-3 grid gap-3 rounded-xl border bg-surface p-4 sm:grid-cols-2"
          onSubmit={(submit) => {
            submit.preventDefault()
            if (form.date && form.time) add.mutate()
          }}
        >
          <Field label="Dátum stretávky" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          <Field label="Čas" type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
          <SelectField label="Kde" value={form.placeKind} onChange={(e) => setForm({ ...form, placeKind: e.target.value as PlaceKind, address: '' })}>
            {PLACE_KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {PLACE_KIND_LABELS[kind]}
              </option>
            ))}
          </SelectField>
          <Field label="Adresa" maxLength={200} placeholder="ulica, mesto" value={address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          <Field label="Polomer (m)" type="number" inputMode="numeric" min={50} max={5000} value={form.radius} onChange={(e) => setForm({ ...form, radius: e.target.value })} />
          <Field label="Poznámka (nepovinné)" maxLength={200} placeholder="napr. pri bráne č. 2" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          <div className="sm:col-span-2">
            <Button type="submit" disabled={add.isPending || !form.date || !form.time || !address.trim()}>
              {add.isPending ? 'Hľadám adresu na mape…' : 'Pridať stretávku'}
            </Button>
            {notFound && <p className="mt-2 text-sm text-accent">Adresu sa nepodarilo nájsť na mape – príchod sa nebude overovať polohou. Skúste ju napísať presnejšie (ulica, mesto).</p>}
            {add.isError && <p className="mt-2 text-sm text-destructive">Stretávku sa nepodarilo uložiť.</p>}
          </div>
        </form>
      )}

      {canEdit && records.length > 0 && (
        <>
          <h3 className="mb-2 text-sm font-medium text-muted-foreground">Dochádzka posádky</h3>
          <ul className="divide-y overflow-hidden rounded-xl border bg-surface text-sm">
            {records.map((item) => (
              <li key={item.id} className="px-4 py-3">
                <div className="flex items-start gap-3">
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{memberName(members.data, item.userId) || 'člen'}</span>
                    <span className="block text-muted-foreground">
                      {formatDate(isoToLocal(item.startedAt).date)} {timeOf(item.startedAt)} – {item.endedAt ? timeOf(item.endedAt) : 'pracuje'}
                      {' · '}
                      {formatMinutes(workedMinutes(item, now))}
                      {item.breakMinutes > 0 && ` · prestávky ${item.breakMinutes} min`}
                      {item.waitMinutes > 0 && ` · čakanie ${item.waitMinutes} min`}
                    </span>
                    <span className="block text-muted-foreground">
                      {[
                        item.verified ? `overené polohou${item.distanceM !== null ? ` (${formatDistance(item.distanceM)})` : ''}` : 'bez overenia polohou',
                        item.pausedAt && `${PAUSE_LABELS[item.pauseKind ?? 'break']} od ${timeOf(item.pausedAt)}`,
                        item.editedByName && `opravil(a) ${item.editedByName}`,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </span>
                  <Button variant="ghost" size="sm" aria-label="Opraviť časy" onClick={() => setEditing(editing === item.id ? null : item.id)}>
                    <Pencil className="size-4" aria-hidden />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label="Zmazať záznam dochádzky"
                    disabled={removeAttendance.isPending}
                    onClick={() => window.confirm('Zmazať záznam dochádzky? Zápis vo výkaze času ostane.') && removeAttendance.mutate(item.id)}
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </Button>
                </div>
                {editing === item.id && (
                  <CorrectForm attendance={item} saving={correct.isPending} onCancel={() => setEditing(null)} onSave={(fields) => correct.mutate({ id: item.id, fields })} />
                )}
              </li>
            ))}
          </ul>
          {correct.isError && <p className="mt-2 text-sm text-destructive">Opravu sa nepodarilo uložiť.</p>}
        </>
      )}
    </CollapsibleSection>
  )
}
