// Pack list bez signálu: odškrtnutia sa ukladajú do telefónu (fronta) a odošlú sa, keď sa chytí sieť.
// Posledný načítaný pack list sa pamätá, aby sa dal otvoriť aj offline.
import type { PackCheck, PackPhase } from './api'
import type { PackRow } from './model'

export type PendingTick = { rowKey: string; equipmentId?: string; caseId?: string; phase: PackPhase; checked: boolean; at: string }
export type PackSnapshot = { eventName: string; startsOn: string; rows: PackRow[]; checks: PackCheck[]; canTick: boolean; savedAt: string }

const queueKey = (eventId: string) => `rigtrack.pack.queue.${eventId}`
const snapshotKey = (eventId: string) => `rigtrack.pack.snapshot.${eventId}`

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}
function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Bez úložiska sa zmena len nepodrží po zatvorení appky.
  }
}

export const readQueue = (eventId: string) => read<PendingTick[]>(queueKey(eventId), [])
export const writeQueue = (eventId: string, queue: PendingTick[]) => write(queueKey(eventId), queue)
/** Naskenované kusy (QR kusu #7) čakajúce na odoslanie – aj bez signálu. */
export type PendingUnit = { equipmentId: string; unit: number; phase: PackPhase }
const unitQueueKey = (eventId: string) => `rigtrack.pack.units.${eventId}`
export const readUnitQueue = (eventId: string) => read<PendingUnit[]>(unitQueueKey(eventId), [])
export const writeUnitQueue = (eventId: string, queue: PendingUnit[]) => write(unitQueueKey(eventId), queue)
/** Pridá kus do fronty (ten istý kus v tej istej fáze len raz). */
export const enqueueUnit = (queue: PendingUnit[], unit: PendingUnit) =>
  queue.some((item) => item.equipmentId === unit.equipmentId && item.unit === unit.unit && item.phase === unit.phase) ? queue : [...queue, unit]

export const readSnapshot = (eventId: string) => read<PackSnapshot | null>(snapshotKey(eventId), null)
export const writeSnapshot = (eventId: string, snapshot: PackSnapshot) => write(snapshotKey(eventId), snapshot)

/** Pridá zmenu do fronty; novšia zmena toho istého riadku a fázy nahradí staršiu. */
export function enqueue(queue: PendingTick[], tick: PendingTick): PendingTick[] {
  return [...queue.filter((item) => !(item.rowKey === tick.rowKey && item.phase === tick.phase)), tick]
}

/**
 * Čo ukázať: odškrtnutia z databázy upravené čakajúcimi zmenami. Čakajúce odškrtnutie má id „pending“
 * (ukáže sa ako „čaká na odoslanie“), čakajúce zrušenie odškrtnutie skryje.
 */
export function mergeChecks(server: PackCheck[], queue: PendingTick[]): PackCheck[] {
  const same = (check: PackCheck, tick: PendingTick) => check.phase === tick.phase && (tick.caseId ? check.caseId === tick.caseId : check.equipmentId === tick.equipmentId)
  const kept = server.filter((check) => !queue.some((tick) => same(check, tick)))
  const pending = queue
    .filter((tick) => tick.checked)
    .map((tick) => server.find((check) => same(check, tick)) ?? { id: 'pending', equipmentId: tick.equipmentId ?? null, caseId: tick.caseId ?? null, phase: tick.phase, checkedByName: 'čaká na odoslanie', checkedAt: tick.at })
  return [...kept, ...pending]
}

/** Je chyba spôsobená výpadkom siete (zmena ostane vo fronte)? */
export const isNetworkError = (error: unknown) =>
  !navigator.onLine || (error instanceof TypeError && /fetch|network|load failed/i.test(error.message)) || /Failed to fetch|NetworkError/i.test(String((error as { message?: string })?.message ?? ''))
