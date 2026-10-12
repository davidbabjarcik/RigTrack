import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Trash2 } from 'lucide-react'
import { useForm, useWatch } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Field, SelectField, TextareaField } from '@/components/ui/field'
import type { Member } from '@/features/companies/api'
import { asOptionalNumber } from '@/features/equipment/model'
import { PRIORITIES, PRIORITY_LABELS } from '@/lib/priority'
import { deleteShoppingItem, saveShoppingItem, shoppingKeys } from './api'
import {
  SHOPPING_LIST_LABELS,
  SHOPPING_LISTS,
  SHOPPING_STATUS_LABELS,
  SHOPPING_STATUSES,
  shoppingSchema,
  type ShoppingFormValues,
  type ShoppingItem,
  type ShoppingList,
} from './model'

type Props = {
  companyId: string
  /** null = nová položka */
  item: ShoppingItem | null
  /** Zoznam, do ktorého sa nová položka predvolene zaradí. */
  defaultList: ShoppingList
  members: Member[]
  canDelete: boolean
  onClose: () => void
}

/** Formulár na novú položku nákupného zoznamu alebo úpravu existujúcej. */
export function ShoppingEditor({ companyId, item, defaultList, members, canDelete, onClose }: Props) {
  const queryClient = useQueryClient()
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ShoppingFormValues>({
    resolver: zodResolver(shoppingSchema),
    defaultValues: {
      list: item?.list ?? defaultList,
      name: item?.name ?? '',
      quantity: item?.quantity ?? 1,
      unitPrice: item?.unitPrice ?? undefined,
      supplier: item?.supplier ?? '',
      url: item?.url ?? '',
      priority: item?.priority ?? 'normal',
      dueOn: item?.dueOn ?? '',
      status: item?.status ?? 'planned',
      assigneeId: item?.assigneeId ?? '',
      orderNumber: item?.orderNumber ?? '',
      note: item?.note ?? '',
    },
  })
  // Stav objednávky, termín a zodpovedná osoba dávajú zmysel až pri konkrétnom nákupe.
  const concrete = useWatch({ control, name: 'list' }) === 'buy'

  const refresh = () => queryClient.invalidateQueries({ queryKey: shoppingKeys.list(companyId) })
  const save = useMutation({
    mutationFn: (values: ShoppingFormValues) => saveShoppingItem(companyId, item?.id ?? null, values),
    onSuccess: async () => {
      await refresh()
      onClose()
    },
  })
  const remove = useMutation({
    mutationFn: () => deleteShoppingItem(companyId, item!.id),
    onSuccess: async () => {
      await refresh()
      onClose()
    },
  })

  return (
    <form
      onSubmit={handleSubmit((values) => save.mutate(values))}
      noValidate
      className="flex flex-col gap-3 rounded-xl border bg-surface p-4"
    >
      <div className="grid gap-3 sm:grid-cols-[1fr_12rem]">
        <Field label="Názov *" autoFocus error={errors.name?.message} {...register('name')} />
        <SelectField label="Zoznam" error={errors.list?.message} {...register('list')}>
          {SHOPPING_LISTS.map((value) => (
            <option key={value} value={value}>
              {SHOPPING_LIST_LABELS[value]}
            </option>
          ))}
        </SelectField>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field
          label="Počet"
          type="number"
          inputMode="numeric"
          min={1}
          step={1}
          error={errors.quantity?.message}
          {...register('quantity', { valueAsNumber: true })}
        />
        <Field
          label={concrete ? 'Cena za kus (€)' : 'Odhad ceny za kus (€)'}
          type="number"
          inputMode="decimal"
          min={0}
          step="0.01"
          error={errors.unitPrice?.message}
          {...register('unitPrice', asOptionalNumber)}
        />
        <SelectField label="Priorita" error={errors.priority?.message} {...register('priority')}>
          {PRIORITIES.map((value) => (
            <option key={value} value={value}>
              {PRIORITY_LABELS[value]}
            </option>
          ))}
        </SelectField>
        <Field label="Dodávateľ" error={errors.supplier?.message} {...register('supplier')} />
      </div>
      <Field
        label="Odkaz na produkt alebo ponuku"
        type="url"
        placeholder="https://"
        error={errors.url?.message}
        {...register('url')}
      />

      {concrete && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SelectField label="Stav" error={errors.status?.message} {...register('status')}>
            {SHOPPING_STATUSES.map((value) => (
              <option key={value} value={value}>
                {SHOPPING_STATUS_LABELS[value]}
              </option>
            ))}
          </SelectField>
          <Field label="Kúpiť do" type="date" error={errors.dueOn?.message} {...register('dueOn')} />
          <SelectField label="Kto to vybaví" error={errors.assigneeId?.message} {...register('assigneeId')}>
            <option value="">— nikto konkrétny —</option>
            {members.map((member) => (
              <option key={member.userId} value={member.userId}>
                {member.fullName || member.email}
              </option>
            ))}
          </SelectField>
          <Field label="Číslo objednávky / faktúry" error={errors.orderNumber?.message} {...register('orderNumber')} />
        </div>
      )}

      <TextareaField label="Poznámka" rows={2} error={errors.note?.message} {...register('note')} />

      {(save.isError || remove.isError) && (
        <p role="alert" className="text-sm text-destructive">
          Zmena sa nepodarila. Skúste to znova.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" disabled={save.isPending}>
          {save.isPending ? 'Ukladám…' : 'Uložiť'}
        </Button>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Zrušiť
        </Button>
        {item && canDelete && (
          <Button
            variant="destructive"
            size="sm"
            className="ml-auto"
            disabled={remove.isPending}
            onClick={() => {
              if (window.confirm('Odstrániť túto položku?')) remove.mutate()
            }}
          >
            <Trash2 className="size-4" aria-hidden />
            Odstrániť
          </Button>
        )}
      </div>
    </form>
  )
}
