import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, PackageCheck, PackageOpen, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ErrorBlock, LoadingBlock } from '@/components/feedback/QueryState'
import { Button } from '@/components/ui/button'
import { useCompany } from '@/features/companies/company-context'
import { equipmentKeys, fetchEquipmentList } from '@/features/equipment/api'
import { PhotoThumb } from '@/features/equipment/PhotoThumb'
import { usePhotoThumbs } from '@/features/equipment/usePhotoThumbs'
import { formatDate, formatDateTime, todayIso } from '@/lib/format'
import { canDeleteInventory, canEditInventory } from '@/lib/permissions'
import { deleteLoan, issueLoan, returnLoan } from './api'
import { LoanStatusBadge } from './LoanStatusBadge'
import { useLoans } from './useLoans'

export function LoanDetailPage() {
  const { id = '' } = useParams()
  const company = useCompany().active!
  const companyId = company.companyId
  const canEdit = canEditInventory(company.role)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [returning, setReturning] = useState(false)
  const [damaged, setDamaged] = useState<string[]>([])

  const loans = useLoans(companyId)
  const equipment = useQuery({ queryKey: equipmentKeys.list(companyId), queryFn: () => fetchEquipmentList(companyId) })
  const loan = loans.data?.find((candidate) => candidate.id === id)
  const itemOf = (equipmentId: string) => equipment.data?.find((item) => item.id === equipmentId)
  const thumbs = usePhotoThumbs(
    companyId,
    (loan?.items ?? []).map((item) => itemOf(item.equipmentId)?.photoPath ?? ''),
  )

  // Vydanie aj vrátenie menia stav techniky, preto celý strom firmy.
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['company', companyId] })
  const issue = useMutation({ mutationFn: () => issueLoan(id), onSettled: refresh })
  const giveBack = useMutation({
    mutationFn: () => returnLoan(id, damaged),
    onSuccess: () => setReturning(false),
    onSettled: refresh,
  })
  const remove = useMutation({
    mutationFn: () => deleteLoan(companyId, id),
    onSuccess: async () => {
      await refresh()
      navigate('/loans', { replace: true })
    },
  })

  const back = (
    <Link to="/loans" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
      <ArrowLeft className="size-4" aria-hidden />
      Výpožičky
    </Link>
  )

  if (loans.isPending) return <LoadingBlock />
  if (loans.isError) return <ErrorBlock message="Výpožičku sa nepodarilo načítať." onRetry={() => void loans.refetch()} />
  if (!loan) {
    return (
      <>
        {back}
        <ErrorBlock message="Táto výpožička neexistuje alebo k nej nemáte prístup." />
      </>
    )
  }

  const today = todayIso()
  const busy = issue.isPending || giveBack.isPending || remove.isPending
  const toggleDamaged = (equipmentId: string) =>
    setDamaged((current) => (current.includes(equipmentId) ? current.filter((x) => x !== equipmentId) : [...current, equipmentId]))

  return (
    <>
      {back}
      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight break-words">{loan.borrower}</h1>
          <p className="mt-1 text-muted-foreground">
            {formatDate(loan.startsOn)} – {formatDate(loan.endsOn)}
            {loan.contact && ` · ${loan.contact}`}
          </p>
          <div className="mt-2">
            <LoanStatusBadge loan={loan} today={today} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {canEdit && loan.status === 'reserved' && (
            <Button disabled={busy} onClick={() => issue.mutate()}>
              <PackageOpen className="size-4" aria-hidden />
              {issue.isPending ? 'Vydávam…' : 'Vydať techniku'}
            </Button>
          )}
          {canEdit && loan.status === 'issued' && !returning && (
            <Button disabled={busy} onClick={() => setReturning(true)}>
              <PackageCheck className="size-4" aria-hidden />
              Prijať späť
            </Button>
          )}
          {canDeleteInventory(company.role) && loan.status !== 'issued' && (
            <Button
              variant="destructive"
              size="sm"
              disabled={busy}
              onClick={() => {
                if (window.confirm(`Naozaj odstrániť výpožičku pre „${loan.borrower}“?`)) remove.mutate()
              }}
            >
              <Trash2 className="size-4" aria-hidden />
              Odstrániť
            </Button>
          )}
        </div>
      </header>

      {(issue.isError || giveBack.isError || remove.isError) && (
        <p role="alert" className="mb-4 text-sm text-destructive">
          Zmena sa nepodarila. Obnovte stránku a skúste to znova.
        </p>
      )}

      {returning && (
        <section aria-labelledby="return-heading" className="mb-6 rounded-xl border border-accent/40 bg-accent/10 p-4">
          <h2 id="return-heading" className="font-medium">
            Vrátenie techniky
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Zaškrtnite kusy, ktoré sa vrátili poškodené. Ostatné sa vrátia medzi dostupnú techniku.
          </p>
          <ul className="mt-3 flex flex-col gap-2">
            {loan.items.map((item) => (
              <li key={item.equipmentId}>
                <label className="flex cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    className="size-5 accent-(--destructive)"
                    checked={damaged.includes(item.equipmentId)}
                    onChange={() => toggleDamaged(item.equipmentId)}
                  />
                  <span>
                    {itemOf(item.equipmentId)?.name ?? 'Technika'}
                    {item.quantity > 1 && ` (${item.quantity} ks)`} — poškodené
                  </span>
                </label>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex gap-2">
            <Button disabled={busy} onClick={() => giveBack.mutate()}>
              {giveBack.isPending ? 'Zapisujem…' : 'Potvrdiť vrátenie'}
            </Button>
            <Button variant="ghost" onClick={() => setReturning(false)}>
              Zrušiť
            </Button>
          </div>
        </section>
      )}

      <section aria-labelledby="loan-content-heading" className="mb-6">
        <h2 id="loan-content-heading" className="mb-2 text-sm font-medium text-muted-foreground">
          Technika ({loan.items.length})
        </h2>
        <ul className="divide-y overflow-hidden rounded-xl border bg-surface">
          {loan.items.map((item) => {
            const piece = itemOf(item.equipmentId)
            return (
              <li key={item.equipmentId} className="flex items-center gap-3 px-4 py-3">
                <PhotoThumb url={thumbs[piece?.photoPath ?? '']} />
                <Link to={`/equipment/${item.equipmentId}`} className="min-w-0 flex-1 hover:underline">
                  <span className="block truncate font-medium">{piece?.name ?? 'Technika'}</span>
                  {piece?.inventoryNumber && (
                    <span className="block truncate text-sm text-muted-foreground">inv. č. {piece.inventoryNumber}</span>
                  )}
                </Link>
                {item.damaged && <span className="shrink-0 text-sm text-destructive">poškodené</span>}
                <span className="shrink-0 font-medium">{item.quantity} ks</span>
              </li>
            )
          })}
        </ul>
      </section>

      <dl className="mb-6 divide-y overflow-hidden rounded-xl border bg-surface">
        {[
          ['Vydané', loan.issuedAt && formatDateTime(loan.issuedAt)],
          ['Vrátené', loan.returnedAt && formatDateTime(loan.returnedAt)],
        ]
          .filter(([, value]) => value)
          .map(([label, value]) => (
            <div key={label} className="flex justify-between gap-4 px-4 py-3">
              <dt className="text-sm text-muted-foreground">{label}</dt>
              <dd className="font-medium">{value}</dd>
            </div>
          ))}
      </dl>

      {loan.note && <p className="rounded-xl border bg-surface p-4 whitespace-pre-wrap">{loan.note}</p>}
    </>
  )
}
