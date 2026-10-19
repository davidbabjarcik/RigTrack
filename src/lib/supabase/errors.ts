/**
 * Chýba v databáze stĺpec (ešte nespustená migrácia)? Postgres vracia 42703, PostgREST pri zastaranej
 * schéme PGRST204/PGRST200; pre istotu sa pozrieme aj na názov stĺpca v správe.
 */
export function isMissingColumn(error: { code?: string; message?: string } | null | undefined, column: string) {
  if (!error) return false
  return error.code === '42703' || error.code === 'PGRST204' || error.code === 'PGRST200' || (error.message ?? '').includes(column)
}

/** Krátky technický dôvod chyby do hlášky (pomôže pri nahlásení chyby). */
export function errorDetail(error: unknown) {
  if (!error || typeof error !== 'object') return ''
  const { code, message } = error as { code?: string; message?: string }
  return [code, message].filter(Boolean).join(': ').slice(0, 200)
}
