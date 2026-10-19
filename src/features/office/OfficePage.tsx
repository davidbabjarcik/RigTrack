import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Coffee, Minus, Plus, ShoppingBag, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { ErrorBlock, LoadingBlock } from '@/components/feedback/QueryState'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Field, SelectField } from '@/components/ui/field'
import { useAuth } from '@/features/auth/auth-context'
import { useCompany } from '@/features/companies/company-context'
import { useMembers } from '@/features/companies/useMembers'
import { formatNumber } from '@/features/equipment/model'
import { formatDate, todayIso } from '@/lib/format'
import { isAdminRole } from '@/lib/roles'
import { cn } from '@/lib/utils'
import {
  addOfficeItems,
  addOfficePurchase,
  COMMON_OFFICE_ITEMS,
  deleteOfficeItem,
  deleteOfficePurchase,
  officeStats,
  PACK_UNITS,
  updateOfficeItem,
  useOffice,
  type OfficeItem,
  type PackUnit,
} from './api'

function PurchaseForm({ companyId, items, preset, onDone }: { companyId: string; items: OfficeItem[]; preset: string; onDone: () => void }) {
  const queryClient = useQueryClient()
  const members = useMembers(companyId)
  const userId = useAuth().session?.user.id ?? ''
  const [itemId, setItemId] = useState(preset || items[0]?.id || '')
  const [quantity, setQuantity] = useState(1)
  const [packAmount, setPackAmount] = useState(Number.NaN)
  const [packUnit, setPackUnit] = useState<PackUnit | ''>('')
  const [boughtOn, setBoughtOn] = useState(todayIso())
  const [boughtBy, setBoughtBy] = useState(userId)
  const [note, setNote] = useState('')
  const save = useMutation({
    mutationFn: () => addOfficePurchase(companyId, { itemId, quantity, price: 0, packAmount: Number.isNaN(packAmount) ? null : packAmount, packUnit, boughtOn, boughtBy, note }),
    onSuccess: onDone,
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['company', companyId, 'office'] }),
  })
  function submit(event: FormEvent) {
    event.preventDefault()
    if (itemId && quantity > 0) save.mutate()
  }
  return (
    <form onSubmit={submit} className="mb-4 grid gap-3 rounded-xl border bg-surface p-4 sm:grid-cols-3">
      <SelectField label="Čo" value={itemId} onChange={(e) => setItemId(e.target.value)}>
        {items.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name}
          </option>
        ))}
      </SelectField>
      <Field label={`Koľko (${items.find((item) => item.id === itemId)?.unit ?? 'ks'})`} type="number" inputMode="decimal" min={0.01} step="any" value={Number.isNaN(quantity) ? '' : quantity} onChange={(e) => setQuantity(e.target.valueAsNumber)} />
      <div className="flex gap-2">
        <Field label="Balenie (nepovinné)" className="flex-1" type="number" inputMode="decimal" min={0} step="any" placeholder="napr. 1" value={Number.isNaN(packAmount) ? '' : packAmount} onChange={(e) => setPackAmount(e.target.valueAsNumber)} />
        <SelectField label="Jednotka" className="w-24" value={packUnit} onChange={(e) => setPackUnit(e.target.value as PackUnit | '')}>
          <option value="">—</option>
          {PACK_UNITS.map((unit) => (
            <option key={unit} value={unit}>
              {unit}
            </option>
          ))}
        </SelectField>
      </div>
      <SelectField label="Kto kúpil" value={boughtBy} onChange={(e) => setBoughtBy(e.target.value)}>
        {(members.data ?? [{ userId, fullName: 'ja', email: '' }]).map((member) => (
          <option key={member.userId} value={member.userId}>
            {member.fullName || member.email}
          </option>
        ))}
      </SelectField>
      <Field label="Kedy" type="date" value={boughtOn} onChange={(e) => setBoughtOn(e.target.value)} />
      <Field label="Poznámka" placeholder="napr. Lidl, vrátiť z pokladne" maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} />
      {save.isError && (
        <p role="alert" className="text-sm text-destructive sm:col-span-3">
          Nepodarilo sa uložiť.
        </p>
      )}
      <div className="flex gap-2 sm:col-span-3">
        <Button type="submit" size="sm" disabled={!itemId || !(quantity > 0) || save.isPending}>
          Zapísať nákup
        </Button>
        <Button variant="ghost" size="sm" onClick={onDone}>
          Zrušiť
        </Button>
      </div>
    </form>
  )
}

/** Kancelária: voda, káva, poháre… – koľko máme, kto čo kúpil a štatistiky. */
export function OfficePage() {
  const company = useCompany().active!
  const companyId = company.companyId
  const userId = useAuth().session?.user.id
  const admin = isAdminRole(company.role)
  const queryClient = useQueryClient()
  const { items, purchases } = useOffice(companyId)
  const [buying, setBuying] = useState<string | null>(null)
  const [newItem, setNewItem] = useState('')
  const [period, setPeriod] = useState(todayIso().slice(0, 4))
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['company', companyId, 'office'] })
  const addItems = useMutation({ mutationFn: (list: { name: string; unit: string }[]) => addOfficeItems(companyId, list), onSuccess: () => setNewItem(''), onSettled: refresh })
  const change = useMutation({ mutationFn: ({ id, quantity }: { id: string; quantity: number }) => updateOfficeItem(id, { quantity }), onSettled: refresh })
  const removeItem = useMutation({ mutationFn: deleteOfficeItem, onSettled: refresh })
  const removePurchase = useMutation({ mutationFn: deleteOfficePurchase, onSettled: refresh })

  if (items.isPending || purchases.isPending) return <LoadingBlock />
  if (items.isError || purchases.isError) {
    return <ErrorBlock message="Kanceláriu sa nepodarilo načítať. Táto časť databázy ešte nie je pripravená – kontaktujte vývojára aplikácie." onRetry={() => void items.refetch()} />
  }
  const list = items.data
  const nameOf = (id: string) => list.find((item) => item.id === id)?.name ?? '—'
  const stats = officeStats(purchases.data, period)
  const years = [...new Set([todayIso().slice(0, 4), ...purchases.data.map((purchase) => purchase.boughtOn.slice(0, 4))])].sort().reverse()
  const missingCommon = COMMON_OFFICE_ITEMS.filter((common) => !list.some((item) => item.name.toLowerCase() === common.name.toLowerCase()))

  return (
    <>
      <PageHeader
        title="Kancelária"
        description="Voda, káva, poháre a ďalší spotrebný materiál – koľko máme a kto čo kúpil"
        action={
          list.length > 0 &&
          buying === null && (
            <Button onClick={() => setBuying('')}>
              <ShoppingBag className="size-4" aria-hidden />
              Kúpil som
            </Button>
          )
        }
      />
      {buying !== null && <PurchaseForm companyId={companyId} items={list} preset={buying} onDone={() => setBuying(null)} />}

      {missingCommon.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-dashed bg-surface p-4 text-sm">
          <Coffee className="size-5 text-muted-foreground" aria-hidden />
          <span className="flex-1">Pridať bežné: {missingCommon.map((item) => item.name).join(', ')}</span>
          <Button variant="outline" size="sm" disabled={addItems.isPending} onClick={() => addItems.mutate(missingCommon)}>
            Pridať všetky
          </Button>
        </div>
      )}

      <ul className="mb-3 divide-y overflow-hidden rounded-xl border bg-surface">
        {list.map((item) => {
          const low = item.minQuantity !== null && item.quantity <= item.minQuantity
          return (
            <li key={item.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{item.name}</span>
                <span className={cn('block text-sm', low ? 'text-destructive' : 'text-muted-foreground')}>
                  máme {formatNumber(item.quantity)} {item.unit}
                  {low && ' · treba dokúpiť'}
                </span>
              </span>
              <span className="flex items-center gap-1">
                <Button variant="ghost" size="sm" aria-label={`Minulo sa: ${item.name}`} disabled={item.quantity <= 0 || change.isPending} onClick={() => change.mutate({ id: item.id, quantity: item.quantity - 1 })}>
                  <Minus className="size-4" aria-hidden />
                </Button>
                <Button variant="ghost" size="sm" aria-label={`Pridať: ${item.name}`} disabled={change.isPending} onClick={() => change.mutate({ id: item.id, quantity: item.quantity + 1 })}>
                  <Plus className="size-4" aria-hidden />
                </Button>
                <Button variant="outline" size="sm" onClick={() => setBuying(item.id)}>
                  Kúpil som
                </Button>
                {admin && (
                  <button type="button" aria-label={`Odstrániť ${item.name}`} className="rounded p-1 text-muted-foreground hover:bg-muted" onClick={() => window.confirm(`Odstrániť ${item.name} aj s nákupmi?`) && removeItem.mutate(item.id)}>
                    <X className="size-4" aria-hidden />
                  </button>
                )}
              </span>
            </li>
          )
        })}
        <li className="px-4 py-3">
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault()
              if (newItem.trim()) addItems.mutate([{ name: newItem, unit: 'ks' }])
            }}
          >
            <Field label="Nová položka" hideLabel className="flex-1" placeholder="Nová položka, napr. servítky" maxLength={80} value={newItem} onChange={(e) => setNewItem(e.target.value)} />
            <Button type="submit" variant="outline" size="sm" disabled={!newItem.trim() || addItems.isPending}>
              <Plus className="size-4" aria-hidden />
              Pridať
            </Button>
          </form>
        </li>
      </ul>
      <p className="mb-8 text-xs text-muted-foreground">−/+ upraví zásobu (napr. keď sa niečo minie). Nákup sa k zásobe pripočíta sám.</p>

      <section className="mb-8">
        <div className="mb-2 flex items-end justify-between gap-3">
          <h2 className="text-sm font-medium text-muted-foreground">Štatistiky</h2>
          <SelectField label="Obdobie" hideLabel className="w-40" value={period} onChange={(e) => setPeriod(e.target.value)}>
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
            <option value="">Celé obdobie</option>
          </SelectField>
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="rounded-xl border bg-surface p-4">
            <p className="text-sm text-muted-foreground">Kto koľkokrát kúpil</p>
            <ul className="mt-2 flex flex-col gap-1 text-sm">
              {stats.byPerson.map((person) => (
                <li key={person.id ?? person.name} className="flex justify-between gap-3">
                  <span>
                    {person.name || 'neznámy'}
                  </span>
                  <span className="font-medium">{person.count}×</span>
                </li>
              ))}
              {stats.byPerson.length === 0 && <li className="text-muted-foreground">Zatiaľ žiadne nákupy.</li>}
            </ul>
          </div>
          <div className="rounded-xl border bg-surface p-4">
            <p className="text-sm text-muted-foreground">Čoho sa koľko kúpilo</p>
            <ul className="mt-2 flex flex-col gap-1 text-sm">
              {stats.byItem.map((row) => (
                <li key={row.itemId} className="flex justify-between gap-3">
                  <span>
                    {nameOf(row.itemId)}{' '}
                    <span className="text-muted-foreground">
                      · {formatNumber(row.quantity)} {list.find((item) => item.id === row.itemId)?.unit}
                      {Object.entries(row.packs).map(([unit, amount]) => ` · ${formatNumber(amount)} ${unit}`)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-medium text-muted-foreground">Posledné nákupy</h2>
        <ul className="divide-y overflow-hidden rounded-xl border bg-surface text-sm">
          {purchases.data.slice(0, 50).map((purchase) => (
            <li key={purchase.id} className="flex items-center gap-3 px-4 py-2.5">
              <span className="min-w-0 flex-1">
                <span className="font-medium">{nameOf(purchase.itemId)}</span> · {formatNumber(purchase.quantity)}
                {purchase.packAmount && purchase.packUnit && ` × ${formatNumber(purchase.packAmount)} ${purchase.packUnit}`} · {purchase.boughtByName || 'neznámy'}
                <span className="block text-muted-foreground">{[formatDate(purchase.boughtOn), purchase.note].filter(Boolean).join(' · ')}</span>
              </span>
              {(admin || purchase.boughtBy === userId) && (
                <button type="button" aria-label="Zmazať nákup" className="rounded p-1 text-muted-foreground hover:bg-muted" onClick={() => window.confirm('Zmazať nákup? Odpočíta sa aj zo zásoby.') && removePurchase.mutate(purchase.id)}>
                  <X className="size-4" aria-hidden />
                </button>
              )}
            </li>
          ))}
          {purchases.data.length === 0 && <li className="px-4 py-6 text-center text-muted-foreground">Zatiaľ nikto nič nezapísal.</li>}
        </ul>
      </section>
    </>
  )
}
