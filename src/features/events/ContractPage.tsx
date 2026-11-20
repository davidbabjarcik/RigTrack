import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, FileSignature, PenLine, Save, Trash2, TriangleAlert } from 'lucide-react'
import { useRef, useState, type ReactNode } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ErrorBlock, LoadingBlock } from '@/components/feedback/QueryState'
import { PrintButton } from '@/components/print/PrintButton'
import { Button } from '@/components/ui/button'
import { Field, SelectField, TextareaField } from '@/components/ui/field'
import { useCompany } from '@/features/companies/company-context'
import { equipmentKeys, fetchEquipmentList } from '@/features/equipment/api'
import { SignaturePad } from '@/features/loans/SignaturePad'
import { useIssuers, useOffers, type Issuer } from '@/features/offers/api'
import type { Offer } from '@/features/offers/model'
import { fetchEventPartners, partnerKeys, usePartners, type Partner } from '@/features/partners/api'
import { formatDate, formatMoney, todayIso } from '@/lib/format'
import { tf, tx } from '@/lib/i18n'
import { can } from '@/lib/permissions'
import {
  CONTRACT_KIND_LABELS,
  DEFAULT_TERMS,
  offerPrice,
  EMPTY_PARTY,
  VAT_NOTE_LABELS,
  type ContractKind,
  type ContractParty,
  type ContractSnapshot,
  type ContractTerms,
  type VatNote,
} from './contract'
import { contractKeys, deleteContract, saveContract, signContract, useContracts, type SavedContract } from './contractApi'
import { ContractDocument } from './ContractDocument'
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

/** Nová zmluva: údaje strán a podmienky, náhľad na A4, tlač a uloženie s číslom. */
function ContractForm({ event, issuers, partners, offers, organizerId, canSave, onSaved }: {
  event: CompanyEvent
  issuers: Issuer[]
  partners: Partner[]
  offers: Offer[]
  organizerId?: string
  canSave: boolean
  onSaved: (id: string) => void
}) {
  const company = useCompany().active!
  const companyId = company.companyId
  const queryClient = useQueryClient()
  const sheet = useRef<HTMLDivElement>(null)
  const equipment = useQuery({ queryKey: equipmentKeys.list(companyId), queryFn: () => fetchEquipmentList(companyId), enabled: can(company, 'equipment.view') })
  const fromOffer = offerPrice(offers, event.id)
  const [supplier, setSupplier] = useState<ContractParty>(() => fromIssuer(issuers[0]))
  const [client, setClient] = useState<ContractParty>(() => fromPartner(partners.find((partner) => partner.id === organizerId), event.organizer || event.client))
  const [terms, setTerms] = useState<ContractTerms>(() => ({ ...DEFAULT_TERMS, price: fromOffer?.price ?? null, vat: fromOffer?.vat ?? DEFAULT_TERMS.vat }))
  const [priceText, setPriceText] = useState(() => (fromOffer ? String(fromOffer.price).replace('.', ',') : ''))
  const [depositText, setDepositText] = useState('')
  const update = (patch: Partial<ContractTerms>) => setTerms({ ...terms, ...patch })

  const gear = (equipment.data ?? []).length
    ? event.equipment
        .map((line) => {
          const item = equipment.data!.find((candidate) => candidate.id === line.equipmentId)
          return item ? `${line.quantity}× ${item.name}` : null
        })
        .filter((line): line is string => Boolean(line))
    : []
  const snapshot: ContractSnapshot = {
    supplier,
    client,
    terms,
    createdOn: todayIso(),
    subject: {
      eventName: event.name,
      when: event.startsOn === event.endsOn ? formatDate(event.startsOn) : `${formatDate(event.startsOn)} – ${formatDate(event.endsOn)}`,
      venue: event.venue,
      times: describeTimes(event),
      getIn: event.getInTime,
      power: event.power ? `${POWER_LABELS[event.power]}${event.powerCount && event.powerCount > 1 ? `, ${event.powerCount}×` : ''}` : '',
      gear,
      dj: event.kind === 'dj',
    },
  }
  const save = useMutation({
    mutationFn: () => saveContract(companyId, event.id, snapshot),
    onSuccess: (saved) => {
      void queryClient.invalidateQueries({ queryKey: contractKeys.ofEvent(companyId, event.id) })
      onSaved(saved.id)
    },
  })
  const rental = terms.kind === 'rental'

  return (
    <>
      <div className="mx-auto mb-4 flex max-w-[210mm] flex-col gap-4 rounded-xl border bg-surface p-4 text-foreground print:hidden">
        <p className="flex items-start gap-2 rounded-lg bg-amber-500/10 p-3 text-sm text-amber-900 dark:text-amber-200">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          {tx('Toto je vzor zmluvy z údajov eventu. Pred podpisom si ho prečítajte a podľa potreby upravte, pri väčších zákazkách s právnikom.')}
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField label={tx('Druh zmluvy')} value={terms.kind} onChange={(changed) => update({ kind: changed.target.value as ContractKind })}>
            {(Object.keys(CONTRACT_KIND_LABELS) as ContractKind[]).map((kind) => (
              <option key={kind} value={kind}>
                {tx(CONTRACT_KIND_LABELS[kind])}
              </option>
            ))}
          </SelectField>
          {issuers.length > 1 && (
            <SelectField label={tx('Dodávateľ')} defaultValue={issuers[0].id} onChange={(changed) => setSupplier(fromIssuer(issuers.find((issuer) => issuer.id === changed.target.value)))}>
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
          <div>
            <Field
              label={tx('Cena (€)')}
              inputMode="decimal"
              placeholder={tx('prázdne = dopísať perom')}
              value={priceText}
              onChange={(changed) => {
                setPriceText(changed.target.value)
                update({ price: numberOrNull(changed.target.value) })
              }}
            />
            {fromOffer && (
              <p className="mt-1 text-xs text-muted-foreground">
                {tf(fromOffer.accepted ? 'z prijatej ponuky {0}' : 'z ponuky {0}', fromOffer.number || '')}
              </p>
            )}
          </div>
          <SelectField label={tx('DPH')} value={terms.vat} onChange={(changed) => update({ vat: changed.target.value as VatNote })}>
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
            onChange={(changed) => {
              setDepositText(changed.target.value)
              update({ deposit: numberOrNull(changed.target.value) })
            }}
          />
          <Field
            label={tx('Splatnosť faktúry (dni)')}
            type="number"
            inputMode="numeric"
            min={0}
            max={120}
            value={terms.dueDays}
            onChange={(changed) => update({ dueDays: Math.min(120, Math.max(0, Number(changed.target.value) || 0)) })}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <TextareaField label={tx('Storno podmienky (každá na riadok)')} rows={3} maxLength={1500} value={terms.cancellation} onChange={(changed) => update({ cancellation: changed.target.value })} />
          <TextareaField label={tx('Ďalšie dojednania (každé na riadok)')} rows={3} maxLength={3000} value={terms.extra} onChange={(changed) => update({ extra: changed.target.value })} />
        </div>
        <div className="flex flex-wrap items-end gap-4">
          <Field label={tx('Miesto podpisu')} placeholder={tx('napr. Bratislava')} maxLength={80} value={terms.place} onChange={(changed) => update({ place: changed.target.value })} />
          {gear.length > 0 && (
            <label className="flex items-center gap-2 pb-3 text-sm">
              <input type="checkbox" className="size-4" checked={terms.withEquipment} onChange={(changed) => update({ withEquipment: changed.target.checked })} />
              {tx('Uviesť techniku eventu v zmluve')}
            </label>
          )}
          <span className="flex-1" />
          <PrintButton sheet={sheet} fileName={`zmluva-${event.name}`} marginMm={18} variant="outline" />
          {canSave && (
            <Button disabled={save.isPending} onClick={() => save.mutate()}>
              <Save className="size-4" aria-hidden />
              {save.isPending ? tx('Ukladám…') : tx('Uložiť zmluvu')}
            </Button>
          )}
        </div>
        {canSave && <p className="text-xs text-muted-foreground">{tx('Uložená zmluva dostane číslo, ostane pri evente presne tak, ako je, a dá sa podpísať prstom (klient aj my).')}</p>}
        {save.isError && <p role="alert" className="text-sm text-destructive">{tx('Zmluvu sa nepodarilo uložiť.')}</p>}
      </div>

      <div className="mb-8 px-2 print:mb-0 print:px-0">
        <ContractDocument snapshot={snapshot} sheetRef={sheet} />
      </div>
    </>
  )
}

/** Uložená zmluva: presne ako pri uložení, s podpismi a tlačou. */
function SavedContractView({ contract, eventName, canEdit, onBack }: { contract: SavedContract; eventName: string; canEdit: boolean; onBack: () => void }) {
  const companyId = useCompany().active!.companyId
  const queryClient = useQueryClient()
  const sheet = useRef<HTMLDivElement>(null)
  const [signing, setSigning] = useState<'client' | 'supplier' | null>(null)
  const sign = useMutation({
    mutationFn: ({ side, name, image }: { side: 'client' | 'supplier'; name: string; image: string }) => signContract(contract.id, side, name, image),
    onSuccess: () => setSigning(null),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['company', companyId, 'events'] }),
  })
  const { snapshot } = contract
  const rental = snapshot.terms.kind === 'rental'
  const sides = [
    { side: 'supplier' as const, label: rental ? tx('Prenajímateľ') : tx('Dodávateľ'), party: snapshot.supplier, signer: contract.supplierSigner, image: contract.supplierSignature },
    { side: 'client' as const, label: rental ? tx('Nájomca') : tx('Objednávateľ'), party: snapshot.client, signer: contract.clientSigner, image: contract.clientSignature },
  ]
  const current = sides.find((item) => item.side === signing)

  return (
    <>
      <div className="mx-auto mb-4 flex max-w-[210mm] flex-col gap-3 rounded-xl border bg-surface p-4 text-foreground print:hidden">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="size-4" aria-hidden />
            {tx('Späť na zmluvy')}
          </Button>
          <span className="font-medium">{tf('Zmluva {0}', contract.number)}</span>
          <span className="text-sm text-muted-foreground">{tf('uložená {0}', formatDate(contract.createdAt.slice(0, 10)))}</span>
          <span className="flex-1" />
          <PrintButton sheet={sheet} fileName={`zmluva-${contract.number}-${eventName}`} marginMm={18} />
        </div>
        {canEdit && (
          <div className="flex flex-wrap gap-2">
            {sides.map((item) =>
              item.image ? (
                <span key={item.side} className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-3 py-1 text-sm text-emerald-800 dark:text-emerald-200">
                  <FileSignature className="size-4" aria-hidden />
                  {tf('{0} podpísal: {1}', item.label, item.signer)}
                </span>
              ) : (
                <Button key={item.side} variant="outline" size="sm" onClick={() => setSigning(item.side)}>
                  <PenLine className="size-4" aria-hidden />
                  {tf('Podpis: {0}', item.label)}
                </Button>
              ),
            )}
          </div>
        )}
        {sign.isError && <p role="alert" className="text-sm text-destructive">{tx('Podpis sa nepodarilo uložiť.')}</p>}
      </div>
      <div className="mb-8 px-2 print:mb-0 print:px-0">
        <ContractDocument
          snapshot={snapshot}
          number={contract.number}
          sheetRef={sheet}
          signatures={{
            supplier: contract.supplierSignature ? { name: contract.supplierSigner, image: contract.supplierSignature } : undefined,
            client: contract.clientSignature ? { name: contract.clientSigner, image: contract.clientSignature } : undefined,
          }}
        />
      </div>
      {current && (
        <SignaturePad
          title={tf('Podpis: {0}', current.label)}
          statement={tf('Podpisom potvrdzujem zmluvu {0} so všetkými jej podmienkami.', contract.number)}
          defaultName={current.party.representative || current.party.name}
          saving={sign.isPending}
          error={sign.isError}
          onSave={(name, image) => sign.mutate({ side: current.side, name, image })}
          onClose={() => setSigning(null)}
        />
      )}
    </>
  )
}

/** Zoznam uložených zmlúv k eventu. */
function SavedList({ contracts, onOpen, canEdit }: { contracts: SavedContract[]; onOpen: (id: string) => void; canEdit: boolean }) {
  const companyId = useCompany().active!.companyId
  const queryClient = useQueryClient()
  const remove = useMutation({ mutationFn: deleteContract, onSettled: () => queryClient.invalidateQueries({ queryKey: ['company', companyId, 'events'] }) })
  if (contracts.length === 0) return null
  return (
    <div className="mx-auto mb-4 max-w-[210mm] rounded-xl border bg-surface p-4 text-foreground print:hidden">
      <h2 className="mb-2 text-sm font-medium">{tf('Uložené zmluvy ({0})', contracts.length)}</h2>
      <ul className="flex flex-col divide-y">
        {contracts.map((contract) => {
          const signed = [contract.supplierSignature, contract.clientSignature].filter(Boolean).length
          return (
            <li key={contract.id} className="flex flex-wrap items-center gap-2 py-2 text-sm">
              <button type="button" className="font-medium text-accent hover:underline" onClick={() => onOpen(contract.id)}>
                {contract.number}
              </button>
              <span className="min-w-0 flex-1 text-muted-foreground">
                {[
                  formatDate(contract.createdAt.slice(0, 10)),
                  tx(CONTRACT_KIND_LABELS[contract.kind]),
                  contract.snapshot.client.name,
                  contract.snapshot.terms.price !== null && formatMoney(contract.snapshot.terms.price, 'EUR'),
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
              <span className={signed === 2 ? 'text-emerald-700 dark:text-emerald-400' : 'text-muted-foreground'}>
                {signed === 2 ? tx('podpísaná') : signed === 1 ? tx('podpísaná jednou stranou') : tx('nepodpísaná')}
              </span>
              {canEdit && (
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={tf('Zmazať zmluvu {0}', contract.number)}
                  disabled={remove.isPending}
                  onClick={() => window.confirm(tf('Zmazať zmluvu {0}?', contract.number)) && remove.mutate(contract.id)}
                >
                  <Trash2 className="size-4" aria-hidden />
                </Button>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/** Zmluva k eventu na A4: vzor z údajov eventu, dodávateľa a organizátora; uloží sa s číslom a dá sa podpísať. */
export function ContractPage() {
  const { id = '' } = useParams()
  const [params, setParams] = useSearchParams()
  const company = useCompany().active!
  const companyId = company.companyId
  const events = useEvents(companyId)
  const issuers = useIssuers(companyId)
  const partners = usePartners(companyId)
  const offers = useOffers(companyId)
  const contracts = useContracts(companyId, id)
  const linked = useQuery({ queryKey: partnerKeys.ofEvent(companyId, id), queryFn: () => fetchEventPartners(companyId, id), retry: false })
  const event = events.data?.find((candidate) => candidate.id === id)
  const open = (contractId: string | null) => setParams(contractId ? { contract: contractId } : {}, { replace: false })
  const opened = contracts.data?.find((contract) => contract.id === params.get('contract'))

  const back = (
    <Link to={`/events/${id}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
      <ArrowLeft className="size-4" aria-hidden />
      {tx('Event')}
    </Link>
  )
  let body: ReactNode
  if (!can(company, 'events.edit')) body = <ErrorBlock message={tx('Na zmluvy k eventom nemáte oprávnenie.')} />
  else if (events.isPending || issuers.isPending || partners.isPending || linked.isPending || offers.isPending || contracts.isPending) body = <LoadingBlock />
  else if (events.isError) body = <ErrorBlock message={tx('Údaje sa nepodarilo načítať.')} onRetry={() => void events.refetch()} />
  else if (!event) body = <ErrorBlock message={tx('Tento event neexistuje alebo k nemu nemáte prístup.')} />
  else if (opened) body = <SavedContractView contract={opened} eventName={event.name} canEdit onBack={() => open(null)} />
  else {
    body = (
      <>
        <SavedList contracts={contracts.data ?? []} onOpen={open} canEdit />
        <ContractForm
          event={event}
          issuers={issuers.data ?? []}
          partners={partners.data ?? []}
          offers={offers.data ?? []}
          organizerId={linked.data?.find((item) => item.kind === 'organizer')?.partnerId}
          canSave={contracts.isSuccess}
          onSaved={open}
        />
      </>
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
