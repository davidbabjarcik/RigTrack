import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Package, Trash2 } from 'lucide-react'
import { useFieldArray, useForm, useWatch } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router-dom'
import { ErrorBlock, LoadingBlock } from '@/components/feedback/QueryState'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button, LinkButton } from '@/components/ui/button'
import { Field, TextareaField } from '@/components/ui/field'
import type { Case } from '@/features/cases/model'
import { useCases } from '@/features/cases/useCases'
import { useCompany } from '@/features/companies/company-context'
import { equipmentKeys, fetchEquipmentList } from '@/features/equipment/api'
import { asOptionalNumber, unitIdsOf, type Equipment } from '@/features/equipment/model'
import { PhotoThumb } from '@/features/equipment/PhotoThumb'
import { UnitPicker } from '@/features/equipment/UnitPicker'
import { usePhotoThumbs } from '@/features/equipment/usePhotoThumbs'
import { plannedOnEvents, type CompanyEvent } from '@/features/events/model'
import { useEvents } from '@/features/events/useEvents'
import { formatMoney, todayIso } from '@/lib/format'
import { can } from '@/lib/permissions'
import { createLoan, updateLoan } from './api'
import { LoanPicker } from './LoanPicker'
import { busyQuantity, busyUnits, describeContent, linePerDay, loanDays, loanPricing, groupByCase, loanSchema, type Loan, type LoanFormValues } from './model'
import { useLoans } from './useLoans'

type FormProps = {
  companyId: string
  /** Upravovaná rezervácia; bez nej vzniká nová. */
  current: Loan | null
  equipment: Equipment[]
  cases: Case[]
  /** Ostatné výpožičky (bez upravovanej), proti ktorým sa ráta obsadenosť. */
  loans: Loan[]
  events: CompanyEvent[]
}

function LoanForm({ companyId, current, equipment, cases, loans, events }: FormProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const today = todayIso()

  const {
    register,
    control,
    getValues,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<LoanFormValues>({
    resolver: zodResolver(loanSchema),
    defaultValues: current
      ? {
          borrower: current.borrower,
          contact: current.contact,
          borrowerIco: current.borrowerIco,
          borrowerAddress: current.borrowerAddress,
          startsOn: current.startsOn,
          endsOn: current.endsOn,
          billedDays: current.billedDays ?? undefined,
          price: current.price ?? undefined,
          deposit: current.deposit ?? undefined,
          note: current.note,
          items: current.items.map((item) => ({
            equipmentId: item.equipmentId,
            quantity: item.quantity,
            caseId: item.caseId ?? '',
            unitNumbers: item.unitNumbers,
            unitPrice: item.unitPrice ?? undefined,
          })),
        }
      : { borrower: '', contact: '', borrowerIco: '', borrowerAddress: '', startsOn: today, endsOn: today, note: '', items: [] },
  })
  const { fields, append, remove, replace, update } = useFieldArray({ control, name: 'items' })
  const startsOn = useWatch({ control, name: 'startsOn' })
  const endsOn = useWatch({ control, name: 'endsOn' })
  const datesValid = Boolean(startsOn && endsOn && endsOn >= startsOn)
  // Živá kalkulácia: ceny a počty sa menia priamo v poliach, preto sledujeme celé položky.
  const liveItems = useWatch({ control, name: 'items' })
  const billedDays = useWatch({ control, name: 'billedDays' })
  const agreedPrice = useWatch({ control, name: 'price' })
  const calendarDays = datesValid ? loanDays(startsOn, endsOn) : 1
  const pricing = loanPricing({
    startsOn,
    endsOn,
    billedDays: Number.isFinite(billedDays) ? billedDays : calendarDays,
    price: Number.isFinite(agreedPrice) ? agreedPrice : null,
    items: liveItems,
  })

  // Voľné kusy v zvolenom termíne: obsadené sú iné výpožičky aj technika naplánovaná na eventy
  // (rovnako to počíta databáza). Bez platného termínu sa ráta celý počet.
  const freeOf = (item: Equipment) =>
    item.quantity -
    (datesValid ? busyQuantity(loans, item.id, startsOn, endsOn, today) + plannedOnEvents(events, item.id, startsOn, endsOn) : 0)

  const save = useMutation({
    mutationFn: async (values: LoanFormValues) => {
      if (!current) return createLoan(companyId, values)
      await updateLoan(current.id, values)
      return current.id
    },
    onSuccess: async (id) => {
      await queryClient.invalidateQueries({ queryKey: ['company', companyId] })
      navigate(`/loans/${id}`, { replace: true })
    },
  })
  // Databáza kolíziu termínov opíše po slovensky (ktorá technika a koľko je voľných).
  const saveError = save.error as { code?: string; message?: string } | null
  const conflict = saveError?.code === '23514' ? saveError.message : null

  const chosen = new Set(fields.map((field) => field.equipmentId))
  const lendable = equipment.filter((item) => item.status !== 'retired' && item.kind !== 'consumable')
  const thumbs = usePhotoThumbs(
    companyId,
    lendable.map((item) => item.photoPath),
  )
  const itemOf = (equipmentId: string) => equipment.find((candidate) => candidate.id === equipmentId)
  // Celé cases sú v zozname jedným riadkom, jednotlivá technika má vlastný počet.
  const grouped = groupByCase(fields.map((field, index) => ({ field, index, caseId: field.caseId || null })))
  const wholeCases = grouped.cases
  const single = grouped.single

  // Celý case nahradí kusy, ktoré z neho už boli vybrané jednotlivo.
  const addCase = (caseId: string) => {
    const content = lendable.filter((item) => item.caseId === caseId && item.quantity > 0)
    const taken = new Set(content.map((item) => item.id))
    replace([
      ...getValues('items').filter((item) => !taken.has(item.equipmentId)),
      ...content.map((item) => ({
        equipmentId: item.id,
        quantity: item.quantity,
        caseId,
        unitNumbers: item.trackUnits ? unitIdsOf(item) : [],
        unitPrice: item.rentalPrice ?? undefined,
      })),
    ])
  }
  const removeCase = (caseId: string) => replace(getValues('items').filter((item) => item.caseId !== caseId))

  return (
    <form
      onSubmit={handleSubmit((values) => {
        const missing = values.items.find((item) => itemOf(item.equipmentId)?.trackUnits && item.unitNumbers.length === 0)
        if (missing) {
          setError('items', { message: `Pri „${itemOf(missing.equipmentId)?.name}“ vyberte konkrétne kusy.` })
          return
        }
        save.mutate(values)
      })}
      noValidate
      className="flex flex-col gap-4"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Komu *" autoFocus placeholder="meno alebo firma" error={errors.borrower?.message} {...register('borrower')} />
        <Field label="Kontakt" placeholder="telefón alebo e-mail" error={errors.contact?.message} {...register('contact')} />
        <Field label="IČO" placeholder="nepovinné" error={errors.borrowerIco?.message} {...register('borrowerIco')} />
        <Field label="Adresa" placeholder="nepovinné" error={errors.borrowerAddress?.message} {...register('borrowerAddress')} />
        <Field label="Od *" type="date" error={errors.startsOn?.message} {...register('startsOn')} />
        <Field label="Do *" type="date" error={errors.endsOn?.message} {...register('endsOn')} />
      </div>

      <section aria-labelledby="loan-items-heading">
        <h2 id="loan-items-heading" className="mb-2 text-sm font-medium text-muted-foreground">
          Vo výpožičke ({wholeCases.length + single.length})
        </h2>
        {fields.length === 0 ? (
          <p className="rounded-xl border border-dashed bg-surface p-4 text-sm text-muted-foreground">
            Zatiaľ nič. Vyberte case alebo techniku zo zoznamu nižšie.
          </p>
        ) : (
          <ul className="divide-y overflow-hidden rounded-xl border bg-surface">
            {wholeCases.map(({ caseId, content }) => {
              const name = cases.find((item) => item.id === caseId)?.name ?? 'Case'
              const short = content.some(({ field }) => {
                const item = itemOf(field.equipmentId)
                return !item || freeOf(item) < field.quantity
              })
              return (
                <li key={caseId} className="flex items-center gap-3 px-4 py-3">
                  <Package className="size-5 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{name} · celý case</span>
                    <span className="block text-xs text-muted-foreground">
                      {describeContent(
                        content.map(({ field }) => field),
                        (equipmentId) => itemOf(equipmentId)?.name ?? 'Technika',
                      )}
                    </span>
                    {short && <span className="block text-sm text-destructive">Časť obsahu nie je v tomto termíne voľná.</span>}
                  </span>
                  <span className="shrink-0 text-sm text-muted-foreground tabular-nums">
                    {formatMoney(
                      content.reduce((sum, { field }) => sum + linePerDay(field), 0),
                      'EUR',
                    )}
                    /deň
                  </span>
                  <Button variant="ghost" aria-label={`Odobrať case: ${name}`} onClick={() => removeCase(caseId)}>
                    <Trash2 className="size-4" aria-hidden />
                  </Button>
                </li>
              )
            })}
            {single.map(({ field, index }) => {
              const item = itemOf(field.equipmentId)
              const free = item ? freeOf(item) : 0
              return (
                <li key={field.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <PhotoThumb url={thumbs[item?.photoPath ?? '']} />
                  <span className="min-w-0 flex-1 basis-40">
                    <span className="block truncate font-medium">{item?.name ?? 'Technika'}</span>
                    <span className="block text-sm text-muted-foreground">
                      voľné {Math.max(free, 0)} z {item?.quantity ?? 0} ks
                    </span>
                  </span>
                  {!item?.trackUnits && (
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
                  )}
                  <Field
                    label="€ / ks / deň"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="0.01"
                    className="w-28"
                    error={errors.items?.[index]?.unitPrice?.message}
                    {...register(`items.${index}.unitPrice`, asOptionalNumber)}
                  />
                  <Button variant="ghost" aria-label={`Odobrať: ${item?.name ?? 'technika'}`} onClick={() => remove(index)}>
                    <Trash2 className="size-4" aria-hidden />
                  </Button>
                  {item?.trackUnits && (
                    <div className="basis-full">
                      <UnitPicker
                        label={`Ktoré kusy (vybrané ${field.unitNumbers.length})`}
                        units={unitIdsOf(item)}
                        chosen={field.unitNumbers}
                        taken={datesValid ? busyUnits(loans, item.id, startsOn, endsOn, today) : []}
                        takenHint="v tomto termíne sú na inej výpožičke"
                        onChange={(units) =>
                          update(index, {
                            equipmentId: item.id,
                            caseId: '',
                            unitNumbers: units,
                            quantity: Math.max(units.length, 1),
                            unitPrice: getValues(`items.${index}.unitPrice`),
                          })
                        }
                      />
                    </div>
                  )}
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

      <LoanPicker
        equipment={lendable}
        cases={cases}
        chosen={chosen}
        chosenCases={new Set(wholeCases.map((group) => group.caseId))}
        thumbs={thumbs}
        freeOf={freeOf}
        onAdd={(item) => append({ equipmentId: item.id, quantity: 1, caseId: '', unitNumbers: [], unitPrice: item.rentalPrice ?? undefined })}
        onAddCase={addCase}
      />

      <section aria-labelledby="loan-price-heading" className="rounded-xl border bg-surface p-4">
        <h2 id="loan-price-heading" className="mb-1 font-medium">
          Cena
        </h2>
        <p className="mb-3 text-sm text-muted-foreground">
          Ceny položiek sa predvyplnia z cenníka techniky a dajú sa prepísať. Všetko je nepovinné.
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field
            label="Účtované dni"
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            placeholder={`${calendarDays} (podľa termínu)`}
            error={errors.billedDays?.message}
            {...register('billedDays', asOptionalNumber)}
          />
          <Field
            label="Dohodnutá cena (€)"
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            placeholder="prázdne = vypočítaná"
            error={errors.price?.message}
            {...register('price', asOptionalNumber)}
          />
          <Field
            label="Kaucia (€)"
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            error={errors.deposit?.message}
            {...register('deposit', asOptionalNumber)}
          />
        </div>
        <dl className="mt-4 flex flex-col gap-1 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">
              Vypočítaná cena ({formatMoney(pricing.perDay, 'EUR')} × {pricing.days} {pricing.days === 1 ? 'deň' : pricing.days < 5 ? 'dni' : 'dní'})
            </dt>
            <dd className="tabular-nums">{formatMoney(pricing.calculated, 'EUR')}</dd>
          </div>
          <div className="flex justify-between gap-4 text-base font-semibold">
            <dt>Cena výpožičky</dt>
            <dd className="tabular-nums">{formatMoney(pricing.total, 'EUR')}</dd>
          </div>
        </dl>
      </section>

      <TextareaField label="Poznámka" error={errors.note?.message} {...register('note')} />

      {save.isError && (
        <p role="alert" className="text-sm text-destructive">
          {conflict ?? 'Uloženie zlyhalo, nič sa nezapísalo. Skúste to znova.'}
        </p>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? 'Ukladám…' : current ? 'Uložiť zmeny' : 'Vytvoriť rezerváciu'}
        </Button>
        <LinkButton to={current ? `/loans/${current.id}` : '/loans'} variant="outline">
          Zrušiť
        </LinkButton>
      </div>
    </form>
  )
}

export function LoanFormPage() {
  const { id } = useParams()
  const company = useCompany().active!
  const allowed = can(company, 'loans.edit')
  const loans = useLoans(company.companyId)
  const events = useEvents(company.companyId)
  const cases = useCases(company.companyId)
  const equipment = useQuery({
    queryKey: equipmentKeys.list(company.companyId),
    queryFn: () => fetchEquipmentList(company.companyId),
    enabled: allowed,
  })

  let body
  if (!allowed) {
    body = <ErrorBlock message="Na vytváranie výpožičiek nemáte oprávnenie." />
  } else if (loans.isPending || equipment.isPending || events.isPending || cases.isPending) {
    body = <LoadingBlock />
  } else if (loans.isError || equipment.isError || events.isError || cases.isError) {
    body = <ErrorBlock message="Údaje sa nepodarilo načítať." onRetry={() => void equipment.refetch()} />
  } else {
    const current = id ? (loans.data.find((loan) => loan.id === id) ?? null) : null
    if (id && !current) {
      body = <ErrorBlock message="Táto výpožička neexistuje alebo k nej nemáte prístup." />
    } else if (current && current.status !== 'reserved') {
      body = <ErrorBlock message="Upraviť sa dá len rezervácia, ktorá ešte nebola vydaná." />
    } else {
      body = (
        <LoanForm
          key={id ?? 'new'}
          companyId={company.companyId}
          current={current}
          equipment={equipment.data}
          cases={cases.data}
          loans={loans.data.filter((loan) => loan.id !== id)}
          events={events.data}
        />
      )
    }
  }

  return (
    <>
      <PageHeader
        title={id ? 'Upraviť výpožičku' : 'Nová výpožička'}
        description={id ? 'Rezerváciu možno meniť, kým technika neodišla.' : 'Vznikne ako rezervácia; vydanie potvrdíte, keď technika naozaj odíde.'}
      />
      {body}
    </>
  )
}
