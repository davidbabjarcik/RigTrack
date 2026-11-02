import { Plus, Settings2 } from 'lucide-react'
import { Button, LinkButton } from '@/components/ui/button'
import { SelectField } from '@/components/ui/field'
import { cn } from '@/lib/utils'
import { metres, palletTypesOf, rackLengthCm, type Spot, type SpotKind, type Warehouse } from './model'
import { BUILDING, buildSpot, CHOICE_LABELS, PLACE_USES, PLACES, selectionKind, type AddSelection, type Choice } from './planAdd'

type Props = {
  warehouse: Warehouse
  spots: Spot[]
  busy: boolean
  selection: AddSelection
  onSelection: (selection: AddSelection) => void
  onAdd: (spot: Omit<Spot, 'id'>) => void
}

/**
 * Úprava plánu → Pridať: regál (podľa typu), miesto (na cases alebo hliník), paleta (podľa typu); zvlášť stavba –
 * miestnosť, dvere, okno, stĺp, stena. Tlačidlom doprostred, alebo ťahaním v pláne sa nakreslí, čo je vybrané.
 */
export function PlanAddBar({ warehouse, spots, busy, selection, onSelection, onAdd }: Props) {
  const kind = selectionKind(selection)
  const rackTypes = warehouse.rackTypes ?? []
  const palletTypes = palletTypesOf(warehouse)
  const pickedRack = rackTypes.find((type) => type.id === selection.rackType) ?? rackTypes[0]
  const pickedPallet = palletTypes.find((type) => type.id === selection.palletType) ?? palletTypes[0]
  const set = (patch: Partial<AddSelection>) => onSelection({ ...selection, ...patch })
  const setChoice = (choice: Choice) => set({ choice })
  const add = () => {
    const spot = buildSpot(selection, warehouse, spots)
    if (spot) onAdd(spot)
  }

  return (
    <div className="mb-3 flex flex-col gap-3 rounded-xl border bg-surface p-3">
      <div className="flex flex-wrap items-center gap-1.5" role="radiogroup" aria-label="Čo pridať">
        <span className="mr-1 text-sm font-medium">Pridať:</span>
        {PLACES.map((value) => (
          <ChoiceButton key={value} active={selection.choice === value} label={CHOICE_LABELS[value]} onClick={() => setChoice(value)} />
        ))}
        <span className="mx-2 h-5 w-px bg-border" aria-hidden />
        <span className="mr-1 text-sm text-muted-foreground">Stavba:</span>
        {BUILDING.map((value) => (
          <ChoiceButton key={value} active={selection.choice === value} label={CHOICE_LABELS[value]} onClick={() => setChoice(value)} />
        ))}
        <LinkButton to="/settings?tab=warehouse" variant="outline" size="sm" className="ml-auto">
          <Settings2 className="size-4" aria-hidden />
          Nastavenia skladu
        </LinkButton>
      </div>
      <div className="flex flex-wrap items-end gap-2">
        {kind === 'rack' && rackTypes.length > 0 && (
          <SelectField label="Typ regálu" className="min-w-56" value={pickedRack?.id ?? ''} onChange={(e) => set({ rackType: e.target.value })}>
            {rackTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name} ({metres(rackLengthCm(type.bays))} × {type.depthCm} cm)
              </option>
            ))}
          </SelectField>
        )}
        {kind === 'rack' && rackTypes.length === 0 && <p className="text-sm text-muted-foreground">Typy regálov (polia, police, palety) si nastavíte v Nastaveniach skladu.</p>}
        {kind === 'pallet' && palletTypes.length > 0 && (
          <SelectField label="Typ palety" className="min-w-56" value={pickedPallet?.id ?? ''} onChange={(e) => set({ palletType: e.target.value })}>
            {palletTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name} ({type.length} × {type.width} cm)
              </option>
            ))}
          </SelectField>
        )}
        {kind === 'pallet' && palletTypes.length === 0 && <p className="text-sm text-muted-foreground">Typy paliet si nastavíte v Nastaveniach skladu.</p>}
        {selection.choice === 'place' && (
          <SelectField label="Na čo je miesto" className="min-w-48" value={selection.placeUse} onChange={(e) => set({ placeUse: e.target.value as SpotKind })}>
            {PLACE_USES.map((use) => (
              <option key={use.kind} value={use.kind}>
                {use.label}
              </option>
            ))}
          </SelectField>
        )}
        {(kind === 'door' || kind === 'window') && <p className="text-sm text-muted-foreground">Ide na stenu skladu; natiahnuť sa dá len pozdĺž steny.</p>}
        {kind === 'truss' && <p className="text-sm text-muted-foreground">Klikom na miesto v pláne otvoríte stohy trussov.</p>}
        {kind === 'room' && <p className="text-sm text-muted-foreground">Miestnosť (napr. kancelária, dielňa) – v pláne len na orientáciu.</p>}
        <Button disabled={busy || (kind === 'pallet' && !pickedPallet)} onClick={add}>
          <Plus className="size-4" aria-hidden />
          Pridať {kind === 'truss' ? 'miesto na hliník' : CHOICE_LABELS[selection.choice].toLowerCase()}
        </Button>
        <p className="w-full text-xs text-muted-foreground">Tlačidlom sa pridá doprostred, alebo to ťahaním po prázdnom mieste plánu nakreslite.</p>
      </div>
    </div>
  )
}

function ChoiceButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button type="button" role="radio" aria-checked={active} className={cn('rounded-full border px-3 py-1 text-sm', active ? 'border-accent bg-accent text-accent-foreground' : 'hover:bg-muted')} onClick={onClick}>
      {label}
    </button>
  )
}
