import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { errorDetail } from '@/lib/supabase/errors'
import {
  CABLE_COLOR_TYPE_LABELS,
  CABLE_COLOR_TYPES,
  cableColorKeys,
  cableTypesSupported,
  deleteCableColor,
  fetchCableColors,
  saveCableColor,
  type CableColor,
  type CableColorType,
} from './cableColors'
import { formatNumber } from './model'

const DEFAULT_COLOR = '#00a651'

/**
 * Nastavenia → Zoznamy: farby dĺžok káblov zvlášť pre XLR / DMX, powerCON, 230 V a ostatné káble
 * (páska na konektore a hárok s obsahom case).
 */
export function CableColorsSettings({ companyId }: { companyId: string }) {
  const queryClient = useQueryClient()
  const colors = useQuery({ queryKey: cableColorKeys.list(companyId), queryFn: () => fetchCableColors(companyId) })
  const refresh = () => queryClient.invalidateQueries({ queryKey: cableColorKeys.list(companyId) })
  const save = useMutation({ mutationFn: (color: CableColor) => saveCableColor(companyId, color), onSettled: refresh })
  const remove = useMutation({ mutationFn: (color: CableColor) => deleteCableColor(companyId, color), onSettled: refresh })
  // Rovnaké farby pre všetky káble (len spoločné), alebo rozdielne pre XLR, powerCON a 230 V.
  const [splitWanted, setSplitWanted] = useState<boolean | null>(null)
  const typed = (colors.data ?? []).filter((color) => color.cableType)
  const split = splitWanted ?? typed.length > 0
  const unsplit = useMutation({
    mutationFn: async () => {
      for (const color of typed) await deleteCableColor(companyId, color)
    },
    onSuccess: () => setSplitWanted(false),
    onSettled: refresh,
  })

  if (colors.isPending) return <p className="text-sm text-muted-foreground">Načítavam…</p>
  if (colors.isError) return <p className="text-sm text-destructive">Farby sa nepodarilo načítať.</p>
  // Bez migrácie 0113 sú všetky farby spoločné.
  const supported = cableTypesSupported()
  const types: CableColorType[] = supported && split ? [...CABLE_COLOR_TYPES] : ['']
  const toggleSplit = () => {
    if (!split) return setSplitWanted(true)
    if (typed.length === 0) return setSplitWanted(false)
    if (window.confirm(`Zmazať ${typed.length} farieb nastavených pre XLR, powerCON a 230 V? Všetky káble potom budú mať spoločné farby.`)) unsplit.mutate()
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">Každá dĺžka má svoju farbu (páska na konektore, hárok s obsahom case).</p>
      {supported && (
        <div role="radiogroup" aria-label="Farby podľa typu kábla" className="flex flex-wrap gap-1 self-start rounded-lg bg-muted p-1">
          {(
            [
              [false, 'Rovnaké pre všetky káble'],
              [true, 'Rozdielne pre XLR, powerCON a 230 V'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={label}
              type="button"
              role="radio"
              aria-checked={split === value}
              disabled={unsplit.isPending}
              onClick={() => split !== value && toggleSplit()}
              className={split === value ? 'h-8 rounded-md bg-surface px-3 text-sm font-medium shadow-sm' : 'h-8 rounded-md px-3 text-sm text-muted-foreground hover:text-foreground'}
            >
              {label}
            </button>
          ))}
        </div>
      )}
      {split && (
        <p className="text-sm text-muted-foreground">
          Typ kábla sa určí podľa konektora. Dĺžky, ktoré typ nemá nastavené, dostanú farbu zo „Spoločné – všetky káble“ – stačí
          teda nastaviť len tie, ktoré majú byť iné.
        </p>
      )}
      <div className="grid gap-3 lg:grid-cols-2">
        {types.map((type) => (
          <TypeCard
            key={type || 'other'}
            title={types.length === 1 ? 'Všetky káble' : CABLE_COLOR_TYPE_LABELS[type]}
            colors={colors.data.filter((color) => (color.cableType ?? '') === type)}
            onSave={(color) => save.mutate({ ...color, cableType: type })}
            onRemove={(color) => remove.mutate({ ...color, cableType: type })}
            busy={save.isPending || remove.isPending}
          />
        ))}
      </div>
      {(save.isError || remove.isError || unsplit.isError) && <p className="text-sm text-destructive">Nepodarilo sa uložiť. {errorDetail(save.error ?? remove.error ?? unsplit.error)}</p>}
    </div>
  )
}

type CardProps = { title: string; colors: CableColor[]; onSave: (color: CableColor) => void; onRemove: (color: CableColor) => void; busy: boolean }

function TypeCard({ title, colors, onSave, onRemove, busy }: CardProps) {
  const [length, setLength] = useState('')
  const value = Number(length.replace(',', '.'))
  const valid = Number.isFinite(value) && value > 0 && value <= 1000 && !colors.some((color) => color.lengthM === value)
  return (
    <section className="flex flex-col gap-3 rounded-xl border bg-surface p-4">
      <h3 className="text-sm font-semibold">{title}</h3>
      {colors.length === 0 && <p className="text-sm text-muted-foreground">Zatiaľ žiadne farby.</p>}
      <ul className="flex flex-col gap-2">
        {colors.map((color) => (
          <ColorRow key={color.lengthM} color={color} onSave={onSave} onRemove={onRemove} busy={busy} />
        ))}
      </ul>
      <form
        className="flex items-center gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          if (!valid) return
          onSave({ lengthM: value, name: '', color: DEFAULT_COLOR })
          setLength('')
        }}
      >
        <input
          inputMode="decimal"
          placeholder="Dĺžka v m, napr. 10"
          aria-label={`Nová dĺžka – ${title}`}
          className="h-9 w-40 rounded-md border bg-background px-2 text-sm"
          value={length}
          onChange={(event) => setLength(event.target.value)}
        />
        <Button type="submit" size="sm" variant="outline" disabled={!valid || busy}>
          <Plus className="size-4" aria-hidden />
          Pridať dĺžku
        </Button>
      </form>
    </section>
  )
}

function ColorRow({ color, onSave, onRemove, busy }: { color: CableColor; onSave: (color: CableColor) => void; onRemove: (color: CableColor) => void; busy: boolean }) {
  // Farba a názov sa uložia chvíľu po poslednej zmene (nie pri každom pohybe v palete).
  const [draft, setDraft] = useState({ color: color.color, name: color.name })
  const save = useRef(onSave)
  useEffect(() => {
    save.current = onSave
  }, [onSave])
  useEffect(() => {
    if (draft.color === color.color && draft.name.trim() === color.name) return
    const timer = window.setTimeout(() => save.current({ ...color, color: draft.color, name: draft.name.trim() }), 700)
    return () => window.clearTimeout(timer)
  }, [draft, color])
  const length = `${formatNumber(color.lengthM)} m`
  return (
    <li className="flex items-center gap-2">
      <input
        type="color"
        aria-label={`Farba pre ${length}`}
        className="size-9 shrink-0 cursor-pointer rounded border bg-transparent"
        value={draft.color}
        onChange={(event) => setDraft({ ...draft, color: event.target.value })}
      />
      <span className="w-16 shrink-0 text-sm font-medium tabular-nums">{length}</span>
      <input
        aria-label={`Názov farby pre ${length}`}
        placeholder="názov farby (napr. zelená)"
        maxLength={40}
        className="h-9 min-w-0 flex-1 rounded-md border bg-background px-2 text-sm"
        value={draft.name}
        onChange={(event) => setDraft({ ...draft, name: event.target.value })}
      />
      <Button size="sm" variant="ghost" aria-label={`Odstrániť farbu pre ${length}`} disabled={busy} onClick={() => onRemove(color)}>
        <Trash2 className="size-4" aria-hidden />
      </Button>
    </li>
  )
}
