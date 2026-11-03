// Hľadať všade: jedno políčko na Prehľade cez techniku, cases, eventy, firmy, kontakty, úlohy, poznámky a sklad.
// Hľadá sa bez ohľadu na veľkosť písmen a diakritiku; každé slovo musí niekde sedieť. „#7“ nájde kus číslo 7.

export type SearchHit = { id: string; title: string; detail: string; to: string }
export type SearchGroup = { kind: SearchKind; label: string; hits: SearchHit[]; more: number }
export type SearchKind = 'equipment' | 'cases' | 'events' | 'partners' | 'contacts' | 'tasks' | 'notes' | 'spots'

export const SEARCH_LABELS: Record<SearchKind, string> = {
  equipment: 'Technika',
  cases: 'Cases a racks',
  events: 'Eventy',
  partners: 'Firmy',
  contacts: 'Kontakty',
  tasks: 'Úlohy',
  notes: 'Poznámky',
  spots: 'Sklad',
}

type EquipmentLike = { id: string; name: string; manufacturer: string; model: string; serialNumber: string; inventoryNumber: string; caseId: string | null; quantity: number; trackUnits: boolean; unitIds: number[] }
type CaseLike = { id: string; name: string; inventoryNumber: string; labelNumber: string; title: string }
type EventLike = { id: string; name: string; venue: string; startsOn: string; status: string }
type PartnerLike = { id: string; name: string; legalName: string; ico: string; contacts: { id: string; name: string; role: string; phone: string; email: string }[] }
type TaskLike = { id: string; title: string; note: string; status: string }
type NoteLike = { id: string; title: string; body: string }
type SpotLike = { id: string; name: string; note?: string; kind: string }

export type SearchSources = {
  equipment?: EquipmentLike[]
  cases?: CaseLike[]
  events?: EventLike[]
  partners?: PartnerLike[]
  tasks?: TaskLike[]
  notes?: NoteLike[]
  spots?: SpotLike[]
  /** Názov case podľa id (pri technike „v K10 Case #3“). */
  caseName?: (id: string) => string
  /** Dátum na zobrazenie (napr. 3. 11. 2026). */
  date?: (iso: string) => string
}

export const plain = (text: string) => text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()

const PER_GROUP = 6
const STRUCTURES = new Set(['column', 'wall', 'door', 'window', 'room'])

/** Výsledky po skupinách (prázdne skupiny vynechané); dopyt kratší ako 2 znaky nič nehľadá. */
export function searchAll(query: string, sources: SearchSources): SearchGroup[] {
  const words = plain(query.trim()).split(/\s+/).filter(Boolean)
  if (words.join('').length < 2) return []
  // „#7“ (alebo „#7 beam“): číslo kusu techniky evidovanej po kusoch.
  const unitWord = words.find((word) => /^#\d+$/.test(word))
  const unit = unitWord ? Number(unitWord.slice(1)) : null
  const textWords = words.filter((word) => word !== unitWord)
  const matches = (...fields: (string | undefined)[]) => {
    const haystack = plain(fields.filter(Boolean).join(' '))
    return textWords.every((word) => haystack.includes(word))
  }
  const date = sources.date ?? ((iso: string) => iso)
  const groups: { kind: SearchKind; hits: SearchHit[] }[] = []

  const equipment = (sources.equipment ?? []).flatMap((item): SearchHit[] => {
    const where = item.caseId ? `v ${sources.caseName?.(item.caseId) || 'case'}` : 'mimo case'
    if (unit !== null) {
      const units = item.unitIds.length > 0 ? item.unitIds : Array.from({ length: item.quantity }, (_, index) => index + 1)
      if (!item.trackUnits || !units.includes(unit) || !matches(item.name, item.manufacturer, item.model)) return []
      return [{ id: `${item.id}#${unit}`, title: `${item.name} #${unit}`, detail: where, to: `/equipment/${item.id}?unit=${unit}` }]
    }
    if (!matches(item.name, item.manufacturer, item.model, item.serialNumber, item.inventoryNumber)) return []
    const detail = [item.quantity > 1 ? `${item.quantity} ks` : '', where, item.inventoryNumber && `inv. ${item.inventoryNumber}`].filter(Boolean).join(' · ')
    return [{ id: item.id, title: item.name, detail, to: `/equipment/${item.id}` }]
  })
  groups.push({ kind: 'equipment', hits: equipment })
  if (unit !== null) return finish(groups)

  groups.push({
    kind: 'cases',
    hits: (sources.cases ?? [])
      .filter((item) => matches(item.title, item.name, item.inventoryNumber, item.labelNumber && `#${item.labelNumber}`))
      .map((item) => ({ id: item.id, title: item.title, detail: item.inventoryNumber ? `inv. ${item.inventoryNumber}` : '', to: `/cases/${item.id}` })),
  })
  groups.push({
    kind: 'events',
    hits: (sources.events ?? [])
      .filter((item) => item.status !== 'cancelled' && matches(item.name, item.venue))
      .sort((a, b) => b.startsOn.localeCompare(a.startsOn))
      .map((item) => ({ id: item.id, title: item.name, detail: [date(item.startsOn), item.venue].filter(Boolean).join(' · '), to: `/events/${item.id}` })),
  })
  groups.push({
    kind: 'partners',
    hits: (sources.partners ?? [])
      .filter((item) => matches(item.name, item.legalName, item.ico))
      .map((item) => ({ id: item.id, title: item.name, detail: [item.legalName !== item.name && item.legalName, item.ico && `IČO ${item.ico}`].filter(Boolean).join(' · '), to: `/partners/${item.id}` })),
  })
  groups.push({
    kind: 'contacts',
    hits: (sources.partners ?? []).flatMap((partner) =>
      partner.contacts
        .filter((contact) => matches(contact.name, contact.role, contact.phone, contact.email, partner.name))
        .map((contact) => ({ id: contact.id, title: contact.name, detail: [contact.role, partner.name, contact.phone].filter(Boolean).join(' · '), to: `/partners/${partner.id}` })),
    ),
  })
  groups.push({
    kind: 'tasks',
    hits: (sources.tasks ?? [])
      .filter((item) => matches(item.title, item.note))
      .sort((a, b) => Number(a.status === 'done') - Number(b.status === 'done'))
      .map((item) => ({ id: item.id, title: item.title, detail: item.status === 'done' ? 'hotová' : '', to: '/todos' })),
  })
  groups.push({
    kind: 'notes',
    hits: (sources.notes ?? [])
      .filter((item) => matches(item.title, item.body))
      .map((item) => ({ id: item.id, title: item.title || item.body.split('\n')[0].slice(0, 80) || 'Poznámka', detail: '', to: '/notes' })),
  })
  groups.push({
    kind: 'spots',
    hits: (sources.spots ?? [])
      .filter((item) => !STRUCTURES.has(item.kind) && matches(item.name, item.note))
      .map((item) => ({ id: item.id, title: item.name, detail: 'miesto v sklade', to: `/warehouse?spot=${item.id}` })),
  })
  return finish(groups)
}

function finish(groups: { kind: SearchKind; hits: SearchHit[] }[]): SearchGroup[] {
  return groups
    .filter((group) => group.hits.length > 0)
    .map((group) => ({ kind: group.kind, label: SEARCH_LABELS[group.kind], hits: group.hits.slice(0, PER_GROUP), more: Math.max(0, group.hits.length - PER_GROUP) }))
}
