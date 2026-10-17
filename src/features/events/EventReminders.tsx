import { useQuery } from '@tanstack/react-query'
import { Lightbulb, Plus, X } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import type { Equipment, Lookup } from '@/features/equipment/model'
import type { CompanyEvent } from './model'
import { describeMatcher, eventReminders, fetchRules, loadDismissed, ruleKeys, saveDismissed, type Matcher } from './rules'

type Props = {
  companyId: string
  event: CompanyEvent
  equipment: Equipment[]
  categories: Lookup[]
  cases: { id: string; name: string }[]
  canEdit: boolean
  busy: boolean
  onAddEquipment: (equipmentId: string) => void
  onAddCase: (caseId: string) => void
  onOpenPicker: () => void
}

/** Pripomienky podľa pravidiel z nastavení: čo by k technike na evente ešte mohlo treba. */
export function EventReminders({ companyId, event, equipment, categories, cases, canEdit, busy, onAddEquipment, onAddCase, onOpenPicker }: Props) {
  const rules = useQuery({ queryKey: ruleKeys.list(companyId), queryFn: () => fetchRules(companyId) })
  const [dismissed, setDismissed] = useState(() => loadDismissed(event.id))
  const describe = (matcher: Matcher) => describeMatcher(matcher, { equipment, categories, cases })
  const reminders = eventReminders(event, rules.data ?? [], equipment, describe).filter((reminder) => !dismissed.includes(reminder.rule.id))
  if (reminders.length === 0) return null

  const dismiss = (id: string) => {
    const next = [...dismissed, id]
    setDismissed(next)
    saveDismissed(event.id, next)
  }

  return (
    <ul className="mb-3 flex flex-col gap-2">
      {reminders.map(({ rule, text }) => (
        <li key={rule.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-sky-400/50 bg-sky-100/60 p-3 text-sm dark:bg-sky-950/40">
          <Lightbulb className="size-4 shrink-0 text-sky-600 dark:text-sky-300" aria-hidden />
          <span className="min-w-0 flex-1">{text}</span>
          {canEdit && (
            <Button
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => {
                if (rule.need.type === 'equipment') onAddEquipment(rule.need.value)
                else if (rule.need.type === 'case') onAddCase(rule.need.value)
                else onOpenPicker()
              }}
            >
              <Plus className="size-4" aria-hidden />
              {rule.need.type === 'equipment' || rule.need.type === 'case' ? 'Pridať' : 'Vybrať'}
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => dismiss(rule.id)}>
            <X className="size-4" aria-hidden />
            Netreba
          </Button>
        </li>
      ))}
    </ul>
  )
}
