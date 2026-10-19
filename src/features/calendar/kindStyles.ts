import type { EntryKind } from './model'

/** Farba každého druhu termínu: bodka, ikona a podfarbený štítok. Rovnaká v zozname aj v mriežke. */
export const KIND_STYLES: Record<EntryKind, { dot: string; text: string; chip: string; bar: string }> = {
  event: {
    dot: 'bg-violet-500',
    text: 'text-violet-600 dark:text-violet-400',
    chip: 'bg-violet-500/15 text-violet-800 dark:text-violet-200',
    bar: 'border-l-violet-500',
  },
  loan: {
    dot: 'bg-sky-500',
    text: 'text-sky-600 dark:text-sky-400',
    chip: 'bg-sky-500/15 text-sky-800 dark:text-sky-200',
    bar: 'border-l-sky-500',
  },
  vehicle: {
    dot: 'bg-amber-500',
    text: 'text-amber-600 dark:text-amber-400',
    chip: 'bg-amber-500/15 text-amber-800 dark:text-amber-200',
    bar: 'border-l-amber-500',
  },
  task: {
    dot: 'bg-emerald-500',
    text: 'text-emerald-600 dark:text-emerald-400',
    chip: 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-200',
    bar: 'border-l-emerald-500',
  },
  service: {
    dot: 'bg-rose-500',
    text: 'text-rose-600 dark:text-rose-400',
    chip: 'bg-rose-500/15 text-rose-800 dark:text-rose-200',
    bar: 'border-l-rose-500',
  },
  celebration: {
    dot: 'bg-pink-500',
    text: 'text-pink-600 dark:text-pink-400',
    chip: 'bg-pink-500/15 text-pink-800 dark:text-pink-200',
    bar: 'border-l-pink-500',
  },
  away: {
    dot: 'bg-orange-500',
    text: 'text-orange-600 dark:text-orange-400',
    chip: 'bg-orange-500/15 text-orange-800 dark:text-orange-200',
    bar: 'border-l-orange-500',
  },
  shopping: {
    dot: 'bg-neutral-400',
    text: 'text-neutral-500 dark:text-neutral-400',
    chip: 'bg-neutral-500/15 text-neutral-700 dark:text-neutral-200',
    bar: 'border-l-neutral-400',
  },
}
