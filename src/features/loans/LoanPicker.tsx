import { ChevronDown, ChevronRight, Package } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import type { Case } from '@/features/cases/model'
import { filterEquipment, type Equipment } from '@/features/equipment/model'
import { PhotoThumb } from '@/features/equipment/PhotoThumb'
import { cn } from '@/lib/utils'

// Pri veľkom sklade nemá zmysel vykresliť tisíce riadkov; používateľ zúži výber hľadaním.
const DEVICE_LIMIT = 30

type Props = {
  title?: string
  /** Technika, ktorú možno vybrať (bez vyradenej a spotrebného materiálu). */
  equipment: Equipment[]
  cases: Case[]
  /** Technika, ktorá už vybraná je. */
  chosen: Set<string>
  /** Cases, ktoré už sú vybrané ako celok. */
  chosenCases: Set<string>
  /** Náhľady fotiek podľa cesty fotky. */
  thumbs: Record<string, string | undefined>
  freeOf: (item: Equipment) => number
  disabled?: boolean
  onAdd: (item: Equipment) => void
  onAddCase: (caseId: string) => void
}

/**
 * Výber techniky do výpožičky alebo na event v dvoch záložkách. Cases fungujú ako priečinky:
 * dá sa vziať celý case, alebo ho rozkliknúť a vybrať z neho jednotlivé kusy. Zariadenia sú
 * celý sklad v jednom zozname bez ohľadu na to, v ktorom case ležia.
 */
export function LoanPicker({ title = 'Pridať techniku', equipment, cases, chosen, chosenCases, thumbs, freeOf, disabled, onAdd, onAddCase }: Props) {
  const [tab, setTab] = useState<'cases' | 'devices'>('cases')
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState<string[]>([])
  const toggle = (caseId: string) => setOpen((current) => (current.includes(caseId) ? current.filter((id) => id !== caseId) : [...current, caseId]))
  const caseName = (caseId: string | null) => cases.find((item) => item.id === caseId)?.name
  const matching = (items: Equipment[]) => filterEquipment(items, { search, status: '', categoryId: '', locationId: '', caseId: '' })
  const searching = search.trim() !== ''

  const row = (item: Equipment, detail?: string) => {
    const free = freeOf(item)
    return (
      <li key={item.id} className="flex items-center gap-3 py-2">
        <PhotoThumb url={thumbs[item.photoPath]} />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{item.name}</span>
          <span className={free > 0 ? 'block truncate text-sm text-muted-foreground' : 'block truncate text-sm text-destructive'}>
            {free > 0 ? `voľné ${free} z ${item.quantity} ks` : 'v tomto termíne obsadené'}
            {detail && ` · ${detail}`}
          </span>
        </span>
        <Button variant="outline" size="sm" disabled={disabled || free <= 0} onClick={() => onAdd(item)}>
          Pridať
        </Button>
      </li>
    )
  }

  const devices = matching(equipment.filter((item) => !chosen.has(item.id)))
  // Hľadanie v cases nájde case podľa názvu aj podľa toho, čo v ňom je.
  const folders = cases
    .map((item) => {
      const content = equipment.filter((piece) => piece.caseId === item.id && piece.quantity > 0)
      const named = item.name.toLowerCase().includes(search.trim().toLowerCase())
      return { id: item.id, name: item.name, content, shown: !searching || named ? content : matching(content) }
    })
    .filter((folder) => folder.content.length > 0 && folder.shown.length > 0)

  return (
    <section aria-labelledby="loan-picker-heading" className="rounded-xl border bg-surface p-4">
      <h2 id="loan-picker-heading" className="mb-3 font-medium">
        {title}
      </h2>
      <div className="mb-3 flex gap-2" role="tablist" aria-label="Čo pridať">
        {(
          [
            { id: 'cases', label: `Cases (${cases.length})` },
            { id: 'devices', label: `Zariadenia (${equipment.length})` },
          ] as const
        ).map((option) => (
          <button
            key={option.id}
            type="button"
            role="tab"
            aria-selected={tab === option.id}
            onClick={() => setTab(option.id)}
            className={cn(
              'h-9 flex-1 rounded-lg border px-3 text-sm font-medium sm:flex-none',
              tab === option.id ? 'bg-primary text-primary-foreground' : 'bg-surface hover:bg-muted',
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
      <Field
        label="Hľadať"
        hideLabel
        type="search"
        placeholder={tab === 'cases' ? 'Hľadať case alebo to, čo v ňom je' : 'Názov, výrobca, sériové alebo inventárne číslo'}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {tab === 'devices' ? (
        devices.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">{searching ? 'Hľadaniu nič nezodpovedá.' : 'Žiadna ďalšia technika.'}</p>
        ) : (
          <>
            <ul className="mt-3 divide-y">{devices.slice(0, DEVICE_LIMIT).map((item) => row(item, caseName(item.caseId) ?? 'mimo cases'))}</ul>
            {devices.length > DEVICE_LIMIT && (
              <p className="mt-3 text-sm text-muted-foreground">
                Zobrazených prvých {DEVICE_LIMIT} z {devices.length}. Spresnite hľadanie.
              </p>
            )}
          </>
        )
      ) : folders.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          {searching ? 'Hľadaniu nezodpovedá žiadny case.' : 'Žiadny case s technikou. Jednotlivé kusy nájdete v záložke Zariadenia.'}
        </p>
      ) : (
        <ul className="mt-3 divide-y">
          {folders.map((folder) => {
            // Pri hľadaní sú nájdené cases rovno rozbalené.
            const isOpen = searching || open.includes(folder.id)
            const whole = chosenCases.has(folder.id)
            const left = folder.shown.filter((item) => !chosen.has(item.id))
            const allFree = folder.content.every((item) => freeOf(item) >= item.quantity)
            const Chevron = isOpen ? ChevronDown : ChevronRight
            return (
              <li key={folder.id} className="py-1">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => toggle(folder.id)}
                    className="flex min-h-12 min-w-0 flex-1 items-center gap-2 rounded-lg px-1 text-left hover:bg-muted"
                  >
                    <Chevron className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                    <Package className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{folder.name}</span>
                      <span className="block truncate text-sm text-muted-foreground">
                        {folder.content.length} {folder.content.length === 1 ? 'položka' : folder.content.length < 5 ? 'položky' : 'položiek'}
                        {!whole && !allFree && ' · časť je v tomto termíne obsadená'}
                      </span>
                    </span>
                  </button>
                  {whole ? (
                    <span className="shrink-0 px-2 text-sm text-muted-foreground">pridaný celý</span>
                  ) : (
                    <Button variant="outline" size="sm" disabled={disabled || !allFree} onClick={() => onAddCase(folder.id)}>
                      Celý case
                    </Button>
                  )}
                </div>
                {isOpen &&
                  (left.length === 0 ? (
                    <p className="py-2 pl-7 text-sm text-muted-foreground">Všetko z tohto case už je pridané.</p>
                  ) : (
                    <ul className="divide-y pl-7">{left.map((item) => row(item))}</ul>
                  ))}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
