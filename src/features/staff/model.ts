import type { Member } from '@/features/companies/api'
import type { CompanyEvent } from '@/features/events/model'

// Zamestnanci: karta človeka z tímu (fotka, pozícia, kontakt, zručnosti) a kedy nemôže.

export type StaffRow = {
  id: string
  memberId: string | null
  name: string
  position: string
  phone: string
  email: string
  photoPath: string
  skills: string
  note: string
  active: boolean
  birthDate: string | null
  /** Meniny ako „MM-DD“, prázdne = nezadané. */
  nameDay: string
  /** Skupiny vodičského oprávnenia, napr. B, C. */
  licences: string[]
  /** Prešiel úvodným dotazníkom po prvom prihlásení. */
  onboarded: boolean
}

/** Skupiny vodičského oprávnenia na Slovensku. */
export const LICENCES = ['AM', 'A1', 'A2', 'A', 'B1', 'B', 'BE', 'C1', 'C1E', 'C', 'CE', 'D1', 'D1E', 'D', 'DE', 'T'] as const

export type Unavailability = { id: string; staffId: string; startsOn: string; endsOn: string; note: string }

/** Človek v zozname: člen firmy (s kartou alebo zatiaľ bez nej) alebo brigádnik bez účtu. */
export type Person = Omit<StaffRow, 'id'> & {
  /** Kľúč do adresy: id karty, alebo „m-<id člena>“, kým karta neexistuje. */
  key: string
  staffId: string | null
  /** E-mail účtu (len pri členoch). */
  accountEmail: string
  isMember: boolean
}

export const memberKey = (memberId: string) => `m-${memberId}`

/** Spojí členov firmy s kartami; karty bez člena (brigádnici, bývalí členovia) idú tiež. Zoradené podľa mena. */
export function mergeStaff(members: Member[], rows: StaffRow[]): Person[] {
  const people: Person[] = members.map((member) => {
    const row = rows.find((candidate) => candidate.memberId === member.userId)
    const base = { position: '', phone: '', email: '', photoPath: '', skills: '', note: '', active: true, birthDate: null, nameDay: '', licences: [], onboarded: false }
    return {
      ...base,
      ...(row ?? {}),
      key: row?.id ?? memberKey(member.userId),
      staffId: row?.id ?? null,
      memberId: member.userId,
      name: member.fullName || row?.name || member.email,
      accountEmail: member.email,
      isMember: true,
    }
  })
  for (const row of rows) {
    if (row.memberId && members.some((member) => member.userId === row.memberId)) continue
    people.push({ ...row, key: row.id, staffId: row.id, name: row.name || 'Bývalý člen', accountEmail: '', isMember: false })
  }
  return people.sort((a, b) => Number(b.active) - Number(a.active) || a.name.localeCompare(b.name, 'sk'))
}

/** Obdobie, kedy človek v daný deň nemôže, ak také je. */
export function unavailableOn(periods: Unavailability[], staffId: string | null, date: string) {
  return periods.find((period) => period.staffId === staffId && period.startsOn <= date && period.endsOn >= date) ?? null
}

/** Obdobia, ktoré sa prekrývajú s termínom od–do (napr. s eventom). */
export function clashes(periods: Unavailability[], staffId: string | null, from: string, to: string) {
  return periods.filter((period) => period.staffId === staffId && period.startsOn <= to && period.endsOn >= from)
}

/** Nadchádzajúce a prebiehajúce obdobia, od najbližšieho. */
export function upcomingPeriods(periods: Unavailability[], staffId: string | null, today: string) {
  return periods.filter((period) => period.staffId === staffId && period.endsOn >= today).sort((a, b) => a.startsOn.localeCompare(b.startsOn))
}

/** Eventy, na ktorých je člen v posádke a ešte neskončili, od najbližšieho. */
export function upcomingEvents(events: CompanyEvent[], memberId: string | null, today: string) {
  if (!memberId) return []
  return events
    .filter((event) => event.status !== 'cancelled' && event.endsOn >= today && event.crew.some((person) => person.memberId === memberId))
    .sort((a, b) => a.startsOn.localeCompare(b.startsOn))
}

/** Hľadanie podľa mena, pozície, zručností, telefónu a e-mailu, bez diakritiky. */
export function matchesPerson(person: Person, query: string) {
  const plain = (text: string) =>
    text
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()
  const words = plain(query).split(/\s+/).filter(Boolean)
  const haystack = plain([person.name, person.position, person.skills, person.phone, person.email, person.accountEmail].join(' '))
  return words.every((word) => haystack.includes(word))
}
