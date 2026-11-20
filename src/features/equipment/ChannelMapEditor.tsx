import { ChevronDown, ClipboardPaste } from 'lucide-react'
import { useState } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { ColorSlotsEditor, GoboSlotsEditor } from './DmxSlotsEditor'
import type { EquipmentFormValues } from './model'
import { Button } from '@/components/ui/button'
import { tf, tx } from '@/lib/i18n'
import { ChannelIcon } from './DmxChannelTable'
import { CHANNEL_GROUP_LABELS, CHANNEL_GROUPS, CHANNEL_SUGGESTIONS, channelColor, channelGroup, mapRows, rowsToMap, slotKind, VALUE_SUGGESTIONS, type ChannelRow } from './dmxChannels'

type OptionGroup = { label: string; items: string[] }
const CUSTOM = '__custom'

/** Bežné názvy kanálov zoskupené podľa toho, čo robia (stmievanie, farba, pozícia…). */
const NAME_GROUPS: OptionGroup[] = CHANNEL_GROUPS.map((group) => ({
  label: CHANNEL_GROUP_LABELS[group],
  items: CHANNEL_SUGGESTIONS.filter((name) => channelGroup(name) === group),
})).filter((group) => group.items.length > 0)
const VALUE_GROUPS: OptionGroup[] = [{ label: '', items: VALUE_SUGGESTIONS }]

/** Rozbaľovací zoznam s bežnými možnosťami; „Iné – napísať“ prepne na vlastný text. */
function PickOrType({ label, groups, value, placeholder, maxLength, className, onChange }: {
  label: string
  groups: OptionGroup[]
  value: string
  placeholder: string
  maxLength: number
  className?: string
  onChange: (value: string) => void
}) {
  const [typing, setTyping] = useState(false)
  const known = groups.some((group) => group.items.includes(value))
  const clean = (text: string) => text.replace(/[|\n\t]/g, ' ')
  if (typing || (value && !known)) {
    return (
      <span className={`flex items-center gap-1 ${className ?? ''}`}>
        <input
          aria-label={label}
          autoFocus={typing && !value}
          maxLength={maxLength}
          placeholder={placeholder}
          className="h-9 min-w-0 flex-1 rounded-md border bg-background px-2 text-sm"
          value={value}
          onChange={(event) => onChange(clean(event.target.value))}
        />
        <button
          type="button"
          title={tx('Vybrať zo zoznamu')}
          aria-label={tf('{0} – vybrať zo zoznamu', label)}
          className="flex size-9 shrink-0 items-center justify-center rounded-md border text-muted-foreground hover:bg-muted"
          onClick={() => {
            setTyping(false)
            if (!known) onChange('')
          }}
        >
          <ChevronDown className="size-4" aria-hidden />
        </button>
      </span>
    )
  }
  return (
    <select
      aria-label={label}
      className={`h-9 rounded-md border bg-background px-1.5 text-sm ${value ? '' : 'text-muted-foreground'} ${className ?? ''}`}
      value={value}
      onChange={(event) => {
        if (event.target.value === CUSTOM) {
          setTyping(true)
          onChange('')
        } else onChange(event.target.value)
      }}
    >
      <option value="">{placeholder}</option>
      {groups.map((group) =>
        group.label ? (
          <optgroup key={group.label} label={tx(group.label)}>
            {group.items.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </optgroup>
        ) : (
          group.items.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))
        ),
      )}
      <option value={CUSTOM}>{tx('Iné – napísať…')}</option>
    </select>
  )
}

type Props = {
  /** Rozpis „Názov | hodnota“ po riadkoch (tak sa ukladá). */
  map: string
  /** Počet kanálov módu – toľko riadkov tabuľka ukáže. */
  channels: number
  modeName: string
  onChange: (map: string) => void
}

/**
 * Kanály módu ako tabuľka: po zadaní počtu kanálov (napr. 10) je tu 10 riadkov – čo kanál robí
 * a predvolená hodnota. Ikonka sa doplní podľa názvu. Celý zoznam sa dá aj vložiť ako text (z návodu).
 */
export function ChannelMapEditor({ map, channels, modeName, onChange }: Props) {
  // Riadky drží tabuľka sama, aby sa pri písaní nemazali medzery („Pan fine“).
  const [stored, setRows] = useState<ChannelRow[]>(() => mapRows(map, channels))
  const [pasting, setPasting] = useState(false)
  const [pasted, setPasted] = useState('')
  const [openSlots, setOpenSlots] = useState<number | null>(null)
  // Počty farieb a gobo pri tlačidle rozkliknutia (bez formulára, napr. v teste, sú nulové).
  const form = useFormContext<EquipmentFormValues>()
  const wheelColors = useWatch({ control: form?.control, name: 'wheelColors' }) ?? []
  const gobos = useWatch({ control: form?.control, name: 'gobos' }) ?? []
  // Rozpis zmenený zvonka (GDTF, databáza techniky): tabuľka sa načíta nanovo.
  const [seen, setSeen] = useState(map)
  if (map !== seen) {
    setSeen(map)
    if (map !== rowsToMap(stored)) setRows(mapRows(map, channels))
  }

  // Počet riadkov podľa počtu kanálov: chýbajúce sa doplnia prázdne, vyplnené sa nikdy neodstránia.
  const lastFilled = stored.reduce((last, row, index) => (row.name.trim() || row.value.trim() ? index + 1 : last), 0)
  const count = Math.max(Number.isFinite(channels) && channels > 0 ? Math.min(channels, 512) : 0, lastFilled)
  const rows = Array.from({ length: count }, (_, index) => stored[index] ?? { name: '', value: '' })

  const update = (next: ChannelRow[]) => {
    setRows(next)
    onChange(rowsToMap(next))
  }
  const setRow = (index: number, patch: Partial<ChannelRow>) => update(rows.map((row, at) => (at === index ? { ...row, ...patch } : row)))
  const applyPasted = () => {
    const next = mapRows(pasted, channels)
    update(next)
    setPasting(false)
    setPasted('')
  }

  const filled = rows.filter((row) => row.name.trim()).length
  const extra = Number.isFinite(channels) && channels > 0 && rows.length > channels

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium">
          {tf('Kanály módu {0}', modeName || '')}
          <span className="ml-1 font-normal text-muted-foreground">{tf('({0} z {1} vyplnených)', filled, rows.length)}</span>
        </span>
        <Button variant="ghost" size="sm" onClick={() => setPasting(!pasting)}>
          <ClipboardPaste className="size-4" aria-hidden />
          {tx('Vložiť zoznam')}
        </Button>
      </div>
      {pasting && (
        <div className="flex flex-col gap-2 rounded-lg border bg-muted/40 p-3">
          <label className="flex flex-col gap-1 text-sm">
            <span>{tx('Vložte zoznam kanálov (napr. z návodu) – riadok = kanál, predvolená hodnota za „|“ alebo tabulátorom.')}</span>
            <textarea
              rows={6}
              className="rounded-lg border bg-surface px-3 py-2 font-mono text-sm"
              placeholder={tx('Pan | 50 %\nPan fine\nTilt | 50 %\nTilt fine\nDimmer | 0 %\nShutter | Open\nColor Wheel\n…')}
              value={pasted}
              onChange={(event) => setPasted(event.target.value)}
            />
          </label>
          <div className="flex gap-2">
            <Button size="sm" disabled={!pasted.trim()} onClick={applyPasted}>{tx('Použiť')}</Button>
            <Button size="sm" variant="ghost" onClick={() => setPasting(false)}>{tx('Zrušiť')}</Button>
          </div>
        </div>
      )}
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{tx('Zadajte počet kanálov módu – ukáže sa tabuľka na vyplnenie.')}</p>
      ) : (
        <ol className="flex flex-col divide-y overflow-hidden rounded-lg border bg-surface">
          {rows.map((row, index) => {
            const group = channelGroup(row.name)
            const slots = form ? slotKind(row.name) : null
            const firstGobo = slots === 'gobo' && rows.findIndex((other) => slotKind(other.name) === 'gobo') === index
            const slotCount =
              slots === 'color'
                ? wheelColors.length
                : slots === 'gobo'
                  ? gobos.filter((gobo) => (gobo?.wheel?.trim() ? gobo.wheel.trim().toLowerCase() === row.name.trim().toLowerCase() : firstGobo)).length
                  : 0
            const open = openSlots === index && slots !== null
            return (
              <li key={index} className={`flex flex-col gap-2 px-2 py-1.5 ${extra && index >= channels ? 'bg-amber-500/10' : ''}`}>
                <div className="flex items-center gap-2">
                <span className="w-7 shrink-0 text-right font-mono text-sm text-muted-foreground tabular-nums">{index + 1}</span>
                <span className="flex w-6 shrink-0 justify-center" title={row.name ? tx(CHANNEL_GROUP_LABELS[group]) : undefined}>
                  {row.name.trim() ? <ChannelIcon group={group} color={channelColor(row.name)} /> : null}
                </span>
                <PickOrType
                  label={tf('Kanál {0} – čo robí', index + 1)}
                  groups={NAME_GROUPS}
                  placeholder={tx('vybrať…')}
                  maxLength={60}
                  className="min-w-0 flex-1"
                  value={row.name}
                  onChange={(name) => setRow(index, { name })}
                />
                <PickOrType
                  label={tf('Kanál {0} – predvolená hodnota', index + 1)}
                  groups={VALUE_GROUPS}
                  placeholder={tx('hodnota')}
                  maxLength={30}
                  className="w-24 shrink-0 sm:w-32"
                  value={row.value}
                  onChange={(value) => setRow(index, { value })}
                />
                </div>
                {slots && (
                  <button
                    type="button"
                    aria-expanded={open}
                    className="ml-[4.25rem] inline-flex items-center gap-1 self-start text-sm text-accent hover:underline"
                    onClick={() => setOpenSlots(open ? null : index)}
                  >
                    <ChevronDown className={`size-4 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
                    {slots === 'color' ? tf('Farby na koliesku ({0})', slotCount) : tf('Gobá ({0})', slotCount)}
                  </button>
                )}
                {open && (
                  <div className="rounded-lg border bg-muted/30 p-3 sm:ml-[4.25rem]">
                    {slots === 'color' ? <ColorSlotsEditor /> : <GoboSlotsEditor wheel={row.name} first={firstGobo} />}
                  </div>
                )}
              </li>
            )
          })}
        </ol>
      )}
      {extra && <p className="text-xs text-amber-700 dark:text-amber-400">{tf('Vyplnených riadkov je viac, než má mód kanálov ({0}). Skontrolujte počet kanálov.', channels)}</p>}
    </div>
  )
}
