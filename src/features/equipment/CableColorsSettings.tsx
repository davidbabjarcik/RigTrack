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
  PRESET_COLORS,
  fetchCableColors,
  saveCableColor,
  type CableColor,
  type CableColorType,
} from './cableColors'
import { formatNumber } from './model'

const DEFAULT_COLOR = '#00a651'

/**
 * Nastavenia → Zoznamy: farby dĺžok káblov. Spoločné platia pre všetky káble; kto chce, pridá vlastné farby
 * len pre niektorý typ (XLR / DMX, powerCON, 230 V) – dĺžky, ktoré typ nemá, ostanú so spoločnou farbou.
 */
export function CableColorsSettings({ companyId }: { companyId: string }) {
  const queryClient = useQueryClient()
  const colors = useQuery({ queryKey: cableColorKeys.list(companyId), queryFn: () => fetchCableColors(companyId) })
  const refresh = () => queryClient.invalidateQueries({ queryKey: cableColorKeys.list(companyId) })
  const save = useMutation({ mutationFn: (color: CableColor) => saveCableColor(companyId, color), onSettled: refresh })
  const remove = useMutation({ mutationFn: (color: CableColor) => deleteCableColor(companyId, color), onSettled: refresh })
  const many = useMutation({
    mutationFn: async ({ add = [], drop = [] }: { add?: CableColor[]; drop?: CableColor[] }) => {
      for (const color of drop) await deleteCableColor(companyId, color)
      for (const color of add) await saveCableColor(companyId, color)
    },
    onSettled: refresh,
  })
  // Typy, ktorým používateľ práve pridal vlastné farby (ešte bez uloženej dĺžky).
  const [added, setAdded] = useState<CableColorType[]>([])

  if (colors.isPending) return <p className="text-sm text-muted-foreground">Načítavam…</p>
  if (colors.isError) return <p className="text-sm text-destructive">Farby sa nepodarilo načítať.</p>
  // Bez migrácie 0113 sú všetky farby spoločné.
  const supported = cableTypesSupported()
  const ofType = (type: CableColorType) => colors.data.filter((color) => (color.cableType ?? '') === type)
  const own = CABLE_COLOR_TYPES.filter((type) => type !== '' && (added.includes(type) || ofType(type).length > 0))
  const free = CABLE_COLOR_TYPES.filter((type) => type !== '' && !own.includes(type))
  const busy = save.isPending || remove.isPending || many.isPending
  const fillPreset = (type: CableColorType) => {
    const existing = ofType(type)
    // Vlastné farby typu začnú od spoločných (alebo predlohy) – potom sa zmení len to, čo má byť iné.
    const source = type === '' || ofType('').length === 0 ? PRESET_COLORS : ofType('')
    many.mutate({ add: source.filter((color) => !existing.some((item) => item.lengthM === color.lengthM)).map((color) => ({ ...color, cableType: type })) })
  }
  const dropType = (type: CableColorType) => {
    const list = ofType(type)
    if (list.length > 0 && !window.confirm(`Zmazať vlastné farby pre ${CABLE_COLOR_TYPE_LABELS[type]}? Tieto káble potom budú mať spoločné farby.`)) return
    setAdded(added.filter((value) => value !== type))
    if (list.length > 0) many.mutate({ drop: list })
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        Každá dĺžka má svoju farbu (páska na konektore, hárok s obsahom case). Spoločné farby platia pre všetky káble
        {supported && ' – ak chcete pre niektorý typ iné, pridajte mu vlastné. Typ sa určí podľa konektora'}.
      </p>
      <div className="grid gap-3 lg:grid-cols-2">
        <TypeCard
          title={own.length > 0 ? 'Spoločné – všetky ostatné káble' : 'Spoločné – všetky káble'}
          colors={ofType('')}
          onSave={(color) => save.mutate({ ...color, cableType: '' })}
          onRemove={(color) => remove.mutate({ ...color, cableType: '' })}
          onPreset={() => fillPreset('')}
          presetLabel="Doplniť predlohu (1 m zelená … 15 m oranžová)"
          busy={busy}
        />
        {own.map((type) => (
          <TypeCard
            key={type}
            title={`Vlastné pre ${CABLE_COLOR_TYPE_LABELS[type]}`}
            hint="Dĺžky, ktoré tu nie sú, majú spoločnú farbu."
            colors={ofType(type)}
            onSave={(color) => save.mutate({ ...color, cableType: type })}
            onRemove={(color) => remove.mutate({ ...color, cableType: type })}
            onPreset={() => fillPreset(type)}
            presetLabel="Skopírovať spoločné farby"
            onDropType={() => dropType(type)}
            busy={busy}
          />
        ))}
      </div>
      {supported && free.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Iné farby pre:</span>
          {free.map((type) => (
            <Button key={type} size="sm" variant="outline" onClick={() => setAdded([...added, type])}>
              <Plus className="size-4" aria-hidden />
              {CABLE_COLOR_TYPE_LABELS[type]}
            </Button>
          ))}
        </div>
      )}
      {(save.isError || remove.isError || many.isError) && <p className="text-sm text-destructive">Nepodarilo sa uložiť. {errorDetail(save.error ?? remove.error ?? many.error)}</p>}
    </div>
  )
}

type CardProps = {
  title: string
  hint?: string
  colors: CableColor[]
  onSave: (color: CableColor) => void
  onRemove: (color: CableColor) => void
  onPreset: () => void
  presetLabel: string
  /** Zrušiť vlastné farby typu (len pri type, nie pri spoločných). */
  onDropType?: () => void
  busy: boolean
}

function TypeCard({ title, hint, colors, onSave, onRemove, onPreset, presetLabel, onDropType, busy }: CardProps) {
  const [length, setLength] = useState('')
  const value = Number(length.replace(',', '.'))
  const valid = Number.isFinite(value) && value > 0 && value <= 1000 && !colors.some((color) => color.lengthM === value)
  return (
    <section className="flex flex-col gap-3 rounded-xl border bg-surface p-4">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold">{title}</h3>
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
        {onDropType && (
          <Button size="sm" variant="ghost" disabled={busy} onClick={onDropType}>
            Zrušiť
          </Button>
        )}
      </div>
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
      {(colors.length === 0 || onDropType) && (
        <button type="button" className="self-start text-sm text-accent hover:underline disabled:opacity-50" disabled={busy} onClick={onPreset}>
          {presetLabel}
        </button>
      )}
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
