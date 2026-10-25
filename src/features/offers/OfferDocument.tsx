import { formatDate, formatMoney } from '@/lib/format'
import { bulletLines, partCode, partPrice, sumPrices, summaryRows, type Offer, type OfferPart } from './model'

// Klasický obchodný doklad na A4: tenké čiary, sivé hlavičky tabuliek, ceny vpravo, podpis a pätička s údajmi.
const vatSuffix = (offer: Pick<Offer, 'vatMode' | 'vatPct'>) =>
  offer.vatMode === 'with' ? 's DPH' : offer.vatMode === 'plus' ? `bez DPH (+ ${String(offer.vatPct).replace('.', ',')} % DPH)` : ''

function Label({ children }: { children: string }) {
  return <p className="text-[9px] font-semibold tracking-[0.08em] text-neutral-500 uppercase">{children}</p>
}

function PartRow({ part, code, sub }: { part: OfferPart; code: string; sub?: boolean }) {
  const items = bulletLines(part.items)
  const price = partPrice(part)
  const money = (value: number) => formatMoney(value, 'EUR')
  return (
    <tr className="break-inside-avoid border-b border-neutral-300 align-top">
      <td className={`py-2 pr-2 ${sub ? 'pl-3 text-neutral-600' : 'font-bold'}`}>{code}</td>
      <td className="py-2 pr-4">
        <p className={sub ? 'font-semibold' : 'font-bold'}>{part.title}</p>
        {part.description && <p className="mt-0.5 whitespace-pre-wrap text-neutral-700">{part.description}</p>}
        {items.length > 0 && (
          <ul className="mt-1 columns-2 gap-6 text-neutral-700">
            {items.map((item, index) => (
              <li key={index} className="break-inside-avoid">
                – {item}
              </li>
            ))}
          </ul>
        )}
        {part.includes && <p className="mt-1 text-[10px] text-neutral-500 italic">Cena zahŕňa: {part.includes}</p>}
      </td>
      <td className="py-2 text-right font-semibold whitespace-nowrap">{price !== null ? money(price) : part.priceNote}</td>
    </tr>
  )
}

/** Cenová ponuka na tlač / PDF. */
export function OfferDocument({ offer, logoUrl }: { offer: Offer; logoUrl?: string }) {
  const rows = summaryRows(offer.sections)
  const sum = sumPrices(offer.sections)
  const total = offer.totalOverride ?? sum
  const issuer = offer.issuer
  const money = (value: number) => formatMoney(value, 'EUR')
  const vat = offer.vatMode === 'plus' ? Math.round(total * offer.vatPct) / 100 : 0
  const info = [
    ['Podujatie', offer.title],
    ['Miesto dodania', offer.place],
    ['Termín dodania', offer.serviceDates],
    ['Dátum vystavenia', formatDate(offer.issuedOn)],
  ].filter(([, value]) => value)

  return (
    <article className="mx-auto max-w-[190mm] text-[11px] leading-snug text-neutral-900">
      <header className="flex items-end justify-between gap-6 border-b-2 border-neutral-900 pb-3">
        <div className="flex items-center gap-3">
          {logoUrl && <img src={logoUrl} alt="" className="h-12 max-w-36 object-contain" />}
          <p className="text-base font-bold">{issuer.name}</p>
        </div>
        <div className="text-right">
          <p className="text-xl font-bold tracking-wide">Cenová ponuka</p>
          {offer.number && <p className="text-neutral-600">č. {offer.number}</p>}
        </div>
      </header>

      <table className="mt-4 w-full border-collapse">
        <thead>
          <tr className="bg-neutral-100 text-left">
            <th className="w-1/2 border border-neutral-300 px-2 py-1">
              <Label>Dodávateľ</Label>
            </th>
            <th className="w-1/2 border border-neutral-300 px-2 py-1">
              <Label>Odberateľ</Label>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr className="align-top">
            <td className="border border-neutral-300 px-2 py-2">
              <p className="font-semibold">{issuer.name}</p>
              {issuer.address && <p className="whitespace-pre-line">{issuer.address}</p>}
              <p className="mt-1">
                {[issuer.ico && `IČO: ${issuer.ico}`, issuer.dic && `DIČ: ${issuer.dic}`, issuer.icDph && `IČ DPH: ${issuer.icDph}`].filter(Boolean).join('   ')}
              </p>
              {!issuer.vatPayer && <p>Nie je platiteľ DPH</p>}
            </td>
            <td className="border border-neutral-300 px-2 py-2">
              <p className="font-semibold">{offer.client.name || '—'}</p>
              {offer.client.address && <p className="whitespace-pre-line">{offer.client.address}</p>}
              {(offer.client.ico || offer.client.dic) && <p className="mt-1">{[offer.client.ico && `IČO: ${offer.client.ico}`, offer.client.dic && `DIČ: ${offer.client.dic}`].filter(Boolean).join('   ')}</p>}
              {offer.client.contact && <p className="mt-1">{offer.client.contact}</p>}
            </td>
          </tr>
        </tbody>
      </table>

      {info.length > 0 && (
        <table className="mt-2 w-full border-collapse">
          <tbody>
            <tr className="align-top">
              {info.map(([label, value]) => (
                <td key={label} className="border border-neutral-300 px-2 py-1.5">
                  <Label>{label}</Label>
                  <p className="font-medium">{value}</p>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      )}

      <table className="mt-5 w-full border-collapse">
        <thead>
          <tr className="border-y border-neutral-900 bg-neutral-100 text-left">
            <th className="w-10 px-0 py-1.5">
              <Label>Časť</Label>
            </th>
            <th className="py-1.5">
              <Label>Predmet ponuky</Label>
            </th>
            <th className="w-32 py-1.5 text-right">
              <Label>{`Cena ${vatSuffix(offer) ? `(${offer.vatMode === 'with' ? 's DPH' : 'bez DPH'})` : ''}`.trim()}</Label>
            </th>
          </tr>
        </thead>
        <tbody>
          {offer.sections.map((section, index) => [
            <PartRow key={section.id} part={section} code={partCode(index)} />,
            ...section.parts.map((part, subIndex) => <PartRow key={part.id} part={part} code={partCode(index, subIndex)} sub />),
          ])}
        </tbody>
      </table>

      <div className="mt-3 flex justify-end break-inside-avoid">
        <table className="w-72 border-collapse">
          <tbody>
            {rows.length > 1 && sum > 0 && (
              <tr>
                <td className="py-0.5 text-neutral-600">Súčet častí</td>
                <td className={`py-0.5 text-right ${offer.totalOverride !== null ? 'text-neutral-500 line-through' : ''}`}>{money(sum)}</td>
              </tr>
            )}
            {offer.totalOverride !== null && (
              <tr>
                <td className="py-0.5 text-neutral-600">Zvýhodnená cena</td>
                <td className="py-0.5 text-right">{money(offer.totalOverride)}</td>
              </tr>
            )}
            {offer.vatMode === 'plus' && total > 0 && (
              <tr>
                <td className="py-0.5 text-neutral-600">DPH {String(offer.vatPct).replace('.', ',')} %</td>
                <td className="py-0.5 text-right">{money(vat)}</td>
              </tr>
            )}
            {total > 0 && (
              <tr className="border-t-2 border-neutral-900 bg-neutral-100">
                <td className="px-1 py-1.5 font-bold">Spolu {offer.vatMode === 'none' ? '' : 's DPH'}</td>
                <td className="px-1 py-1.5 text-right text-sm font-bold">{money(offer.vatMode === 'plus' ? total + vat : total)}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {offer.notes && <p className="mt-5 whitespace-pre-wrap text-neutral-700">{offer.notes}</p>}

      <div className="mt-10 flex items-end justify-between gap-8 break-inside-avoid">
        <div>
          <Label>Vyhotovil</Label>
          <p className="font-medium">{offer.authorName || ' '}</p>
        </div>
        <div className="w-56 border-t border-neutral-400 pt-1 text-center text-[9px] text-neutral-500">podpis a pečiatka</div>
      </div>

      <footer className="mt-8 border-t border-neutral-300 pt-2 text-center text-[9px] text-neutral-500">
        {[issuer.name, issuer.ico && `IČO ${issuer.ico}`, issuer.dic && `DIČ ${issuer.dic}`, issuer.contact.replace(/\n/g, ' · ')].filter(Boolean).join(' · ')}
      </footer>
    </article>
  )
}
