// Cenová ponuka s vlastnými časťami (0096): časti A, B, C… (aj A1, A2), ceny, zhrnutie a celková cena.
import type { Equipment } from '@/features/equipment/model'
import type { EventEquipment } from '@/features/events/model'
import { formatMoney } from '@/lib/format'

/** Riadok ceny v časti: technika zo skladu (cena z cenníka prenájmu) alebo vlastná položka (napr. doprava). */
export type OfferLine = { id: string; equipmentId: string | null; label: string; quantity: number; days: number; unitPrice: number }
/** Ako sa ráta cena časti: napísaná ručne, alebo súčet riadkov (technika a vlastné položky). */
export type PriceMode = 'manual' | 'lines'

export type OfferPart = {
  id: string
  title: string
  description: string
  /** Zoznam (napr. technika) – jeden riadok = jedna odrážka. */
  items: string
  /** „Cena zahŕňa: …“ */
  includes: string
  price: number | null
  /** Text namiesto ceny (napr. „podľa dopytu“). */
  priceNote: string
  priceMode: PriceMode
  lines: OfferLine[]
  /** Podčasti (A1, A2…) – len jedna úroveň. */
  parts: OfferPart[]
}
export type OfferClient = { name: string; address: string; ico: string; dic: string; contact: string }
/** Za koho sa ponuka vystavuje (s.r.o., živnosť…). */
export type OfferIssuer = { name: string; address: string; ico: string; dic: string; icDph: string; contact: string; vatPayer: boolean }
export const EMPTY_ISSUER: OfferIssuer = { name: '', address: '', ico: '', dic: '', icDph: '', contact: '', vatPayer: true }
export type VatMode = 'with' | 'plus' | 'none'
export type OfferStatus = 'draft' | 'sent' | 'accepted' | 'rejected'
export type Offer = {
  id: string
  eventId: string | null
  number: string
  status: OfferStatus
  client: OfferClient
  issuerId: string | null
  issuer: OfferIssuer
  /** Max. rozpočet klienta (null = bez limitu). */
  budget: number | null
  title: string
  place: string
  serviceDates: string
  issuedOn: string
  sections: OfferPart[]
  vatMode: VatMode
  vatPct: number
  totalOverride: number | null
  notes: string
  authorName: string
  updatedAt: string
  /** Odkaz pre klienta (0097): token, kedy a s akou poznámkou klient odpovedal. */
  shareToken?: string | null
  respondedAt?: string | null
  responseNote?: string
}

export const OFFER_STATUS_LABELS: Record<OfferStatus, string> = { draft: 'koncept', sent: 'poslaná', accepted: 'prijatá', rejected: 'odmietnutá' }
export const VAT_MODE_LABELS: Record<VatMode, string> = { with: 'Ceny s DPH', plus: 'Ceny + DPH', none: 'Bez DPH (neplatca)' }
export const EMPTY_CLIENT: OfferClient = { name: '', address: '', ico: '', dic: '', contact: '' }

const newId = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2))
export const emptyPart = (title = ''): OfferPart => ({ id: newId(), title, description: '', items: '', includes: '', price: null, priceNote: '', priceMode: 'manual', lines: [], parts: [] })
export const newLine = (patch: Partial<OfferLine> = {}): OfferLine => ({ id: newId(), equipmentId: null, label: '', quantity: 1, days: 1, unitPrice: 0, ...patch })

const round2 = (value: number) => Math.round(value * 100) / 100
export const lineTotal = (line: OfferLine) => round2(line.quantity * line.days * line.unitPrice)

/** Cena časti: ručná, alebo súčet riadkov. */
export function partPrice(part: Pick<OfferPart, 'price' | 'priceMode' | 'lines'>): number | null {
  if (part.priceMode === 'lines') return part.lines.length > 0 ? round2(part.lines.reduce((sum, line) => sum + lineTotal(line), 0)) : null
  return part.price
}

/** Doplní chýbajúce polia (staršie uložené ponuky, šablóny). */
export function normalizePart(part: Partial<OfferPart>): OfferPart {
  const base = emptyPart()
  return { ...base, ...part, id: part.id ?? base.id, lines: part.lines ?? [], priceMode: part.priceMode ?? 'manual', parts: (part.parts ?? []).map(normalizePart) }
}

/** Odrážky z riadkov časti („4 × Reprobox“). */
export const itemsFromLines = (lines: OfferLine[]) => lines.filter((line) => line.label.trim()).map((line) => `${line.quantity} × ${line.label.trim()}`).join('\n')

/** Číslo ponuky z dátumu vystavenia („2026-11-05“ → „20261105“). */
export const numberFromDate = (iso: string) => iso.replace(/-/g, '')

/** Označenie časti: A, B, C… a podčasti A1, A2… */
export function partCode(index: number, subIndex?: number) {
  const letter = String.fromCharCode(65 + (index % 26))
  return subIndex === undefined ? letter : `${letter}${subIndex + 1}`
}

/** „1 200,00 € s DPH“, „600,00 € + 23 % DPH“, alebo text namiesto ceny. */
export function priceLabel(part: Pick<OfferPart, 'price' | 'priceNote'> & Partial<Pick<OfferPart, 'priceMode' | 'lines'>>, vatMode: VatMode, vatPct: number) {
  const price = partPrice({ price: part.price, priceMode: part.priceMode ?? 'manual', lines: part.lines ?? [] })
  if (price === null) return part.priceNote.trim()
  const money = formatMoney(price, 'EUR')
  if (vatMode === 'with') return `${money} s DPH`
  if (vatMode === 'plus') return `${money} + ${String(vatPct).replace('.', ',')} % DPH`
  return money
}

export type SummaryRow = { code: string; title: string; price: number | null; priceNote: string }

/** Zhrnutie: každá časť a podčasť, ktorá má cenu alebo text ceny. */
export function summaryRows(sections: OfferPart[]): SummaryRow[] {
  const rows: SummaryRow[] = []
  sections.forEach((section, index) => {
    const price = partPrice(section)
    if (price !== null || section.priceNote.trim()) rows.push({ code: partCode(index), title: section.title, price, priceNote: section.priceNote })
    section.parts.forEach((part, subIndex) => {
      const subPrice = partPrice(part)
      if (subPrice !== null || part.priceNote.trim()) rows.push({ code: partCode(index, subIndex), title: part.title, price: subPrice, priceNote: part.priceNote })
    })
  })
  return rows
}

/** Súčet všetkých cien (časti aj podčasti). */
export function sumPrices(sections: OfferPart[]) {
  return Math.round(summaryRows(sections).reduce((sum, row) => sum + (row.price ?? 0), 0) * 100) / 100
}

/** Riadky „6 × Názov“ z techniky eventu (voliteľne len vybrané druhy), zoskupené podľa názvu. */
export function itemsFromEquipment(lines: EventEquipment[], equipment: Equipment[], kinds?: string[]) {
  const counts = new Map<string, number>()
  for (const line of lines) {
    const item = equipment.find((candidate) => candidate.id === line.equipmentId)
    if (!item || (kinds && kinds.length > 0 && !kinds.includes(item.kind))) continue
    const name = [item.manufacturer, item.model].filter(Boolean).join(' ') || item.name
    counts.set(name, (counts.get(name) ?? 0) + line.quantity)
  }
  return [...counts]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'sk'))
    .map(([name, count]) => `${count} × ${name}`)
    .join('\n')
}

/** Odrážky z textu: prázdne riadky sa vynechajú, úvodné „-“ / „•“ sa odstránia. */
export const bulletLines = (items: string) =>
  items
    .split('\n')
    .map((line) => line.replace(/^\s*[-•*]\s*/, '').trim())
    .filter(Boolean)
