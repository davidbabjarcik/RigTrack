import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { ErrorBlock, LoadingBlock } from '@/components/feedback/QueryState'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Field, SelectField } from '@/components/ui/field'
import { useAuth } from '@/features/auth/auth-context'
import type { Member } from '@/features/companies/api'
import { useCompany } from '@/features/companies/company-context'
import { memberName, useMembers } from '@/features/companies/useMembers'
import type { CompanyEvent } from '@/features/events/model'
import { useEvents } from '@/features/events/useEvents'
import { formatDate, formatMoney, todayIso } from '@/lib/format'
import { can } from '@/lib/permissions'
import { addPayment, deletePayment, fetchPayments, payoutKeys, setPaymentPaid } from './api'
import { PayoutShareChart } from './PayoutShareChart'
import {
  inYear,
  lastEditionPayout,
  PAYMENT_KIND_LABELS,
  PAYMENT_KINDS,
  paymentSchema,
  paymentTotals,
  paymentYears,
  sortPayments,
  unpaidByMember,
  type Payment,
  type PaymentFormValues,
} from './model'

const money = (amount: number) => formatMoney(amount, 'EUR')

type FormProps = {
  companyId: string
  members: Member[]
  events: CompanyEvent[]
  /** Doterajšie záznamy: z nich sa navrhuje suma podľa minulého ročníka akcie. */
  payments: Payment[]
  onClose: () => void
}

function PaymentForm({ companyId, members, events, payments, onClose }: FormProps) {
  const queryClient = useQueryClient()
  const {
    register,
    control,
    getValues,
    setValue,
    handleSubmit,
    formState: { errors },
  } = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: { memberId: '', amount: undefined, kind: 'reward', happenedOn: todayIso(), eventId: '', note: '' },
  })
  const add = useMutation({
    mutationFn: (values: PaymentFormValues) => addPayment(companyId, values),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: payoutKeys.list(companyId) })
      onClose()
    },
  })
  // Opakovaná akcia: koľko dostal ten istý človek za jej minulý ročník.
  const memberId = useWatch({ control, name: 'memberId' })
  const eventId = useWatch({ control, name: 'eventId' })
  const amount = useWatch({ control, name: 'amount' })
  const before = lastEditionPayout(payments, events, memberId, eventId)
  // Po výbere člena alebo eventu sa suma navrhne sama, ale len do prázdneho poľa.
  const suggest = () => {
    const found = lastEditionPayout(payments, events, getValues('memberId'), getValues('eventId'))
    if (found && !Number.isFinite(getValues('amount'))) setValue('amount', found.amount, { shouldDirty: true })
  }
  // Najnovšie eventy hore: odmena sa zvyčajne zapisuje krátko po akcii.
  const recentEvents = [...events].sort((a, b) => b.startsOn.localeCompare(a.startsOn)).slice(0, 50)

  return (
    <form
      onSubmit={handleSubmit((values) => add.mutate(values))}
      noValidate
      className="mb-6 flex flex-col gap-3 rounded-xl border bg-surface p-4"
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SelectField label="Komu *" error={errors.memberId?.message} {...register('memberId', { onChange: suggest })}>
          <option value="">— vyberte —</option>
          {members.map((member) => (
            <option key={member.userId} value={member.userId}>
              {member.fullName || member.email}
            </option>
          ))}
        </SelectField>
        <Field
          label="Suma (€) *"
          type="number"
          inputMode="decimal"
          min={0}
          step="0.01"
          error={errors.amount?.message}
          {...register('amount', { valueAsNumber: true })}
        />
        <SelectField label="Druh" error={errors.kind?.message} {...register('kind')}>
          {PAYMENT_KINDS.map((kind) => (
            <option key={kind} value={kind}>
              {PAYMENT_KIND_LABELS[kind]}
            </option>
          ))}
        </SelectField>
        <Field label="Dátum" type="date" error={errors.happenedOn?.message} {...register('happenedOn')} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <SelectField label="Event (nepovinné)" error={errors.eventId?.message} {...register('eventId', { onChange: suggest })}>
          <option value="">— bez eventu —</option>
          {recentEvents.map((event) => (
            <option key={event.id} value={event.id}>
              {event.name} ({formatDate(event.startsOn)})
            </option>
          ))}
        </SelectField>
        <Field label="Poznámka" error={errors.note?.message} {...register('note')} />
      </div>
      {before && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <span>
            Minulý ročník ({before.event.name}, {formatDate(before.event.startsOn)}): <strong>{money(before.amount)}</strong>
          </span>
          {amount !== before.amount && (
            <button type="button" className="font-medium text-accent hover:underline" onClick={() => setValue('amount', before.amount, { shouldDirty: true })}>
              Použiť rovnakú sumu
            </button>
          )}
        </div>
      )}
      {before && Number.isFinite(amount) && amount < before.amount && (
        <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          Pozor: je to o {money(before.amount - amount)} menej než za minulý ročník. Ak je to zámer, môžete záznam uložiť.
        </p>
      )}
      {add.isError && (
        <p role="alert" className="text-sm text-destructive">
          Odmenu sa nepodarilo zapísať.
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={add.isPending}>
          {add.isPending ? 'Ukladám…' : 'Zapísať odmenu'}
        </Button>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Zrušiť
        </Button>
      </div>
    </form>
  )
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-surface p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
    </div>
  )
}

export function PayoutsPage() {
  const company = useCompany().active!
  const companyId = company.companyId
  const userId = useAuth().session!.user.id
  // „isAdmin“ = vidí odmeny všetkých; zapisovať a vyplácať je samostatné oprávnenie.
  const isAdmin = can(company, 'payouts.view_all')
  const canManage = can(company, 'payouts.manage')
  const queryClient = useQueryClient()
  const [adding, setAdding] = useState(false)
  const [memberFilter, setMemberFilter] = useState('')
  const [year, setYear] = useState('')

  const payments = useQuery({ queryKey: payoutKeys.list(companyId), queryFn: () => fetchPayments(companyId) })
  const members = useMembers(companyId)
  const events = useEvents(companyId)
  const refresh = () => queryClient.invalidateQueries({ queryKey: payoutKeys.list(companyId) })
  const pay = useMutation({ mutationFn: ({ id, paid }: { id: string; paid: boolean }) => setPaymentPaid(id, paid), onSettled: refresh })
  const remove = useMutation({ mutationFn: deletePayment, onSettled: refresh })

  const everything = payments.data ?? []
  const years = paymentYears(everything)
  // Rok platí pre všetko na stránke: súčty, graf aj zoznam.
  const all = inYear(everything, years.includes(year) ? year : '')
  // Admin vidí všetkých a môže filtrovať; ostatným databáza vráti iba ich vlastné záznamy.
  const visible = sortPayments(isAdmin && memberFilter ? all.filter((payment) => payment.memberId === memberFilter) : all)
  const totals = paymentTotals(visible)
  const owed = isAdmin ? unpaidByMember(all) : []
  const eventName = (eventId: string | null) => events.data?.find((event) => event.id === eventId)?.name

  return (
    <>
      <PageHeader
        title="Odmeny"
        description={isAdmin ? 'Odmeny a zálohy členov firmy' : 'Vaše odmeny a zálohy'}
        action={
          canManage &&
          !adding && (
            <Button onClick={() => setAdding(true)}>
              <Plus className="size-4" aria-hidden />
              Zapísať
            </Button>
          )
        }
      />

      {adding && (
        <PaymentForm
          companyId={companyId}
          members={members.data ?? []}
          events={events.data ?? []}
          payments={everything}
          onClose={() => setAdding(false)}
        />
      )}

      {payments.isPending ? (
        <LoadingBlock />
      ) : payments.isError ? (
        <ErrorBlock message="Odmeny sa nepodarilo načítať." onRetry={() => void payments.refetch()} />
      ) : (
        <>
          {years.length > 1 && (
            <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Rok">
              {['', ...years].map((option) => (
                <button
                  key={option || 'all'}
                  type="button"
                  aria-pressed={(years.includes(year) ? year : '') === option}
                  onClick={() => setYear(option)}
                  className={
                    (years.includes(year) ? year : '') === option
                      ? 'h-9 rounded-lg border bg-primary px-3 text-sm font-medium text-primary-foreground'
                      : 'h-9 rounded-lg border bg-surface px-3 text-sm font-medium hover:bg-muted'
                  }
                >
                  {option || 'Všetky roky'}
                </button>
              ))}
            </div>
          )}
          <div className="mb-6 grid grid-cols-2 gap-3">
            <Tile label={isAdmin ? 'Treba vyplatiť' : 'Čaká na vyplatenie'} value={money(totals.unpaid)} />
            <Tile label="Už vyplatené" value={money(totals.paid)} />
          </div>

          {isAdmin && !memberFilter && <PayoutShareChart payments={all} nameOf={(memberId) => memberName(members.data, memberId) || 'Bývalý člen'} />}

          {isAdmin && owed.length > 0 && !memberFilter && (
            <section className="mb-6" aria-labelledby="owed-heading">
              <h2 id="owed-heading" className="mb-2 text-sm font-medium text-muted-foreground">
                Komu treba vyplatiť
              </h2>
              <ul className="divide-y overflow-hidden rounded-xl border bg-surface">
                {owed.map((row) => (
                  <li key={row.memberId}>
                    <button
                      type="button"
                      onClick={() => setMemberFilter(row.memberId)}
                      className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left hover:bg-muted"
                    >
                      <span className="min-w-0 truncate font-medium">{memberName(members.data, row.memberId) || 'Bývalý člen'}</span>
                      <span className="shrink-0 font-medium tabular-nums">{money(row.unpaid)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {isAdmin && (
            <SelectField label="Člen" hideLabel className="mb-3 sm:w-64" value={memberFilter} onChange={(e) => setMemberFilter(e.target.value)}>
              <option value="">Všetci členovia</option>
              {(members.data ?? []).map((member) => (
                <option key={member.userId} value={member.userId}>
                  {member.fullName || member.email}
                </option>
              ))}
            </SelectField>
          )}

          {visible.length === 0 ? (
            <p className="rounded-xl border border-dashed bg-surface px-6 py-12 text-center text-sm text-muted-foreground">
              {isAdmin ? 'Zatiaľ žiadne záznamy. Začnite tlačidlom Zapísať.' : 'Zatiaľ pre vás nie je zapísaná žiadna odmena.'}
            </p>
          ) : (
            <ul className="divide-y overflow-hidden rounded-xl border bg-surface">
              {visible.map((payment) => {
                const name = eventName(payment.eventId)
                return (
                  <li key={payment.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1 basis-48">
                      <p className="truncate font-medium">
                        {isAdmin && payment.memberId !== userId
                          ? memberName(members.data, payment.memberId) || 'Bývalý člen'
                          : PAYMENT_KIND_LABELS[payment.kind]}
                      </p>
                      <p className="truncate text-sm text-muted-foreground">
                        {[
                          isAdmin && payment.memberId !== userId && PAYMENT_KIND_LABELS[payment.kind],
                          formatDate(payment.happenedOn),
                          payment.note,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                        {name && payment.eventId && (
                          <>
                            {' · '}
                            <Link to={`/events/${payment.eventId}`} className="text-accent hover:underline">
                              {name}
                            </Link>
                          </>
                        )}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-medium tabular-nums">{money(payment.amount)}</p>
                      <p className="text-sm text-muted-foreground">
                        {payment.paidAt ? `vyplatené ${formatDate(payment.paidAt.slice(0, 10))}` : 'nevyplatené'}
                      </p>
                    </div>
                    {canManage && (
                      <div className="flex shrink-0 gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={pay.isPending}
                          onClick={() => pay.mutate({ id: payment.id, paid: !payment.paidAt })}
                        >
                          {payment.paidAt ? 'Vrátiť' : 'Vyplatené'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label="Odstrániť záznam"
                          disabled={remove.isPending}
                          onClick={() => {
                            if (window.confirm(`Odstrániť záznam na ${money(payment.amount)}?`)) remove.mutate(payment.id)
                          }}
                        >
                          <Trash2 className="size-4" aria-hidden />
                        </Button>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          )}

          {(pay.isError || remove.isError) && (
            <p role="alert" className="mt-2 text-sm text-destructive">
              Zmena sa nepodarila.
            </p>
          )}
        </>
      )}
    </>
  )
}
