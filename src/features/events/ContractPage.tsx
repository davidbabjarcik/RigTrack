import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, TriangleAlert } from 'lucide-react'
import { useRef, useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ErrorBlock, LoadingBlock } from '@/components/feedback/QueryState'
import { PaperSheet } from '@/components/print/PaperSheet'
import { PrintButton } from '@/components/print/PrintButton'
import { Field, SelectField, TextareaField } from '@/components/ui/field'
import { useCompany } from '@/features/companies/company-context'
import { equipmentKeys, fetchEquipmentList } from '@/features/equipment/api'
import { useIssuers, type Issuer } from '@/features/offers/api'
import { fetchEventPartners, partnerKeys, usePartners, type Partner } from '@/features/partners/api'
import { formatDate, todayIso } from '@/lib/format'
import { tx } from '@/lib/i18n'
import { can } from '@/lib/permissions'
import {
  CONTRACT_KIND_LABELS,
  DEFAULT_TERMS,
  EMPTY_PARTY,
  partyLines,
  paymentPoints,
  VAT_NOTE_LABELS,
  type ContractKind,
  type ContractParty,
  type ContractTerms,
  type VatNote,
} from './contract'
import { describeTimes, POWER_LABELS, type CompanyEvent } from './model'
import { useEvents } from './useEvents'

const PRINT_CSS = `
@page { size: A4; margin: 18mm; @top-left { content: ""; } @top-center { content: ""; } @top-right { content: ""; } @bottom-left { content: ""; } @bottom-center { content: ""; } @bottom-right { content: ""; } }
@media print { html, body { background: #fff !important; } }
`

const fromIssuer = (issuer: Issuer | undefined): ContractParty =>
  issuer ? { name: issuer.name, address: issuer.address, ico: issuer.ico, dic: issuer.dic, icDph: issuer.icDph, representative: '' } : EMPTY_PARTY
const fromPartner = (partner: Partner | undefined, fallbackName: string): ContractParty =>
  partner
    ? { name: partner.legalName || partner.name, address: partner.address, ico: partner.ico, dic: partner.dic, icDph: partner.icDph, representative: partner.ceo }
    : { ...EMPTY_PARTY, name: fallbackName }

const numberOrNull = (text: string) => {
  const value = Number(text.replace(',', '.').replace(/\s/g, ''))
  return text.trim() && Number.isFinite(value) && value >= 0 ? value : null
}

/** Jeden článok zmluvy: „Čl. II Predmet zmluvy“ a očíslované body. */
function Article({ number, title, points }: { number: string; title: string; points: ReactNode[] }) {
  return (
    <section className="mt-5 break-inside-avoid">
      <h2 className="text-center font-semibold">
        Čl. {number}
        <br />
        {title}
      </h2>
      <ol className="mt-2 flex list-decimal flex-col gap-1.5 pl-5 text-justify">
        {points.map((point, index) => (
          <li key={index}>{point}</li>
        ))}
      </ol>
    </section>
  )
}

function Party({ role, party }: { role: string; party: ContractParty }) {
  return (
    <div className="break-inside-avoid">
      <p className="font-semibold">{party.name || '_______________________________'}</p>
      {partyLines(party).map((line) => (
        <p key={line}>{line}</p>
      ))}
      <p className="text-neutral-600">(ďalej len „{role}“)</p>
    </div>
  )
}

/** Údaje strany na úpravu pred tlačou. */
function PartyFields({ title, party, onChange }: { title: string; party: ContractParty; onChange: (party: ContractParty) => void }) {
  const set = (key: keyof ContractParty) => (event: { target: { value: string } }) => onChange({ ...party, [key]: event.target.value })
  return (
    <fieldset className="grid min-w-0 gap-2 sm:grid-cols-2">
      <legend className="mb-1 text-sm font-medium">{title}</legend>
      <Field label={tx('Názov / meno')} className="sm:col-span-2" maxLength={160} value={party.name} onChange={set('name')} />
      <Field label={tx('Sídlo / adresa')} className="sm:col-span-2" maxLength={240} value={party.address} onChange={set('address')} />
      <Field label={tx('IČO')} maxLength={20} value={party.ico} onChange={set('ico')} />
      <Field label={tx('DIČ')} maxLength={20} value={party.dic} onChange={set('dic')} />
      <Field label={tx('IČ DPH')} maxLength={20} value={party.icDph} onChange={set('icDph')} />
      <Field label={tx('Zastúpený')} maxLength={120} value={party.representative} onChange={set('representative')} />
    </fieldset>
  )
}

function ContractForm({ event, issuers, partners, organizerId }: { event: CompanyEvent; issuers: Issuer[]; partners: Partner[]; organizerId?: string }) {
  const company = useCompany().active!
  const companyId = company.companyId
  const sheet = useRef<HTMLDivElement>(null)
  const equipment = useQuery({ queryKey: equipmentKeys.list(companyId), queryFn: () => fetchEquipmentList(companyId), enabled: can(company, 'equipment.view') })
  const [supplier, setSupplier] = useState<ContractParty>(() => fromIssuer(issuers[0]))
  const [client, setClient] = useState<ContractParty>(() => fromPartner(partners.find((partner) => partner.id === organizerId), event.organizer || event.client))
  const [terms, setTerms] = useState<ContractTerms>({ ...DEFAULT_TERMS, kind: event.kind === 'dj' ? 'service' : DEFAULT_TERMS.kind })
  const [priceText, setPriceText] = useState('')
  const [depositText, setDepositText] = useState('')
  const update = (patch: Partial<ContractTerms>) => setTerms({ ...terms, ...patch })

  const when = event.startsOn === event.endsOn ? formatDate(event.startsOn) : `${formatDate(event.startsOn)} – ${formatDate(event.endsOn)}`
  const times = describeTimes(event)
  const gear = (equipment.data ?? []).length
    ? event.equipment
        .map((line) => {
          const item = equipment.data!.find((candidate) => candidate.id === line.equipmentId)
          return item ? `${line.quantity}× ${item.name}` : null
        })
        .filter((line): line is string => Boolean(line))
    : []
  const rental = terms.kind === 'rental'
  const supplierRole = rental ? 'prenajímateľ' : 'dodávateľ'
  const clientRole = rental ? 'nájomca' : 'objednávateľ'
  const Supplier = rental ? 'Prenajímateľ' : 'Dodávateľ'
  const Client = rental ? 'Nájomca' : 'Objednávateľ'
  const cancellation = terms.cancellation.split('\n').map((line) => line.trim()).filter(Boolean)

  const articles: { title: string; points: ReactNode[] }[] = [
    {
      title: 'Predmet zmluvy',
      points: [
        rental
          ? 'Prenajímateľ prenechá nájomcovi do dočasného užívania techniku uvedenú v tejto zmluve a nájomca sa zaväzuje zaplatiť za to dohodnutú cenu.'
          : event.kind === 'dj'
            ? `${Supplier} sa zaväzuje zabezpečiť pre ${clientRole}a hudobnú produkciu (DJ) na podujatí uvedenom nižšie a ${clientRole} sa zaväzuje zaplatiť za to dohodnutú cenu.`
            : `${Supplier} sa zaväzuje zabezpečiť pre ${clientRole}a technické zabezpečenie podujatia (zvuk, svetlo, prípadne ďalšia technika a obsluha) a ${clientRole} sa zaväzuje zaplatiť za to dohodnutú cenu.`,
        <>
          Podujatie: <strong>{event.name}</strong>, termín: <strong>{when}</strong>
          {event.venue && (
            <>
              , miesto: <strong>{event.venue}</strong>
            </>
          )}
          {times && <>, {times}</>}.
        </>,
        ...(terms.withEquipment && gear.length > 0 ? [`Technika: ${gear.join(', ')}.`] : []),
      ],
    },
    { title: rental ? 'Nájomné a platobné podmienky' : 'Cena a platobné podmienky', points: paymentPoints(terms, Client) },
    {
      title: `Povinnosti ${rental ? 'prenajímateľa' : 'dodávateľa'}`,
      points: rental
        ? [`${Supplier} odovzdá techniku funkčnú a v dohodnutom rozsahu; pri odovzdaní a vrátení sa skontroluje jej stav.`]
        : [
            `${Supplier} zabezpečí plnenie riadne, včas a s odbornou starostlivosťou, vrátane dopravy, stavby a demontáže techniky, ak sa nedohodne inak.`,
            `${Supplier} zodpovedá za to, že technika je funkčná a bezpečná a obsluhujú ju poučené osoby.`,
          ],
    },
    {
      title: `Povinnosti ${rental ? 'nájomcu' : 'objednávateľa'}`,
      points: [
        ...(rental
          ? [`${Client} používa techniku len na dohodnutý účel, chráni ju pred poškodením, krádežou a nepriaznivým počasím a vráti ju v dohodnutom termíne v stave, v akom ju prevzal, s prihliadnutím na bežné opotrebenie.`]
          : [
              `${Client} zabezpečí včasný prístup na miesto podujatia${event.getInTime ? ` (príchod / stavba ${event.getInTime})` : ''}, priestor na techniku a súčinnosť potrebnú na plnenie.`,
              `${Client} zabezpečí elektrickú prípojku${event.power ? ` (${POWER_LABELS[event.power]}${event.powerCount && event.powerCount > 1 ? `, ${event.powerCount}×` : ''})` : ''} v dohodnutom mieste, pri vonkajšom podujatí aj ochranu techniky pred dažďom.`,
            ]),
        `${Client} zodpovedá za škodu na technike spôsobenú ním, jeho hosťami alebo tretími osobami počas podujatia, okrem škody spôsobenej ${rental ? 'prenajímateľom' : 'dodávateľom'}.`,
      ],
    },
    ...(cancellation.length > 0
      ? [
          {
            title: 'Zrušenie podujatia (storno)',
            points: [
              <>
                Ak {clientRole} podujatie zruší, zaplatí storno poplatok:
                <ol className="mt-1 list-[lower-alpha] pl-5">
                  {cancellation.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ol>
              </>,
            ],
          },
        ]
      : []),
    ...(terms.extra.trim() ? [{ title: 'Ďalšie dojednania', points: terms.extra.split('\n').map((line) => line.trim()).filter(Boolean) }] : []),
    {
      title: 'Záverečné ustanovenia',
      points: [
        'Zmluva nadobúda platnosť a účinnosť dňom podpisu oboma zmluvnými stranami.',
        'Zmluvu možno meniť len písomnými dodatkami podpísanými oboma stranami. Vzťahy, ktoré táto zmluva neupravuje, sa riadia Obchodným zákonníkom, prípadne Občianskym zákonníkom.',
        'Zmluva je vyhotovená v dvoch rovnopisoch, každá strana dostane jeden. Strany zmluvu prečítali, súhlasia s jej obsahom a na znak súhlasu ju podpisujú.',
      ],
    },
  ]
  const roman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX']

  return (
    <>
      <div className="mx-auto mb-4 flex max-w-[210mm] flex-col gap-4 rounded-xl border bg-surface p-4 text-foreground print:hidden">
        <p className="flex items-start gap-2 rounded-lg bg-amber-500/10 p-3 text-sm text-amber-900 dark:text-amber-200">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          {tx('Toto je vzor zmluvy z údajov eventu. Pred podpisom si ho prečítajte a podľa potreby upravte, pri väčších zákazkách s právnikom. Nič z tohto formulára sa neukladá.')}
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField label={tx('Druh zmluvy')} value={terms.kind} onChange={(event) => update({ kind: event.target.value as ContractKind })}>
            {(Object.keys(CONTRACT_KIND_LABELS) as ContractKind[]).map((kind) => (
              <option key={kind} value={kind}>
                {tx(CONTRACT_KIND_LABELS[kind])}
              </option>
            ))}
          </SelectField>
          {issuers.length > 1 && (
            <SelectField label={tx('Dodávateľ')} defaultValue={issuers[0].id} onChange={(event) => setSupplier(fromIssuer(issuers.find((issuer) => issuer.id === event.target.value)))}>
              {issuers.map((issuer) => (
                <option key={issuer.id} value={issuer.id}>
                  {issuer.name}
                </option>
              ))}
            </SelectField>
          )}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <PartyFields title={tx(rental ? 'Prenajímateľ' : 'Dodávateľ')} party={supplier} onChange={setSupplier} />
          <PartyFields title={tx(rental ? 'Nájomca' : 'Objednávateľ')} party={client} onChange={setClient} />
        </div>
        <div className="grid gap-3 sm:grid-cols-4">
          <Field
            label={tx('Cena (€)')}
            inputMode="decimal"
            placeholder={tx('prázdne = dopísať perom')}
            value={priceText}
            onChange={(event) => {
              setPriceText(event.target.value)
              update({ price: numberOrNull(event.target.value) })
            }}
          />
          <SelectField label={tx('DPH')} value={terms.vat} onChange={(event) => update({ vat: event.target.value as VatNote })}>
            {(Object.keys(VAT_NOTE_LABELS) as VatNote[]).map((vat) => (
              <option key={vat} value={vat}>
                {tx(VAT_NOTE_LABELS[vat])}
              </option>
            ))}
          </SelectField>
          <Field
            label={tx('Záloha (€)')}
            inputMode="decimal"
            placeholder={tx('bez zálohy')}
            value={depositText}
            onChange={(event) => {
              setDepositText(event.target.value)
              update({ deposit: numberOrNull(event.target.value) })
            }}
          />
          <Field
            label={tx('Splatnosť faktúry (dni)')}
            type="number"
            inputMode="numeric"
            min={0}
            max={120}
            value={terms.dueDays}
            onChange={(event) => update({ dueDays: Math.min(120, Math.max(0, Number(event.target.value) || 0)) })}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <TextareaField label={tx('Storno podmienky (každá na riadok)')} rows={3} maxLength={1500} value={terms.cancellation} onChange={(event) => update({ cancellation: event.target.value })} />
          <TextareaField label={tx('Ďalšie dojednania (každé na riadok)')} rows={3} maxLength={3000} value={terms.extra} onChange={(event) => update({ extra: event.target.value })} />
        </div>
        <div className="flex flex-wrap items-end gap-4">
          <Field label={tx('Miesto podpisu')} placeholder={tx('napr. Bratislava')} maxLength={80} value={terms.place} onChange={(event) => update({ place: event.target.value })} />
          {gear.length > 0 && (
            <label className="flex items-center gap-2 pb-3 text-sm">
              <input type="checkbox" className="size-4" checked={terms.withEquipment} onChange={(event) => update({ withEquipment: event.target.checked })} />
              {tx('Uviesť techniku eventu v zmluve')}
            </label>
          )}
          <span className="flex-1" />
          <PrintButton sheet={sheet} fileName={`zmluva-${event.name}`} marginMm={18} />
        </div>
      </div>

      <div className="mb-8 px-2 print:mb-0 print:px-0">
        <PaperSheet sheetRef={sheet} marginMm={18} className="text-[13px] leading-relaxed">
          <h1 className="text-center text-xl font-bold tracking-tight uppercase">{CONTRACT_KIND_LABELS[terms.kind]}</h1>
          <p className="mt-1 text-center text-neutral-600">
            {rental ? 'uzavretá podľa § 659 a nasl. Občianskeho zákonníka' : 'uzavretá podľa § 269 ods. 2 Obchodného zákonníka'}
          </p>
          <section className="mt-6 flex flex-col gap-3">
            <h2 className="text-center font-semibold">
              Čl. I
              <br />
              Zmluvné strany
            </h2>
            <Party role={supplierRole} party={supplier} />
            <p className="text-center">a</p>
            <Party role={clientRole} party={client} />
          </section>
          {articles.map((article, index) => (
            <Article key={article.title} number={roman[index + 1]} title={article.title} points={article.points} />
          ))}
          <section className="mt-10 grid grid-cols-2 gap-10 break-inside-avoid">
            {[Supplier, Client].map((role) => (
              <div key={role}>
                <p>
                  V {terms.place || '____________'} dňa {role === Supplier ? formatDate(todayIso()) : '____________'}
                </p>
                <div className="mt-16 border-t border-black pt-1 text-center">
                  {role}
                  <br />
                  <span className="text-neutral-600">{role === Supplier ? supplier.name : client.name}</span>
                </div>
              </div>
            ))}
          </section>
        </PaperSheet>
      </div>
    </>
  )
}

/** Zmluva k eventu na A4: vzor z údajov eventu, dodávateľa a organizátora; doplní sa cena, záloha a podmienky. */
export function ContractPage() {
  const { id = '' } = useParams()
  const company = useCompany().active!
  const companyId = company.companyId
  const events = useEvents(companyId)
  const issuers = useIssuers(companyId)
  const partners = usePartners(companyId)
  const linked = useQuery({ queryKey: partnerKeys.ofEvent(companyId, id), queryFn: () => fetchEventPartners(companyId, id), retry: false })
  const event = events.data?.find((candidate) => candidate.id === id)

  const back = (
    <Link to={`/events/${id}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
      <ArrowLeft className="size-4" aria-hidden />
      {tx('Event')}
    </Link>
  )
  let body: ReactNode
  if (!can(company, 'events.edit')) body = <ErrorBlock message={tx('Na zmluvy k eventom nemáte oprávnenie.')} />
  else if (events.isPending || issuers.isPending || partners.isPending || linked.isPending) body = <LoadingBlock />
  else if (events.isError) body = <ErrorBlock message={tx('Údaje sa nepodarilo načítať.')} onRetry={() => void events.refetch()} />
  else if (!event) body = <ErrorBlock message={tx('Tento event neexistuje alebo k nemu nemáte prístup.')} />
  else {
    body = (
      <ContractForm
        event={event}
        issuers={issuers.data ?? []}
        partners={partners.data ?? []}
        organizerId={linked.data?.find((item) => item.kind === 'organizer')?.partnerId}
      />
    )
  }
  return (
    <div className="min-h-dvh bg-muted p-2 text-black sm:p-6 print:bg-white print:p-0">
      <style>{PRINT_CSS}</style>
      <div className="mx-auto mb-4 max-w-[210mm] print:hidden">{back}</div>
      {body}
    </div>
  )
}
