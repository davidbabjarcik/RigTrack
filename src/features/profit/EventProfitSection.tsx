import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { CollapsibleSection } from '@/components/layout/CollapsibleSection'
import { Button } from '@/components/ui/button'
import { Field, SelectField } from '@/components/ui/field'
import type { CompanyEvent } from '@/features/events/model'
import { usePartners } from '@/features/partners/api'
import { formatMoney } from '@/lib/format'
import { tf, tx } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { addEventCost, deleteEventCost, profitKeys, profitOf, useProfitData } from './api'
import { COST_KIND_LABELS, COST_KINDS, type CostKind } from './model'

const eur = (amount: number) => formatMoney(amount, 'EUR')
const EMPTY = { kind: 'rental' as CostKind, partnerId: '', amount: '', note: '' }

/** Zisk eventu: príjem bez DPH, náklady po riadkoch a ďalšie náklady (prenájom od partnerov…). Len pre toho, kto spravuje peniaze. */
export function EventProfitSection({ companyId, event }: { companyId: string; event: CompanyEvent }) {
  const queryClient = useQueryClient()
  const { equipment, data } = useProfitData(companyId)
  const partners = usePartners(companyId)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const refresh = () => queryClient.invalidateQueries({ queryKey: profitKeys.data(companyId) })
  const add = useMutation({
    mutationFn: () => addEventCost(companyId, event.id, { kind: form.kind, partnerId: form.partnerId || null, amount: Number(form.amount.replace(',', '.')), note: form.note }),
    onSuccess: () => {
      setForm(EMPTY)
      setOpen(false)
    },
    onSettled: refresh,
  })
  const remove = useMutation({ mutationFn: deleteEventCost, onSettled: refresh })

  // Bez migrácie 0171 sa sekcia neukáže.
  if (data.isError) return null
  if (!data.data || !equipment.data) return null
  const profit = profitOf(event, data.data, equipment.data)
  const costs = data.data.costs.filter((cost) => cost.eventId === event.id)
  const partnerName = new Map((partners.data ?? []).map((partner) => [partner.id, partner.name]))
  const amount = Number(form.amount.replace(',', '.'))
  const valid = Number.isFinite(amount) && amount > 0
  const submit = (formEvent: FormEvent) => {
    formEvent.preventDefault()
    if (valid) add.mutate()
  }
  const positive = profit.profit >= 0

  return (
    <CollapsibleSection
      id="event.profit"
      title={tf('Zisk z eventu ({0})', `${positive ? '+' : ''}${eur(profit.profit)}`)}
      actions={
        <Button variant="outline" size="sm" onClick={() => setOpen(!open)}>
          {!open && <Plus className="size-4" aria-hidden />}
          {open ? tx('Zavrieť') : tx('Pridať náklad')}
        </Button>
      }
    >
      {open && (
        <form onSubmit={submit} className="mb-3 grid gap-3 rounded-xl border bg-surface p-4 sm:grid-cols-2">
          <SelectField label={tx('Druh nákladu')} value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as CostKind })}>
            {COST_KINDS.map((kind) => (
              <option key={kind} value={kind}>{tx(COST_KIND_LABELS[kind])}</option>
            ))}
          </SelectField>
          <SelectField label={tx('Od firmy (nepovinné)')} value={form.partnerId} onChange={(e) => setForm({ ...form, partnerId: e.target.value })}>
            <option value="">{tx('— žiadna —')}</option>
            {(partners.data ?? []).map((partner) => (
              <option key={partner.id} value={partner.id}>{partner.name}</option>
            ))}
          </SelectField>
          <Field label={tx('Suma bez DPH (€) *')} inputMode="decimal" autoFocus value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          <Field label={tx('Poznámka')} maxLength={300} placeholder={tx('napr. 4 subwoofery na 2 dni')} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          {add.isError && <p role="alert" className="text-sm text-destructive sm:col-span-2">{tx('Uloženie zlyhalo.')}</p>}
          <Button type="submit" className="justify-self-start" disabled={!valid || add.isPending}>
            {add.isPending ? tx('Ukladám…') : tx('Uložiť náklad')}
          </Button>
        </form>
      )}

      <div className="rounded-xl border bg-surface p-4 text-sm">
        <div className="flex items-baseline justify-between gap-3">
          <span>
            {tx('Príjem bez DPH')}
            <span className="block text-xs text-muted-foreground">
              {profit.income.source === 'payments' && tx('zo zapísaných príjmov')}
              {profit.income.source === 'offer' && tx('podľa cenovej ponuky – ešte nie je zapísaný príjem')}
              {profit.income.source === 'none' && tx('zatiaľ nie je zapísaný príjem ani ponuka')}
            </span>
          </span>
          <span className="font-semibold tabular-nums">{eur(profit.income.amount)}</span>
        </div>
        <ul className="mt-3 divide-y border-t">
          {profit.lines.filter((line) => line.amount > 0 || ['crew', 'travel', 'expenses', 'gear'].includes(line.key)).map((line) => (
            <li key={line.key} className="flex justify-between gap-3 py-1.5">
              <span className="text-muted-foreground">{tx(line.label)}</span>
              <span className="tabular-nums">{line.amount > 0 ? `− ${eur(line.amount)}` : eur(0)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-2 flex items-baseline justify-between gap-3 border-t pt-3">
          <span className="font-semibold">{tx('Zisk')}</span>
          <span className={cn('text-lg font-semibold tabular-nums', positive ? 'text-emerald-700 dark:text-emerald-400' : 'text-destructive')}>
            {positive ? '+' : ''}{eur(profit.profit)}
            {profit.margin !== null && <span className="ml-2 text-sm font-normal text-muted-foreground">{tf('marža {0} %', profit.margin)}</span>}
          </span>
        </div>
      </div>

      {costs.length > 0 && (
        <ul className="mt-3 divide-y overflow-hidden rounded-xl border bg-surface text-sm">
          {costs.map((cost) => (
            <li key={cost.id} className="flex items-center gap-3 px-4 py-2">
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{tx(COST_KIND_LABELS[cost.kind])}{cost.partnerId && partnerName.get(cost.partnerId) ? ` · ${partnerName.get(cost.partnerId)}` : ''}</span>
                {cost.note && <span className="block text-xs text-muted-foreground">{cost.note}</span>}
              </span>
              <span className="tabular-nums">{eur(cost.amount)}</span>
              <Button variant="ghost" size="sm" disabled={remove.isPending} aria-label={tf('Zmazať náklad {0}', eur(cost.amount))} onClick={() => remove.mutate(cost.id)}>
                <Trash2 className="size-4" aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-2 text-xs text-muted-foreground">
        {data.data.settings.kmRate === 0 && <>{tx('Doprava sa nepočíta, kým nenastavíte sadzbu za km.')}{' '}</>}
        {profit.unpricedGear > 0 && <>{tf('Opotrebenie: {0} položiek techniky nemá nákupnú cenu a odpis.', profit.unpricedGear)}{' '}</>}
        <Link to="/profit" className="text-accent hover:underline">{tx('Zisk všetkých eventov a nastavenie výpočtu')}</Link>
      </p>
    </CollapsibleSection>
  )
}
