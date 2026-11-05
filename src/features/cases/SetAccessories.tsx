import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowDown, ArrowUp, Plug } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { equipmentKeys, setSheetAccessory } from '@/features/equipment/api'
import type { Equipment } from '@/features/equipment/model'
import { useUserPrefs } from '@/features/settings/userPrefs'
import { cn } from '@/lib/utils'
import type { Case } from './model'
import { tx, tf } from '@/lib/i18n'

type Props = { companyId: string; members: Case[]; equipment: Equipment[]; canEdit: boolean }

const byName = (a: string, b: string) => a.localeCompare(b, 'sk', { numeric: true })

/**
 * Sada cases: čo je na hárku s obsahom príslušenstvo – naraz vo všetkých cases sady (podľa názvu techniky) –
 * a v akom poradí. Zmeny sa naklikajú a zapíšu až tlačidlom Uložiť.
 */
export function SetAccessories(props: Props) {
  const [open, setOpen] = useState(false)
  const ids = new Set(props.members.map((item) => item.id))
  const inside = props.equipment.filter((item) => item.caseId && ids.has(item.caseId))
  if (inside.length === 0) return null
  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Plug className="size-4" aria-hidden />{tx('Príslušenstvo v obsahu')}</Button>
    )
  }
  return <Editor {...props} inside={inside} onClose={() => setOpen(false)} />
}

function Editor({ companyId, members, canEdit, inside, onClose }: Props & { inside: Equipment[]; onClose: () => void }) {
  const queryClient = useQueryClient()
  const { prefs, update } = useUserPrefs()
  const sheet = prefs.sheet ?? {}
  const savedOrder = sheet.accessoryOrder ?? []
  const names = [...new Set(inside.map((item) => item.name))].sort(byName)
  const rowsOf = (name: string) => inside.filter((item) => item.name === name)
  const isAccessory = (name: string) => rowsOf(name).every((item) => item.attributes.sheetAccessory)
  const isMixed = (name: string) => !isAccessory(name) && rowsOf(name).some((item) => item.attributes.sheetAccessory)
  const rank = (name: string) => (savedOrder.includes(name) ? savedOrder.indexOf(name) : savedOrder.length)
  // Rozpracované: príslušenstvo v poradí na hárku (hore v zozname), ostatné pod ním podľa abecedy.
  const [chosen, setChosen] = useState<string[]>(() => names.filter(isAccessory).sort((a, b) => rank(a) - rank(b) || byName(a, b)))
  const others = names.filter((name) => !chosen.includes(name))
  const initial = names.filter(isAccessory).sort((a, b) => rank(a) - rank(b) || byName(a, b))
  const changed = chosen.join('\u0000') !== initial.join('\u0000') || names.some(isMixed)

  const toggle = (name: string) => setChosen((current) => (current.includes(name) ? current.filter((value) => value !== name) : [...current, name]))
  const move = (name: string, step: -1 | 1) =>
    setChosen((current) => {
      const list = [...current]
      const index = list.indexOf(name)
      const target = index + step
      if (target < 0 || target >= list.length) return current
      ;[list[index], list[target]] = [list[target], list[index]]
      return list
    })

  const save = useMutation({
    mutationFn: async () => {
      for (const name of names) {
        const on = chosen.includes(name)
        for (const item of rowsOf(name)) {
          if (Boolean(item.attributes.sheetAccessory) !== on) await setSheetAccessory(companyId, item.id, item.attributes, on)
        }
      }
      // Poradie: zvolené hore, ostatné uložené názvy (z iných cases) za nimi.
      update({ sheet: { ...sheet, accessoryOrder: [...chosen, ...savedOrder.filter((value) => !chosen.includes(value))] } })
    },
    onSuccess: onClose,
    onSettled: () => queryClient.invalidateQueries({ queryKey: equipmentKeys.list(companyId) }),
  })

  const caseCount = (name: string) => new Set(rowsOf(name).map((item) => item.caseId)).size
  const where = (name: string) => (caseCount(name) === members.length ? tx('vo všetkých') : `v ${caseCount(name)} z ${members.length}`)

  return (
    <section className="mb-4 w-full rounded-xl border bg-surface p-4" aria-labelledby="set-accessories-heading">
      <h2 id="set-accessories-heading" className="font-semibold">{tx('Príslušenstvo v obsahu')}</h2>
      <p className="mb-3 text-sm text-muted-foreground">{tx('Zaškrtnuté je na hárku s obsahom ako príslušenstvo vo všetkých')}{' '}{members.length}{' '}{tx('cases, v poradí zhora nadol. Šípkami zmeníte poradie.')}</p>

      <p className="mb-1 text-xs font-medium text-muted-foreground uppercase">{tx('Príslušenstvo – poradie na hárku')}</p>
      <ol className="mb-3 divide-y rounded-lg border">
        {chosen.length === 0 && <li className="px-3 py-2 text-sm text-muted-foreground">{tx('Nič – zaškrtnite niečo nižšie.')}</li>}
        {chosen.map((name, index) => (
          <li key={name} className="flex min-h-11 items-center gap-2 px-3 py-1.5">
            <input type="checkbox" className="size-4" aria-label={tf('{0} – príslušenstvo', name)} disabled={!canEdit} checked onChange={() => toggle(name)} />
            <span className="w-6 shrink-0 text-right font-semibold tabular-nums text-accent">{index + 1}.</span>
            <span className="min-w-0 flex-1 truncate">{name}</span>
            <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">{where(name)}</span>
            <Button size="sm" variant="ghost" className="size-8 p-0" aria-label={tf('{0} vyššie', name)} disabled={!canEdit || index === 0} onClick={() => move(name, -1)}>
              <ArrowUp className="size-4" aria-hidden />
            </Button>
            <Button size="sm" variant="ghost" className="size-8 p-0" aria-label={tf('{0} nižšie', name)} disabled={!canEdit || index === chosen.length - 1} onClick={() => move(name, 1)}>
              <ArrowDown className="size-4" aria-hidden />
            </Button>
          </li>
        ))}
      </ol>

      {others.length > 0 && (
        <>
          <p className="mb-1 text-xs font-medium text-muted-foreground uppercase">{tx('Obsah (nie príslušenstvo)')}</p>
          <ul className="mb-3 divide-y rounded-lg border">
            {others.map((name) => (
              <li key={name}>
                <label className={cn('flex min-h-11 items-center gap-2 px-3 py-1.5', canEdit && 'cursor-pointer hover:bg-muted')}>
                  <input type="checkbox" className="size-4" disabled={!canEdit} checked={false} onChange={() => toggle(name)} />
                  <span className="w-6 shrink-0" />
                  <span className="min-w-0 flex-1 truncate">{name}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {where(name)}
                    {isMixed(name) && tx(' · teraz len niekde príslušenstvo')}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {canEdit && (
          <Button disabled={!changed || save.isPending} onClick={() => save.mutate()}>
            {save.isPending ? tx('Ukladám…') : tx('Uložiť')}
          </Button>
        )}
        <Button variant="ghost" disabled={save.isPending} onClick={onClose}>
          {changed ? tx('Zrušiť') : tx('Zavrieť')}
        </Button>
        {save.isError && <span className="text-sm text-destructive">{tx('Nepodarilo sa uložiť – skúste to znova.')}</span>}
      </div>
    </section>
  )
}
