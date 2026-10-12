import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useFieldArray, useForm, useWatch } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { ErrorBlock, LoadingBlock } from '@/components/feedback/QueryState'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button, LinkButton } from '@/components/ui/button'
import { Field, TextareaField } from '@/components/ui/field'
import { useCompany } from '@/features/companies/company-context'
import { equipmentKeys, fetchEquipmentList } from '@/features/equipment/api'
import { filterEquipment, type Equipment } from '@/features/equipment/model'
import { todayIso } from '@/lib/format'
import { canEditInventory } from '@/lib/permissions'
import { createLoan } from './api'
import { busyQuantity, loanSchema, type Loan, type LoanFormValues } from './model'
import { useLoans } from './useLoans'

// Pri veľkom sklade nemá zmysel vykresliť tisíce riadkov; používateľ zúži výber hľadaním.
const PICKER_LIMIT = 20

function LoanForm({ companyId, equipment, loans }: { companyId: string; equipment: Equipment[]; loans: Loan[] }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const today = todayIso()

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoanFormValues>({
    resolver: zodResolver(loanSchema),
    defaultValues: { borrower: '', contact: '', startsOn: today, endsOn: today, note: '', items: [] },
  })
  const { fields, append, remove } = useFieldArray({ control, name: 'items' })
  const startsOn = useWatch({ control, name: 'startsOn' })
  const endsOn = useWatch({ control, name: 'endsOn' })
  const datesValid = Boolean(startsOn && endsOn && endsOn >= startsOn)

  // Voľné kusy v zvolenom termíne; bez platného termínu sa ráta celý počet.
  const freeOf = (item: Equipment) =>
    item.quantity - (datesValid ? busyQuantity(loans, item.id, startsOn, endsOn, today) : 0)

  const save = useMutation({
    mutationFn: (values: LoanFormValues) => createLoan(companyId, values),
    onSuccess: async (id) => {
      await queryClient.invalidateQueries({ queryKey: ['company', companyId] })
      navigate(`/loans/${id}`, { replace: true })
    },
  })
  // Databáza kolíziu termínov opíše po slovensky (ktorá technika a koľko je voľných).
  const saveError = save.error as { code?: string; message?: string } | null
  const conflict = saveError?.code === '23514' ? saveError.message : null

  const chosen = new Set(fields.map((field) => field.equipmentId))
  const candidates = filterEquipment(
    equipment.filter((item) => item.status !== 'retired' && item.kind !== 'consumable' && !chosen.has(item.id)),
    { search, status: '', categoryId: '', locationId: '', caseId: '' },
  )

  return (
    <form onSubmit={handleSubmit((values) => save.mutate(values))} noValidate className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Komu *" autoFocus placeholder="meno alebo firma" error={errors.borrower?.message} {...register('borrower')} />
        <Field label="Kontakt" placeholder="telefón alebo e-mail" error={errors.contact?.message} {...register('contact')} />
        <Field label="Od *" type="date" error={errors.startsOn?.message} {...register('startsOn')} />
        <Field label="Do *" type="date" error={errors.endsOn?.message} {...register('endsOn')} />
      </div>

      <section aria-labelledby="loan-items-heading">
        <h2 id="loan-items-heading" className="mb-2 text-sm font-medium text-muted-foreground">
          Technika ({fields.length})
        </h2>
        {fields.length === 0 ? (
          <p className="rounded-xl border border-dashed bg-surface p-4 text-sm text-muted-foreground">
            Zatiaľ nič. Vyberte techniku zo zoznamu nižšie.
          </p>
        ) : (
          <ul className="divide-y overflow-hidden rounded-xl border bg-surface">
            {fields.map((field, index) => {
              const item = equipment.find((candidate) => candidate.id === field.equipmentId)
              const free = item ? freeOf(item) : 0
              return (
                <li key={field.id} className="flex flex-wrap items-end gap-3 px-4 py-3">
                  <span className="min-w-0 flex-1 basis-40">
                    <span className="block truncate font-medium">{item?.name ?? 'Technika'}</span>
                    <span className="block text-sm text-muted-foreground">
                      voľné {Math.max(free, 0)} z {item?.quantity ?? 0} ks
                    </span>
                  </span>
                  <Field
                    label="Počet"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={Math.max(free, 1)}
                    step={1}
                    className="w-24"
                    error={errors.items?.[index]?.quantity?.message}
                    {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                  />
                  <Button variant="ghost" aria-label={`Odobrať: ${item?.name ?? 'technika'}`} onClick={() => remove(index)}>
                    <Trash2 className="size-4" aria-hidden />
                  </Button>
                </li>
              )
            })}
          </ul>
        )}
        {errors.items?.message && (
          <p role="alert" className="mt-2 text-sm text-destructive">
            {errors.items.message}
          </p>
        )}
      </section>

      <section aria-labelledby="loan-picker-heading" className="rounded-xl border bg-surface p-4">
        <h2 id="loan-picker-heading" className="mb-3 font-medium">
          Pridať techniku
        </h2>
        <Field
          label="Hľadať techniku"
          hideLabel
          type="search"
          placeholder="Názov, výrobca, sériové alebo inventárne číslo"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {candidates.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Žiadna ďalšia technika.</p>
        ) : (
          <ul className="mt-3 divide-y">
            {candidates.slice(0, PICKER_LIMIT).map((item) => {
              const free = freeOf(item)
              return (
                <li key={item.id} className="flex items-center gap-3 py-2">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{item.name}</span>
                    <span className={free > 0 ? 'block text-sm text-muted-foreground' : 'block text-sm text-destructive'}>
                      {free > 0 ? `voľné ${free} z ${item.quantity} ks` : 'v tomto termíne obsadené'}
                    </span>
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={free <= 0}
                    onClick={() => append({ equipmentId: item.id, quantity: 1 })}
                  >
                    Pridať
                  </Button>
                </li>
              )
            })}
          </ul>
        )}
        {candidates.length > PICKER_LIMIT && (
          <p className="mt-3 text-sm text-muted-foreground">
            Zobrazených prvých {PICKER_LIMIT} z {candidates.length}. Spresnite hľadanie.
          </p>
        )}
      </section>

      <TextareaField label="Poznámka" error={errors.note?.message} {...register('note')} />

      {save.isError && (
        <p role="alert" className="text-sm text-destructive">
          {conflict ?? 'Uloženie zlyhalo, nič sa nezapísalo. Skúste to znova.'}
        </p>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? 'Ukladám…' : 'Vytvoriť rezerváciu'}
        </Button>
        <LinkButton to="/loans" variant="outline">
          Zrušiť
        </LinkButton>
      </div>
    </form>
  )
}

export function LoanFormPage() {
  const company = useCompany().active!
  const allowed = canEditInventory(company.role)
  const loans = useLoans(company.companyId)
  const equipment = useQuery({
    queryKey: equipmentKeys.list(company.companyId),
    queryFn: () => fetchEquipmentList(company.companyId),
    enabled: allowed,
  })

  let body
  if (!allowed) {
    body = <ErrorBlock message="Na vytváranie výpožičiek nemáte oprávnenie." />
  } else if (loans.isPending || equipment.isPending) {
    body = <LoadingBlock />
  } else if (loans.isError || equipment.isError) {
    body = <ErrorBlock message="Údaje sa nepodarilo načítať." onRetry={() => void equipment.refetch()} />
  } else {
    body = <LoanForm companyId={company.companyId} equipment={equipment.data} loans={loans.data} />
  }

  return (
    <>
      <PageHeader title="Nová výpožička" description="Vznikne ako rezervácia; vydanie potvrdíte, keď technika naozaj odíde." />
      {body}
    </>
  )
}
