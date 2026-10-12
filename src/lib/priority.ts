// Priorita úloh a nákupov; poradie je od najdôležitejšej.
export const PRIORITIES = ['high', 'normal', 'low'] as const
export type Priority = (typeof PRIORITIES)[number]

export const PRIORITY_LABELS: Record<Priority, string> = {
  high: 'Vysoká',
  normal: 'Bežná',
  low: 'Nízka',
}

export function priorityRank(priority: Priority) {
  return PRIORITIES.indexOf(priority)
}
