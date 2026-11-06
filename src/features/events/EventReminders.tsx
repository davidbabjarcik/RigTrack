import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, Lightbulb, Plus, X } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ampReminders, useCatalog } from '@/features/equipment/catalog'
import type { Equipment, Lookup } from '@/features/equipment/model'
import { describeMatcher, fetchRules, loadDismissed, reminders, ruleKeys, saveDismissed, type Line, type Matcher } from './rules'
import { tx, tf, useT } from '@/lib/i18n'

type Props = {
  companyId: string
  /** Technika eventu alebo výpožičky. */
  lines: Line[]
  /** Slovo do textu: „na evente“, „vo výpožičke“. */
  where: string
  /** Pod čím si prehliadač pamätá odkliknuté „Netreba“ (id eventu, „loan:id“). */
  storageKey: string
  equipment: Equipment[]
  categories: Lookup[]
  cases: { id: string; name: string }[]
  canEdit: boolean
  busy: boolean
  onAddEquipment: (equipmentId: string, quantity: number) => void
  onAddCase: (caseId: string) => void
  onOpenPicker: () => void
}

/** Pripomienky podľa pravidiel z nastavení: čo by k vybranej technike ešte mohlo treba. */
export function EventReminders({ companyId, lines, where, storageKey, equipment, categories, cases, canEdit, busy, onAddEquipment, onAddCase, onOpenPicker }: Props) {
  const rules = useQuery({ queryKey: ruleKeys.list(companyId), queryFn: () => fetchRules(companyId) })
  const [dismissed, setDismissed] = useState(() => loadDismissed(storageKey))
  const describe = (matcher: Matcher) => describeMatcher(matcher, { equipment, categories, cases })
  const shown = reminders(lines, rules.data ?? [], equipment, describe, where).filter((reminder) => !dismissed.includes(reminder.rule.id))
  // Zosilňovače z databáze techniky (napr. box L-Acoustics ide len na ich zosilňovače) – bez nastavovania pravidiel.
  const catalog = useCatalog()
  const t = useT()
  const items = lines.flatMap((line) => {
    const item = equipment.find((candidate) => candidate.id === line.equipmentId)
    return item ? [{ manufacturer: item.manufacturer, model: item.model, name: item.name, kind: item.kind, quantity: line.quantity }] : []
  })
  const amps = ampReminders(items, catalog.data ?? [], tx(where), t).filter((reminder) => !dismissed.includes(reminder.key))
  if (shown.length === 0 && amps.length === 0) return null

  const dismiss = (id: string) => {
    const next = [...dismissed, id]
    setDismissed(next)
    saveDismissed(storageKey, next)
  }

  return (
    <ul className="mb-3 flex flex-col gap-2">
      {amps.map((reminder) => (
        <li key={reminder.key} className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-400/60 bg-amber-100/60 p-3 text-sm dark:bg-amber-950/40">
          <AlertTriangle className="size-4 shrink-0 text-amber-600 dark:text-amber-300" aria-hidden />
          <span className="min-w-0 flex-1">{reminder.text}</span>
          {canEdit && (
            <Button variant="outline" size="sm" disabled={busy} onClick={onOpenPicker}>
              <Plus className="size-4" aria-hidden />
              {tx('Vybrať')}
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => dismiss(reminder.key)}>
            <X className="size-4" aria-hidden />
            {tx('Netreba')}
          </Button>
        </li>
      ))}
      {shown.map(({ rule, text, missing }) => (
        <li key={rule.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-sky-400/50 bg-sky-100/60 p-3 text-sm dark:bg-sky-950/40">
          <Lightbulb className="size-4 shrink-0 text-sky-600 dark:text-sky-300" aria-hidden />
          <span className="min-w-0 flex-1">{text}</span>
          {canEdit && (
            <Button
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => {
                if (rule.need.type === 'equipment') onAddEquipment(rule.need.value, missing)
                else if (rule.need.type === 'case') onAddCase(rule.need.value)
                else onOpenPicker()
              }}
            >
              <Plus className="size-4" aria-hidden />
              {rule.need.type === 'equipment' ? (missing > 1 ? tf('Pridať {0} ks', missing) : tx('Pridať')) : rule.need.type === 'case' ? tx('Pridať case') : tx('Vybrať')}
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => dismiss(rule.id)}>
            <X className="size-4" aria-hidden />{tx('Netreba')}</Button>
        </li>
      ))}
    </ul>
  )
}
