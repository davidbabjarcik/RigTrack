import { formatMoney } from '@/lib/format'
import { CURRENCIES, EMPTY_ITEM, type ItemMode, type OrderFormValues, type RememberedArticle } from '../model'
import type { ParsedInvoice } from './thomann'

/**
 * Predvyplní formulár objednávky z prečítanej faktúry.
 *
 * Pri tovare, ktorý už raz prišiel (podľa kódu), sa zopakuje minulé rozhodnutie:
 * spotrebný materiál sa znova nepridá do techniky, kusy evidované zvlášť sa znova
 * založia zvlášť a tovar na množstvo sa pripočíta k tej istej položke.
 * Nový tovar: 1 kus = samostatná položka, viac kusov = jedna položka s počtom.
 * Používateľ všetko pred uložením môže zmeniť.
 */
export function invoiceToFormValues(
  invoice: ParsedInvoice,
  remembered: Map<string, RememberedArticle>,
  today: string,
): OrderFormValues {
  const currency = CURRENCIES.find((code) => code === invoice.currency) ?? 'EUR'
  const noteParts = []
  if (invoice.discount > 0) {
    noteParts.push(`Ceny za kus sú po zľave (zľava na faktúre spolu ${formatMoney(invoice.discount, currency)}).`)
  }
  if (invoice.total !== null) noteParts.push(`Zaplatené podľa faktúry: ${formatMoney(invoice.total, currency)}.`)

  return {
    source: 'shop',
    supplier: invoice.supplier,
    seller: '',
    orderNumber: invoice.orderNumber,
    orderedAt: invoice.orderedAt ?? today,
    currency,
    note: noteParts.join(' '),
    items: invoice.items.map((item) => {
      const memory = remembered.get(item.articleNumber)
      let mode: ItemMode = item.quantity > 1 ? 'bulk' : 'separate'
      let equipmentId = ''
      if (memory?.mode === 'none' || memory?.mode === 'separate') {
        mode = memory.mode
      } else if (memory) {
        // Položka s počtom: pripočítať k nej, ak ešte existuje; inak ju založiť nanovo.
        mode = memory.equipmentId ? 'existing' : 'bulk'
        equipmentId = memory.equipmentId ?? ''
      }
      return {
        ...EMPTY_ITEM,
        name: item.name,
        articleNumber: item.articleNumber,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        mode,
        equipmentId,
        category: memory?.category ?? '',
      }
    }),
  }
}
