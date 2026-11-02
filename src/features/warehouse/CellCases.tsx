import { Ruler, X } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { caseFrontCm, type CellBox, type PlacedCase } from './model'

type Size = { lengthCm: number | null; widthCm: number | null; depthCm: number | null }

type Props = {
  boxes: CellBox[]
  /** Počet paliet na polici (0 = bez paliet). */
  pallets: number
  /** Ukázať len cases na tejto palete. */
  pallet?: number | null
  canEdit: boolean
  busy: boolean
  onRemove: (item: PlacedCase) => void
  onPallet: (item: PlacedCase, pallet: number | null) => void
  onSize: (item: PlacedCase, size: Size) => void
}

const sizeInput = 'h-8 w-16 rounded-lg border bg-surface px-2 text-sm tabular-nums'

/** Cases na polici (alebo palete): na ktorej palete sú, ručne / automaticky, a rýchle zadanie rozmerov. */
export function CellCases({ boxes, pallets, pallet, canEdit, busy, onRemove, onPallet, onSize }: Props) {
  const [sizing, setSizing] = useState<string | null>(null)
  const shown = pallet ? boxes.filter((box) => box.pallet === pallet) : boxes
  if (shown.length === 0) return <p className="text-sm text-muted-foreground">{pallet ? `Na palete ${pallet} nič neleží.` : 'prázdne'}</p>

  return (
    <ul className="divide-y rounded-lg border">
      {shown.map(({ item, pallet: on, bad, known }) => (
        <li key={item.id} className="px-3 py-2">
          <div className="flex flex-wrap items-center gap-2">
            <Link to={`/cases/${item.id}`} className="min-w-0 flex-1 truncate font-medium hover:underline">
              {item.name}
            </Link>
            {bad && <span className="text-xs text-destructive">nezmestí sa</span>}
            {!known && <span className="text-xs text-muted-foreground">bez rozmerov</span>}
            {canEdit && pallets > 0 && (
              <select
                aria-label={`Paleta pre ${item.name}`}
                className="h-8 rounded-lg border bg-surface px-2 text-sm"
                value={item.spotPallet && item.spotPallet <= pallets ? String(item.spotPallet) : ''}
                disabled={busy}
                onChange={(event) => onPallet(item, event.target.value ? Number(event.target.value) : null)}
              >
                <option value="">{on ? `auto (paleta ${on})` : 'auto (vedľa paliet)'}</option>
                {Array.from({ length: pallets }, (_, index) => (
                  <option key={index} value={index + 1}>
                    paleta {index + 1}
                  </option>
                ))}
              </select>
            )}
            {canEdit && (
              <Button variant="ghost" size="sm" className="size-8 p-0" aria-label={`Rozmery: ${item.name}`} aria-expanded={sizing === item.id} onClick={() => setSizing(sizing === item.id ? null : item.id)}>
                <Ruler className="size-4" aria-hidden />
              </Button>
            )}
            {canEdit && (
              <Button variant="ghost" size="sm" className="size-8 p-0" aria-label={`Vybrať z miesta: ${item.name}`} disabled={busy} onClick={() => onRemove(item)}>
                <X className="size-4" aria-hidden />
              </Button>
            )}
          </div>
          {sizing === item.id && (
            <SizeEditor
              item={item}
              busy={busy}
              onSave={(size) => {
                onSize(item, size)
                setSizing(null)
              }}
            />
          )}
        </li>
      ))}
    </ul>
  )
}

function SizeEditor({ item, busy, onSave }: { item: PlacedCase; busy: boolean; onSave: (size: Size) => void }) {
  const [front, setFront] = useState(String(caseFrontCm(item) ?? ''))
  const [back, setBack] = useState(String((item.lengthCm ? item.widthCm : null) ?? ''))
  const [height, setHeight] = useState(String(item.depthCm ?? ''))
  const num = (value: string) => {
    const parsed = Number(value.replace(',', '.'))
    return value.trim() && parsed > 0 ? Math.round(parsed * 10) / 10 : null
  }
  return (
    <form
      className="mt-2 flex flex-wrap items-end gap-2 text-sm"
      onSubmit={(event) => {
        event.preventDefault()
        onSave({ lengthCm: num(front), widthCm: num(back), depthCm: num(height) })
      }}
    >
      <label className="flex flex-col gap-0.5">
        <span className="text-xs text-muted-foreground">Spredu (dĺžka)</span>
        <input className={sizeInput} inputMode="decimal" value={front} onChange={(e) => setFront(e.target.value)} autoFocus />
      </label>
      <label className="flex flex-col gap-0.5">
        <span className="text-xs text-muted-foreground">Dozadu (šírka)</span>
        <input className={sizeInput} inputMode="decimal" value={back} onChange={(e) => setBack(e.target.value)} />
      </label>
      <label className="flex flex-col gap-0.5">
        <span className="text-xs text-muted-foreground">Výška (hĺbka)</span>
        <input className={sizeInput} inputMode="decimal" value={height} onChange={(e) => setHeight(e.target.value)} />
      </label>
      <span className="pb-1.5 text-muted-foreground">cm</span>
      <Button type="submit" size="sm" disabled={busy}>
        Uložiť rozmery
      </Button>
    </form>
  )
}
