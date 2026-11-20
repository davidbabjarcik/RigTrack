import { sumPrices, type Offer } from '@/features/offers/model'
// Zmluva k eventu: vzor zmluvy o technickom zabezpečení podujatia (alebo o prenájme techniky) z údajov eventu,
// dodávateľa (vystavovateľ z cenových ponúk) a objednávateľa (organizátor z Firmy a kontakty).
// Nič sa neukladá – údaje sa vyplnia pri tlači. Je to vzor, nie právna rada.

export type ContractKind = 'service' | 'rental'
export const CONTRACT_KIND_LABELS: Record<ContractKind, string> = {
  service: 'Zmluva o technickom zabezpečení podujatia',
  rental: 'Zmluva o prenájme techniky',
}

export type ContractParty = { name: string; address: string; ico: string; dic: string; icDph: string; representative: string }
export const EMPTY_PARTY: ContractParty = { name: '', address: '', ico: '', dic: '', icDph: '', representative: '' }

export type VatNote = 'with' | 'plus' | 'none'
export const VAT_NOTE_LABELS: Record<VatNote, string> = {
  with: 'vrátane DPH',
  plus: 'bez DPH, DPH sa pripočíta podľa platných predpisov',
  none: 'dodávateľ nie je platiteľom DPH',
}

export type ContractTerms = {
  kind: ContractKind
  price: number | null
  vat: VatNote
  deposit: number | null
  dueDays: number
  /** Storno podmienky, každá na riadok. */
  cancellation: string
  /** Doplňujúce dojednania. */
  extra: string
  place: string
  withEquipment: boolean
}

export const DEFAULT_CANCELLATION = [
  'pri zrušení skôr ako 30 dní pred podujatím bez poplatku (záloha sa vráti),',
  'pri zrušení 14 až 30 dní pred podujatím 50 % z ceny,',
  'pri zrušení menej ako 14 dní pred podujatím 100 % z ceny.',
].join('\n')

export const DEFAULT_TERMS: ContractTerms = {
  kind: 'service',
  price: null,
  vat: 'plus',
  deposit: null,
  dueDays: 14,
  cancellation: DEFAULT_CANCELLATION,
  extra: '',
  place: '',
  withEquipment: true,
}

/** „1 234,50 €“; bez sumy čiara na dopísanie perom. */
export function money(amount: number | null) {
  if (amount === null || !Number.isFinite(amount)) return '______________ €'
  return `${amount.toLocaleString('sk-SK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`
}

/** Údaje strany do jedného riadku: sídlo, IČO, DIČ, IČ DPH, zastúpenie. */
export function partyLines(party: ContractParty) {
  return [
    party.address && `sídlo / miesto podnikania: ${party.address}`,
    [party.ico && `IČO: ${party.ico}`, party.dic && `DIČ: ${party.dic}`, party.icDph && `IČ DPH: ${party.icDph}`].filter(Boolean).join(', '),
    party.representative && `zastúpený: ${party.representative}`,
  ].filter(Boolean) as string[]
}

/** Platobné podmienky ako body zmluvy. */
export function paymentPoints(terms: Pick<ContractTerms, 'price' | 'vat' | 'deposit' | 'dueDays'>, client = 'Objednávateľ') {
  const points = [`Cena za plnenie podľa tejto zmluvy je dohodou zmluvných strán ${money(terms.price)} (${VAT_NOTE_LABELS[terms.vat]}).`]
  if (terms.deposit !== null && terms.deposit > 0) {
    points.push(`${client} zaplatí zálohu ${money(terms.deposit)} najneskôr 7 dní pred začiatkom podujatia; záloha sa započíta do ceny.`)
  }
  points.push(`Zvyšok ceny ${client.toLowerCase()} zaplatí na základe faktúry so splatnosťou ${terms.dueDays} dní od jej vystavenia.`)
  points.push('V cene nie sú zahrnuté služby a materiál nad rámec tejto zmluvy, ak sa zmluvné strany nedohodnú inak.')
  return points
}

/** Čo je predmetom zmluvy – údaje z eventu v čase uloženia (neskoršia zmena eventu uloženú zmluvu nezmení). */
export type ContractSubject = { eventName: string; when: string; venue: string; times: string; getIn: string; power: string; gear: string[]; dj: boolean }

/** Celý obsah zmluvy, ako sa ukladá (0177). */
export type ContractSnapshot = { supplier: ContractParty; client: ContractParty; terms: ContractTerms; subject: ContractSubject; createdOn: string }

/** Cena z cenovej ponuky k eventu: prijatá, inak posledná; suma ponuky (alebo ručne zadaná celková). */
export function offerPrice(offers: Offer[], eventId: string) {
  const mine = offers.filter((offer) => offer.eventId === eventId && offer.status !== 'rejected')
  const offer = mine.find((candidate) => candidate.status === 'accepted') ?? [...mine].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0]
  if (!offer) return null
  const price = offer.totalOverride ?? sumPrices(offer.sections)
  return price > 0 ? { price, vat: offer.vatMode as VatNote, number: offer.number, accepted: offer.status === 'accepted' } : null
}
