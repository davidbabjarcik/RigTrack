// Kôš (0036_recycle_bin.sql): zmazané záznamy, ktoré sa dajú 30 dní obnoviť.

export const BIN_KINDS = ['equipment', 'consumable', 'case', 'photo', 'event_document', 'attachment'] as const
export type BinKind = (typeof BIN_KINDS)[number]

export const BIN_KIND_LABELS: Record<BinKind, string> = {
  equipment: 'Technika',
  consumable: 'Spotrebný materiál',
  case: 'Case',
  photo: 'Fotka',
  event_document: 'Dokument',
  attachment: 'Príloha',
}

/** Po koľkých dňoch sa položka z koša zmaže natrvalo. */
export const BIN_DAYS = 30

export type BinItem = {
  kind: BinKind
  id: string
  label: string
  detail: string
  deletedAt: string
  deletedByName: string
}

/** Koľko celých dní ešte položka v koši vydrží; 0 = zmaže sa pri najbližšom čistení. */
export function daysLeft(deletedAt: string, now: Date) {
  const passed = Math.floor((now.getTime() - Date.parse(deletedAt)) / 86_400_000)
  return Math.max(BIN_DAYS - passed, 0)
}

/** „zostáva 12 dní“ */
export function daysLeftLabel(days: number) {
  if (days === 0) return 'zmaže sa pri najbližšom čistení'
  return `zostáva ${days} ${days === 1 ? 'deň' : days < 5 ? 'dni' : 'dní'}`
}

/** Súbory zo Storage rozdelené po bucketoch; pri fotkách aj ich náhľad vedľa. */
export function filesByBucket(files: { bucket: string; path: string }[]) {
  const buckets = new Map<string, string[]>()
  for (const file of files) {
    if (!file.path) continue
    const paths = buckets.get(file.bucket) ?? []
    paths.push(file.path)
    if (file.bucket === 'equipment-photos' && file.path.endsWith('.jpg')) paths.push(file.path.replace(/\.jpg$/, '-thumb.jpg'))
    buckets.set(file.bucket, paths)
  }
  return buckets
}
