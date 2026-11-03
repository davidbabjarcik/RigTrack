import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, ChevronUp, Plug } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { equipmentKeys, setSheetAccessory } from '@/features/equipment/api'
import type { Equipment } from '@/features/equipment/model'
import { useUserPrefs } from '@/features/settings/userPrefs'
import type { Case } from './model'

type Props = { companyId: string; members: Case[]; equipment: Equipment[]; canEdit: boolean }

/**
 * Sada cases: čo je na hárku s obsahom príslušenstvo – naraz vo všetkých cases sady (podľa názvu techniky) –
 * a poradie príslušenstva na hárku (platí pre všetky hárky).
 */
export function SetAccessories({ companyId, members, equipment, canEdit }: Props) {
  const queryClient = useQueryClient()
  const { prefs, update } = useUserPrefs()
  const sheet = prefs.sheet ?? {}
  const order = sheet.accessoryOrder ?? []
  const [open, setOpen] = useState(false)
  const ids = new Set(members.map((item) => item.id))
  const inside = equipment.filter((item) => item.caseId && ids.has(item.caseId))
  // Technika sady podľa názvu: v koľkých cases je a či je všade príslušenstvo.
  const names = [...new Set(inside.map((item) => item.name))].sort((a, b) => a.localeCompare(b, 'sk', { numeric: true }))
  const rowsOf = (name: string) => inside.filter((item) => item.name === name)
  const isAccessory = (name: string) => rowsOf(name).every((item) => item.attributes.sheetAccessory)
  const isMixed = (name: string) => !isAccessory(name) && rowsOf(name).some((item) => item.attributes.sheetAccessory)
  const rank = (name: string) => (order.includes(name) ? order.indexOf(name) : order.length)
  const accessories = names.filter(isAccessory).sort((a, b) => rank(a) - rank(b) || a.localeCompare(b, 'sk', { numeric: true }))

  const toggle = useMutation({
    mutationFn: async ({ name, on }: { name: string; on: boolean }) => {
      for (const item of rowsOf(name)) {
        if (Boolean(item.attributes.sheetAccessory) !== on) await setSheetAccessory(companyId, item.id, item.attributes, on)
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: equipmentKeys.list(companyId) }),
  })
  const move = (name: string, step: -1 | 1) => {
    const list = [...accessories]
    const index = list.indexOf(name)
    const target = index + step
    if (target < 0 || target >= list.length) return
    ;[list[index], list[target]] = [list[target], list[index]]
    update({ sheet: { ...sheet, accessoryOrder: [...list, ...order.filter((value) => !list.includes(value))] } })
  }

  if (names.length === 0) return null
  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Plug className="size-4" aria-hidden />
        Príslušenstvo v obsahu
      </Button>
    )
  }

  return (
    <section className="mb-4 w-full rounded-xl border bg-surface p-4" aria-labelledby="set-accessories-heading">
      <div className="mb-2 flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <h2 id="set-accessories-heading" className="font-semibold">
            Príslušenstvo v obsahu
          </h2>
          <p className="text-sm text-muted-foreground">Zaškrtnuté je na hárku s obsahom ako príslušenstvo – vo všetkých {members.length} cases naraz.</p>
        </div>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Zavrieť
        </Button>
      </div>
      <ul className="mb-3 divide-y rounded-lg border">
        {names.map((name) => {
          const cases = new Set(rowsOf(name).map((item) => item.caseId)).size
          return (
            <li key={name} className="shrink-0">
              <label className="flex min-h-11 cursor-pointer items-center gap-3 px-3 py-2 hover:bg-muted">
                <input
                  type="checkbox"
                  className="size-4"
                  disabled={!canEdit || toggle.isPending}
                  checked={isAccessory(name)}
                  ref={(element) => {
                    if (element) element.indeterminate = isMixed(name)
                  }}
                  onChange={(event) => toggle.mutate({ name, on: event.target.checked })}
                />
                <span className="min-w-0 flex-1 truncate">{name}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {cases === members.length ? 'vo všetkých' : `v ${cases} z ${members.length}`}
                  {isMixed(name) && ' · len niekde príslušenstvo'}
                </span>
              </label>
            </li>
          )
        })}
      </ul>
      {accessories.length > 1 && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">Poradie na hárku:</span>
          {accessories.map((name, index) => (
            <span key={name} className="inline-flex items-center gap-1 rounded-lg border bg-background py-1 pr-1 pl-3">
              <span className="font-medium">
                {index + 1}. {name}
              </span>
              <Button size="sm" variant="ghost" className="size-8 p-0" aria-label={`${name} skôr`} disabled={index === 0} onClick={() => move(name, -1)}>
                <ChevronUp className="size-4" aria-hidden />
              </Button>
              <Button size="sm" variant="ghost" className="size-8 p-0" aria-label={`${name} neskôr`} disabled={index === accessories.length - 1} onClick={() => move(name, 1)}>
                <ChevronDown className="size-4" aria-hidden />
              </Button>
            </span>
          ))}
        </div>
      )}
      {toggle.isError && <p className="mt-2 text-sm text-destructive">Nepodarilo sa uložiť.</p>}
    </section>
  )
}
