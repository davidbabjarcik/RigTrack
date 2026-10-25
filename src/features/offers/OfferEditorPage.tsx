import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Plus, Printer, Save, Trash2, UserPlus } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ErrorBlock, LoadingBlock } from '@/components/feedback/QueryState'
import { Button, LinkButton } from '@/components/ui/button'
import { Field, SelectField, TextareaField } from '@/components/ui/field'
import { useAuth } from '@/features/auth/auth-context'
import { useCompany } from '@/features/companies/company-context'
import { useCompanyProfile } from '@/features/companies/profile'
import { memberName, useMembers } from '@/features/companies/useMembers'
import { equipmentKeys, fetchEquipmentList } from '@/features/equipment/api'
import { eventDates } from '@/features/events/plan'
import { useEvents } from '@/features/events/useEvents'
import { partnerKeys, savePartner, usePartners } from '@/features/partners/api'
import { formatDate, formatMoney, todayIso } from '@/lib/format'
import { can } from '@/lib/permissions'
import { cn } from '@/lib/utils'
import { deleteOffer, ISSUER_KIND_LABELS, offerKeys, saveOffer, saveTemplate, useIssuers, useOffer, useTemplates, type OfferFields } from './api'
import {
  EMPTY_CLIENT,
  EMPTY_ISSUER,
  emptyPart,
  itemsFromEquipment,
  normalizePart,
  numberFromDate,
  OFFER_STATUS_LABELS,
  sumPrices,
  VAT_MODE_LABELS,
  type OfferPart,
  type OfferStatus,
  type VatMode,
} from './model'
import { OfferActions } from './OfferActions'
import { PartEditor } from './PartEditor'

const money = (value: number) => formatMoney(value, 'EUR')

/** Cenová ponuka – nová alebo úprava: hlavička, vystavovateľ, klient, rozpočet, časti a ceny. */
export function OfferEditorPage() {
  const { id = 'new' } = useParams()
  const [params] = useSearchParams()
  const company = useCompany().active!
  const companyId = company.companyId
  const userId = useAuth().session?.user.id
  const offer = useOffer(companyId, id)
  const events = useEvents(companyId)
  const issuers = useIssuers(companyId)
  const profile = useCompanyProfile(companyId)
  const members = useMembers(companyId)

  if (id !== 'new' && offer.isPending) return <LoadingBlock />
  if (id !== 'new' && (offer.isError || !offer.data)) return <ErrorBlock message="Ponuka sa nenašla alebo k nej nemáte prístup." />
  if (events.isPending || issuers.isPending) return <LoadingBlock />

  let initial: OfferFields
  if (offer.data) {
    initial = offer.data
  } else {
    // Nová ponuka: vystavovateľ (prvý uložený, inak údaje firmy), voliteľne z eventu (?event=…).
    const issuer = issuers.data?.[0]
    const firm = profile.data
    const event = events.data?.find((item) => item.id === params.get('event'))
    const today = todayIso()
    initial = {
      eventId: event?.id ?? null,
      number: numberFromDate(today),
      status: 'draft',
      client: { ...EMPTY_CLIENT, name: event?.organizer ?? '' },
      issuerId: issuer?.id ?? null,
      issuer: issuer
        ? { name: issuer.name, address: issuer.address, ico: issuer.ico, dic: issuer.dic, icDph: issuer.icDph, contact: issuer.contact, vatPayer: issuer.vatPayer }
        : { ...EMPTY_ISSUER, name: firm?.legalName || company.companyName, address: firm?.address ?? '', ico: firm?.ico ?? '', dic: firm?.dic ?? '', icDph: firm?.icDph ?? '', contact: [firm?.phone, firm?.email].filter(Boolean).join('\n') },
      budget: null,
      title: event?.name ?? '',
      place: event?.venue ?? '',
      serviceDates: event ? (event.startsOn === event.endsOn ? formatDate(event.startsOn) : `${formatDate(event.startsOn)} – ${formatDate(event.endsOn)}`) : '',
      issuedOn: today,
      sections: [emptyPart()],
      vatMode: issuer && !issuer.vatPayer ? 'none' : 'with',
      vatPct: 23,
      totalOverride: null,
      notes: '',
      authorName: memberName(members.data, userId ?? null),
    }
  }
  return <OfferEditor key={id} id={id === 'new' ? null : id} initial={initial} />
}

function OfferEditor({ id, initial }: { id: string | null; initial: OfferFields }) {
  const company = useCompany().active!
  const companyId = company.companyId
  const canEdit = can(company, 'offers.edit')
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const events = useEvents(companyId)
  const issuers = useIssuers(companyId)
  const partners = usePartners(companyId)
  const templates = useTemplates(companyId)
  const equipment = useQuery({ queryKey: equipmentKeys.list(companyId), queryFn: () => fetchEquipmentList(companyId), enabled: can(company, 'equipment.view') })
  const [draft, setDraft] = useState<OfferFields>(initial)
  const [dirty, setDirty] = useState(false)
  const set = (patch: Partial<OfferFields>) => {
    setDraft((current) => ({ ...current, ...patch }))
    setDirty(true)
  }
  const setSections = (sections: OfferPart[]) => set({ sections })
  const save = useMutation({
    mutationFn: () => saveOffer(companyId, id, draft),
    onSuccess: async (savedId) => {
      setDirty(false)
      await queryClient.invalidateQueries({ queryKey: offerKeys.list(companyId) })
      if (!id) navigate(`/offers/${savedId}`, { replace: true })
    },
  })
  const remove = useMutation({
    mutationFn: () => deleteOffer(companyId, id!),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: offerKeys.list(companyId) })
      navigate('/offers', { replace: true })
    },
  })
  const profile = useCompanyProfile(companyId)
  const members = useMembers(companyId)
  const userId = useAuth().session?.user.id ?? null
  // „Vyhotovil“: ja alebo CEO firmy (iné meno sa dá napísať).
  const authors = [...new Set([memberName(members.data, userId), profile.data?.ceoName ?? ''].map((name) => name.trim()).filter(Boolean))]
  const knownClient = (partners.data ?? []).some((partner) => [partner.name, partner.legalName].some((name) => name && name.trim().toLowerCase() === draft.client.name.trim().toLowerCase()))
  const addPartner = useMutation({
    mutationFn: () =>
      savePartner(companyId, null, { name: draft.client.name, legalName: '', ico: draft.client.ico, dic: draft.client.dic, icDph: '', ceo: '', address: draft.client.address, usesApp: false, note: draft.client.contact }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: partnerKeys.list(companyId) }),
  })
  const keepTemplate = useMutation({ mutationFn: (part: OfferPart) => saveTemplate(companyId, part), onSettled: () => queryClient.invalidateQueries({ queryKey: offerKeys.templates(companyId) }) })

  const event = events.data?.find((item) => item.id === draft.eventId)
  const days = event ? eventDates(event.startsOn, event.endsOn).length : 1
  const eventItems = event && equipment.data ? itemsFromEquipment(event.equipment, equipment.data) : undefined
  const sum = sumPrices(draft.sections)
  const total = draft.totalOverride ?? sum
  const remaining = draft.budget === null ? null : Math.round((draft.budget - sum) * 100) / 100
  const used = draft.budget ? Math.min(100, (sum / draft.budget) * 100) : 0
  const move = (from: number, direction: -1 | 1) => {
    const to = from + direction
    if (to < 0 || to >= draft.sections.length) return
    const next = [...draft.sections]
    ;[next[from], next[to]] = [next[to], next[from]]
    setSections(next)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link to="/offers" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" aria-hidden />
          Cenové ponuky
        </Link>
        <div className="flex flex-wrap gap-2">
          {id && can(company, 'offers.delete') && (
            <Button variant="ghost" size="sm" disabled={remove.isPending} onClick={() => window.confirm('Zmazať túto cenovú ponuku?') && remove.mutate()}>
              <Trash2 className="size-4" aria-hidden />
              Zmazať
            </Button>
          )}
          {id && (
            <LinkButton to={`/offers/${id}/print`} variant="outline" size="sm">
              <Printer className="size-4" aria-hidden />
              Náhľad a tlač / PDF
            </LinkButton>
          )}
          {canEdit && (
            <Button size="sm" disabled={save.isPending || (!dirty && Boolean(id))} onClick={() => save.mutate()}>
              <Save className="size-4" aria-hidden />
              {save.isPending ? 'Ukladám…' : 'Uložiť'}
            </Button>
          )}
        </div>
      </div>
      <h1 className="text-2xl font-semibold tracking-tight">{id ? `Cenová ponuka ${draft.number}` : 'Nová cenová ponuka'}</h1>
      {save.isError && <p className="text-sm text-destructive">Ponuku sa nepodarilo uložiť. Táto časť databázy ešte nemusí byť pripravená (migrácia 0096).</p>}

      {id && <OfferActions companyId={companyId} id={id} draft={draft} canEdit={canEdit} />}

      {/* Rozpočet a súčet – stále na očiach pri skladaní. */}
      <div className="sticky top-0 z-10 flex flex-col gap-2 rounded-xl border bg-surface/95 p-3 backdrop-blur">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span>
            Súčet častí: <span className="font-semibold tabular-nums">{money(sum)}</span>
          </span>
          {draft.totalOverride !== null && (
            <span>
              Celková (zvýhodnená): <span className="font-semibold tabular-nums">{money(total)}</span>
            </span>
          )}
          {remaining !== null && (
            <span className={cn('font-medium', remaining < 0 ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400')}>
              {remaining < 0 ? `Nad rozpočet o ${money(-remaining)}` : `Ostáva ${money(remaining)} z ${money(draft.budget!)}`}
            </span>
          )}
          <label className="ml-auto flex items-center gap-2">
            Max. rozpočet (€)
            <input
              type="number"
              min={0}
              step="10"
              placeholder="bez limitu"
              className="h-8 w-28 rounded-md border bg-background px-2 text-right"
              value={draft.budget ?? ''}
              onChange={(e) => set({ budget: e.target.value === '' ? null : Math.max(0, Number(e.target.value)) })}
            />
          </label>
        </div>
        {draft.budget !== null && draft.budget > 0 && (
          <div className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
            <div className={cn('h-full rounded-full transition-all', remaining !== null && remaining < 0 ? 'bg-destructive' : 'bg-accent')} style={{ width: `${used}%` }} />
          </div>
        )}
      </div>

      <fieldset disabled={!canEdit} className="flex flex-col gap-4">
        <section className="grid gap-3 rounded-xl border bg-surface p-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Číslo ponuky" maxLength={40} value={draft.number} onChange={(e) => set({ number: e.target.value })} />
          <Field label="Dátum vystavenia" type="date" value={draft.issuedOn} onChange={(e) => set({ issuedOn: e.target.value })} />
          <SelectField label="Stav" value={draft.status} onChange={(e) => set({ status: e.target.value as OfferStatus })}>
            {Object.entries(OFFER_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </SelectField>
          <SelectField label="Event (nepovinné)" value={draft.eventId ?? ''} onChange={(e) => set({ eventId: e.target.value || null })}>
            <option value="">— bez eventu —</option>
            {(events.data ?? [])
              .slice()
              .sort((a, b) => b.startsOn.localeCompare(a.startsOn))
              .map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({formatDate(item.startsOn)})
                </option>
              ))}
          </SelectField>
          <Field label="Podujatie" className="sm:col-span-2" maxLength={200} value={draft.title} onChange={(e) => set({ title: e.target.value })} />
          <Field label="Miesto dodania" maxLength={200} value={draft.place} onChange={(e) => set({ place: e.target.value })} />
          <Field label="Termín dodania" maxLength={200} placeholder="napr. 12. 6. 2026" value={draft.serviceDates} onChange={(e) => set({ serviceDates: e.target.value })} />
        </section>

        <div className="grid gap-4 lg:grid-cols-2">
          <section className="flex flex-col gap-3 rounded-xl border bg-surface p-4">
            <h2 className="font-medium">Vystavuje</h2>
            {(issuers.data ?? []).length > 0 ? (
              <div role="radiogroup" aria-label="Vystavovateľ" className="flex flex-wrap gap-1 rounded-lg bg-muted p-1 sm:self-start">
                {issuers.data!.map((issuer) => (
                  <button
                    key={issuer.id}
                    type="button"
                    role="radio"
                    aria-checked={draft.issuerId === issuer.id}
                    onClick={() => {
                      const fields = { name: issuer.name, address: issuer.address, ico: issuer.ico, dic: issuer.dic, icDph: issuer.icDph, contact: issuer.contact, vatPayer: issuer.vatPayer }
                      set({ issuerId: issuer.id, issuer: fields, vatMode: fields.vatPayer ? (draft.vatMode === 'none' ? 'with' : draft.vatMode) : 'none' })
                    }}
                    className={cn('rounded-md px-3 py-1.5 text-sm font-medium', draft.issuerId === issuer.id ? 'bg-surface text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}
                  >
                    {issuer.kind === 'other' ? issuer.name : ISSUER_KIND_LABELS[issuer.kind]}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Použijú sa Údaje o firme. Či firma vystavuje ako s.r.o. alebo živnosť, nastavíte v{' '}
                <Link to="/settings" className="text-accent hover:underline">
                  Nastavenia → Firma
                </Link>
                .
              </p>
            )}
            <p className="text-sm whitespace-pre-line">
              <span className="font-medium">{draft.issuer.name || '—'}</span>
              {[draft.issuer.address, draft.issuer.ico && `IČO ${draft.issuer.ico}`, draft.issuer.dic && `DIČ ${draft.issuer.dic}`, draft.issuer.icDph && `IČ DPH ${draft.issuer.icDph}`, draft.issuer.vatPayer ? '' : 'neplatiteľ DPH', draft.issuer.contact]
                .filter(Boolean)
                .map((line) => `\n${line}`)}
            </p>
            <details className="text-sm">
              <summary className="cursor-pointer text-muted-foreground">Upraviť údaje len v tejto ponuke</summary>
              <div className="mt-2 flex flex-col gap-2">
                <Field label="Názov" maxLength={160} value={draft.issuer.name} onChange={(e) => set({ issuer: { ...draft.issuer, name: e.target.value } })} />
                <TextareaField label="Adresa" rows={2} maxLength={300} value={draft.issuer.address} onChange={(e) => set({ issuer: { ...draft.issuer, address: e.target.value } })} />
                <div className="grid gap-2 sm:grid-cols-3">
                  <Field label="IČO" maxLength={20} value={draft.issuer.ico} onChange={(e) => set({ issuer: { ...draft.issuer, ico: e.target.value } })} />
                  <Field label="DIČ" maxLength={20} value={draft.issuer.dic} onChange={(e) => set({ issuer: { ...draft.issuer, dic: e.target.value } })} />
                  <Field label="IČ DPH" maxLength={20} value={draft.issuer.icDph} onChange={(e) => set({ issuer: { ...draft.issuer, icDph: e.target.value } })} />
                </div>
                <TextareaField label="Kontakt" rows={2} maxLength={300} value={draft.issuer.contact} onChange={(e) => set({ issuer: { ...draft.issuer, contact: e.target.value } })} />
              </div>
            </details>
          </section>

          <section className="flex flex-col gap-3 rounded-xl border bg-surface p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-medium">Ponuka pre</h2>
              {(partners.data ?? []).length > 0 && (
                <select
                  aria-label="Vybrať z Firiem a kontaktov"
                  className="h-9 rounded-lg border bg-background px-2 text-sm"
                  value=""
                  onChange={(e) => {
                    const partner = partners.data!.find((item) => item.id === e.target.value)
                    if (!partner) return
                    const person = partner.contacts[0]
                    set({
                      client: {
                        name: partner.legalName || partner.name,
                        address: partner.address,
                        ico: partner.ico,
                        dic: partner.dic,
                        contact: person ? [person.name, person.phone, person.email].filter(Boolean).join(', ') : '',
                      },
                    })
                  }}
                >
                  <option value="">Z Firiem a kontaktov…</option>
                  {partners.data!.map((partner) => (
                    <option key={partner.id} value={partner.id}>
                      {partner.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <Field label="Názov / meno" maxLength={160} value={draft.client.name} onChange={(e) => set({ client: { ...draft.client, name: e.target.value } })} />
            <TextareaField label="Adresa" rows={2} maxLength={300} value={draft.client.address} onChange={(e) => set({ client: { ...draft.client, address: e.target.value } })} />
            <div className="grid gap-2 sm:grid-cols-2">
              <Field label="IČO" maxLength={20} value={draft.client.ico} onChange={(e) => set({ client: { ...draft.client, ico: e.target.value } })} />
              <Field label="DIČ" maxLength={20} value={draft.client.dic} onChange={(e) => set({ client: { ...draft.client, dic: e.target.value } })} />
            </div>
            <Field label="Kontaktná osoba" maxLength={200} value={draft.client.contact} onChange={(e) => set({ client: { ...draft.client, contact: e.target.value } })} />
            {draft.client.name.trim() && !knownClient && (
              <Button variant="outline" size="sm" className="self-start" disabled={addPartner.isPending} onClick={() => addPartner.mutate()}>
                <UserPlus className="size-4" aria-hidden />
                {addPartner.isPending ? 'Ukladám…' : 'Uložiť do Firiem a kontaktov'}
              </Button>
            )}
            {addPartner.isSuccess && <p className="text-xs text-muted-foreground">Uložené do Firiem a kontaktov.</p>}
          </section>
        </div>

        <section className="flex flex-col gap-3">
          <h2 className="font-medium">Časti ponuky</h2>
          {draft.sections.map((part, index) => (
            <PartEditor
              key={part.id}
              part={part}
              index={index}
              equipment={equipment.data ?? []}
              defaultDays={days}
              remaining={remaining}
              eventItems={eventItems}
              onChange={(next) => setSections(draft.sections.map((item) => (item.id === part.id ? next : item)))}
              onRemove={() => setSections(draft.sections.filter((item) => item.id !== part.id))}
              onMove={(direction) => move(index, direction)}
              onSaveTemplate={() => keepTemplate.mutate(part)}
            />
          ))}
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setSections([...draft.sections, emptyPart()])}>
              <Plus className="size-4" aria-hidden />
              Pridať časť
            </Button>
            {(templates.data ?? []).length > 0 && (
              <select
                aria-label="Pridať časť zo šablóny"
                className="h-9 rounded-lg border bg-background px-2 text-sm"
                value=""
                onChange={(e) => {
                  const template = templates.data!.find((item) => item.id === e.target.value)
                  // Šablóna dostane nové id, aby sa dala použiť viackrát.
                  if (template) setSections([...draft.sections, normalizePart({ ...template.part, id: undefined, parts: template.part.parts.map((child) => ({ ...child, id: undefined as never })) })])
                }}
              >
                <option value="">Pridať zo šablóny…</option>
                {templates.data!.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.title}
                  </option>
                ))}
              </select>
            )}
            {keepTemplate.isSuccess && <span className="text-xs text-muted-foreground">Uložené ako šablóna.</span>}
          </div>
        </section>

        <section className="grid gap-3 rounded-xl border bg-surface p-4 sm:grid-cols-2 lg:grid-cols-4">
          <SelectField label="DPH" value={draft.vatMode} onChange={(e) => set({ vatMode: e.target.value as VatMode })}>
            {Object.entries(VAT_MODE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </SelectField>
          <Field label="Sadzba DPH %" type="number" min={0} max={100} disabled={draft.vatMode === 'none'} value={draft.vatPct} onChange={(e) => set({ vatPct: Math.min(100, Math.max(0, Number(e.target.value) || 0)) })} />
          <Field
            label="Celková cena – zvýhodnená (€)"
            type="number"
            min={0}
            step="0.01"
            placeholder={`súčet ${money(sum)}`}
            value={draft.totalOverride ?? ''}
            onChange={(e) => set({ totalOverride: e.target.value === '' ? null : Math.max(0, Number(e.target.value)) })}
          />
          <div className="flex flex-col gap-1">
            <Field label="Vyhotovil" maxLength={120} value={draft.authorName} onChange={(e) => set({ authorName: e.target.value })} />
            <div className="flex flex-wrap gap-1">
              {authors.map((name) => (
                <button
                  key={name}
                  type="button"
                  className={cn('rounded-full border px-2 py-0.5 text-xs', draft.authorName === name ? 'border-primary bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted')}
                  onClick={() => set({ authorName: name })}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
          <TextareaField
            label="Poznámky na konci ponuky"
            className="sm:col-span-2 lg:col-span-4"
            rows={3}
            maxLength={3000}
            placeholder="napr. platnosť ponuky, podmienky, kontakt pre individuálnu ponuku"
            value={draft.notes}
            onChange={(e) => set({ notes: e.target.value })}
          />
        </section>
      </fieldset>
      {dirty && canEdit && <p className="text-sm text-accent">Máte neuložené zmeny.</p>}
    </div>
  )
}

