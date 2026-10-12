import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ExternalLink, FileUp, Plus, Trash2 } from 'lucide-react'
import { useId, useRef, useState, type DragEvent } from 'react'
import { useFieldArray, useForm, useWatch } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { ErrorBlock, LoadingBlock } from '@/components/feedback/QueryState'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button, LinkButton } from '@/components/ui/button'
import { Field, SelectField, TextareaField } from '@/components/ui/field'
import { useCompany } from '@/features/companies/company-context'
import { equipmentKeys, fetchEquipmentList } from '@/features/equipment/api'
import { EQUIPMENT_KINDS, KIND_LABELS, type Equipment, type Lookup } from '@/features/equipment/model'
import { useEquipmentLookups } from '@/features/equipment/useEquipmentLookups'
import { formatMoney, todayIso } from '@/lib/format'
import { canManageOrders } from '@/lib/permissions'
import { cn } from '@/lib/utils'
import { createOrder, fetchArticleMemory } from './api'
import { invoiceToFormValues } from './import/toFormValues'
import {
  CURRENCIES,
  EMPTY_ITEM,
  ITEM_MODES,
  MODE_LABELS,
  orderSchema,
  orderTotal,
  supplierProductUrl,
  type OrderFormValues,
  type RememberedArticle,
} from './model'

type FormProps = { companyId: string; equipment: Equipment[]; categories: Lookup[] }

type ImportState = { busy: boolean; message: string | null; failed: boolean }

function OrderForm({ companyId, equipment, categories }: FormProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const categoryListId = useId()

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<OrderFormValues>({
    resolver: zodResolver(orderSchema),
    defaultValues: { supplier: '', orderNumber: '', orderedAt: todayIso(), currency: 'EUR', note: '', items: [EMPTY_ITEM] },
  })
  const { fields, append, remove } = useFieldArray({ control, name: 'items' })
  const items = useWatch({ control, name: 'items' })
  const currency = useWatch({ control, name: 'currency' })
  const supplier = useWatch({ control, name: 'supplier' })

  const save = useMutation({
    mutationFn: (values: OrderFormValues) => createOrder(companyId, values, categories),
    onSuccess: async (id) => {
      // Objednávka zakladá a dopĺňa techniku aj kategórie, preto celý strom firmy.
      await queryClient.invalidateQueries({ queryKey: ['company', companyId] })
      navigate(`/orders/${id}`, { replace: true })
    },
  })

  const fileInput = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [importState, setImportState] = useState<ImportState>({ busy: false, message: null, failed: false })

  async function importFile(file: File) {
    setImportState({ busy: true, message: null, failed: false })
    try {
      // Čítanie PDF je veľká knižnica; stiahne sa až pri prvom importe.
      const [{ extractPdfLines }, { looksLikeThomann, parseThomannInvoice }] = await Promise.all([
        import('./import/pdf'),
        import('./import/thomann'),
      ])
      const lines = await extractPdfLines(file)
      const invoice = parseThomannInvoice(lines)
      if (invoice.items.length === 0) {
        const reason = looksLikeThomann(lines)
          ? 'V súbore sa nenašli žiadne položky.'
          : 'Zatiaľ viem čítať iba faktúry z Thomannu. Túto objednávku zadajte ručne.'
        setImportState({ busy: false, message: reason, failed: true })
        return
      }

      const memory = await fetchArticleMemory(
        companyId,
        invoice.supplier,
        invoice.items.map((item) => item.articleNumber),
      )
      const remembered = new Map<string, RememberedArticle>()
      for (const [code, entry] of memory) {
        remembered.set(code, {
          mode: entry.mode,
          // Väzba môže ukazovať na techniku, ktorú medzičasom niekto zmazal.
          equipmentId: equipment.some((item) => item.id === entry.equipmentId) ? entry.equipmentId : null,
          category: categories.find((category) => category.id === entry.categoryId)?.name ?? '',
        })
      }

      reset(invoiceToFormValues(invoice, remembered, todayIso()))
      const known = invoice.items.filter((item) => remembered.has(item.articleNumber)).length
      setImportState({
        busy: false,
        failed: false,
        message:
          `Načítaných ${invoice.items.length} položiek z faktúry ${invoice.orderNumber}. ` +
          (known > 0 ? `Pri ${known} z nich som predvolil to isté, čo ste zvolili naposledy. ` : '') +
          'Skontrolujte názvy a čo sa má stať v technike, potom uložte.',
      })
    } catch {
      setImportState({ busy: false, message: 'Súbor sa nepodarilo prečítať. Je to PDF faktúra?', failed: true })
    }
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault()
    setDragging(false)
    const file = event.dataTransfer.files[0]
    if (file && !importState.busy) void importFile(file)
  }

  return (
    <form onSubmit={handleSubmit((values) => save.mutate(values))} noValidate className="flex flex-col gap-4">
      <div
        onDragOver={(event) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={cn(
          'rounded-xl border-2 border-dashed bg-surface p-5 text-center transition-colors',
          dragging && 'border-accent bg-accent/10',
        )}
      >
        <input
          ref={fileInput}
          type="file"
          accept="application/pdf,.pdf"
          className="sr-only"
          tabIndex={-1}
          onChange={(event) => {
            const file = event.target.files?.[0]
            event.target.value = ''
            if (file) void importFile(file)
          }}
        />
        <FileUp className="mx-auto size-7 text-muted-foreground" aria-hidden />
        <p className="mt-2 font-medium">{dragging ? 'Pustite faktúru sem' : 'Pretiahnite sem PDF faktúru z Thomannu'}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Formulár sa vyplní sám. Súbor sa číta vo vašom prehliadači a nikam sa neodosiela.
        </p>
        <Button variant="outline" size="sm" className="mt-3" disabled={importState.busy} onClick={() => fileInput.current?.click()}>
          {importState.busy ? 'Čítam…' : 'alebo vybrať súbor'}
        </Button>
        {importState.message && (
          <p role={importState.failed ? 'alert' : 'status'} className={cn('mt-3 text-sm', importState.failed && 'text-destructive')}>
            {importState.message}
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Dodávateľ *" placeholder="napr. Thomann" error={errors.supplier?.message} {...register('supplier')} />
        <Field label="Číslo objednávky / faktúry" autoComplete="off" error={errors.orderNumber?.message} {...register('orderNumber')} />
        <Field label="Dátum *" type="date" error={errors.orderedAt?.message} {...register('orderedAt')} />
        <SelectField label="Mena" error={errors.currency?.message} {...register('currency')}>
          {CURRENCIES.map((code) => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
        </SelectField>
      </div>

      <datalist id={categoryListId}>
        {categories.map((category) => (
          <option key={category.id} value={category.name} />
        ))}
      </datalist>

      <h2 className="mt-2 text-sm font-medium text-muted-foreground">Položky</h2>
      <ul className="flex flex-col gap-3">
        {fields.map((field, index) => {
          const itemErrors = errors.items?.[index]
          const item = items[index]
          const category = categories.find((c) => c.name.toLowerCase() === item?.category.trim().toLowerCase())
          const consumable = Boolean(category?.consumable)
          const mode = consumable ? 'none' : item?.mode
          const productUrl = supplierProductUrl(supplier ?? '', item?.articleNumber ?? '')
          return (
            <li key={field.id} className="flex flex-col gap-3 rounded-xl border bg-surface p-4">
              <div className="flex items-end gap-2">
                <Field
                  label="Názov *"
                  className="flex-1"
                  error={itemErrors?.name?.message}
                  {...register(`items.${index}.name`)}
                />
                <Button
                  variant="ghost"
                  aria-label={`Odstrániť položku ${index + 1}`}
                  disabled={fields.length === 1}
                  onClick={() => remove(index)}
                >
                  <Trash2 className="size-4" aria-hidden />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Field
                  label="Počet *"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  step={1}
                  error={itemErrors?.quantity?.message}
                  {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                />
                <Field
                  label="Cena za kus"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.01"
                  error={itemErrors?.unitPrice?.message}
                  {...register(`items.${index}.unitPrice`, { valueAsNumber: true })}
                />
                <Field
                  label="Kód tovaru"
                  autoComplete="off"
                  error={itemErrors?.articleNumber?.message}
                  {...register(`items.${index}.articleNumber`)}
                />
                <Field
                  label="Kategória"
                  list={categoryListId}
                  placeholder="vyberte alebo nová"
                  autoComplete="off"
                  error={itemErrors?.category?.message}
                  {...register(`items.${index}.category`)}
                />
              </div>

              {productUrl && (
                <a
                  href={productUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="-mt-1 inline-flex items-center gap-1 self-start text-sm text-accent hover:underline"
                >
                  Pozrieť tovar u dodávateľa
                  <ExternalLink className="size-3.5" aria-hidden />
                </a>
              )}

              {consumable ? (
                <p className="rounded-lg bg-muted p-3 text-sm">
                  Kategória „{category!.name}“ je spotrebný materiál: nákup sa eviduje len v objednávkach, do techniky sa
                  nepridáva.
                </p>
              ) : (
                <SelectField label="Čo s tým v technike" error={itemErrors?.mode?.message} {...register(`items.${index}.mode`)}>
                  {ITEM_MODES.map((value) => (
                    <option key={value} value={value}>
                      {MODE_LABELS[value]}
                    </option>
                  ))}
                </SelectField>
              )}

              {mode === 'existing' && (
                <SelectField
                  label="Ku ktorej technike pripočítať"
                  error={itemErrors?.equipmentId?.message}
                  {...register(`items.${index}.equipmentId`)}
                >
                  <option value="">— vyberte —</option>
                  {equipment.map((piece) => (
                    <option key={piece.id} value={piece.id}>
                      {piece.name} ({piece.quantity} ks)
                    </option>
                  ))}
                </SelectField>
              )}

              {(mode === 'separate' || mode === 'bulk') && (
                <div className="grid gap-3 sm:grid-cols-[1fr_12rem]">
                  <Field
                    label="Názov v technike"
                    placeholder="rovnaký ako názov položky"
                    error={itemErrors?.equipmentName?.message}
                    {...register(`items.${index}.equipmentName`)}
                  />
                  <SelectField label="Druh" {...register(`items.${index}.kind`)}>
                    {EQUIPMENT_KINDS.map((value) => (
                      <option key={value} value={value}>
                        {KIND_LABELS[value]}
                      </option>
                    ))}
                  </SelectField>
                </div>
              )}
            </li>
          )
        })}
      </ul>

      {errors.items?.root?.message && (
        <p role="alert" className="text-sm text-destructive">
          {errors.items.root.message}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="outline" onClick={() => append(EMPTY_ITEM)}>
          <Plus className="size-4" aria-hidden />
          Pridať položku
        </Button>
        <p className="text-lg font-semibold">Spolu: {formatMoney(orderTotal(items ?? []), currency)}</p>
      </div>

      <TextareaField label="Poznámka" error={errors.note?.message} {...register('note')} />

      {save.isError && (
        <p role="alert" className="text-sm text-destructive">
          Uloženie zlyhalo, nič sa nezapísalo. Skontrolujte pripojenie a skúste to znova.
        </p>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? 'Ukladám…' : 'Uložiť objednávku'}
        </Button>
        <LinkButton to="/orders" variant="outline">
          Zrušiť
        </LinkButton>
      </div>
    </form>
  )
}

export function OrderFormPage() {
  const company = useCompany().active!
  const allowed = canManageOrders(company.role)
  const lookups = useEquipmentLookups(company.companyId)
  const equipment = useQuery({
    queryKey: equipmentKeys.list(company.companyId),
    queryFn: () => fetchEquipmentList(company.companyId),
    enabled: allowed,
  })

  let body
  if (!allowed) {
    body = <ErrorBlock message="Objednávky môže zapisovať iba admin a skladník." />
  } else if (lookups.isPending || equipment.isPending) {
    body = <LoadingBlock />
  } else if (lookups.isError || equipment.isError) {
    body = <ErrorBlock message="Údaje sa nepodarilo načítať." onRetry={() => void equipment.refetch()} />
  } else {
    body = <OrderForm companyId={company.companyId} equipment={equipment.data} categories={lookups.categories} />
  }

  return (
    <>
      <PageHeader title="Nová objednávka" />
      {body}
    </>
  )
}
