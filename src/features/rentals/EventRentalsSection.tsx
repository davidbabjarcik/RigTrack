import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Copy, Mail, Plus, Trash2, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { CollapsibleSection } from '@/components/layout/CollapsibleSection'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { equipmentKeys, fetchEquipmentList } from '@/features/equipment/api'
import type { CompanyEvent } from '@/features/events/model'
import { usePartners } from '@/features/partners/api'
import { formatDate, formatDateTime } from '@/lib/format'
import { tf, tx } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { addSupplier, compareSuppliers, createRental, deleteRental, rentalKeys, rentalLink, revokeSupplier, setRentalStatus, useRentals, type NewRental, type RentalRequest, type RentalSupplier } from './api'

const money = (value: number) => value.toLocaleString('sk-SK', { style: 'currency', currency: 'EUR' })

function SupplierRow({ supplier, request, canEdit, onRevoke }: { supplier: RentalSupplier; request: RentalRequest; canEdit: boolean; onRevoke: () => void }) {
  const [copied, setCopied] = useState(false)
  const url = rentalLink(supplier.token)
  const state = supplier.revokedAt ? tx('odkaz zrušený') : supplier.respondedAt ? tf('odpovedal {0}', formatDateTime(supplier.respondedAt)) : supplier.viewedAt ? tf('otvoril {0}', formatDateTime(supplier.viewedAt)) : tx('zatiaľ neotvoril')
  const mail = supplier.email
    ? `mailto:${encodeURIComponent(supplier.email)}?subject=${encodeURIComponent(tf('Dopyt na prenájom: {0}', request.title))}&body=${encodeURIComponent(tf('Dobrý deň, posielame dopyt na prenájom techniky ({0} – {1}). Dostupnosť a ceny vyplníte tu: {2}', formatDate(request.from), formatDate(request.to), url))}`
    : ''
  return (
    <li className="flex flex-wrap items-center gap-2 py-2">
      <span className="min-w-0 flex-1">
        <span className="block font-medium">{supplier.name}</span>
        <span className="block text-xs text-muted-foreground">{[supplier.email, state].filter(Boolean).join(' · ')}</span>
        {supplier.message && <span className="block text-xs">{`„${supplier.message}“`}</span>}
      </span>
      {!supplier.revokedAt && (
        <>
          <Button size="sm" variant="outline" onClick={() => void navigator.clipboard.writeText(url).then(() => { setCopied(true); window.setTimeout(() => setCopied(false), 1500) })}>
            {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
            {copied ? tx('Skopírované') : tx('Odkaz')}
          </Button>
          {mail && (
            <a href={mail} className="inline-flex h-9 items-center gap-1 rounded-lg border px-3 text-sm font-medium hover:bg-muted">
              <Mail className="size-4" aria-hidden />{tx('E-mail')}
            </a>
          )}
          {canEdit && (
            <Button size="sm" variant="ghost" aria-label={tx('Zrušiť odkaz')} onClick={() => window.confirm(tf('Zrušiť odkaz pre „{0}“?', supplier.name)) && onRevoke()}>
              <X className="size-4" aria-hidden />
            </Button>
          )}
        </>
      )}
    </li>
  )
}

function RequestCard({ request, canEdit, partners, onChanged }: { request: RentalRequest; canEdit: boolean; partners: { id: string; name: string; email: string }[]; onChanged: () => void }) {
  const [supplierName, setSupplierName] = useState('')
  const [supplierEmail, setSupplierEmail] = useState('')
  const compare = compareSuppliers(request)
  const responded = request.suppliers.filter((supplier) => supplier.respondedAt)
  const add = useMutation({
    mutationFn: () => {
      const partner = partners.find((item) => item.name === supplierName)
      return addSupplier(request.id, supplierName, supplierEmail || partner?.email || '', partner?.id ?? null)
    },
    onSuccess: () => {
      setSupplierName('')
      setSupplierEmail('')
    },
    onSettled: onChanged,
  })
  const revoke = useMutation({ mutationFn: revokeSupplier, onSettled: onChanged })
  const status = useMutation({ mutationFn: (next: 'open' | 'closed') => setRentalStatus(request.id, next), onSettled: onChanged })
  const remove = useMutation({ mutationFn: () => deleteRental(request.id), onSettled: onChanged })

  return (
    <li className="flex flex-col gap-3 rounded-xl border bg-surface p-3">
      <div className="flex flex-wrap items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-medium">{request.title}</p>
          <p className="text-sm text-muted-foreground">{[`${formatDate(request.from)} – ${formatDate(request.to)}`, request.status === 'closed' ? tx('uzavretý') : tx('otvorený'), request.note].filter(Boolean).join(' · ')}</p>
        </div>
        {canEdit && (
          <>
            <Button size="sm" variant="outline" disabled={status.isPending} onClick={() => status.mutate(request.status === 'open' ? 'closed' : 'open')}>
              {request.status === 'open' ? tx('Uzavrieť') : tx('Znova otvoriť')}
            </Button>
            <Button size="sm" variant="ghost" aria-label={tx('Odstrániť dopyt')} onClick={() => window.confirm(tx('Odstrániť dopyt aj s odpoveďami dodávateľov?')) && remove.mutate()}>
              <Trash2 className="size-4" aria-hidden />
            </Button>
          </>
        )}
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted text-xs text-muted-foreground">
            <tr>
              <th className="px-2 py-1">{tx('Položka')}</th>
              <th className="px-2 py-1">{tx('Ks')}</th>
              {responded.map((supplier) => (
                <th key={supplier.id} className={cn('px-2 py-1', compare.cheapestComplete === supplier.id && 'text-emerald-700 dark:text-emerald-400')}>{supplier.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {request.items.map((item) => (
              <tr key={item.id} className="border-t">
                <td className="px-2 py-1">{item.name}{item.note && <span className="block text-xs text-muted-foreground">{item.note}</span>}</td>
                <td className="px-2 py-1">{item.quantity}</td>
                {responded.map((supplier) => {
                  const quote = compare.quoteOf(supplier.id, item.id)
                  const enough = quote && quote.available >= item.quantity
                  return (
                    <td key={supplier.id} className={cn('px-2 py-1 whitespace-nowrap', compare.best.get(item.id) === supplier.id && 'bg-emerald-50 font-medium dark:bg-emerald-950', quote && !enough && 'text-amber-700 dark:text-amber-300')}>
                      {quote && quote.available > 0 ? `${quote.available} ks${quote.unitPrice !== null ? ` × ${money(quote.unitPrice)}` : ''}` : '—'}
                      {quote?.note && <span className="block text-xs text-muted-foreground">{quote.note}</span>}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
          {responded.length > 0 && (
            <tfoot className="border-t bg-muted/50 text-sm">
              <tr>
                <td className="px-2 py-1 font-medium" colSpan={2}>{tx('Spolu (čo vie dodať)')}</td>
                {compare.suppliers.map((supplier) => (
                  <td key={supplier.id} className="px-2 py-1">
                    <span className="font-semibold">{money(supplier.total)}</span>
                    <span className="block text-xs text-muted-foreground">{tf('celé položky {0}/{1}', supplier.covered, request.items.length)}{supplier.priced ? '' : ` · ${tx('bez ceny pri niektorých')}`}</span>
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      {compare.cheapestComplete && <p className="text-sm text-emerald-700 dark:text-emerald-400">{tf('Najlacnejší kompletný: {0}', compare.suppliers.find((supplier) => supplier.id === compare.cheapestComplete)?.name ?? '')}</p>}

      <ul className="divide-y text-sm">
        {request.suppliers.map((supplier) => (
          <SupplierRow key={supplier.id} supplier={supplier} request={request} canEdit={canEdit} onRevoke={() => revoke.mutate(supplier.id)} />
        ))}
      </ul>
      {canEdit && request.status === 'open' && (
        <form
          onSubmit={(event: FormEvent) => {
            event.preventDefault()
            if (supplierName.trim()) add.mutate()
          }}
          className="flex flex-wrap items-end gap-2"
        >
          <Field label={tx('Ďalší dodávateľ')} list={`partners-${request.id}`} className="min-w-48 flex-1" maxLength={120} value={supplierName} onChange={(e) => setSupplierName(e.target.value)} />
          <datalist id={`partners-${request.id}`}>
            {partners.map((partner) => (
              <option key={partner.id} value={partner.name} />
            ))}
          </datalist>
          <Field label={tx('E-mail (nepovinné)')} type="email" className="min-w-48" maxLength={120} value={supplierEmail} onChange={(e) => setSupplierEmail(e.target.value)} />
          <Button type="submit" size="sm" className="mb-0.5" disabled={add.isPending || !supplierName.trim()}>
            <Plus className="size-4" aria-hidden />{tx('Pridať')}
          </Button>
        </form>
      )}
      {(add.isError || revoke.isError || status.isError || remove.isError) && <p role="alert" className="text-sm text-destructive">{tx('Zmena sa nepodarila.')}</p>}
    </li>
  )
}

type DraftItem = { key: string; equipmentId: string | null; name: string; quantity: number; on: boolean }

function NewRequestForm({ companyId, event, partners, onDone }: { companyId: string; event: CompanyEvent; partners: { id: string; name: string; email: string }[]; onDone: () => void }) {
  const equipment = useQuery({ queryKey: equipmentKeys.list(companyId), queryFn: () => fetchEquipmentList(companyId) })
  const fromEvent: DraftItem[] = event.equipment.map((line) => {
    const item = equipment.data?.find((piece) => piece.id === line.equipmentId)
    return { key: line.equipmentId, equipmentId: line.equipmentId, name: item?.name ?? '', quantity: Math.max(1, line.quantity - (item?.quantity ?? 0)), on: false }
  })
  const [title, setTitle] = useState(tf('Prenájom – {0}', event.name).slice(0, 120))
  const [note, setNote] = useState('')
  const [from, setFrom] = useState(event.startsOn)
  const [to, setTo] = useState(event.endsOn)
  const [picked, setPicked] = useState<Record<string, { on: boolean; quantity: number }>>({})
  const [custom, setCustom] = useState<DraftItem[]>([])
  const [suppliers, setSuppliers] = useState<{ key: string; name: string; email: string }[]>([{ key: 's0', name: '', email: '' }])
  const items = [
    ...fromEvent.filter((item) => picked[item.key]?.on && item.name).map((item) => ({ equipment_id: item.equipmentId, name: item.name, quantity: picked[item.key].quantity || item.quantity, note: '' })),
    ...custom.filter((item) => item.name.trim()).map((item) => ({ equipment_id: null, name: item.name.trim(), quantity: item.quantity, note: '' })),
  ]
  const supplierRows = suppliers.filter((supplier) => supplier.name.trim()).map((supplier) => {
    const partner = partners.find((item) => item.name === supplier.name.trim())
    return { partner_id: partner?.id ?? null, name: supplier.name.trim(), email: supplier.email.trim() || partner?.email || '' }
  })
  const create = useMutation({ mutationFn: () => createRental(event.id, { title, note, from, to, items, suppliers: supplierRows } satisfies NewRental), onSuccess: onDone })

  return (
    <form
      className="flex flex-col gap-3 rounded-xl border bg-surface p-3"
      onSubmit={(submit) => {
        submit.preventDefault()
        if (items.length > 0 && title.trim()) create.mutate()
      }}
    >
      <div className="grid gap-2 sm:grid-cols-4">
        <Field label={tx('Názov dopytu')} className="sm:col-span-2" maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} />
        <Field label={tx('Od')} type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <Field label={tx('Do')} type="date" min={from} value={to} onChange={(e) => setTo(e.target.value)} />
        <Field label={tx('Poznámka pre dodávateľa')} className="sm:col-span-4" maxLength={1000} placeholder={tx('napr. dovoz a odvoz zabezpečíme, montáž nie je potrebná')} value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      {fromEvent.length > 0 && (
        <fieldset>
          <legend className="mb-1 text-sm font-medium">{tx('Z techniky akcie (počet = koľko chýba oproti vlastným kusom, dá sa zmeniť)')}</legend>
          <ul className="grid gap-1 sm:grid-cols-2">
            {fromEvent.filter((item) => item.name).map((item) => (
              <li key={item.key} className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="size-4" aria-label={item.name} checked={picked[item.key]?.on ?? false} onChange={(e) => setPicked((value) => ({ ...value, [item.key]: { on: e.target.checked, quantity: value[item.key]?.quantity ?? item.quantity } }))} />
                <span className="min-w-0 flex-1 truncate">{item.name}</span>
                <input type="number" min={1} max={10000} aria-label={tf('Počet – {0}', item.name)} className="h-8 w-20 rounded-lg border bg-background px-2" value={picked[item.key]?.quantity ?? item.quantity} onChange={(e) => setPicked((value) => ({ ...value, [item.key]: { on: true, quantity: Math.max(1, Math.min(10000, Number(e.target.value) || 1)) } }))} />
              </li>
            ))}
          </ul>
        </fieldset>
      )}
      <fieldset className="flex flex-col gap-1">
        <legend className="mb-1 text-sm font-medium">{tx('Iné položky (čo nemáte v technike)')}</legend>
        {custom.map((item) => (
          <div key={item.key} className="flex gap-2">
            <input aria-label={tx('Položka')} maxLength={120} className="h-9 min-w-0 flex-1 rounded-lg border bg-background px-2 text-sm" value={item.name} onChange={(e) => setCustom((value) => value.map((row) => (row.key === item.key ? { ...row, name: e.target.value } : row)))} />
            <input aria-label={tx('Ks')} type="number" min={1} max={10000} className="h-9 w-20 rounded-lg border bg-background px-2 text-sm" value={item.quantity} onChange={(e) => setCustom((value) => value.map((row) => (row.key === item.key ? { ...row, quantity: Math.max(1, Math.min(10000, Number(e.target.value) || 1)) } : row)))} />
          </div>
        ))}
        <div>
          <Button size="sm" variant="outline" onClick={() => setCustom((value) => [...value, { key: `c${value.length}`, equipmentId: null, name: '', quantity: 1, on: true }])}>
            <Plus className="size-4" aria-hidden />{tx('Pridať položku')}
          </Button>
        </div>
      </fieldset>
      <fieldset className="flex flex-col gap-1">
        <legend className="mb-1 text-sm font-medium">{tx('Dodávatelia (každý dostane vlastný odkaz)')}</legend>
        <datalist id="rental-partners">
          {partners.map((partner) => (
            <option key={partner.id} value={partner.name} />
          ))}
        </datalist>
        {suppliers.map((supplier, index) => (
          <div key={supplier.key} className="flex flex-wrap gap-2">
            <input aria-label={tf('Dodávateľ {0}', index + 1)} list="rental-partners" maxLength={120} placeholder={tx('Firma (z kontaktov alebo nová)')} className="h-9 min-w-48 flex-1 rounded-lg border bg-background px-2 text-sm" value={supplier.name} onChange={(e) => setSuppliers((value) => value.map((row) => (row.key === supplier.key ? { ...row, name: e.target.value } : row)))} />
            <input aria-label={tf('E-mail dodávateľa {0}', index + 1)} type="email" maxLength={120} placeholder={tx('E-mail (nepovinné)')} className="h-9 min-w-48 rounded-lg border bg-background px-2 text-sm" value={supplier.email} onChange={(e) => setSuppliers((value) => value.map((row) => (row.key === supplier.key ? { ...row, email: e.target.value } : row)))} />
          </div>
        ))}
        <div>
          <Button size="sm" variant="outline" disabled={suppliers.length >= 30} onClick={() => setSuppliers((value) => [...value, { key: `s${value.length}`, name: '', email: '' }])}>
            <Plus className="size-4" aria-hidden />{tx('Ďalší dodávateľ')}
          </Button>
        </div>
      </fieldset>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" size="sm" disabled={create.isPending || items.length === 0 || !title.trim()}>{tf('Vytvoriť dopyt ({0} položiek)', items.length)}</Button>
        <Button size="sm" variant="ghost" onClick={onDone}>{tx('Zrušiť')}</Button>
      </div>
      {create.isError && <p role="alert" className="text-sm text-destructive">{create.error.message || tx('Dopyt sa nepodarilo vytvoriť.')}</p>}
    </form>
  )
}

/** Dopyty na prenájom pri akcii: čo chýba, odkazy pre dodávateľov a porovnanie ich odpovedí. */
export function EventRentalsSection({ companyId, event, canEdit }: { companyId: string; event: CompanyEvent; canEdit: boolean }) {
  const queryClient = useQueryClient()
  const rentals = useRentals(companyId, event.id)
  const partners = usePartners(companyId)
  const [adding, setAdding] = useState(false)
  if (!rentals.data) return null
  const refresh = () => void queryClient.invalidateQueries({ queryKey: rentalKeys.ofEvent(companyId, event.id) })
  const partnerList = (partners.data ?? []).map((partner) => ({ id: partner.id, name: partner.name, email: partner.contacts?.find((contact) => contact.email)?.email ?? '' }))
  return (
    <CollapsibleSection
      id="event.rentals"
      title={tf('Dopyty na prenájom ({0})', rentals.data.length)}
      actions={
        canEdit &&
        !adding && (
          <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
            <Plus className="size-4" aria-hidden />{tx('Nový dopyt')}
          </Button>
        )
      }
    >
      {adding && (
        <div className="mb-3">
          <NewRequestForm
            companyId={companyId}
            event={event}
            partners={partnerList}
            onDone={() => {
              setAdding(false)
              refresh()
            }}
          />
        </div>
      )}
      {rentals.data.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {rentals.data.map((request) => (
            <RequestCard key={request.id} request={request} canEdit={canEdit} partners={partnerList} onChanged={refresh} />
          ))}
        </ul>
      ) : (
        !adding && <p className="text-sm text-muted-foreground">{tx('Chýba vám technika? Pošlite dopyt viacerým požičovniam naraz – každá vyplní dostupnosť a cenu cez vlastný odkaz a odpovede tu porovnáte.')}</p>
      )}
    </CollapsibleSection>
  )
}
