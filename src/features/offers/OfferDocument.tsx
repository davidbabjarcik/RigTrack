import { formatDate, formatMoney } from '@/lib/format'
import { splitContact, bulletLines, partCode, priceLabel, sumPrices, summaryRows, type Offer, type OfferPart } from './model'

// Rozloženie ako bežná firemná ponuka: nadpis s číslom, vpravo dodávateľ, „Ponuka pre“, údaje o podujatí,
// časti A., B. s popisom, zoznamom, „Cena zahŕňa“ a „Cena za časť“, celková cena, zhrnutie a „Vyhotovil“.
const vatText = (offer: Pick<Offer, 'vatMode' | 'vatPct'>) =>
  offer.vatMode === 'with' ? 's DPH' : offer.vatMode === 'plus' ? `+ ${String(offer.vatPct).replace('.', ',')}% DPH` : ''

function PartBlock({ part, code, offer, sub }: { part: OfferPart; code: string; offer: Offer; sub?: boolean }) {
  const items = bulletLines(part.items)
  const price = priceLabel(part, offer.vatMode, offer.vatPct)
  return (
    <section className={sub ? 'mt-3 break-inside-avoid' : 'mt-6 break-inside-avoid'}>
      <h2 className={sub ? 'text-[13px] font-bold' : 'text-[15px] font-bold'}>
        {sub ? `${code} - ${part.title}` : `${code}. ${part.title}`}
      </h2>
      {part.description && <p className="mt-1 whitespace-pre-wrap">{part.description}</p>}
      {items.length > 0 && (
        <ul className="mt-1.5 list-disc pl-6">
          {items.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      )}
      {part.includes && (
        <p className="mt-2">
          <span className="font-bold">Cena zahŕňa:</span> {part.includes}
        </p>
      )}
      {price && (
        <p className="mt-2 font-bold">
          Cena za časť {code}: {price}
        </p>
      )}
    </section>
  )
}

/** Cenová ponuka na tlač / PDF. */
export function OfferDocument({ offer, logoUrl }: { offer: Offer; logoUrl?: string }) {
  const rows = summaryRows(offer.sections)
  const sum = sumPrices(offer.sections)
  const total = offer.totalOverride ?? sum
  const issuer = offer.issuer
  const money = (value: number) => formatMoney(value, 'EUR')
  const codes = offer.sections.map((_, index) => partCode(index))
  const { phone, email, web, other: otherContact } = splitContact(issuer.contact)

  return (
    <article className="mx-auto max-w-[190mm] font-[Arial,Helvetica,sans-serif] text-[12px] leading-[1.45] text-black">
      <header className="flex items-start justify-between gap-8">
        <div>
          {logoUrl && <img src={logoUrl} alt="" className="mb-3 h-14 max-w-44 object-contain" />}
          <h1 className="text-[22px] font-bold tracking-wide">
            CENOVÁ PONUKA {offer.number && <span className="ml-2 font-normal">{offer.number}</span>}
          </h1>
        </div>
        <div className="text-right">
          <p className="font-bold">{issuer.name}</p>
          {issuer.address && <p className="whitespace-pre-line">{issuer.address}</p>}
          {issuer.ico && <p>IČO: {issuer.ico}</p>}
          {issuer.dic && <p>DIČ: {issuer.dic}</p>}
          {issuer.vatPayer && issuer.icDph && <p>IČ DPH: {issuer.icDph}</p>}
          {!issuer.vatPayer && <p>Nie je platiteľ DPH</p>}
          {phone && <p>TELEFÓN: {phone}</p>}
          {email && <p>EMAIL: {email}</p>}
          {web && <p>WEB: {web}</p>}
          {otherContact.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      </header>

      <hr className="my-4 border-black" />

      <div className="flex flex-wrap justify-between gap-6">
        <div>
          <p className="font-bold">Ponuka pre:</p>
          <p className="font-bold">{offer.client.name || '—'}</p>
          {offer.client.address && <p className="whitespace-pre-line">{offer.client.address}</p>}
          {offer.client.ico && <p>IČO: {offer.client.ico}</p>}
          {offer.client.dic && <p>DIČ: {offer.client.dic}</p>}
          {offer.client.contact && <p>{offer.client.contact}</p>}
        </div>
        <div className="text-right">
          <p>
            <span className="font-bold">Dátum vystavenia:</span> {formatDate(offer.issuedOn)}
          </p>
        </div>
      </div>

      {(offer.title || offer.place || offer.serviceDates) && (
        <div className="mt-5">
          {offer.title && <p className="text-[15px] font-bold">{offer.title}</p>}
          {offer.place && (
            <p>
              <span className="font-bold">Miesto dodania:</span> {offer.place}
            </p>
          )}
          {offer.serviceDates && (
            <p>
              <span className="font-bold">Termín dodania služby:</span> {offer.serviceDates}
            </p>
          )}
        </div>
      )}

      {offer.sections.map((section, index) => (
        <div key={section.id}>
          <PartBlock part={section} code={partCode(index)} offer={offer} />
          {section.parts.map((part, subIndex) => (
            <div key={part.id} className="pl-4">
              <PartBlock part={part} code={partCode(index, subIndex)} offer={offer} sub />
            </div>
          ))}
        </div>
      ))}

      {total > 0 && (codes.length > 1 || offer.totalOverride !== null) && (
        <p className="mt-6 text-[14px] font-bold break-inside-avoid">
          Celková cena za časti {codes.join(' + ')}
          {offer.totalOverride !== null && ' (zvýhodnená)'}: {money(total)} {vatText(offer)}
        </p>
      )}

      {rows.length > 1 && (
        <section className="mt-6 break-inside-avoid">
          <h2 className="text-[15px] font-bold">ZHRNUTIE</h2>
          <table className="mt-2 w-full border-collapse">
            <tbody>
              {rows.map((row) => (
                <tr key={row.code} className="border-b border-neutral-400">
                  <td className="w-14 py-1 font-bold">{row.code}</td>
                  <td className="py-1">{row.title}</td>
                  <td className="py-1 text-right whitespace-nowrap">{row.price === null ? row.priceNote : `${money(row.price)} ${vatText(offer)}`}</td>
                </tr>
              ))}
              <tr>
                <td className="py-1.5 font-bold">SPOLU</td>
                <td />
                <td className="py-1.5 text-right font-bold whitespace-nowrap">
                  {money(total)} {vatText(offer)}
                </td>
              </tr>
            </tbody>
          </table>
        </section>
      )}

      {total > 0 && codes.length === 1 && offer.totalOverride === null && rows.length <= 1 && (
        <p className="mt-6 text-[14px] font-bold">
          Celková cena: {money(total)} {vatText(offer)}
        </p>
      )}

      {offer.notes && <p className="mt-6 whitespace-pre-wrap">{offer.notes}</p>}

      {offer.authorName && (
        <div className="mt-10 break-inside-avoid">
          <p className="font-bold">Vyhotovil:</p>
          <p>{offer.authorName}</p>
        </div>
      )}
    </article>
  )
}
