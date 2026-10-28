import { useId } from 'react'
import { Button } from '@/components/ui/button'
import { cableTypeLabel, resolveCableType, PRESET_COLORS, cableTypesSupported, findCableColor, type CableColor } from './cableColors'
import { HexColorInput } from './HexColorInput'
import { formatNumber } from './model'

export type ColorEdit = { name: string; color: string }

type Props = {
  lengthM: number | undefined
  /** Konektor kábla – XLR, powerCON a 230 V majú vlastné farby dĺžok. */
  connector?: string
  /** Farby dĺžok uložené vo firme. */
  existing: CableColor[]
  /** Neuložená zmena pre túto dĺžku; uloží sa spolu s formulárom. */
  edit: ColorEdit | undefined
  onEdit: (edit: ColorEdit) => void
  /** Farby mení admin a skladník; ostatní ich iba vidia. */
  canEdit: boolean
}

const DEFAULT_COLOR = '#00a651'

/** Farebný kód dĺžky kábla priamo pri zadávaní kábla. Farba patrí dĺžke, nie jednému káblu. */
export function LengthColorField({ lengthM, connector, existing, edit, onEdit, canEdit }: Props) {
  const colorId = useId()
  const nameId = useId()
  if (lengthM === undefined || !Number.isFinite(lengthM) || lengthM <= 0) return null

  const saved = findCableColor(existing, connector, lengthM)
  const shown = edit ?? saved
  const type = cableTypesSupported() ? resolveCableType(existing, connector) : ''
  const length = `${formatNumber(lengthM)} m${type ? ` (${cableTypeLabel(type)})` : ''}`

  // Pre ktoré káble farba platí: farba patrí dĺžke (a typu kábla), nie jednému káblu.
  const meters = `${formatNumber(lengthM)} m`
  const scope = !cableTypesSupported()
    ? `Farba platí pre všetky káble dlhé ${meters}. Rôzne farby pre XLR, powerCON a 230 V pôjdu po aktualizácii databázy (supabase/update-all.sql).`
    : type && saved && !saved.cableType
      ? `Teraz je spoločná farba všetkých káblov ${meters}. Zmena sa uloží len pre ${cableTypeLabel(type)} – ostatné káble ostanú so spoločnou.`
      : type
        ? `Platí pre všetky káble ${cableTypeLabel(type)} dlhé ${meters}. Spoločné farby: Nastavenia → Zoznamy → Farby dĺžok káblov.`
        : `Platí pre všetky káble dlhé ${meters} (Nastavenia → Zoznamy → Farby dĺžok káblov).`

  if (!shown) {
    return canEdit ? (
      <Button variant="outline" size="sm" className="self-start" onClick={() => onEdit(PRESET_COLORS.find((color) => color.lengthM === lengthM) ?? { name: '', color: DEFAULT_COLOR })}>
        Nastaviť farbu pre {length}
      </Button>
    ) : null
  }

  if (!canEdit) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="size-5 rounded border" style={{ backgroundColor: shown.color }} aria-hidden />
        Farba dĺžky {length}: {shown.name || <span className="font-mono uppercase">{shown.color}</span>}
      </p>
    )
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1.5">
        <label htmlFor={colorId} className="text-sm font-medium">
          Farba pre {length}
        </label>
        <HexColorInput id={colorId} value={shown.color} onChange={(color) => onEdit({ name: shown.name, color })} />
      </div>
      <div className="flex min-w-32 flex-1 flex-col gap-1.5">
        <label htmlFor={nameId} className="text-sm font-medium">
          Názov farby (na hárku s obsahom case)
        </label>
        <input
          id={nameId}
          className="h-11 w-full rounded-lg border bg-surface px-3 text-base placeholder:text-muted-foreground"
          placeholder="napr. zelená"
          maxLength={40}
          value={shown.name}
          onChange={(e) => onEdit({ name: e.target.value, color: shown.color })}
        />
      </div>
      <p className="basis-full text-sm text-muted-foreground">{scope}</p>
    </div>
  )
}
