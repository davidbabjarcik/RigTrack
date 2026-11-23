import { formatDate } from '@/lib/format'

// Harmonogram akcie: položky po dňoch (a pri festivale po pódiách) s časom od – do.

export const SCHEDULE_KINDS = ['get_in', 'build', 'soundcheck', 'doors', 'act', 'changeover', 'break', 'curfew', 'teardown', 'other'] as const
export type ScheduleKind = (typeof SCHEDULE_KINDS)[number]
export const SCHEDULE_KIND_LABELS: Record<ScheduleKind, string> = {
  get_in: 'Príchod / get-in',
  build: 'Stavba',
  soundcheck: 'Soundcheck',
  doors: 'Otvorenie brán',
  act: 'Vystúpenie',
  changeover: 'Prestavba',
  break: 'Pauza',
  curfew: 'Koniec (curfew)',
  teardown: 'Demontáž',
  other: 'Iné',
}

export type ScheduleItem = { id: string; day: string; startsAt: string; endsAt: string; stage: string; kind: ScheduleKind; title: string; note: string }
export type ScheduleFields = Omit<ScheduleItem, 'id'>

/** Minúty od polnoci; čas po polnoci (koniec menší ako začiatok) sa počíta do ďalšieho dňa. */
export const minutes = (time: string) => {
  const [hours, mins] = time.split(':').map(Number)
  return (hours || 0) * 60 + (mins || 0)
}
export const span = (item: Pick<ScheduleItem, 'startsAt' | 'endsAt'>) => {
  const start = minutes(item.startsAt)
  if (!item.endsAt) return { start, end: start }
  const end = minutes(item.endsAt)
  return { start, end: end < start ? end + 24 * 60 : end }
}

export const sortItems = (items: ScheduleItem[]) => [...items].sort((a, b) => a.day.localeCompare(b.day) || minutes(a.startsAt) - minutes(b.startsAt) || a.stage.localeCompare(b.stage, 'sk'))

/** Dni → pódiá → položky (pódium '' = bez pódia). */
export function groupSchedule(items: ScheduleItem[]) {
  const days = new Map<string, Map<string, ScheduleItem[]>>()
  for (const item of sortItems(items)) {
    const stages = days.get(item.day) ?? new Map<string, ScheduleItem[]>()
    stages.set(item.stage, [...(stages.get(item.stage) ?? []), item])
    days.set(item.day, stages)
  }
  return days
}

/** Upozornenia: prekryv na tom istom pódiu v ten istý deň, krátka prestavba medzi vystúpeniami. */
export function scheduleWarnings(items: ScheduleItem[], minChangeover = 15) {
  const warnings: { ids: string[]; text: string }[] = []
  for (const [day, stages] of groupSchedule(items)) {
    for (const [stage, list] of stages) {
      const timed = list.filter((item) => item.endsAt && item.kind !== 'doors' && item.kind !== 'curfew')
      for (let i = 0; i < timed.length; i++) {
        for (let j = i + 1; j < timed.length; j++) {
          const a = span(timed[i])
          const b = span(timed[j])
          if (a.start < b.end && b.start < a.end) warnings.push({ ids: [timed[i].id, timed[j].id], text: `${formatDate(day)}${stage ? ` · ${stage}` : ''}: „${timed[i].title}“ a „${timed[j].title}“ sa prekrývajú` })
        }
      }
      const acts = timed.filter((item) => item.kind === 'act')
      for (let i = 1; i < acts.length; i++) {
        const gap = span(acts[i]).start - span(acts[i - 1]).end
        if (gap >= 0 && gap < minChangeover) warnings.push({ ids: [acts[i - 1].id, acts[i].id], text: `${formatDate(day)}${stage ? ` · ${stage}` : ''}: medzi „${acts[i - 1].title}“ a „${acts[i].title}“ je len ${gap} min na prestavbu` })
      }
    }
  }
  return warnings
}

/** Dni akcie od začiatku po koniec (harmonogram sa zadáva len v nich). */
export function eventDays(event: { startsOn: string; endsOn: string }) {
  const days: string[] = []
  const end = new Date(`${event.endsOn}T00:00:00Z`)
  for (let day = new Date(`${event.startsOn}T00:00:00Z`); day <= end && days.length < 60; day.setUTCDate(day.getUTCDate() + 1)) days.push(day.toISOString().slice(0, 10))
  return days.length > 0 ? days : [event.startsOn]
}
