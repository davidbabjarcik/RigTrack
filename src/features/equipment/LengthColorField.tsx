import { useId } from 'react'
import { Button } from '@/components/ui/button'
import type { CableColor } from './cableColors'
import { HexColorInput } from './HexColorInput'
import { formatNumber } from './model'

export type ColorEdit = { name: string; color: string }

type Props = {
  lengthM: number | undefined
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
export function LengthColorField({ lengthM, existing, edit, onEdit, canEdit }: Props) {
  const colorId = useId()
  const nameId = useId()
  if (lengthM === undefined || !Number.isFinite(lengthM) || lengthM <= 0) return null

  const saved = existing.find((color) => color.lengthM === lengthM)
  const shown = edit ?? saved
  const length = `${formatNumber(lengthM)} m`

  if (!shown) {
    return canEdit ? (
      <Button variant="outline" size="sm" className="self-start" onClick={() => onEdit({ name: '', color: DEFAULT_COLOR })}>
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
      {edit && saved && (edit.color !== saved.color || edit.name !== saved.name) && (
        <p className="basis-full text-sm text-muted-foreground">Zmena sa po uložení prejaví na všetkých kábloch s dĺžkou {length}.</p>
      )}
    </div>
  )
}
