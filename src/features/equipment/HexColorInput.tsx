import { useState } from 'react'
import { parseHexColor } from './cableColors'

type Props = { id: string; value: string; onChange: (color: string) => void }

/** Výber farby: paleta a vedľa nej RGB kód, ktorý sa dá aj prepísať alebo vložiť. */
export function HexColorInput({ id, value, onChange }: Props) {
  // Rozpísaný kód, kým ešte nie je platný; inak sa zobrazuje uložená hodnota.
  const [draft, setDraft] = useState<string | null>(null)

  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        aria-label="Vybrať farbu z palety"
        className="h-11 w-14 shrink-0 cursor-pointer rounded-lg border bg-surface p-1"
        value={value}
        onChange={(e) => {
          setDraft(null)
          onChange(e.target.value.toLowerCase())
        }}
      />
      <input
        id={id}
        className="h-11 w-28 rounded-lg border bg-surface px-3 font-mono text-base uppercase aria-invalid:border-destructive"
        spellCheck={false}
        autoComplete="off"
        maxLength={7}
        aria-invalid={draft !== null && parseHexColor(draft) === null ? true : undefined}
        value={draft ?? value}
        onChange={(e) => {
          const parsed = parseHexColor(e.target.value)
          if (parsed) {
            setDraft(null)
            onChange(parsed)
          } else {
            setDraft(e.target.value)
          }
        }}
        onBlur={() => setDraft(null)}
      />
    </div>
  )
}
