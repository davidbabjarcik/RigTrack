import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { addDutyTypes, deleteDutyType, dutyKeys, updateDutyType, useDutyTypes } from './api'
import { DEFAULT_DUTIES, type DutyType } from './model'

/** Nastavenia: aké činnosti sa pri eventoch zapisujú (nakladanie, kontrola hliníka…). */
export function DutySettings({ companyId }: { companyId: string }) {
  const queryClient = useQueryClient()
  const types = useDutyTypes(companyId)
  const [name, setName] = useState('')
  const refresh = () => queryClient.invalidateQueries({ queryKey: dutyKeys.types(companyId) })
  const list = types.data ?? []
  const nextSort = list.reduce((max, type) => Math.max(max, type.sort), 0) + 1
  const add = useMutation({ mutationFn: (names: string[]) => addDutyTypes(companyId, names, nextSort), onSuccess: () => setName(''), onSettled: refresh })
  const update = useMutation({ mutationFn: ({ id, fields }: { id: string; fields: Partial<DutyType> }) => updateDutyType(id, fields), onSettled: refresh })
  const remove = useMutation({ mutationFn: deleteDutyType, onSettled: refresh })
  // Posun v poradí: vymenia sa poradové čísla so susedom.
  const swap = (index: number, by: -1 | 1) => {
    const a = list[index]
    const b = list[index + by]
    if (!a || !b) return
    update.mutate({ id: a.id, fields: { sort: b.sort === a.sort ? a.sort + by : b.sort } })
    update.mutate({ id: b.id, fields: { sort: a.sort } })
  }

  if (types.isError) return <p className="rounded-xl border bg-surface p-4 text-sm text-muted-foreground">Táto časť databázy ešte nie je pripravená – kontaktujte vývojára aplikácie.</p>
  const exists = list.some((type) => type.name.trim().toLowerCase() === name.trim().toLowerCase())

  return (
    <div className="rounded-xl border bg-surface p-4">
      <p className="mb-3 text-sm text-muted-foreground">
        Činnosti, ku ktorým sa pri evente zapisujú ľudia – napr. kto nakladal dodávku alebo kontroloval kabeláž. V Štatistikách potom uvidíte, kto čo
        robil najčastejšie. Vypnutá činnosť sa pri nových eventoch neponúka, ale ostane v štatistikách.
      </p>
      {list.length > 0 ? (
        <ul className="mb-3 divide-y overflow-hidden rounded-lg border">
          {list.map((type, index) => (
            <li key={type.id} className="flex items-center gap-2 px-3 py-2">
              <span className={type.active ? 'min-w-0 flex-1 font-medium' : 'min-w-0 flex-1 text-muted-foreground line-through'}>{type.name}</span>
              <label className="flex items-center gap-1 text-sm">
                <input type="checkbox" className="size-4" checked={type.active} onChange={(event) => update.mutate({ id: type.id, fields: { active: event.target.checked } })} />
                Zapnutá
              </label>
              <Button variant="ghost" size="sm" aria-label="Posunúť vyššie" disabled={index === 0 || update.isPending} onClick={() => swap(index, -1)}>
                <ArrowUp className="size-4" aria-hidden />
              </Button>
              <Button variant="ghost" size="sm" aria-label="Posunúť nižšie" disabled={index === list.length - 1 || update.isPending} onClick={() => swap(index, 1)}>
                <ArrowDown className="size-4" aria-hidden />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                aria-label={`Zmazať ${type.name}`}
                disabled={remove.isPending}
                onClick={() => window.confirm(`Zmazať „${type.name}“? Zmažú sa aj zápisy pri eventoch a zmizne zo štatistík. Ak ju len nechcete ponúkať, vypnite ju.`) && remove.mutate(type.id)}
              >
                <Trash2 className="size-4" aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mb-3 rounded-lg border border-dashed p-3 text-sm">
          <p className="mb-2">Zatiaľ žiadne činnosti.</p>
          <Button size="sm" variant="outline" disabled={add.isPending || types.isPending} onClick={() => add.mutate(DEFAULT_DUTIES)}>
            Pridať predvolené: {DEFAULT_DUTIES.join(', ')}
          </Button>
        </div>
      )}
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          if (name.trim() && !exists) add.mutate([name])
        }}
      >
        <Field label="Nová činnosť" className="min-w-48 flex-1" maxLength={60} placeholder="napr. Stavba pódia" value={name} onChange={(event) => setName(event.target.value)} />
        <Button type="submit" disabled={add.isPending || !name.trim() || exists}>
          <Plus className="size-4" aria-hidden />
          Pridať
        </Button>
      </form>
      {exists && <p className="mt-2 text-sm text-muted-foreground">Taká činnosť už je.</p>}
      {(add.isError || update.isError || remove.isError) && <p className="mt-2 text-sm text-destructive">Zmena sa nepodarila.</p>}
    </div>
  )
}
