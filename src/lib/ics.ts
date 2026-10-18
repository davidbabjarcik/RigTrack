import { downloadText, safeFileName } from './download'

export type CalendarItem = {
  /** Stabilné id, aby opakovaný import termín aktualizoval a nezdvojil. */
  uid: string
  title: string
  /** Celodenný termín od–do vrátane (YYYY-MM-DD). */
  startsOn: string
  endsOn: string
  location?: string
  description?: string
  url?: string
}

function escape(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;')
}

/** Riadky dlhšie ako 75 bajtov sa podľa RFC 5545 zalomia (pokračovanie začína medzerou). */
function fold(line: string) {
  const encoder = new TextEncoder()
  const out: string[] = []
  let current = ''
  for (const char of line) {
    if (encoder.encode(current + char).length > (out.length === 0 ? 75 : 74)) {
      out.push(current)
      current = char
    } else {
      current += char
    }
  }
  out.push(current)
  return out.join('\r\n ')
}

const compact = (isoDate: string) => isoDate.replace(/-/g, '')

function nextDay(isoDate: string) {
  const date = new Date(`${isoDate}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + 1)
  return date.toISOString().slice(0, 10)
}

/** Kalendár vo formáte iCalendar (.ics) – vie ho otvoriť telefón, Google Kalendár aj Outlook. */
export function buildIcs(items: CalendarItem[], now = new Date()) {
  const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//RigTrack//SK', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH']
  for (const item of items) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${item.uid}@rigtrack`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${compact(item.startsOn)}`,
      // Koniec celodenného termínu je v iCalendar výlučný: deň po poslednom dni.
      `DTEND;VALUE=DATE:${compact(nextDay(item.endsOn < item.startsOn ? item.startsOn : item.endsOn))}`,
      `SUMMARY:${escape(item.title)}`,
    )
    if (item.location) lines.push(`LOCATION:${escape(item.location)}`)
    if (item.description) lines.push(`DESCRIPTION:${escape(item.description)}`)
    if (item.url) lines.push(`URL:${item.url}`)
    lines.push('END:VEVENT')
  }
  lines.push('END:VCALENDAR')
  return lines.map(fold).join('\r\n') + '\r\n'
}

export function downloadIcs(fileName: string, items: CalendarItem[]) {
  downloadText(`${safeFileName(fileName, 'kalendar')}.ics`, buildIcs(items), 'text/calendar;charset=utf-8')
}

/** Odkaz, ktorý otvorí nový termín rovno v Google Kalendári. */
export function googleCalendarUrl(item: CalendarItem) {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: item.title,
    dates: `${compact(item.startsOn)}/${compact(nextDay(item.endsOn < item.startsOn ? item.startsOn : item.endsOn))}`,
  })
  const details = [item.description, item.url].filter(Boolean).join('\n\n')
  if (details) params.set('details', details)
  if (item.location) params.set('location', item.location)
  return `https://calendar.google.com/calendar/render?${params}`
}
