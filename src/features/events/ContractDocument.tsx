import type { ReactNode, RefObject } from 'react'
import { PaperSheet } from '@/components/print/PaperSheet'
import { formatDate } from '@/lib/format'
import { CONTRACT_KIND_LABELS, partyLines, paymentPoints, type ContractParty, type ContractSnapshot } from './contract'

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

export type ContractSignatures = { supplier?: { name: string; image: string | null }; client?: { name: string; image: string | null } }

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X']

/**
 * Text zmluvy na A4 z uložených (alebo práve vyplnených) údajov. Nezávisí od eventu – uložená zmluva sa tak
 * zobrazí presne tak, ako bola uložená.
 */
export function ContractDocument({ snapshot, number, signatures, sheetRef }: { snapshot: ContractSnapshot; number?: string; signatures?: ContractSignatures; sheetRef?: RefObject<HTMLDivElement | null> }) {
  const { supplier, client, terms, subject } = snapshot
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
          : subject.dj
            ? `${Supplier} sa zaväzuje zabezpečiť pre ${clientRole}a hudobnú produkciu (DJ) na podujatí uvedenom nižšie a ${clientRole} sa zaväzuje zaplatiť za to dohodnutú cenu.`
            : `${Supplier} sa zaväzuje zabezpečiť pre ${clientRole}a technické zabezpečenie podujatia (zvuk, svetlo, prípadne ďalšia technika a obsluha) a ${clientRole} sa zaväzuje zaplatiť za to dohodnutú cenu.`,
        <>
          Podujatie: <strong>{subject.eventName}</strong>, termín: <strong>{subject.when}</strong>
          {subject.venue && (
            <>
              , miesto: <strong>{subject.venue}</strong>
            </>
          )}
          {subject.times && <>, {subject.times}</>}.
        </>,
        ...(terms.withEquipment && subject.gear.length > 0 ? [`Technika: ${subject.gear.join(', ')}.`] : []),
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
              `${Client} zabezpečí včasný prístup na miesto podujatia${subject.getIn ? ` (príchod / stavba ${subject.getIn})` : ''}, priestor na techniku a súčinnosť potrebnú na plnenie.`,
              `${Client} zabezpečí elektrickú prípojku${subject.power ? ` (${subject.power})` : ''} v dohodnutom mieste, pri vonkajšom podujatí aj ochranu techniky pred dažďom.`,
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

  const signers = [
    { role: Supplier, party: supplier, signature: signatures?.supplier, date: formatDate(snapshot.createdOn) },
    { role: Client, party: client, signature: signatures?.client, date: signatures?.client?.image ? formatDate(snapshot.createdOn) : '____________' },
  ]

  return (
    <PaperSheet sheetRef={sheetRef} marginMm={18} className="text-[13px] leading-relaxed">
      {number && <p className="text-right text-neutral-600">Číslo zmluvy: {number}</p>}
      <h1 className="text-center text-xl font-bold tracking-tight uppercase">{CONTRACT_KIND_LABELS[terms.kind]}</h1>
      <p className="mt-1 text-center text-neutral-600">{rental ? 'uzavretá podľa § 659 a nasl. Občianskeho zákonníka' : 'uzavretá podľa § 269 ods. 2 Obchodného zákonníka'}</p>
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
        <Article key={article.title} number={ROMAN[index + 1]} title={article.title} points={article.points} />
      ))}
      <section className="mt-10 grid grid-cols-2 gap-10 break-inside-avoid">
        {signers.map(({ role, party, signature, date }) => (
          <div key={role}>
            <p>
              V {terms.place || '____________'} dňa {date}
            </p>
            <div className="flex h-16 items-end justify-center">
              {signature?.image && <img src={signature.image} alt={`Podpis: ${signature.name}`} className="max-h-16 max-w-full object-contain" />}
            </div>
            <div className="border-t border-black pt-1 text-center">
              {role}
              <br />
              <span className="text-neutral-600">{signature?.name || party.name}</span>
            </div>
          </div>
        ))}
      </section>
    </PaperSheet>
  )
}
