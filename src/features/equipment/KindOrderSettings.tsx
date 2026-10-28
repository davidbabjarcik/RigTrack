import { ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useUserPrefs } from '@/features/settings/userPrefs'
import { EQUIPMENT_KINDS, KIND_LABELS, type EquipmentKind } from './model'

/** Úplné poradie druhov: uložené (moje zameranie) a za ním ostatné v predvolenom poradí. */
function kindOrderOf(saved: string[] | undefined): EquipmentKind[] {
  const known = (saved ?? []).filter((kind): kind is EquipmentKind => (EQUIPMENT_KINDS as readonly string[]).includes(kind))
  return [...known, ...EQUIPMENT_KINDS.filter((kind) => !known.includes(kind))]
}

/**
 * Nastavenia → Účet: poradie techniky pri triedení „Podľa kategórie / druhu“ – svetlár si dá svetlá hore, zvukár zvuk.
 * Platí pre váš účet na každom zariadení.
 */
export function KindOrderSettings() {
  const { prefs, update } = useUserPrefs()
  const order = kindOrderOf(prefs.kindOrder)
  const move = (index: number, step: -1 | 1) => {
    const next = [...order]
    const target = index + step
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    update({ kindOrder: next })
  }
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-muted-foreground">
        Pri triedení techniky „Podľa kategórie / druhu“ budú druhy v tomto poradí (napr. svetlá hore, ak robíte svetlá).
      </p>
      <ol className="divide-y overflow-hidden rounded-xl border bg-surface">
        {order.map((kind, index) => (
          <li key={kind} className="flex items-center gap-2 px-3 py-1.5 text-sm">
            <span className="w-6 text-muted-foreground tabular-nums">{index + 1}.</span>
            <span className="min-w-0 flex-1 truncate font-medium">{KIND_LABELS[kind]}</span>
            <Button size="sm" variant="ghost" className="size-8 p-0" aria-label={`${KIND_LABELS[kind]} vyššie`} disabled={index === 0} onClick={() => move(index, -1)}>
              <ChevronUp className="size-4" aria-hidden />
            </Button>
            <Button size="sm" variant="ghost" className="size-8 p-0" aria-label={`${KIND_LABELS[kind]} nižšie`} disabled={index === order.length - 1} onClick={() => move(index, 1)}>
              <ChevronDown className="size-4" aria-hidden />
            </Button>
          </li>
        ))}
      </ol>
      {prefs.kindOrder && prefs.kindOrder.length > 0 && (
        <button type="button" className="self-start text-sm text-accent hover:underline" onClick={() => update({ kindOrder: [] })}>
          Vrátiť predvolené poradie
        </button>
      )}
    </div>
  )
}
