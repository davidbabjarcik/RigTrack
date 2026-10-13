import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, FileText, Package, PackageCheck, PackageOpen, Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ErrorBlock, LoadingBlock } from '@/components/feedback/QueryState'
import { Button, LinkButton } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { useCases } from '@/features/cases/useCases'
import { useCompany } from '@/features/companies/company-context'
import { equipmentKeys, fetchEquipmentList } from '@/features/equipment/api'
import { PhotoThumb } from '@/features/equipment/PhotoThumb'
import { UnitPicker } from '@/features/equipment/UnitPicker'
import { usePhotoThumbs } from '@/features/equipment/usePhotoThumbs'
import { formatDate, formatDateTime, formatMoney, todayIso } from '@/lib/format'
import { can } from '@/lib/permissions'
import { deleteLoan, issueLoan, returnLoan } from './api'
import { LoanStatusBadge } from './LoanStatusBadge'
import { describeContent, describeDamage, formatUnits, groupByCase, linePerDay, loanPricing, type LoanDamage } from './model'
import { useLoans } from './useLoans'

export function LoanDetailPage() {
  const { id = '' } = useParams()
  const company = useCompany().active!
  const companyId = company.companyId
  const canEdit = can(company, 'loans.edit')
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [returning, setReturning] = useState(false)
  const [damage, setDamage] = useState<Record<string, Omit<LoanDamage, 'equipmentId'>>>({})

  const loans = useLoans(companyId)
  const cases = useCases(companyId)
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
    mutationFn: () =>
      returnLoan(
        id,
        Object.entries(damage)
          .filter(([, entry]) => entry.quantity > 0)
          .map(([equipmentId, entry]) => ({ equipmentId, ...entry })),
      ),
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
  const grouped = groupByCase(loan.items)
  const pricing = loanPricing(loan)
  const busy = issue.isPending || giveBack.isPending || remove.isPending
  const setDamageOf = (equipmentId: string, entry: Omit<LoanDamage, 'equipmentId'>) =>
    setDamage((current) => ({ ...current, [equipmentId]: entry }))

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
          <LinkButton to={`/loans/${loan.id}/sheet`} variant="outline">
            <FileText className="size-4" aria-hidden />
            Listina (PDF)
          </LinkButton>
          {canEdit && loan.status === 'reserved' && (
            <LinkButton to={`/loans/${loan.id}/edit`} variant="outline">
              <Pencil className="size-4" aria-hidden />
              Upraviť
            </LinkButton>
          )}
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
          {can(company, 'loans.delete') && loan.status !== 'issued' && (
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
            Označte, čo sa vrátilo poškodené. Poškodeným kusom sa otvorí servisný záznam, ostatné sa vrátia medzi dostupnú
            techniku.
          </p>
          <ul className="mt-3 flex flex-col gap-4">
            {loan.items.map((item) => {
              const name = itemOf(item.equipmentId)?.name ?? 'Technika'
              const entry = damage[item.equipmentId]
              return (
                <li key={item.equipmentId}>
                  {item.unitNumbers.length > 0 ? (
                    <UnitPicker
                      label={`${name} — poškodené kusy`}
                      tone="destructive"
                      units={item.unitNumbers}
                      chosen={entry?.units ?? []}
                      onChange={(units) => setDamageOf(item.equipmentId, { units, quantity: units.length })}
                    />
                  ) : item.quantity > 1 ? (
                    <Field
                      label={`${name} — poškodených kusov (z ${item.quantity})`}
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={item.quantity}
                      step={1}
                      className="sm:w-72"
                      value={entry?.quantity ?? 0}
                      onChange={(e) =>
                        setDamageOf(item.equipmentId, {
                          units: [],
                          quantity: Math.min(Math.max(Math.trunc(Number(e.target.value)) || 0, 0), item.quantity),
                        })
                      }
                    />
                  ) : (
                    <label className="flex cursor-pointer items-center gap-3">
                      <input
                        type="checkbox"
                        className="size-5 accent-(--destructive)"
                        checked={(entry?.quantity ?? 0) > 0}
                        onChange={(e) => setDamageOf(item.equipmentId, { units: [], quantity: e.target.checked ? 1 : 0 })}
                      />
                      <span>{name} — poškodené</span>
                    </label>
                  )}
                </li>
              )
            })}
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
          Technika ({grouped.cases.length + grouped.single.length})
        </h2>
        <ul className="divide-y overflow-hidden rounded-xl border bg-surface">
          {grouped.cases.map(({ caseId, content }) => (
            <li key={caseId} className="flex items-center gap-3 px-4 py-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <Package className="size-5" aria-hidden />
              </span>
              <Link to={`/cases/${caseId}`} className="min-w-0 flex-1 hover:underline">
                <span className="block truncate font-medium">{cases.data?.find((item) => item.id === caseId)?.name ?? 'Case'}</span>
                <span className="block text-xs text-muted-foreground">
                  {describeContent(content, (equipmentId) => itemOf(equipmentId)?.name ?? 'Technika')}
                </span>
              </Link>
              {content.some((item) => item.damaged) && (
                <span className="shrink-0 text-sm text-destructive">
                  {content
                    .filter((item) => item.damaged)
                    .map((item) => `${itemOf(item.equipmentId)?.name ?? 'Technika'}: ${describeDamage(item)}`)
                    .join(', ')}
                </span>
              )}
              <span className="shrink-0 font-medium">celý case</span>
            </li>
          ))}
          {grouped.single.map((item) => {
            const piece = itemOf(item.equipmentId)
            return (
              <li key={item.equipmentId} className="flex items-center gap-3 px-4 py-3">
                <PhotoThumb url={thumbs[piece?.photoPath ?? '']} />
                <Link to={`/equipment/${item.equipmentId}`} className="min-w-0 flex-1 hover:underline">
                  <span className="block truncate font-medium">{piece?.name ?? 'Technika'}</span>
                  {(piece?.inventoryNumber || item.unitNumbers.length > 0) && (
                    <span className="block truncate text-sm text-muted-foreground">
                      {[item.unitNumbers.length > 0 && `kusy ${formatUnits(item.unitNumbers)}`, piece?.inventoryNumber && `inv. č. ${piece.inventoryNumber}`]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  )}
                </Link>
                {item.damaged && <span className="shrink-0 text-sm text-destructive">{describeDamage(item)}</span>}
                <span className="shrink-0 text-right font-medium">
                  {item.quantity} ks
                  {item.unitPrice !== null && (
                    <span className="block text-sm font-normal text-muted-foreground tabular-nums">{formatMoney(linePerDay(item), 'EUR')}/deň</span>
                  )}
                </span>
              </li>
            )
          })}
        </ul>
      </section>

      <dl className="mb-6 divide-y overflow-hidden rounded-xl border bg-surface">
        {([
          ['IČO', loan.borrowerIco],
          ['Adresa', loan.borrowerAddress],
          [
            'Cena',
            pricing.priced &&
              `${formatMoney(pricing.total, 'EUR')} (${pricing.days} ${pricing.days === 1 ? 'deň' : pricing.days < 5 ? 'dni' : 'dní'}${
                loan.price !== null ? ', dohodnutá' : ''
              })`,
          ],
          ['Kaucia', loan.deposit !== null && formatMoney(loan.deposit, 'EUR')],
          ['Vydané', loan.issuedAt && formatDateTime(loan.issuedAt)],
          ['Vrátené', loan.returnedAt && formatDateTime(loan.returnedAt)],
        ] as [string, string | false | null][])
          .filter(([, value]) => value)
          .map(([label, value]) => (
            <div key={label} className="flex justify-between gap-4 px-4 py-3">
              <dt className="text-sm text-muted-foreground">{label}</dt>
              <dd className="text-right font-medium break-words">{value}</dd>
            </div>
          ))}
      </dl>

      {loan.note && <p className="rounded-xl border bg-surface p-4 whitespace-pre-wrap">{loan.note}</p>}
    </>
  )
}
