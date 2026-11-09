/** Platnosť niečoho s dátumom „platí do“ (licencia, certifikát): bez dátumu, platí, čoskoro končí (do 30 dní), skončila. */
export type Validity = 'none' | 'ok' | 'soon' | 'expired'

export const SOON_DAYS = 30

export function validity(until: string | null, today: string): Validity {
  if (!until) return 'none'
  if (until < today) return 'expired'
  const [y, m, d] = today.split('-').map(Number)
  const limit = new Date(Date.UTC(y, m - 1, d + SOON_DAYS)).toISOString().slice(0, 10)
  return until <= limit ? 'soon' : 'ok'
}

export const VALIDITY_CLASS: Record<Validity, string> = {
  none: 'text-muted-foreground',
  ok: 'text-muted-foreground',
  soon: 'text-amber-700 dark:text-amber-400',
  expired: 'text-destructive',
}
