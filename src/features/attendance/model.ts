// Stretávky a dochádzka: kde a kedy sa posádka stretne a kto kedy prišiel, mal prestávku a skončil.

export const PLACE_KINDS = ['company', 'event', 'hotel', 'custom'] as const
export type PlaceKind = (typeof PLACE_KINDS)[number]
export const PLACE_KIND_LABELS: Record<PlaceKind, string> = { company: 'Na firme (sklad)', event: 'Na mieste akcie', hotel: 'Hotel / ubytovanie', custom: 'Iná adresa' }

export type PauseKind = 'break' | 'wait'
export const PAUSE_LABELS: Record<PauseKind, string> = { break: 'Prestávka', wait: 'Čakanie' }

export type Meeting = {
  id: string
  eventId: string
  meetAt: string
  placeKind: PlaceKind
  address: string
  lat: number | null
  lon: number | null
  radiusM: number
  note: string
}

export type Attendance = {
  id: string
  eventId: string
  meetingId: string | null
  userId: string
  startedAt: string
  endedAt: string | null
  verified: boolean
  distanceM: number | null
  pausedAt: string | null
  pauseKind: PauseKind | null
  breakMinutes: number
  waitMinutes: number
  editedByName: string
}

/** Vzdialenosť dvoch bodov na Zemi v metroch (haversine). */
export function distanceM(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const rad = (deg: number) => (deg * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLon = rad(b.lon - a.lon)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2
  return Math.round(2 * 6_371_000 * Math.asin(Math.sqrt(h)))
}

/** „80 m“ / „12,4 km“ */
export function formatDistance(meters: number) {
  return meters < 1000 ? `${meters} m` : `${(meters / 1000).toFixed(1).replace('.', ',')} km`
}

// Stretávka sa ponúka 3 hodiny pred časom a do 12 hodín po ňom (prídem skôr, alebo neskôr).
const BEFORE_MS = 3 * 3_600_000
const AFTER_MS = 12 * 3_600_000

/** Stretávka, na ktorú sa teraz dá prihlásiť (najbližšia k aktuálnemu času), alebo null. */
export function currentMeeting(meetings: Meeting[], now: number) {
  const open = meetings.filter((meeting) => {
    const at = Date.parse(meeting.meetAt)
    return now >= at - BEFORE_MS && now <= at + AFTER_MS
  })
  return open.sort((a, b) => Math.abs(Date.parse(a.meetAt) - now) - Math.abs(Date.parse(b.meetAt) - now))[0] ?? null
}

/** Odpracované minúty: od príchodu do odchodu (alebo teraz) mínus prestávky a čakanie, aj prebiehajúce. */
export function workedMinutes(attendance: Pick<Attendance, 'startedAt' | 'endedAt' | 'pausedAt' | 'breakMinutes' | 'waitMinutes'>, now: number) {
  const end = attendance.endedAt ? Date.parse(attendance.endedAt) : now
  const running = attendance.pausedAt && !attendance.endedAt ? Math.max(0, now - Date.parse(attendance.pausedAt)) / 60_000 : 0
  return Math.max(0, Math.floor((end - Date.parse(attendance.startedAt)) / 60_000 - attendance.breakMinutes - attendance.waitMinutes - running))
}

/** 125 → „2 h 05 min“ */
export function formatMinutes(minutes: number) {
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return hours > 0 ? `${hours} h ${String(rest).padStart(2, '0')} min` : `${rest} min`
}

/** Dátum a čas z formulára (miestny čas) → ISO; a späť pre predvyplnenie. */
export function localToIso(date: string, time: string) {
  return new Date(`${date}T${time}`).toISOString()
}
export function isoToLocal(iso: string) {
  const date = new Date(iso)
  const pad = (value: number) => String(value).padStart(2, '0')
  return { date: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`, time: `${pad(date.getHours())}:${pad(date.getMinutes())}` }
}

export const timeOf = (iso: string) => new Date(iso).toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' })

// Dochádzka podľa polohy je dobrovoľná – každý si ju zapína sám v Nastaveniach (pamätá sa v prehliadači).
const OPT_IN_KEY = 'rigtrack.attendance.enabled'
export function attendanceEnabled() {
  try {
    return localStorage.getItem(OPT_IN_KEY) === 'on'
  } catch {
    return false
  }
}
export function setAttendanceEnabled(on: boolean) {
  try {
    localStorage.setItem(OPT_IN_KEY, on ? 'on' : 'off')
  } catch {
    // Bez úložiska sa voľba len nezapamätá.
  }
}
