import { useMutation, useQueryClient } from '@tanstack/react-query'
import { SlidersHorizontal, Wand2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { saveUnitInfo } from './api'
import { unitIdsOf, type Equipment, type UnitInfo } from './model'
import { dipOn } from '@/features/labels/tape'

type Row = { unit: number; part: Equipment }
type Values = { line: string; address: string; mode: string }

/**
 * DMX všetkým kusom naraz (napr. 16 hláv v 8 cases): linka, adresa a mód pri každom kuse.
 * „Rozpočítať adresy“ priradí adresy za sebou podľa počtu kanálov módu (1, 17, 33…).
 */
export function GroupDmx({ companyId, parts, caseName, open, onOpen, onClose }: { companyId: string; parts: Equipment[]; caseName: (caseId: string | null) => string; open: boolean; onOpen: () => void; onClose: () => void }) {
  const queryClient = useQueryClient()
  const rows: Row[] = parts
    .filter((part) => part.trackUnits)
    .flatMap((part) => unitIdsOf(part).map((unit) => ({ unit, part })))
    .sort((a, b) => a.unit - b.unit)
  const modes = parts[0]?.attributes.dmxModes ?? []
  const initial = () =>
    Object.fromEntries(
      rows.map(({ unit, part }) => {
        const info = part.unitInfo?.[String(unit)]
        return [unit, { line: info?.dmxLine ?? '', address: info?.dmxAddress ? String(info.dmxAddress) : '', mode: info?.dmxMode ?? '' }]
      }),
    ) as Record<number, Values>
  const [values, setValues] = useState<Record<number, Values>>(initial)
  const [start, setStart] = useState('1')
  const set = (unit: number, patch: Partial<Values>) => setValues((current) => ({ ...current, [unit]: { ...current[unit], ...patch } }))
  const setAll = (patch: Partial<Values>) => setValues((current) => Object.fromEntries(Object.entries(current).map(([unit, value]) => [unit, { ...value, ...patch }])) as Record<number, Values>)
  const channelsOf = (mode: string) => modes.find((item) => (item.name || `${item.channels} ch`) === mode)?.channels ?? (Number(/(\d+)\s*ch/i.exec(mode)?.[1]) || 0)

  // Adresy za sebou: ďalší kus začína za kanálmi predchádzajúceho (podľa jeho módu).
  function spread() {
    let next = Math.max(1, Number(start) || 1)
    setValues((current) => {
      const updated = { ...current }
      for (const { unit } of rows) {
        const channels = channelsOf(updated[unit].mode) || 1
        updated[unit] = { ...updated[unit], address: String(next) }
        next += channels
      }
      return updated
    })
  }

  const save = useMutation({
    mutationFn: async () => {
      for (const part of parts.filter((item) => item.trackUnits)) {
        const info: Record<string, UnitInfo> = { ...(part.unitInfo ?? {}) }
        for (const unit of unitIdsOf(part)) {
          const value = values[unit]
          const rest = { ...(info[String(unit)] ?? {}) }
          delete rest.dmxLine
          delete rest.dmxAddress
          delete rest.dmxMode
          const address = Number(value.address)
          info[String(unit)] = {
            ...rest,
            ...(value.line.trim() && { dmxLine: value.line.trim() }),
            ...(address >= 1 && address <= 512 && { dmxAddress: address }),
            ...(value.mode.trim() && { dmxMode: value.mode.trim() }),
          }
          if (Object.keys(info[String(unit)]).length === 0) delete info[String(unit)]
        }
        await saveUnitInfo(companyId, part.id, info)
      }
    },
    onSuccess: onClose,
    // Zoznam aj detail techniky (DMX adresy sa dajú meniť aj v detaile).
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['company', companyId] }),
  })

  if (rows.length === 0) return null
  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={onOpen}>
        <SlidersHorizontal className="size-4" aria-hidden />
        DMX všetkým
      </Button>
    )
  }
  const overflow = rows.some(({ unit }) => Number(values[unit].address) + (channelsOf(values[unit].mode) || 1) - 1 > 512)

  return (
    <section aria-labelledby="group-dmx-heading" className="mb-6 w-full rounded-xl border border-accent/40 bg-surface p-4">
      <h2 id="group-dmx-heading" className="mb-3 font-medium">
        DMX všetkým kusom
      </h2>
      <div className="mb-3 flex flex-wrap items-end gap-2 rounded-lg bg-muted/50 p-3">
        <Field label="Linka všetkým" className="w-32" placeholder="napr. 1, A" onChange={(event) => setAll({ line: event.target.value })} />
        {modes.length > 0 && (
          <label className="flex flex-col gap-1 text-sm font-medium">
            Mód všetkým
            <select className="h-10 rounded-lg border bg-background px-2 font-normal" defaultValue="" onChange={(event) => setAll({ mode: event.target.value })}>
              <option value="">—</option>
              {modes.map((mode) => (
                <option key={mode.name + mode.channels} value={mode.name || `${mode.channels} ch`}>
                  {mode.name || `${mode.channels} ch`} ({mode.channels} ch)
                </option>
              ))}
            </select>
          </label>
        )}
        <Field label="Od adresy" type="number" inputMode="numeric" min={1} max={512} className="w-28" value={start} onChange={(event) => setStart(event.target.value)} />
        <Button variant="outline" onClick={spread}>
          <Wand2 className="size-4" aria-hidden />
          Rozpočítať adresy
        </Button>
      </div>
      <ul className="grid gap-2 lg:grid-cols-2">
        {rows.map(({ unit, part }) => (
          <li key={unit} className="grid grid-cols-[4.5rem_1fr_1fr_1fr] items-center gap-2">
            <span className="text-sm">
              <span className="block font-medium">#{unit}</span>
              {part.attributes.dipSwitches && Number(values[unit].address) > 0 && (
                <span className="block text-xs text-accent" title="Zapnuté DIP prepínače pre túto adresu">
                  DIP {dipOn(Number(values[unit].address), part.attributes.dipSwitches)}
                </span>
              )}
              <span className="block truncate text-xs text-muted-foreground">{part.caseId ? caseName(part.caseId) : 'mimo case'}</span>
            </span>
            <input aria-label={`Linka #${unit}`} placeholder="linka" className="h-10 min-w-0 rounded-lg border bg-background px-2" value={values[unit].line} onChange={(event) => set(unit, { line: event.target.value })} />
            <input aria-label={`Adresa #${unit}`} type="number" min={1} max={512} placeholder="adresa" className="h-10 min-w-0 rounded-lg border bg-background px-2" value={values[unit].address} onChange={(event) => set(unit, { address: event.target.value })} />
            {modes.length > 0 ? (
              <select aria-label={`Mód #${unit}`} className="h-10 min-w-0 rounded-lg border bg-background px-1 text-sm" value={values[unit].mode} onChange={(event) => set(unit, { mode: event.target.value })}>
                <option value="">mód</option>
                {modes.map((mode) => (
                  <option key={mode.name + mode.channels} value={mode.name || `${mode.channels} ch`}>
                    {mode.name || `${mode.channels} ch`}
                  </option>
                ))}
              </select>
            ) : (
              <input aria-label={`Mód #${unit}`} placeholder="mód" className="h-10 min-w-0 rounded-lg border bg-background px-2" value={values[unit].mode} onChange={(event) => set(unit, { mode: event.target.value })} />
            )}
          </li>
        ))}
      </ul>
      {overflow && <p className="mt-2 text-sm text-destructive">Niektorý kus by presiahol adresu 512 – dajte ho na ďalšiu linku.</p>}
      {save.isError && <p className="mt-2 text-sm text-destructive">Nepodarilo sa uložiť.</p>}
      <div className="mt-4 flex gap-2">
        <Button disabled={save.isPending} onClick={() => save.mutate()}>
          {save.isPending ? 'Ukladám…' : 'Uložiť'}
        </Button>
        <Button variant="ghost" onClick={onClose}>
          Zrušiť
        </Button>
      </div>
    </section>
  )
}
