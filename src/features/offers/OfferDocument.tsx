import { formatDate, formatMoney } from '@/lib/format'
import { bulletLines, partCode, priceLabel, sumPrices, summaryRows, type Offer, type OfferPart } from './model'

const vatLabel = (offer: Pick<Offer, 'vatMode' | 'vatPct'>) =>
  offer.vatMode === 'with' ? 's DPH' : offer.vatMode === 'plus' ? `+ ${String(offer.vatPct).replace('.', ',')} % DPH` : ''

function PartBlock({ part, code, offer, sub }: { part: OfferPart; code: string; offer: Offer; sub?: boolean }) {
  const items = bulletLines(part.items)
  const price = priceLabel(part, offer.vatMode, offer.vatPct)
  return (
    <section className={sub ? 'mt-3 ml-4 break-inside-avoid' : 'mt-5 break-inside-avoid'}>
      <h3 className={sub ? 'text-sm font-bold' : 'border-b border-neutral-300 pb-1 text-base font-bold'}>
        {code}. {part.title}
      </h3>
      {part.description && <p className="mt-1 text-sm whitespace-pre-wrap">{part.description}</p>}
      {items.length > 0 && (
        <ul className="mt-1 list-disc pl-5 text-sm">
          {items.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      )}
      {part.includes && (
        <p className="mt-1 text-sm">
          <span className="font-semibold">Cena zahŕňa:</span> {part.includes}
        </p>
      )}
      {price && (
        <p className="mt-1 text-sm font-bold">
          Cena za časť {code}: {price}
        </p>
      )}
    </section>
  )
}

/** Cenová ponuka na A4: hlavička, pre koho, časti, zhrnutie, celková cena a poznámky. */
export function OfferDocument({ offer, logoUrl }: { offer: Offer; logoUrl?: string }) {
  const rows = summaryRows(offer.sections)
  const sum = sumPrices(offer.sections)
  const total = offer.totalOverride ?? sum
  const issuer = offer.issuer
  const money = (value: number) => formatMoney(value, 'EUR')
  return (
    <article className="mx-auto max-w-[190mm] text-black">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-black pb-3">
        <div className="flex items-center gap-3">
          {logoUrl && <img src={logoUrl} alt="" className="h-14 max-w-40 object-contain" />}
          <div>
            <h1 className="text-2xl font-bold tracking-wide">CENOVÁ PONUKA</h1>
            {offer.number && <p className="text-sm">č. {offer.number}</p>}
          </div>
        </div>
        <div className="text-right text-sm">
          <p className="font-semibold">{issuer.name}</p>
          {issuer.address && <p className="whitespace-pre-line">{issuer.address}</p>}
          {issuer.ico && <p>IČO: {issuer.ico}</p>}
          {issuer.dic && <p>DIČ: {issuer.dic}</p>}
          {issuer.icDph && <p>IČ DPH: {issuer.icDph}</p>}
          {!issuer.vatPayer && <p>Nie je platiteľ DPH</p>}
          {issuer.contact && <p className="whitespace-pre-line">{issuer.contact}</p>}
        </div>
      </header>

      <div className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
        <div>
          <p className="text-xs font-semibold tracking-wide text-neutral-600 uppercase">Ponuka pre</p>
          <p className="font-semibold">{offer.client.name || '—'}</p>
          {offer.client.address && <p className="whitespace-pre-line">{offer.client.address}</p>}
          {offer.client.ico && <p>IČO: {offer.client.ico}</p>}
          {offer.client.dic && <p>DIČ: {offer.client.dic}</p>}
          {offer.client.contact && <p>{offer.client.contact}</p>}
        </div>
        <div className="sm:text-right">
          {offer.title && <p className="text-base font-semibold">{offer.title}</p>}
          {offer.place && <p>Miesto dodania: {offer.place}</p>}
          {offer.serviceDates && <p>Termín dodania: {offer.serviceDates}</p>}
          <p>Dátum vystavenia: {formatDate(offer.issuedOn)}</p>
        </div>
      </div>

      {offer.sections.map((section, index) => (
        <div key={section.id}>
          <PartBlock part={section} code={partCode(index)} offer={offer} />
          {section.parts.map((part, subIndex) => (
            <PartBlock key={part.id} part={part} code={partCode(index, subIndex)} offer={offer} sub />
          ))}
        </div>
      ))}

      {(rows.length > 1 || offer.totalOverride !== null) && (
        <section className="mt-6 break-inside-avoid">
          <h3 className="border-b border-neutral-300 pb-1 text-base font-bold">Zhrnutie</h3>
          <table className="mt-2 w-full text-sm">
            <tbody>
              {rows.map((row) => (
                <tr key={row.code} className="border-b border-neutral-200">
                  <td className="w-12 py-1 font-semibold">{row.code}</td>
                  <td className="py-1">{row.title}</td>
                  <td className="py-1 text-right whitespace-nowrap">{row.price === null ? row.priceNote : `${money(row.price)} ${vatLabel(offer)}`}</td>
                </tr>
              ))}
              {sum > 0 && (
                <tr className={offer.totalOverride !== null ? 'text-neutral-500' : 'font-bold'}>
                  <td className="py-1.5" />
                  <td className="py-1.5">Spolu</td>
                  <td className={`py-1.5 text-right whitespace-nowrap ${offer.totalOverride !== null ? 'line-through' : ''}`}>
                    {money(sum)} {vatLabel(offer)}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      )}

      {total > 0 && (
        <p className="mt-4 rounded border-2 border-black px-3 py-2 text-right text-base font-bold break-inside-avoid">
          {offer.totalOverride !== null ? 'Celková cena (zvýhodnená)' : 'Celková cena'}: {money(total)} {vatLabel(offer)}
        </p>
      )}

      {offer.notes && <p className="mt-5 text-sm whitespace-pre-wrap">{offer.notes}</p>}

      {offer.authorName && (
        <p className="mt-8 text-sm">
          Vyhotovil: <span className="font-semibold">{offer.authorName}</span>
        </p>
      )}
    </article>
  )
}
