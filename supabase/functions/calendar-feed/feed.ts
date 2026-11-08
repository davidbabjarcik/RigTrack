// Kalendár eventov vo formáte iCalendar (RFC 5545) pre odber cez odkaz – bez knižníc, aby bežal v Deno aj v testoch.

export type FeedEvent = {
  id: string
  name: string
  venue: string
  starts_on: string
  ends_on: string
  status: string
  get_in_time: string
  show_time: string
  show_end_time: string
  crew_role: string
  company_name: string
  scope: string
  app_url: string
}

const STATUS: Record<string, string> = { planned: 'Plánovaný', confirmed: 'Potvrdený', done: 'Odohraný' }

const escape = (value: string) => value.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;')

/** Riadky nad 75 bajtov sa zalomia (pokračovanie začína medzerou). */
function fold(line: string) {
  const encoder = new TextEncoder()
  const out: string[] = []
  let current = ''
  for (const char of line) {
    if (encoder.encode(current + char).length > (out.length === 0 ? 75 : 74)) {
      out.push(current)
      current = char
    } else current += char
  }
  out.push(current)
  return out.join('\r\n ')
}

const compact = (iso: string) => iso.slice(0, 10).replace(/-/g, '')
function nextDay(iso: string) {
  const date = new Date(`${iso.slice(0, 10)}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + 1)
  return date.toISOString().slice(0, 10)
}

/** Celý kalendár: celodenné termíny, v popise stav, časy, rola v posádke a odkaz do appky. */
export function buildFeed(events: FeedEvent[], now = new Date()) {
  const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const first = events[0]
  const name = first ? `RigTrack – ${first.company_name}${first.scope === 'mine' ? ' (moje eventy)' : ''}` : 'RigTrack'
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//RigTrack//SK',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escape(name)}`,
    // Kalendárové appky sa majú pýtať na zmeny približne každú hodinu.
    'REFRESH-INTERVAL;VALUE=DURATION:PT1H',
    'X-PUBLISHED-TTL:PT1H',
  ]
  for (const event of events) {
    const end = event.ends_on < event.starts_on ? event.starts_on : event.ends_on
    const show = event.show_time && `Začiatok ${event.show_time}${event.show_end_time ? `–${event.show_end_time}` : ''}`
    const times = [event.get_in_time && `Príchod ${event.get_in_time}`, show].filter(Boolean).join(', ')
    const url = event.app_url ? `${event.app_url.replace(/\/$/, '')}/events/${event.id}` : ''
    const description = [STATUS[event.status] ?? '', event.crew_role && `Rola: ${event.crew_role}`, times, url].filter(Boolean).join('\n')
    lines.push(
      'BEGIN:VEVENT',
      `UID:event-${event.id}@rigtrack`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${compact(event.starts_on)}`,
      `DTEND;VALUE=DATE:${compact(nextDay(end))}`,
      `SUMMARY:${escape(event.name)}`,
    )
    if (event.venue) lines.push(`LOCATION:${escape(event.venue)}`)
    if (description) lines.push(`DESCRIPTION:${escape(description)}`)
    if (url) lines.push(`URL:${url}`)
    lines.push(`STATUS:${event.status === 'planned' ? 'TENTATIVE' : 'CONFIRMED'}`, 'TRANSP:TRANSPARENT', 'END:VEVENT')
  }
  lines.push('END:VCALENDAR')
  return lines.map(fold).join('\r\n') + '\r\n'
}

/** Odkaz má 64 znakov 0–9 a–f; nič iné sa do databázy ani neposiela. */
export const isFeedToken = (value: string) => /^[0-9a-f]{64}$/.test(value)
