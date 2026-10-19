import type { Person } from './model'

/** „06-24“ → „24. 6.“ */
export function formatNameDay(nameDay: string) {
  if (!nameDay) return ''
  const [month, day] = nameDay.split('-').map(Number)
  return `${day}. ${month}.`
}

export type Celebration = { person: Person; kind: 'birthday' | 'nameday'; date: string; age: number | null }

const addDays = (iso: string, days: number) => {
  const date = new Date(`${iso}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

/** Narodeniny a meniny aktívnych ľudí od `today` na `days` dní (vrátane dneška), najbližšie prvé. */
export function upcomingCelebrations(people: Person[], today: string, days = 7): Celebration[] {
  const result: Celebration[] = []
  for (let offset = 0; offset < days; offset++) {
    const date = addDays(today, offset)
    const monthDay = date.slice(5)
    for (const person of people) {
      if (!person.active) continue
      if (person.birthDate && person.birthDate.slice(5) === monthDay) {
        result.push({ person, kind: 'birthday', date, age: Number(date.slice(0, 4)) - Number(person.birthDate.slice(0, 4)) })
      }
      if (person.nameDay === monthDay) result.push({ person, kind: 'nameday', date, age: null })
    }
  }
  return result
}

/** Text pre upozornenie: „Dnes má narodeniny Jano (30)“, „Zajtra má meniny Mária“. */
export function describeCelebration(celebration: Celebration, today: string) {
  const when = celebration.date === today ? 'Dnes' : celebration.date === addDays(today, 1) ? 'Zajtra' : `${Number(celebration.date.slice(8))}. ${Number(celebration.date.slice(5, 7))}.`
  const what = celebration.kind === 'birthday' ? 'narodeniny' : 'meniny'
  const age = celebration.age !== null ? ` (${celebration.age})` : ''
  return `${when} má ${what} ${celebration.person.name}${age}`
}
