import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { isoToLocal, localToIso, type Attendance } from './model'

const minutesOf = (value: string) => (value.trim() === '' ? 0 : Math.max(0, Math.min(1440, Math.round(Number(value)) || 0)))

/** Oprava dochádzky vedúcim: príchod, odchod, prestávky a čakanie. */
export type CorrectFields = { startedAt: string; endedAt: string | null; breakMinutes: number; waitMinutes: number }

export function CorrectForm({ attendance, onSave, onCancel, saving }: { attendance: Pick<Attendance, 'startedAt' | 'endedAt' | 'breakMinutes' | 'waitMinutes'>; onSave: (fields: CorrectFields) => void; onCancel: () => void; saving: boolean }) {
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
