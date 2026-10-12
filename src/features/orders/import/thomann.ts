// Čítanie faktúry Thomann z textových riadkov PDF (anglická šablóna „Invoice Nr.“).
// Riadok položky vyzerá takto:  001.00 358334 12 piece 4,80 EUR 57,60 EUR
// Za ním môže byť riadková zľava („3,00 % -2,39 EUR“) a jeden či viac riadkov popisu.
// Zľava býva aj spoločná pre celú faktúru („3,00 % Discount: -13,64 EUR“).

export type ParsedItem = {
  articleNumber: string
  name: string
  quantity: number
  /** Cena za kus po všetkých zľavách — toľko kus naozaj stál. */
  unitPrice: number
  /** Cena za kus tak, ako je vytlačená na faktúre. */
  listPrice: number
}

export type ParsedInvoice = {
  supplier: string
  orderNumber: string
  orderedAt: string | null
  currency: string
  items: ParsedItem[]
  /** Súčet všetkých zliav na faktúre (riadkových aj spoločnej). */
  discount: number
  /** Zaplatená suma podľa faktúry. */
  total: number | null
}

const ITEM = /^\d{3}\.\d{2}\s+(\S+)\s+(\d+)\s+\S+\s+([\d.,]+)\s+([A-Z]{3})\s+[\d.,]+\s+[A-Z]{3}$/
const LINE_DISCOUNT = /^[\d.,]+\s*%\s+-\s*([\d.,]+)\s+[A-Z]{3}$/
const INVOICE_DISCOUNT = /^([\d.,]+)\s*%\s*Discount:\s*-\s*([\d.,]+)/
// Riadky, ktorými sa končí popis položky: medzisúčet, súčty, pätička a hlavička ďalšej strany.
const END_OF_ITEM = /^(Amount carried forward|Value of goods|Thomann GmbH|Pos\.\s+Article|#_|Invoice Nr\.|Page \d+ of)/
const NAME_LIMIT = 60

/** „1.234,56“ → 1234.56 */
function amount(value: string) {
  return Number(value.replace(/\./g, '').replace(',', '.'))
}

const round2 = (value: number) => Math.round(value * 100) / 100

/**
 * Popis na faktúre je celý odsek: „Výrobca Model - opis, ďalšie parametre…“.
 * Názov je jeho začiatok po prvú čiarku, bodkočiarku alebo pomlčku s medzerou;
 * ak je aj tak dlhý, skráti sa na koniec prvej vety.
 */
export function shortName(description: string) {
  let name = description.split(/[,;]|\s*-\s+/)[0].trim()
  if (name.length > NAME_LIMIT) {
    const sentenceEnd = name.search(/\.\s+\p{Lu}/u)
    if (sentenceEnd > 0) name = name.slice(0, sentenceEnd)
  }
  return name.slice(0, 200).trim()
}

export function looksLikeThomann(lines: string[]) {
  return lines.some((line) => line.includes('Thomann GmbH'))
}

type RawItem = { articleNumber: string; quantity: number; listPrice: number; lineDiscount: number; description: string[] }

export function parseThomannInvoice(rawLines: string[]): ParsedInvoice {
  const lines = rawLines.map((line) => line.trim())
  const raw: RawItem[] = []
  let current: RawItem | null = null
  let currency = 'EUR'

  for (const line of lines) {
    const item = ITEM.exec(line)
    if (item) {
      current = { articleNumber: item[1], quantity: Number(item[2]), listPrice: amount(item[3]), lineDiscount: 0, description: [] }
      currency = item[4]
      raw.push(current)
    } else if (current) {
      const lineDiscount = LINE_DISCOUNT.exec(line)
      if (lineDiscount) current.lineDiscount += amount(lineDiscount[1])
      else if (END_OF_ITEM.test(line)) current = null
      else current.description.push(line)
    }
  }

  const find = (pattern: RegExp) => {
    for (const line of lines) {
      const match = pattern.exec(line)
      if (match) return match
    }
    return null
  }
  const invoice = find(/Invoice Nr\.:\s*(\d+)/)
  const date = find(/^Date:\s*(\d{2})\.(\d{2})\.(\d{4})/)
  const invoiceDiscount = find(INVOICE_DISCOUNT)
  const percent = invoiceDiscount ? amount(invoiceDiscount[1]) : 0

  // Zaplatená suma je na riadku za „Method of payment:“ (napr. „Visa Card 441,19 EUR“).
  const paymentLine = lines[lines.findIndex((line) => line.startsWith('Method of payment')) + 1] ?? ''
  const paid = /([\d.,]+) [A-Z]{3}$/.exec(paymentLine)

  const items = raw.map((item) => {
    const afterLineDiscount = item.quantity * item.listPrice - item.lineDiscount
    return {
      articleNumber: item.articleNumber,
      name: shortName(item.description.join(' ')) || `Tovar ${item.articleNumber}`,
      quantity: item.quantity,
      unitPrice: round2((afterLineDiscount * (1 - percent / 100)) / item.quantity),
      listPrice: item.listPrice,
    }
  })

  return {
    supplier: 'Thomann',
    orderNumber: invoice?.[1] ?? '',
    orderedAt: date ? `${date[3]}-${date[2]}-${date[1]}` : null,
    currency,
    items,
    discount: round2(raw.reduce((sum, item) => sum + item.lineDiscount, 0) + (invoiceDiscount ? amount(invoiceDiscount[2]) : 0)),
    total: paid ? amount(paid[1]) : null,
  }
}
