import { Aperture, CircleDot, Gauge, Minus, Move, Settings, Sparkles, Sun, Triangle, Zap, ZoomIn, type LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { tf, tx } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { CollapsibleSection } from '@/components/layout/CollapsibleSection'
import { CHANNEL_GROUP_LABELS, COLOR_PART_HEX, COLOR_PART_LABELS, colorMixName, colorsFromChannels, dmxChannels, type ChannelGroup, type ColorPart, type ColorWheel } from './dmxChannels'
import type { DmxMode } from './model'

const ICONS: Record<Exclude<ChannelGroup, 'color'>, [LucideIcon, string]> = {
  intensity: [Sun, 'text-amber-500'],
  shutter: [Zap, 'text-yellow-500'],
  position: [Move, 'text-sky-500'],
  gobo: [Aperture, 'text-violet-500'],
  prism: [Triangle, 'text-pink-500'],
  beam: [ZoomIn, 'text-teal-500'],
  effect: [Sparkles, 'text-fuchsia-500'],
  speed: [Gauge, 'text-orange-500'],
  control: [Settings, 'text-slate-500'],
  unused: [Minus, 'text-muted-foreground'],
  other: [CircleDot, 'text-muted-foreground'],
}

const RAINBOW = 'conic-gradient(#ef4444, #f59e0b, #facc15, #22c55e, #06b6d4, #3b82f6, #8b5cf6, #ef4444)'

/** Farebná bodka (farba kanála, zložka miešania, farba v koliesku). */
export function Swatch({ hex, className }: { hex: string; className?: string }) {
  return <span aria-hidden className={cn('inline-block size-4 shrink-0 rounded-full border border-black/20 dark:border-white/30', className)} style={{ background: hex }} />
}

/** Ikonka kanála podľa skupiny; farebný kanál ukáže svoju farbu, ostatné farebné dúhu. */
export function ChannelIcon({ group, color }: { group: ChannelGroup; color: string | null }) {
  const label = tx(CHANNEL_GROUP_LABELS[group])
  if (group === 'color') {
    return (
      <span title={label} role="img" aria-label={label} className="inline-flex size-5 items-center justify-center">
        {color ? <Swatch hex={color} /> : <span className="size-4 rounded-sm" style={{ background: RAINBOW }} />}
      </span>
    )
  }
  const [Icon, className] = ICONS[group]
  return (
    <span title={label} role="img" aria-label={label} className="inline-flex size-5 items-center justify-center">
      <Icon className={cn('size-4', className)} aria-hidden />
    </span>
  )
}

/** Tabuľka kanálov jedného módu: číslo, ikonka, čo kanál robí a predvolená hodnota. */
export function DmxChannelTable({ mode, startAddress }: { mode: DmxMode; startAddress?: number | null }) {
  const channels = dmxChannels(mode)
  const withValues = channels.some((channel) => channel.value)
  if (channels.length === 0) return <p className="text-sm text-muted-foreground">{tx('Rozpis kanálov tohto módu nie je zapísaný.')}</p>
  return (
    <div className="overflow-x-auto rounded-xl border bg-surface">
      <table className="w-full text-sm">
        <thead className="bg-muted/60 text-left text-xs text-muted-foreground">
          <tr>
            <th scope="col" className="w-12 px-3 py-2 text-right font-medium">{tx('Ch')}</th>
            {startAddress ? <th scope="col" className="w-16 px-2 py-2 text-right font-medium">{tx('Adresa')}</th> : null}
            <th scope="col" className="w-8 py-2"><span className="sr-only">{tx('Druh')}</span></th>
            <th scope="col" className="px-3 py-2 font-medium">{tx('Čo robí')}</th>
            {withValues && <th scope="col" className="px-3 py-2 font-medium">{tx('Predvolené')}</th>}
          </tr>
        </thead>
        <tbody className="divide-y">
          {channels.map((channel) => (
            <tr key={channel.channel} className={cn(channel.group === 'unused' && 'text-muted-foreground')}>
              <td className="px-3 py-1.5 text-right font-mono tabular-nums text-muted-foreground">{channel.channel}</td>
              {startAddress ? <td className="px-2 py-1.5 text-right font-mono font-medium tabular-nums">{String(startAddress + channel.channel - 1).padStart(3, '0')}</td> : null}
              <td className="py-1.5">
                <ChannelIcon group={channel.group} color={channel.color} />
              </td>
              <td className={cn('px-3 py-1.5 break-words', channel.fine && 'text-muted-foreground')}>{channel.name || '–'}</td>
              {withValues && <td className="px-3 py-1.5 break-words text-muted-foreground">{channel.value}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Prepínanie medzi módmi a tabuľka kanálov zvoleného módu. */
export function DmxModesView({ modes }: { modes: DmxMode[] }) {
  const [active, setActive] = useState(0)
  const mode = modes[Math.min(active, modes.length - 1)]
  if (!mode) return null
  return (
    <div>
      {modes.length > 1 && (
        <div role="tablist" aria-label={tx('DMX módy')} className="mb-3 flex flex-wrap gap-2">
          {modes.map((item, index) => (
            <button
              key={index}
              type="button"
              role="tab"
              aria-selected={index === active}
              onClick={() => setActive(index)}
              className={cn('rounded-full border px-3 py-1 text-sm', index === active ? 'border-accent bg-accent text-accent-foreground' : 'bg-surface hover:bg-muted')}
            >
              {item.name} · {item.channels}{' '}{tx('ch')}
            </button>
          ))}
        </div>
      )}
      {modes.length === 1 && <p className="mb-2 text-sm font-medium">{tf('{0} · {1} ch', mode.name, mode.channels)}</p>}
      <DmxChannelTable mode={mode} />
    </div>
  )
}

/** Farby svetla: miešanie (RGBW…) a farebné koliesko s farbami. */
export function LightColors({ parts, wheel, guessed = false }: { parts: ColorPart[]; wheel: ColorWheel | null; guessed?: boolean }) {
  if (parts.length === 0 && !wheel) return null
  const slots = wheel ? wheel.slots ?? wheel.colors.length : 0
  return (
    <div className="flex flex-col gap-2 text-sm">
      {parts.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{tf('Miešanie {0}', colorMixName(parts))}</span>
          {parts.map((part) => (
            <span key={part} className="inline-flex items-center gap-1 rounded-full border bg-surface px-2 py-0.5 text-xs" title={tx(COLOR_PART_LABELS[part])}>
              <Swatch hex={COLOR_PART_HEX[part]} className="size-3" />
              {part}
            </span>
          ))}
        </div>
      )}
      {wheel && (
        <div>
          <span className="font-medium">{slots > 0 ? tf('Farebné koliesko · {0} farieb', slots) : tx('Farebné koliesko')}</span>
          {wheel.colors.length > 0 && (
            <ul className="mt-1.5 flex flex-wrap gap-1.5">
              {wheel.colors.map((color, index) => (
                <li key={index} className="inline-flex items-center gap-1.5 rounded-full border bg-surface py-0.5 pr-2.5 pl-1 text-xs">
                  <Swatch hex={color.hex} />
                  <span className="font-mono text-muted-foreground tabular-nums">{index + 1}</span>
                  {color.name}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {guessed && <p className="text-xs text-muted-foreground">{tx('Odhadnuté podľa názvov DMX kanálov – presne to nastavíte v úprave svetla.')}</p>}
    </div>
  )
}

/** Sekcia v detaile svetla: DMX módy s rozpisom kanálov a farby (zadané, inak odhadnuté z kanálov). */
export function LightDmxSection({ attributes }: { attributes: { dmxModes?: DmxMode[]; colorParts?: ColorPart[]; colorWheel?: ColorWheel } }) {
  const modes = attributes.dmxModes ?? []
  const entered = Boolean(attributes.colorParts?.length || attributes.colorWheel)
  const guess = entered ? null : colorsFromChannels(modes)
  const parts = attributes.colorParts ?? guess?.parts ?? []
  const wheel = attributes.colorWheel ?? (guess?.wheel ? { colors: [] } : null)
  const hasColors = parts.length > 0 || Boolean(wheel)
  if (modes.length === 0 && !hasColors) return null
  return (
    <CollapsibleSection id="equipment.dmx" title={tx('DMX módy a farby')}>
      <div className="flex flex-col gap-4">
        {hasColors && (
          <div className="rounded-xl border bg-surface p-4">
            <LightColors parts={parts} wheel={wheel} guessed={!entered} />
          </div>
        )}
        {modes.length > 0 && <DmxModesView modes={modes} />}
      </div>
    </CollapsibleSection>
  )
}
