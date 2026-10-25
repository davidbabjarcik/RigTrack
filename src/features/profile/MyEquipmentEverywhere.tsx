import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Box, ExternalLink, Plus, RefreshCw, Speaker, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Field, SelectField } from '@/components/ui/field'
import { useCompany, type Membership } from '@/features/companies/company-context'
import { EQUIPMENT_KINDS, KIND_LABELS, type EquipmentKind } from '@/features/equipment/model'
import {
  createOwnCase,
  createOwnEverywhere,
  myEquipmentKeys,
  shareEquipment,
  syncEquipment,
  unshareEquipment,
  useMyCases,
  useMyEquipment,
} from './myEquipment'

const ALL = 'all'
const EMPTY_ITEM = { name: '', kind: 'audio' as EquipmentKind, quantity: '1', manufacturer: '', model: '' }

/** Moja vlastná technika a moje case / racky: zoznam, pridanie, pridanie do ďalšej firmy, prenesenie zmien a odobratie. */
export function MyEquipmentEverywhere({ userId, memberships }: { userId: string; memberships: Membership[] }) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { setActive } = useCompany()
  const gear = useMyEquipment(userId)
  const cases = useMyCases(userId)
  const [item, setItem] = useState(EMPTY_ITEM)
  const [itemTarget, setItemTarget] = useState(memberships.length > 1 ? ALL : (memberships[0]?.companyId ?? ''))
  const [caseName, setCaseName] = useState('')
  const [caseTarget, setCaseTarget] = useState(memberships[0]?.companyId ?? '')
  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: myEquipmentKeys.all(userId) }),
      queryClient.invalidateQueries({ queryKey: myEquipmentKeys.cases(userId) }),
      queryClient.invalidateQueries({ queryKey: ['company'] }),
    ])
  const share = useMutation({ mutationFn: ({ id, companyId }: { id: string; companyId: string }) => shareEquipment(id, companyId), onSettled: refresh })
  const sync = useMutation({ mutationFn: syncEquipment, onSettled: refresh })
  const unshare = useMutation({ mutationFn: unshareEquipment, onSettled: refresh })
  const addItem = useMutation({
    mutationFn: () =>
      createOwnEverywhere(itemTarget === ALL ? memberships.map((m) => m.companyId) : [itemTarget], {
        name: item.name.trim(),
        kind: item.kind,
        quantity: Math.max(1, Number(item.quantity) || 1),
        manufacturer: item.manufacturer,
        model: item.model,
      }),
    onSuccess: () => setItem(EMPTY_ITEM),
    onSettled: refresh,
  })
  const addCase = useMutation({ mutationFn: () => createOwnCase(caseTarget, caseName.trim()), onSuccess: () => setCaseName(''), onSettled: refresh })
  const busy = share.isPending || sync.isPending || unshare.isPending || addItem.isPending || addCase.isPending
  const nameOf = (companyId: string) => memberships.find((m) => m.companyId === companyId)?.companyName ?? 'firma'
  const open = (companyId: string, path: string) => {
    setActive(companyId)
    navigate(path)
  }

  function submitItem(event: FormEvent) {
    event.preventDefault()
    if (item.name.trim() && itemTarget) addItem.mutate()
  }
  function submitCase(event: FormEvent) {
    event.preventDefault()
    if (caseName.trim() && caseTarget) addCase.mutate()
  }

  const companyOptions = memberships.map((m) => (
    <option key={m.companyId} value={m.companyId}>
      {m.companyName}
    </option>
  ))

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[3fr_2fr]">
      <section className="flex flex-col gap-3 rounded-xl border bg-surface p-4" aria-labelledby="my-gear-heading">
        <h2 id="my-gear-heading" className="flex items-center gap-2 font-medium">
          <Speaker className="size-5 text-accent" aria-hidden />
          Technika
        </h2>
        <p className="text-sm text-muted-foreground">
          Technika, ktorá patrí vám. Vo firme je vedená ako vaša a dá sa dať na event. Pridajte ju aj do ďalšej firmy; zmeny pôvodnej položky sa do kópií prenesú samy.
        </p>

        {memberships.length > 0 && (
          <form onSubmit={submitItem} className="grid gap-2 rounded-lg border border-dashed p-3 sm:grid-cols-2">
            <Field label="Názov *" maxLength={120} placeholder="napr. Behringer X32" value={item.name} onChange={(e) => setItem({ ...item, name: e.target.value })} />
            <SelectField label="Druh" value={item.kind} onChange={(e) => setItem({ ...item, kind: e.target.value as EquipmentKind })}>
              {EQUIPMENT_KINDS.map((kind) => (
                <option key={kind} value={kind}>
                  {KIND_LABELS[kind]}
                </option>
              ))}
            </SelectField>
            <Field label="Výrobca" maxLength={80} value={item.manufacturer} onChange={(e) => setItem({ ...item, manufacturer: e.target.value })} />
            <Field label="Model" maxLength={80} value={item.model} onChange={(e) => setItem({ ...item, model: e.target.value })} />
            <Field label="Počet" type="number" min={1} value={item.quantity} onChange={(e) => setItem({ ...item, quantity: e.target.value })} />
            <SelectField label="Do firmy" value={itemTarget} onChange={(e) => setItemTarget(e.target.value)}>
              {memberships.length > 1 && <option value={ALL}>Všetky moje firmy</option>}
              {companyOptions}
            </SelectField>
            <Button type="submit" className="sm:col-span-2 sm:justify-self-start" disabled={busy || !item.name.trim()}>
              <Plus className="size-4" aria-hidden />
              {addItem.isPending ? 'Pridávam…' : 'Pridať techniku'}
            </Button>
          </form>
        )}

        {gear.isPending ? (
          <p className="text-sm text-muted-foreground">Načítavam…</p>
        ) : gear.isError ? (
          <p className="text-sm text-muted-foreground">Technika sa nepodarila načítať.</p>
        ) : gear.data.length === 0 ? (
          <p className="text-sm text-muted-foreground">Zatiaľ nemáte žiadnu vlastnú techniku.</p>
        ) : (
          <ul className="divide-y rounded-lg border text-sm">
            {gear.data.map(({ original, copies }) => {
              const present = new Set([original.companyId, ...copies.map((copy) => copy.companyId)])
              const missing = memberships.filter((m) => !present.has(m.companyId))
              return (
                <li key={original.id} className="flex flex-col gap-2 px-3 py-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium">
                      {original.name} <span className="font-normal text-muted-foreground">· {original.quantity} ks</span>
                    </span>
                    <span className="flex gap-1">
                      {copies.length > 0 && (
                        <Button size="sm" variant="ghost" title="Kópie sa aktualizujú samy; toto ich dorovná hneď" disabled={busy} onClick={() => sync.mutate(original.id)}>
                          <RefreshCw className="size-4" aria-hidden />
                          Dorovnať kópie
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => open(original.companyId, `/equipment/${original.id}`)}>
                        <ExternalLink className="size-4" aria-hidden />
                        Upraviť
                      </Button>
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="rounded-full bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground">{nameOf(original.companyId)}</span>
                    {copies.map((copy) => (
                      <span key={copy.id} className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
                        {nameOf(copy.companyId)}
                        <button
                          type="button"
                          aria-label={`Odobrať z firmy ${nameOf(copy.companyId)}`}
                          className="text-muted-foreground hover:text-foreground"
                          disabled={busy}
                          onClick={() => window.confirm(`Odobrať „${original.name}“ z firmy ${nameOf(copy.companyId)}?`) && unshare.mutate(copy.id)}
                        >
                          <X className="size-3.5" aria-hidden />
                        </button>
                      </span>
                    ))}
                    {missing.map((m) => (
                      <button
                        key={m.companyId}
                        type="button"
                        disabled={busy}
                        onClick={() => share.mutate({ id: original.id, companyId: m.companyId })}
                        className="inline-flex items-center gap-1 rounded-full border border-dashed px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        <Plus className="size-3.5" aria-hidden />
                        {m.companyName}
                      </button>
                    ))}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3 rounded-xl border bg-surface p-4" aria-labelledby="my-cases-heading">
        <h2 id="my-cases-heading" className="flex items-center gap-2 font-medium">
          <Box className="size-5 text-accent" aria-hidden />
          Case / racky
        </h2>
        <p className="text-sm text-muted-foreground">Vaše case a racky. Techniku do nich vložíte vo firme.</p>
        {memberships.length > 0 && (
          <form onSubmit={submitCase} className="grid gap-2 rounded-lg border border-dashed p-3">
            <Field label="Názov *" maxLength={120} placeholder="napr. Rack 6U – mikrofóny" value={caseName} onChange={(e) => setCaseName(e.target.value)} />
            {memberships.length > 1 && (
              <SelectField label="Do firmy" value={caseTarget} onChange={(e) => setCaseTarget(e.target.value)}>
                {companyOptions}
              </SelectField>
            )}
            <Button type="submit" className="justify-self-start" disabled={busy || !caseName.trim()}>
              <Plus className="size-4" aria-hidden />
              {addCase.isPending ? 'Pridávam…' : 'Pridať case / rack'}
            </Button>
          </form>
        )}
        {cases.isPending ? (
          <p className="text-sm text-muted-foreground">Načítavam…</p>
        ) : cases.isError ? (
          <p className="text-sm text-muted-foreground">Case sa nepodarilo načítať.</p>
        ) : cases.data.length === 0 ? (
          <p className="text-sm text-muted-foreground">Zatiaľ nemáte žiadny vlastný case ani rack.</p>
        ) : (
          <ul className="divide-y rounded-lg border text-sm">
            {cases.data.map((c) => (
              <li key={c.id}>
                <button type="button" onClick={() => open(c.companyId, `/cases/${c.id}`)} className="flex w-full items-center gap-2 px-3 py-2.5 text-left hover:bg-muted">
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{c.name}</span>
                    <span className="block text-xs text-muted-foreground">
                      {nameOf(c.companyId)} · {c.items} {c.items === 1 ? 'vec' : c.items >= 2 && c.items <= 4 ? 'veci' : 'vecí'}
                    </span>
                  </span>
                  <ExternalLink className="size-4 text-muted-foreground" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {(share.isError || sync.isError || unshare.isError || addItem.isError || addCase.isError) && (
        <p className="text-sm text-destructive lg:col-span-2">Zmena sa nepodarila. Táto časť databázy ešte nie je pripravená – kontaktujte vývojára aplikácie.</p>
      )}
    </div>
  )
}
