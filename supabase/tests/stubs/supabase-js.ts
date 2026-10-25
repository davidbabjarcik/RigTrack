// Náhrada supabase-js pre test funkcie send-push: tabuľky v pamäti a zapamätané zmeny.
type Row = Record<string, unknown>
export const tables: Record<string, Row[]> = {
  push_subscriptions: [],
  notifications: [],
}
export const updates: { table: string; values: Row; id: unknown }[] = []
export const deletes: { table: string; ids: unknown[] }[] = []

export function createClient() {
  return {
    from(table: string) {
      return {
        select() {
          return {
            eq(column: string, value: unknown) {
              return Promise.resolve({
                data: tables[table].filter((row) => row[column] === value),
                error: null,
              })
            },
          }
        },
        delete() {
          return {
            in(_column: string, ids: unknown[]) {
              deletes.push({ table, ids })
              return Promise.resolve({ error: null })
            },
          }
        },
        update(values: Row) {
          return {
            eq(_column: string, id: unknown) {
              updates.push({ table, values, id })
              return Promise.resolve({ error: null })
            },
          }
        },
      }
    },
  }
}
