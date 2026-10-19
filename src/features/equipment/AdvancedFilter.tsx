import { SlidersHorizontal } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { SelectField } from '@/components/ui/field'
import {
  advancedFilterCount,
  AUDIO_TYPE_LABELS,
  AUDIO_TYPES,
  CAPTURE_MATCH_LABELS,
  CAPTURE_MATCHES,
  COMPANY_OWNER,
  EQUIPMENT_KINDS,
  EQUIPMENT_SORTS,
  KIND_LABELS,
  purchaseDates,
  SORT_LABELS,
  type Equipment,
  type EquipmentFilter,
} from './model'

type Props = {
  filter: EquipmentFilter
  onChange: (patch: Partial<EquipmentFilter>) => void
  items: Equipment[]
  owners: { staffId: string; name: string }[]
  /** Základné filtre (stav, kategória, umiestnenie, case) – zobrazia sa na začiatku panela. */
  children?: ReactNode
}

/** Veľký filter techniky: druh, typ, vlastník, výrobca, upozornenia, Capture, rok nákupu, sieť, odkazy a triedenie. */
export function AdvancedFilter({ filter, onChange, items, owners, children }: Props) {
  const count = advancedFilterCount(filter)
  const [open, setOpen] = useState(count > 0)
  const manufacturers = [...new Set(items.map((item) => item.manufacturer.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'sk'))
  const years = [...new Set(items.flatMap((item) => purchaseDates(item).map((date) => date.slice(0, 4))))].sort().reverse()
  const ownerIds = new Set(items.map((item) => item.ownerStaffId).filter(Boolean))
  const ownerOptions = owners.filter((owner) => ownerIds.has(owner.staffId))
  const hasLights = items.some((item) => item.kind === 'light')

  return (
    <div className="sm:col-span-2 lg:col-span-4">
      <div className="flex flex-wrap items-end gap-2">
        <Button variant="outline" size="sm" aria-expanded={open} onClick={() => setOpen(!open)}>
          <SlidersHorizontal className="size-4" aria-hidden />
          Viac filtrov{count > 0 && ` (${count})`}
        </Button>
        <SelectField label="Triediť" hideLabel className="w-56" value={filter.sort ?? 'name'} onChange={(e) => onChange({ sort: e.target.value as EquipmentFilter['sort'] })}>
          {EQUIPMENT_SORTS.map((sort) => (
            <option key={sort} value={sort}>
              {SORT_LABELS[sort]}
            </option>
          ))}
        </SelectField>
        {count > 0 && (
          <button
            type="button"
            className="px-2 py-2 text-sm text-accent hover:underline"
            onClick={() => onChange({ status: '', categoryId: '', locationId: '', caseId: '', kind: '', audioType: '', owner: '', manufacturer: '', attention: '', capture: '', purchasedYear: '', withNetwork: false, withLinks: false })}
          >
            Zrušiť filtre
          </button>
        )}
      </div>
      {open && (
        <div className="mt-3 grid gap-3 rounded-xl border bg-surface p-4 sm:grid-cols-2 lg:grid-cols-4">
          {children}
          <SelectField label="Druh" value={filter.kind ?? ''} onChange={(e) => onChange({ kind: e.target.value as EquipmentFilter['kind'] })}>
            <option value="">Všetky druhy</option>
            {EQUIPMENT_KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {KIND_LABELS[kind]}
              </option>
            ))}
          </SelectField>
          <SelectField label="Typ zvuku" value={filter.audioType ?? ''} onChange={(e) => onChange({ audioType: e.target.value as EquipmentFilter['audioType'] })}>
            <option value="">Všetky typy</option>
            {AUDIO_TYPES.map((type) => (
              <option key={type} value={type}>
                {AUDIO_TYPE_LABELS[type]}
              </option>
            ))}
          </SelectField>
          <SelectField label="Vlastník" value={filter.owner ?? ''} onChange={(e) => onChange({ owner: e.target.value })}>
            <option value="">Všetci</option>
            <option value={COMPANY_OWNER}>Firemná technika</option>
            {ownerOptions.map((owner) => (
              <option key={owner.staffId} value={owner.staffId}>
                {owner.name}
              </option>
            ))}
          </SelectField>
          <SelectField label="Výrobca" value={filter.manufacturer ?? ''} onChange={(e) => onChange({ manufacturer: e.target.value })}>
            <option value="">Všetci výrobcovia</option>
            {manufacturers.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </SelectField>
          <SelectField label="Upozornenie" value={filter.attention ?? ''} onChange={(e) => onChange({ attention: e.target.value as EquipmentFilter['attention'] })}>
            <option value="">Bez ohľadu</option>
            <option value="service">Servis po termíne / do 30 dní</option>
            <option value="restock">Treba dokúpiť</option>
            <option value="hours">Odčítať prevádzkové hodiny</option>
          </SelectField>
          {hasLights && (
            <SelectField label="Svetlá – sedí s Capture" value={filter.capture ?? ''} onChange={(e) => onChange({ capture: e.target.value as EquipmentFilter['capture'] })}>
              <option value="">Bez ohľadu</option>
              {CAPTURE_MATCHES.map((match) => (
                <option key={match} value={match}>
                  {CAPTURE_MATCH_LABELS[match]}
                </option>
              ))}
              <option value="unset">Nezistené</option>
            </SelectField>
          )}
          <SelectField label="Rok nákupu" value={filter.purchasedYear ?? ''} onChange={(e) => onChange({ purchasedYear: e.target.value })}>
            <option value="">Všetky roky</option>
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </SelectField>
          <div className="flex flex-col justify-end gap-2 pb-1">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="size-4" checked={Boolean(filter.withNetwork)} onChange={(e) => onChange({ withNetwork: e.target.checked })} />
              Má IP / MAC adresu
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="size-4" checked={Boolean(filter.withLinks)} onChange={(e) => onChange({ withLinks: e.target.checked })} />
              Má odkazy (návod, fixtúra)
            </label>
          </div>
        </div>
      )}
    </div>
  )
}
