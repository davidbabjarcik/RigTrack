import { useUserPrefs } from '@/features/settings/userPrefs'
import { DEFAULT_PRIORITY_COLORS, priorityColor, TASK_PRIORITIES, TASK_PRIORITY_LABELS } from './model'

/** Nastavenia → Účet: farby priorít úloh (platia pre váš účet na každom zariadení). */
export function PriorityColorsSettings() {
  const { prefs, update } = useUserPrefs()
  const custom = prefs.priorityColors ?? {}
  const changed = Object.keys(custom).length > 0
  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-surface p-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {TASK_PRIORITIES.map((priority) => (
          <label key={priority} className="flex items-center gap-2 text-sm">
            <input
              type="color"
              className="size-9 cursor-pointer rounded border bg-transparent"
              value={priorityColor(priority, custom)}
              onChange={(event) => {
                const next = { ...custom, [priority]: event.target.value }
                if (event.target.value === DEFAULT_PRIORITY_COLORS[priority]) delete next[priority]
                update({ priorityColors: next })
              }}
            />
            {TASK_PRIORITY_LABELS[priority]}
          </label>
        ))}
      </div>
      {changed && (
        <button type="button" className="self-start text-sm text-accent hover:underline" onClick={() => update({ priorityColors: {} })}>
          Vrátiť predvolené (sivá, modrá, žltá, červená)
        </button>
      )}
    </div>
  )
}
