import { ArrowDown, ArrowUp, BookmarkPlus, ListPlus, Plus, Search, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Field, TextareaField } from '@/components/ui/field'
import type { Equipment } from '@/features/equipment/model'
import { formatMoney } from '@/lib/format'
import { cn } from '@/lib/utils'
import { emptyPart, itemsFromLines, lineTotal, newLine, partCode, partPrice, type OfferLine, type OfferPart, type PriceMode } from './model'

type Props = {
  part: OfferPart
  index: number
  subIndex?: number
  equipment: Equipment[]
  defaultDays: number
  /** Koľko ešte ostáva z rozpočtu (null = bez rozpočtu). */
  remaining: number | null
  /** Riadky „6 × Názov“ z techniky eventu (ak je ponuka k eventu). */
  eventItems?: string
  onChange: (part: OfferPart) => void
  onRemove: () => void
  onMove: (direction: -1 | 1) => void
  onSaveTemplate?: () => void
}

const money = (value: number) => formatMoney(value, 'EUR')
const MODES: { id: PriceMode; label: string }[] = [
  { id: 'manual', label: 'Cenu napíšem' },
  { id: 'lines', label: 'Z techniky a položiek' },
]

/** Jedna časť ponuky (A, B… alebo A1, A2): texty, cena ručne alebo zo zoznamu techniky a vlastných položiek. */
export function PartEditor({ part, index, subIndex, equipment, defaultDays, remaining, eventItems, onChange, onRemove, onMove, onSaveTemplate }: Props) {
  const [search, setSearch] = useState('')
  const [itemSearch, setItemSearch] = useState('')
  const set = (patch: Partial<OfferPart>) => onChange({ ...part, ...patch })
  const setLine = (id: string, patch: Partial<OfferLine>) => set({ lines: part.lines.map((line) => (line.id === id ? { ...line, ...patch } : line)) })
  const code = partCode(index, subIndex)
  const price = partPrice(part)
  const query = search.trim().toLowerCase()
  const found = query
    ? equipment
        .filter((item) => item.status !== 'retired' && `${item.name} ${item.manufacturer} ${item.model}`.toLowerCase().includes(query))
        .slice(0, 8)
    : []
  const addGear = (item: Equipment) => {
    const existing = part.lines.find((line) => line.equipmentId === item.id)
    if (existing) setLine(existing.id, { quantity: existing.quantity + 1 })
    else set({ lines: [...part.lines, newLine({ equipmentId: item.id, label: [item.manufacturer, item.model].filter(Boolean).join(' ') || item.name, days: defaultDays, unitPrice: item.rentalPrice ?? 0 })] })
    setSearch('')
  }
  const isSub = subIndex !== undefined
  // Zoznam (odrážky) sa dá klikať z vlastnej techniky: „2 × Názov“, ďalší klik pridá kus.
  const itemQuery = itemSearch.trim().toLowerCase()
  const itemFound = itemQuery
    ? equipment.filter((item) => item.status !== 'retired' && `${item.name} ${item.manufacturer} ${item.model}`.toLowerCase().includes(itemQuery)).slice(0, 8)
    : []
  const addItem = (item: Equipment) => {
    const label = [item.manufacturer, item.model].filter(Boolean).join(' ') || item.name
    const rows = part.items.split('\n').filter((row) => row.trim())
    const index = rows.findIndex((row) => row.replace(/^\s*\d+\s*×\s*/, '').trim() === label)
    if (index >= 0) {
      const count = Number(/^\s*(\d+)\s*×/.exec(rows[index])?.[1] ?? 1)
      rows[index] = `${count + 1} × ${label}`
    } else rows.push(`1 × ${label}`)
    set({ items: rows.join('\n') })
    setItemSearch('')
  }

  return (
    <div className={cn('flex flex-col gap-3 rounded-xl border p-4', isSub ? 'bg-background' : 'bg-surface')}>
      <div className="flex items-center gap-2">
        <span className="flex h-8 min-w-8 items-center justify-center rounded-lg bg-accent/15 px-2 text-sm font-bold text-accent">{code}</span>
        <Field label={`Názov časti ${code}`} hideLabel className="flex-1" placeholder={isSub ? 'napr. Ozvučenie' : 'napr. Kompletné technické zabezpečenie'} maxLength={160} value={part.title} onChange={(e) => set({ title: e.target.value })} />
        <Button variant="ghost" size="sm" aria-label={`Posunúť ${code} vyššie`} onClick={() => onMove(-1)}>
          <ArrowUp className="size-4" aria-hidden />
        </Button>
        <Button variant="ghost" size="sm" aria-label={`Posunúť ${code} nižšie`} onClick={() => onMove(1)}>
          <ArrowDown className="size-4" aria-hidden />
        </Button>
        {onSaveTemplate && (
          <Button variant="ghost" size="sm" title="Uložiť ako šablónu" aria-label={`Uložiť ${code} ako šablónu`} onClick={onSaveTemplate}>
            <BookmarkPlus className="size-4" aria-hidden />
          </Button>
        )}
        <Button variant="ghost" size="sm" aria-label={`Odstrániť ${code}`} onClick={() => window.confirm(`Odstrániť časť ${code}?`) && onRemove()}>
          <Trash2 className="size-4" aria-hidden />
        </Button>
      </div>

      <TextareaField label="Popis" rows={2} maxLength={2000} placeholder="Čo časť obsahuje – jedna-dve vety pre klienta." value={part.description} onChange={(e) => set({ description: e.target.value })} />
      <div>
        <TextareaField label="Zoznam (jeden riadok = jedna odrážka)" rows={3} maxLength={4000} placeholder={'napr.\n4 × Reprobox\n2 × Subwoofer'} value={part.items} onChange={(e) => set({ items: e.target.value })} />
        <div className="relative mt-1">
          <Search className="pointer-events-none absolute top-3 left-3 size-4 text-muted-foreground" aria-hidden />
          <Field label="Pridať do zoznamu z našej techniky" hideLabel placeholder="Pridať do zoznamu z našej techniky – hľadať…" className="[&_input]:h-10 [&_input]:pl-9" value={itemSearch} onChange={(e) => setItemSearch(e.target.value)} />
        </div>
        {itemFound.length > 0 && (
          <ul className="mt-1 divide-y rounded-lg border text-sm">
            {itemFound.map((item) => (
              <li key={item.id}>
                <button type="button" onClick={() => addItem(item)} className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-muted">
                  <Plus className="size-4 text-accent" aria-hidden />
                  <span className="min-w-0 flex-1 truncate">{item.name}</span>
                  <span className="text-xs text-muted-foreground">{item.quantity} ks</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-1 flex flex-wrap gap-2">
          {part.lines.length > 0 && (
            <button type="button" className="inline-flex items-center gap-1 text-xs text-accent hover:underline" onClick={() => set({ items: itemsFromLines(part.lines) })}>
              <ListPlus className="size-3.5" aria-hidden />
              Vyplniť z riadkov ceny
            </button>
          )}
          {eventItems && (
            <button type="button" className="inline-flex items-center gap-1 text-xs text-accent hover:underline" onClick={() => set({ items: [part.items.trim(), eventItems].filter(Boolean).join('\n') })}>
              <ListPlus className="size-3.5" aria-hidden />
              Pridať techniku z eventu
            </button>
          )}
        </div>
      </div>
      <Field label="Cena zahŕňa" maxLength={300} placeholder="napr. dopravu, montáž, demontáž a obsluhu" value={part.includes} onChange={(e) => set({ includes: e.target.value })} />

      <div className="rounded-lg border p-3">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">Cena {code}</span>
          <div role="radiogroup" className="flex gap-1 rounded-lg bg-muted p-1">
            {MODES.map((mode) => (
              <button
                key={mode.id}
                type="button"
                role="radio"
                aria-checked={part.priceMode === mode.id}
                onClick={() => set({ priceMode: mode.id })}
                className={cn('rounded-md px-2.5 py-1 text-xs font-medium', part.priceMode === mode.id ? 'bg-surface text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}
              >
                {mode.label}
              </button>
            ))}
          </div>
          <span className="ml-auto text-sm font-semibold tabular-nums">{price === null ? part.priceNote || '—' : money(price)}</span>
        </div>

        {part.priceMode === 'manual' ? (
          <div className="grid gap-2 sm:grid-cols-2">
            <Field
              label="Suma (€)"
              type="number"
              min={0}
              step="0.01"
              value={part.price ?? ''}
              onChange={(e) => set({ price: e.target.value === '' ? null : Math.max(0, Number(e.target.value)) })}
            />
            <Field label="Alebo text namiesto ceny" placeholder="napr. podľa dopytu" maxLength={120} value={part.priceNote} onChange={(e) => set({ priceNote: e.target.value })} />
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {part.lines.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[34rem] text-sm">
                  <thead>
                    <tr className="text-left text-xs text-muted-foreground">
                      <th className="pb-1 font-medium">Položka</th>
                      <th className="w-16 pb-1 font-medium">Ks</th>
                      <th className="w-16 pb-1 font-medium">Dni</th>
                      <th className="w-24 pb-1 font-medium">€ / ks / deň</th>
                      <th className="w-24 pb-1 text-right font-medium">Spolu</th>
                      <th className="w-8" />
                    </tr>
                  </thead>
                  <tbody>
                    {part.lines.map((line) => (
                      <tr key={line.id}>
                        <td className="pr-1 pb-1">
                          <input aria-label="Položka" className="h-8 w-full rounded-md border bg-background px-2" value={line.label} maxLength={160} onChange={(e) => setLine(line.id, { label: e.target.value })} />
                        </td>
                        <td className="pr-1 pb-1">
                          <input aria-label="Kusov" type="number" min={0} className="h-8 w-full rounded-md border bg-background px-1.5 text-right" value={line.quantity} onChange={(e) => setLine(line.id, { quantity: Math.max(0, Number(e.target.value) || 0) })} />
                        </td>
                        <td className="pr-1 pb-1">
                          <input aria-label="Dní" type="number" min={0} className="h-8 w-full rounded-md border bg-background px-1.5 text-right" value={line.days} onChange={(e) => setLine(line.id, { days: Math.max(0, Number(e.target.value) || 0) })} />
                        </td>
                        <td className="pr-1 pb-1">
                          <input aria-label="Cena za kus a deň" type="number" min={0} step="0.01" className="h-8 w-full rounded-md border bg-background px-1.5 text-right" value={line.unitPrice} onChange={(e) => setLine(line.id, { unitPrice: Math.max(0, Number(e.target.value) || 0) })} />
                        </td>
                        <td className="pb-1 text-right tabular-nums">{money(lineTotal(line))}</td>
                        <td className="pb-1 text-right">
                          <button type="button" aria-label={`Odobrať ${line.label}`} className="rounded p-1 text-muted-foreground hover:bg-muted" onClick={() => set({ lines: part.lines.filter((item) => item.id !== line.id) })}>
                            <X className="size-4" aria-hidden />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="relative">
              <Search className="pointer-events-none absolute top-3.5 left-3 size-4 text-muted-foreground" aria-hidden />
              <Field label="Pridať techniku zo skladu" hideLabel placeholder="Pridať techniku zo skladu – hľadať názov…" className="[&_input]:pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            {found.length > 0 && (
              <ul className="divide-y rounded-lg border text-sm">
                {found.map((item) => {
                  const cost = (item.rentalPrice ?? 0) * defaultDays
                  const over = remaining !== null && cost > remaining
                  return (
                    <li key={item.id}>
                      <button type="button" onClick={() => addGear(item)} className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-muted">
                        <Plus className="size-4 text-accent" aria-hidden />
                        <span className="min-w-0 flex-1 truncate">{item.name}</span>
                        <span className={cn('text-xs tabular-nums', over ? 'text-destructive' : 'text-muted-foreground')}>
                          {item.rentalPrice ? `${money(item.rentalPrice)} / deň${over ? ' · nad rozpočet' : ''}` : 'bez ceny prenájmu'}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
            <Button variant="outline" size="sm" className="self-start" onClick={() => set({ lines: [...part.lines, newLine({ days: 1 })] })}>
              <Plus className="size-4" aria-hidden />
              Vlastná položka (doprava, technik…)
            </Button>
          </div>
        )}
      </div>

      {!isSub && (
        <PartChildren
          part={part}
          index={index}
          equipment={equipment}
          defaultDays={defaultDays}
          remaining={remaining}
          eventItems={eventItems}
          onChange={(parts) => set({ parts })}
        />
      )}
    </div>
  )
}

/** Podčasti A1, A2… s tlačidlom na pridanie. */
function PartChildren({ part, index, equipment, defaultDays, remaining, eventItems, onChange }: { part: OfferPart; index: number; equipment: Equipment[]; defaultDays: number; remaining: number | null; eventItems?: string; onChange: (parts: OfferPart[]) => void }) {
  const move = (from: number, direction: -1 | 1) => {
    const to = from + direction
    if (to < 0 || to >= part.parts.length) return
    const next = [...part.parts]
    ;[next[from], next[to]] = [next[to], next[from]]
    onChange(next)
  }
  return (
    <div className="flex flex-col gap-3 border-l-2 border-accent/30 pl-3">
      {part.parts.map((child, subIndex) => (
        <PartEditor
          key={child.id}
          part={child}
          index={index}
          subIndex={subIndex}
          equipment={equipment}
          defaultDays={defaultDays}
          remaining={remaining}
          eventItems={eventItems}
          onChange={(next) => onChange(part.parts.map((item) => (item.id === child.id ? next : item)))}
          onRemove={() => onChange(part.parts.filter((item) => item.id !== child.id))}
          onMove={(direction) => move(subIndex, direction)}
        />
      ))}
      <Button variant="ghost" size="sm" className="self-start" onClick={() => onChange([...part.parts, emptyPart()])}>
        <Plus className="size-4" aria-hidden />
        Pridať podčasť {partCode(index, part.parts.length)}
      </Button>
    </div>
  )
}
