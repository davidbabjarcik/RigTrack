import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Wallet } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { addPayment, fetchPayments, payoutKeys } from '@/features/payouts/api'
import { formatMoney } from '@/lib/format'
import { tf, tx } from '@/lib/i18n'
import type { CompanyEvent } from './model'

/**
 * Odmena za DJ hranie pri človeku v „Kto hrá“: koľko je zapísané (a či vyplatené) a rýchle zapísanie ďalšej.
 * Zapisuje sa ako odmena za akciu v Odmenách, takže ju vidno aj v Zisku z eventov. Len pre toho, kto spravuje odmeny.
 */
export function DjPayLine({ companyId, event, memberId }: { companyId: string; event: CompanyEvent; memberId: string }) {
  const queryClient = useQueryClient()
  const payments = useQuery({ queryKey: payoutKeys.list(companyId), queryFn: () => fetchPayments(companyId), retry: false })
  const [amount, setAmount] = useState('')
  const add = useMutation({
    mutationFn: () =>
      addPayment(companyId, {
        memberId,
        amount: Number(amount.replace(',', '.')),
        kind: 'reward',
        happenedOn: event.endsOn,
        eventId: event.id,
        note: tf('DJ hranie: {0}', event.name).slice(0, 500),
      }),
    onSuccess: () => setAmount(''),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['company', companyId] }),
  })
  if (payments.isError || payments.isPending) return null
  const mine = payments.data.filter((payment) => payment.eventId === event.id && payment.memberId === memberId && payment.kind !== 'advance')
  const total = mine.reduce((sum, payment) => sum + payment.amount, 0)
  const unpaid = mine.filter((payment) => !payment.paidAt).reduce((sum, payment) => sum + payment.amount, 0)
  const value = Number(amount.replace(',', '.'))
  const valid = Number.isFinite(value) && value > 0 && value <= 1_000_000

  const submit = (submitted: FormEvent) => {
    submitted.preventDefault()
    if (valid) add.mutate()
  }

  return (
    <span className="mt-1 flex flex-wrap items-center gap-2 text-sm">
      <Wallet className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      {mine.length > 0 ? (
        <Link to="/payouts" className="hover:underline">
          {tf('Odmena {0}', formatMoney(total, 'EUR'))}
          <span className="text-muted-foreground">{unpaid > 0 ? tf(' · nevyplatené {0}', formatMoney(unpaid, 'EUR')) : tx(' · vyplatené')}</span>
        </Link>
      ) : (
        <span className="text-muted-foreground">{tx('Odmena zatiaľ nie je zapísaná')}</span>
      )}
      <form onSubmit={submit} className="flex items-center gap-1">
        <input
          aria-label={tx('Odmena za hranie (€)')}
          inputMode="decimal"
          placeholder={tx('€')}
          className="h-8 w-20 rounded-md border bg-background px-2 text-sm"
          value={amount}
          onChange={(changed) => setAmount(changed.target.value)}
        />
        <Button type="submit" size="sm" variant="outline" disabled={!valid || add.isPending}>
          {mine.length > 0 ? tx('Pridať') : tx('Zapísať odmenu')}
        </Button>
      </form>
      {add.isError && <span className="text-destructive">{tx('Odmenu sa nepodarilo zapísať.')}</span>}
    </span>
  )
}
