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
