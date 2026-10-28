import { useMutation, useQueryClient } from '@tanstack/react-query'
import { errorDetail } from '@/lib/supabase/errors'
import { CATEGORY_COLORS, COLOR_CLASSES, COLOR_LABELS, DEFAULT_KIND_COLORS } from './categoryColors'
import { kindColorKeys, saveKindColor, useKindColors, type KindColor } from './kindColors'
import { EQUIPMENT_KINDS, KIND_LABELS, type EquipmentKind } from './model'

/**
 * Nastavenia → Zoznamy: farba pruhu v zozname techniky podľa druhu (Svetlo, Zvuk…). Platí pre techniku bez kategórie
 * alebo s kategóriou bez farby.
 */
export function KindColorsSettings({ companyId, canEdit }: { companyId: string; canEdit: boolean }) {
  const queryClient = useQueryClient()
  const colors = useKindColors(companyId)
  const save = useMutation({
    mutationFn: ({ kind, color }: { kind: EquipmentKind; color: KindColor | null }) => saveKindColor(companyId, kind, color),
    onSettled: () => queryClient.invalidateQueries({ queryKey: kindColorKeys.list(companyId) }),
  })
  const current = colors.data ?? {}
  const label = (kind: EquipmentKind) => {
    const fallback = DEFAULT_KIND_COLORS[kind]
    return fallback ? `Predvolená (${COLOR_LABELS[fallback].toLowerCase()})` : 'Predvolená (bez farby)'
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-muted-foreground">
        Farebný pruh pri technike v zozname. Ak má technika kategóriu s farbou, platí farba kategórie; inak táto farba podľa druhu.
      </p>
      <ul className="grid gap-2 rounded-xl border bg-surface p-3 sm:grid-cols-2">
        {EQUIPMENT_KINDS.map((kind) => {
          const value = current[kind]
          const shown = value === 'none' ? null : (value ?? DEFAULT_KIND_COLORS[kind] ?? null)
          return (
            <li key={kind} className="flex items-center gap-2">
              <span className={`h-6 w-1.5 shrink-0 rounded-full ${shown ? COLOR_CLASSES[shown] : 'bg-transparent ring-1 ring-border'}`} aria-hidden />
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{KIND_LABELS[kind]}</span>
              <select
                aria-label={`Farba druhu ${KIND_LABELS[kind]}`}
                className="h-9 rounded-lg border bg-surface px-2 text-sm"
                value={value ?? ''}
                disabled={!canEdit || save.isPending}
                onChange={(event) => save.mutate({ kind, color: (event.target.value || null) as KindColor | null })}
              >
                <option value="">{label(kind)}</option>
                {CATEGORY_COLORS.map((option) => (
                  <option key={option} value={option}>
                    {COLOR_LABELS[option]}
                  </option>
                ))}
                <option value="none">Bez farby</option>
              </select>
            </li>
          )
        })}
      </ul>
      {save.isError && (
        <p className="text-sm text-destructive">
          {/kind_colors/.test(String(save.error?.message ?? '')) ? 'Farby druhov ešte databáza nepozná – spustite v Supabase supabase/update-all.sql (migrácia 0115).' : `Nepodarilo sa uložiť. ${errorDetail(save.error)}`}
        </p>
      )}
    </div>
  )
}
