/**
 * Chýba v databáze stĺpec (ešte nespustená migrácia)? Postgres vracia 42703, PostgREST pri zastaranej
 * schéme PGRST204/PGRST200; pre istotu sa pozrieme aj na názov stĺpca v správe.
 */
export function isMissingColumn(error: { code?: string; message?: string } | null | undefined, column: string) {
  if (!error) return false
  return error.code === '42703' || error.code === 'PGRST204' || error.code === 'PGRST200' || (error.message ?? '').includes(column)
}

/** Chýba v databáze tabuľka (ešte nespustená migrácia)? Postgres 42P01, PostgREST PGRST205. */
export function isMissingTable(error: { code?: string; message?: string } | null | undefined, table: string) {
  if (!error) return false
  return error.code === '42P01' || error.code === 'PGRST205' || ((error.message ?? '').includes(table) && /does not exist|could not find/i.test(error.message ?? ''))
}

/** Krátky technický dôvod chyby do hlášky (pomôže pri nahlásení chyby). */
export function errorDetail(error: unknown) {
  if (!error || typeof error !== 'object') return ''
  const { code, message } = error as { code?: string; message?: string }
  return [code, message].filter(Boolean).join(': ').slice(0, 200)
}
