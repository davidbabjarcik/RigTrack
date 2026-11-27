import { Cable as CableIcon, Link2, Trash2, Wand2, X } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { tf, tx } from '@/lib/i18n'
import type { FitSlot } from './fit'
import { CABLE_COLORS, CABLE_LABELS, CABLES, cableSummary, compatible, endText, summaryText, type Cable, type RackLink, type SlotPorts } from './links'

const field = 'h-8 rounded-lg border bg-background px-2 text-sm'

/** Zoznam káblov v racku: odkiaľ, kam, typ, dĺžka a popis; súhrn pre balenie. */
export function RackLinks({ slots, links, resolve, onChange, onRemove, onAuto, notice, readOnly = false }: { slots: FitSlot[]; links: RackLink[]; resolve: SlotPorts; onChange?: (key: string, patch: Partial<RackLink>) => void; onRemove?: (key: string) => void; onAuto?: () => void; notice?: string; readOnly?: boolean }) {
  const auto = onAuto && slots.length > 1 && (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="sm" variant="outline" onClick={onAuto}>
        <Wand2 className="size-4" aria-hidden />
        {tx('Zapojiť automaticky')}
      </Button>
      {notice && <span role="status" className="text-sm text-muted-foreground">{notice}</span>}
    </div>
  )
  if (links.length === 0) {
    if (readOnly) return null
    return (
      <div className="flex flex-col gap-2 rounded-xl border border-dashed bg-surface p-3 text-sm text-muted-foreground">
        <p>{tx('Káble: zatiaľ žiadne. Vyberte zariadenie a v časti Prepojenia ho spojte s iným, alebo ich zapojte automaticky.')}</p>
        {auto}
      </div>
    )
  }
  const summary = cableSummary(links)
  return (
    <section className="rounded-xl border bg-surface p-3" aria-label={tx('Káble')}>
      <h2 className="flex items-center gap-2 font-semibold">
        <CableIcon className="size-4" aria-hidden />
        {tf('Káble ({0})', links.length)}
      </h2>
      <p className="mb-2 text-sm text-muted-foreground">{summary.map((row) => summaryText(row, tx)).join(' · ')}</p>
      {auto}
      <ul className="flex flex-col divide-y text-sm">
        {links.map((link) => (
          <li key={link.key} className="flex flex-wrap items-center gap-2 py-2">
            <span className="size-3 shrink-0 rounded-full" style={{ background: CABLE_COLORS[link.cable] }} aria-hidden />
            <span className="min-w-0 flex-1 basis-56">
              <span className="block break-words">{endText(slots, resolve, link.from, link.fromPort)}</span>
              <span className="block break-words text-muted-foreground">→ {endText(slots, resolve, link.to, link.toPort)}</span>
            </span>
            {readOnly ? (
              <span className="text-muted-foreground">
                {[tx(CABLE_LABELS[link.cable]), link.lengthM !== null ? `${String(link.lengthM).replace('.', ',')} m` : '', link.label].filter(Boolean).join(' · ')}
              </span>
            ) : (
              <>
                <select aria-label={tx('Typ kábla')} className={field} value={link.cable} onChange={(event) => onChange?.(link.key, { cable: event.target.value as Cable })}>
                  {CABLES.map((cable) => (
                    <option key={cable} value={cable}>
                      {tx(CABLE_LABELS[cable])}
                    </option>
                  ))}
                </select>
                <label className="flex items-center gap-1">
                  <input
                    aria-label={tx('Dĺžka (m)')}
                    className={`${field} w-16`}
                    inputMode="decimal"
                    value={link.lengthM === null ? '' : String(link.lengthM).replace('.', ',')}
                    onChange={(event) => {
                      const value = event.target.value.trim().replace(',', '.')
                      const number = Number(value)
                      onChange?.(link.key, { lengthM: value === '' || !Number.isFinite(number) ? null : Math.min(1000, Math.max(0, number)) })
                    }}
                  />
                  m
                </label>
                <input aria-label={tx('Popis kábla')} className={`${field} w-28`} maxLength={80} placeholder={tx('popis')} value={link.label} onChange={(event) => onChange?.(link.key, { label: event.target.value })} />
                <Button size="sm" variant="ghost" aria-label={tx('Odobrať kábel')} onClick={() => onRemove?.(link.key)}>
                  <Trash2 className="size-4" aria-hidden />
                </Button>
              </>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}

/** Prepojenia vybraného zariadenia: zapojené porty a pripojenie voľného portu k inému zariadeniu. */
export function SlotConnections({ slot, slots, links, resolve, onConnect, onRemove }: { slot: FitSlot; slots: FitSlot[]; links: RackLink[]; resolve: SlotPorts; onConnect: (fromKey: string, fromPort: string, toKey: string, toPort: string) => void; onRemove: (key: string) => void }) {
  const { ports } = resolve(slot)
  const used = new Set(links.flatMap((link) => [`${link.from}|${link.fromPort}`, `${link.to}|${link.toPort}`]))
  const free = ports.filter((port) => !used.has(`${slot.key}|${port.id}`))
  const [portId, setPortId] = useState('')
  const [target, setTarget] = useState('')
  const own = free.find((port) => port.id === portId) ?? free[0]
  // Voľné porty iných zariadení, ktoré sa dajú spojiť s vybraným portom.
  const options = own
    ? slots
        .filter((other) => other.key !== slot.key)
        .flatMap((other) => {
          const info = resolve(other)
          return info.ports.filter((port) => !used.has(`${other.key}|${port.id}`) && compatible(own, port)).map((port) => ({ value: `${other.key}|${port.id}`, label: `${info.name} · ${port.label}` }))
        })
    : []
  const mine = links.filter((link) => link.from === slot.key || link.to === slot.key)
  if (ports.length === 0) return null
  return (
    <div className="flex flex-col gap-2 rounded-xl border bg-surface p-3 text-sm" aria-label={tx('Prepojenia')}>
      <p className="flex items-center gap-2 font-medium">
        <Link2 className="size-4" aria-hidden />
        {tx('Prepojenia')}
      </p>
      {mine.length > 0 && (
        <ul className="flex flex-col gap-1">
          {mine.map((link) => {
            const outgoing = link.from === slot.key
            const ownPort = ports.find((port) => port.id === (outgoing ? link.fromPort : link.toPort))?.label ?? ''
            return (
              <li key={link.key} className="flex items-start gap-2">
                <span className="mt-1.5 size-2.5 shrink-0 rounded-full" style={{ background: CABLE_COLORS[link.cable] }} aria-hidden />
                <span className="min-w-0 flex-1 break-words">
                  {ownPort} → {outgoing ? endText(slots, resolve, link.to, link.toPort) : endText(slots, resolve, link.from, link.fromPort)}
                </span>
                <button type="button" className="rounded p-0.5 text-muted-foreground hover:bg-muted" aria-label={tf('Odpojiť {0}', ownPort)} onClick={() => onRemove(link.key)}>
                  <X className="size-4" aria-hidden />
                </button>
              </li>
            )
          })}
        </ul>
      )}
      {free.length > 0 ? (
        <div className="flex flex-col gap-2">
          <label className="flex flex-col gap-1">
            {tx('Port')}
            <select
              className={field}
              value={own?.id ?? ''}
              onChange={(event) => {
                setPortId(event.target.value)
                setTarget('')
              }}
            >
              {free.map((port) => (
                <option key={port.id} value={port.id}>
                  {port.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            {tx('Pripojiť k')}
            <select className={field} value={target} onChange={(event) => setTarget(event.target.value)} disabled={options.length === 0}>
              <option value="">{options.length === 0 ? tx('nie je kam pripojiť') : tx('vyberte…')}</option>
              {options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <Button
            size="sm"
            variant="outline"
            disabled={!own || !target}
            onClick={() => {
              const [toKey, toPort] = target.split('|')
              if (own.dir === 'in') onConnect(toKey, toPort, slot.key, own.id)
              else onConnect(slot.key, own.id, toKey, toPort)
              setTarget('')
              setPortId('')
            }}
          >
            {tx('Prepojiť')}
          </Button>
        </div>
      ) : (
        <p className="text-muted-foreground">{tx('Všetky porty sú zapojené.')}</p>
      )}
    </div>
  )
}
