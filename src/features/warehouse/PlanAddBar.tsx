import { Plus, Settings2 } from 'lucide-react'
import { useState } from 'react'
import { Button, LinkButton } from '@/components/ui/button'
import { SelectField } from '@/components/ui/field'
import { cn } from '@/lib/utils'
import { metres, nextSpotName, palletTypesOf, rackLengthCm, SPOT_KIND_LABELS, type Spot, type SpotKind, type Warehouse } from './model'

/** Čo sa dá pridať do plánu a v akom poradí sú tlačidlá. */
const ADDABLE: SpotKind[] = ['rack', 'pallet', 'zone', 'truss', 'room', 'door', 'window', 'column', 'wall']
const LABELS: Partial<Record<SpotKind, string>> = { zone: 'Miesto / zóna', truss: 'Hliník', wall: 'Stena' }

/** Predvolená veľkosť nového prvku (cm) a ako sa volá. */
const DEFAULTS: Partial<Record<SpotKind, { length: number; width: number; name: string }>> = {
  zone: { length: 300, width: 200, name: 'Miesto' },
  truss: { length: 350, width: 210, name: 'Hliník' },
  room: { length: 400, width: 300, name: 'Miestnosť' },
  door: { length: 120, width: 15, name: 'Dvere' },
  window: { length: 150, width: 15, name: 'Okno' },
  column: { length: 40, width: 40, name: 'Stĺp' },
  wall: { length: 300, width: 15, name: 'Stena' },
  rack: { length: 280, width: 110, name: 'Regál' },
}

const nameFor = (spots: Pick<Spot, 'name'>[], base: string) => nextSpotName(spots).replace('Miesto', base)

type Props = { warehouse: Warehouse; spots: Spot[]; busy: boolean; onAdd: (spot: Omit<Spot, 'id'>) => void }

/**
 * Úprava plánu → Pridať: vyberiete, čo pridať (regál podľa typu, paleta podľa typu, miesto, hliník, miestnosť, dvere,
 * okno, stĺp, stena). Pridá sa doprostred; dvere a okno na hornú stenu skladu. Potom sa posunie ťahaním.
 */
export function PlanAddBar({ warehouse, spots, busy, onAdd }: Props) {
  const [kind, setKind] = useState<SpotKind>('rack')
  const rackTypes = warehouse.rackTypes ?? []
  const palletTypes = palletTypesOf(warehouse)
  const [rackType, setRackType] = useState('')
  const [palletType, setPalletType] = useState('')
  const pickedRack = rackTypes.find((type) => type.id === rackType) ?? rackTypes[0]
  const pickedPallet = palletTypes.find((type) => type.id === palletType) ?? palletTypes[0]

  const center = (length: number, width: number) => ({
    length: Math.min(length, warehouse.lengthCm),
    width: Math.min(width, warehouse.widthCm),
    x: Math.max(0, Math.round((warehouse.lengthCm - length) / 2)),
    y: Math.max(0, Math.round((warehouse.widthCm - width) / 2)),
  })

  const add = () => {
    if (kind === 'rack' && pickedRack) {
      onAdd({
        name: nameFor(spots, 'Regál'),
        kind,
        ...center(rackLengthCm(pickedRack.bays), pickedRack.depthCm),
        levels: Math.min(20, Math.max(...pickedRack.bays.map((bay) => bay.levels.length))),
        bays: pickedRack.bays,
      })
      return
    }
    if (kind === 'pallet' && pickedPallet) {
      onAdd({ name: nameFor(spots, 'Paleta'), kind, ...center(pickedPallet.length, pickedPallet.width), levels: 1, material: pickedPallet.material })
      return
    }
    const preset = DEFAULTS[kind]!
    const placed = center(preset.length, preset.width)
    // Dvere a okno idú na hornú stenu skladu (potom sa dajú posunúť po obvode).
    onAdd({ name: nameFor(spots, preset.name), kind, ...placed, ...(kind === 'door' || kind === 'window' ? { y: 0 } : {}), levels: 1 })
  }

  return (
    <div className="mb-3 flex flex-col gap-3 rounded-xl border bg-surface p-3">
      <div className="flex flex-wrap items-center gap-1.5" role="radiogroup" aria-label="Čo pridať">
        <span className="mr-1 text-sm font-medium">Pridať:</span>
        {ADDABLE.map((value) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={kind === value}
            className={cn('rounded-full border px-3 py-1 text-sm', kind === value ? 'border-accent bg-accent text-accent-foreground' : 'hover:bg-muted')}
            onClick={() => setKind(value)}
          >
            {LABELS[value] ?? SPOT_KIND_LABELS[value]}
          </button>
        ))}
        <LinkButton to="/settings?tab=warehouse" variant="outline" size="sm" className="ml-auto">
          <Settings2 className="size-4" aria-hidden />
          Nastavenia skladu
        </LinkButton>
      </div>
      <div className="flex flex-wrap items-end gap-2">
        {kind === 'rack' && rackTypes.length > 0 && (
          <SelectField label="Typ regálu" className="min-w-56" value={pickedRack?.id ?? ''} onChange={(e) => setRackType(e.target.value)}>
            {rackTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name} ({metres(rackLengthCm(type.bays))} × {type.depthCm} cm)
              </option>
            ))}
          </SelectField>
        )}
        {kind === 'rack' && rackTypes.length === 0 && <p className="text-sm text-muted-foreground">Typy regálov (polia, police, palety) si nastavíte v Nastaveniach skladu.</p>}
        {kind === 'pallet' && palletTypes.length > 0 && (
          <SelectField label="Typ palety" className="min-w-56" value={pickedPallet?.id ?? ''} onChange={(e) => setPalletType(e.target.value)}>
            {palletTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name} ({type.length} × {type.width} cm)
              </option>
            ))}
          </SelectField>
        )}
        {kind === 'pallet' && palletTypes.length === 0 && <p className="text-sm text-muted-foreground">Typy paliet si nastavíte v Nastaveniach skladu.</p>}
        {(kind === 'door' || kind === 'window') && <p className="text-sm text-muted-foreground">Pridá sa na hornú stenu; keď ho posuniete k inej stene skladu, prichytí sa k nej.</p>}
        {kind === 'truss' && <p className="text-sm text-muted-foreground">Miesto na hliník – klikom naň v pláne otvoríte stohy trussov.</p>}
        {kind === 'room' && <p className="text-sm text-muted-foreground">Miestnosť (napr. kancelária, dielňa) – v pláne len na orientáciu.</p>}
        <Button disabled={busy || (kind === 'rack' && !pickedRack) || (kind === 'pallet' && !pickedPallet)} onClick={add}>
          <Plus className="size-4" aria-hidden />
          Pridať {(LABELS[kind] ?? SPOT_KIND_LABELS[kind]).toLowerCase()}
        </Button>
      </div>
    </div>
  )
}
