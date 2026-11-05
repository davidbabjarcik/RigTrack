import { BookCheck, Info, ShieldAlert } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Field, SelectField } from '@/components/ui/field'
import { catalogBrands, catalogModels, findCatalogEntry, type CatalogEntry } from './catalog'
import type { EquipmentKind } from './model'
import { tf, tx } from '@/lib/i18n'

const OTHER = '__other__'

/** Koľko technických údajov o modeli databáza pozná (prázdne sa nerátajú). */
export function knownFacts(attributes: Record<string, unknown>): number {
  return Object.values(attributes).filter((value) => value !== undefined && value !== null && value !== '' && !(Array.isArray(value) && value.length === 0)).length
}
/** Pod týmto počtom sú to len základné údaje (napr. typ a impedancia), nie parametre. */
const FEW_FACTS = 4

function Hint({ children }: { children?: ReactNode }) {
  return children ? <div className="text-xs text-muted-foreground">{children}</div> : null
}

type Props = {
  kind: EquipmentKind
  catalog: CatalogEntry[]
  manufacturer: string
  model: string
  manufacturerError?: string
  modelError?: string
  onManufacturer: (value: string) => void
  onModel: (value: string) => void
  /** Model vybraný z katalógu – formulár doplní jeho údaje. */
  onPick: (entry: CatalogEntry) => void
}

/**
 * Výrobca a model zo spoločného katalógu: najprv značka (napr. JBL), potom jej model. Na konci zoznamu „Iná
 * značka / Iný model…“ – dopíše sa ručne a po uložení ide ako návrh do katalógu na overenie.
 */
export function CatalogPicker({ kind, catalog, manufacturer, model, manufacturerError, modelError, onManufacturer, onModel, onPick }: Props) {
  const brands = catalogBrands(catalog, kind)
  const brand = brands.find((value) => value.toLowerCase() === manufacturer.trim().toLowerCase())
  const models = brand ? catalogModels(catalog, kind, brand) : []
  const known = brand ? findCatalogEntry(catalog, kind, brand, model) : undefined
  // Vlastná značka / model: keď je zadané niečo mimo katalógu, alebo to človek zvolil.
  const [ownBrand, setOwnBrand] = useState(() => Boolean(manufacturer.trim()) && !brand)
  const [ownModel, setOwnModel] = useState(() => Boolean(model.trim()) && !known)
  const freeBrand = ownBrand || brands.length === 0
  const freeModel = freeBrand || ownModel || models.length === 0

  return (
    <>
      {freeBrand ? (
        <div className="flex flex-col gap-1">
          <Field
            label={tx('Výrobca')}
            placeholder={tx('napr. JBL')}
            autoComplete="off"
            error={manufacturerError}
            value={manufacturer}
            onChange={(event) => onManufacturer(event.target.value)}
          />
          <Hint>{brands.length > 0 ? (
              <button
                type="button"
                className="text-accent hover:underline"
                onClick={() => {
                  setOwnBrand(false)
                  setOwnModel(false)
                  onManufacturer('')
                  onModel('')
                }}
              >{tx('Vybrať zo zoznamu značiek')}</button>
            ) : undefined}</Hint>
        </div>
      ) : (
        <SelectField
          label={tx('Výrobca')}
          error={manufacturerError}
          value={brand ?? ''}
          onChange={(event) => {
            const value = event.target.value
            if (value === OTHER) {
              setOwnBrand(true)
              setOwnModel(true)
              onManufacturer('')
              onModel('')
              return
            }
            onManufacturer(value)
            onModel('')
            setOwnModel(false)
          }}
        >
          <option value="">{tx('— vyberte značku —')}</option>
          {brands.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
          <option value={OTHER}>{tx('+ Iná značka (pridať)…')}</option>
        </SelectField>
      )}

      {freeModel ? (
        <div className="flex flex-col gap-1">
          <Field
            label={tx('Model')}
            autoComplete="off"
            placeholder={freeBrand ? undefined : tx('napr. VRX932LA-1')}
            error={modelError}
            value={model}
            onChange={(event) => onModel(event.target.value)}
          />
          <Hint>{!freeBrand && models.length > 0 ? (
              <button
                type="button"
                className="text-accent hover:underline"
                onClick={() => {
                  setOwnModel(false)
                  onModel('')
                }}
              >{tx('Vybrať zo zoznamu modelov')}{' '}{brand}
              </button>
            ) : manufacturer.trim() ? (
              tx('Model mimo katalógu – po uložení pôjde na overenie do spoločnej databázy techniky.')
            ) : undefined}</Hint>
        </div>
      ) : (
        <SelectField
          label={tx('Model')}
          error={modelError}
          value={known?.model ?? ''}
          disabled={!brand}
          onChange={(event) => {
            const value = event.target.value
            if (value === OTHER) {
              setOwnModel(true)
              onModel('')
              return
            }
            onModel(value)
            const entry = brand ? findCatalogEntry(catalog, kind, brand, value) : undefined
            if (entry) onPick(entry)
          }}
        >
          <option value="">{brand ? tx('— vyberte model —') : tx('najprv značku')}</option>
          {models.map((entry) => (
            <option key={entry.id} value={entry.model}>
              {entry.model}
            </option>
          ))}
          <option value={OTHER}>{tx('+ Iný model (pridať)…')}</option>
        </SelectField>
      )}
      {known && (
        <p className="-mt-2 flex items-center gap-1.5 text-xs text-muted-foreground sm:col-span-2">
          {known.verified ? <BookCheck className="size-3.5 shrink-0 text-emerald-600" aria-hidden /> : <ShieldAlert className="size-3.5 shrink-0 text-amber-600" aria-hidden />}
          {known.verified
            ? tx('Model zo spoločnej databázy techniky – údaje sú overené.')
            : tx('Model zo spoločnej databázy techniky – údaje zatiaľ nie sú overené, skontrolujte ich.')}
        </p>
      )}
      {known && knownFacts(known.attributes) < FEW_FACTS && (
        <p role="status" className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm sm:col-span-2">
          <Info className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden />
          <span>
            {knownFacts(known.attributes) === 0
              ? tx('Technické údaje o tomto modeli zatiaľ nie sú známe – doplňte ich ručne, ak ich viete.')
              : tf('O tomto modeli databáza zatiaľ pozná len základné údaje ({0}) – ostatné doplňte ručne, ak ich viete.', knownFacts(known.attributes))}
          </span>
        </p>
      )}
    </>
  )
}
