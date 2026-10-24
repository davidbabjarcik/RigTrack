import { Plus, Trash2 } from 'lucide-react'
import { useId } from 'react'
import { useFieldArray, type Control, type UseFormRegister } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { useMembers } from '@/features/companies/useMembers'
import type { EquipmentFormValues } from './model'

type Props = { companyId: string; control: Control<EquipmentFormValues>; register: UseFormRegister<EquipmentFormValues>; quantity: number }

/** Kto káble vyrobil (spájkoval): aj rozdelené, napr. z 10 XLR spravil 8 Jano a 2 Fero. */
export function CableMakersField({ companyId, control, register, quantity }: Props) {
  const makers = useFieldArray({ control, name: 'makers' })
  const members = useMembers(companyId)
  const listId = useId()
  return (
    <div className="sm:col-span-2">
      <p className="mb-1.5 text-sm font-medium">Kto kábel vyrobil (nepovinné)</p>
      {makers.fields.length > 0 && (
        <ul className="mb-2 flex flex-col gap-2">
          {makers.fields.map((field, index) => (
            <li key={field.id} className="flex items-end gap-2">
              <Field label="Kto" hideLabel={index > 0} className="flex-1" list={listId} maxLength={80} placeholder="meno" {...register(`makers.${index}.name`)} />
              <Field
                label="Kusov"
                hideLabel={index > 0}
                className="w-24"
                type="number"
                inputMode="numeric"
                min={1}
                {...register(`makers.${index}.count`, { valueAsNumber: true })}
              />
              <Button variant="ghost" aria-label={`Odobrať ${index + 1}`} onClick={() => makers.remove(index)}>
                <Trash2 className="size-4" aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <datalist id={listId}>
        {(members.data ?? []).map((member) => (
          <option key={member.userId} value={member.fullName || member.email} />
        ))}
      </datalist>
      <Button
        variant="outline"
        size="sm"
        onClick={() => makers.append({ name: '', count: makers.fields.length === 0 ? Math.max(1, Number.isFinite(quantity) ? quantity : 1) : 1 })}
      >
        <Plus className="size-4" aria-hidden />
        Pridať kto vyrobil
      </Button>
      <p className="mt-1 text-xs text-muted-foreground">V Štatistikách potom uvidíte, kto spravil najviac káblov.</p>
    </div>
  )
}
