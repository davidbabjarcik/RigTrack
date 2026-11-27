import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { cn } from '@/lib/utils'
import { partsOf, type FitSlot } from './fit'
import { DeviceFace } from './DeviceFace'
import { kindColor, ROW_PX, targetAt, type DropTarget } from './gridUtils'
import type { RackCategory } from './library'
import { CABLE_COLORS, type RackLink, type SlotPorts } from './links'

type Props = {
  units: number
  slots: FitSlot[]
  side: 'front' | 'rear'
  selected: string | null
  flagged: Set<string>
  /** Názov, druh (farba) a podnázov slotu. */
  describe: (slot: FitSlot) => { name: string; subtitle: string; kind: string; category?: RackCategory | null }
  onSelect: (key: string | null) => void
  /** Presun slotu ťahaním (myšou hneď, prstom po dlhšom podržaní). */
  onMove?: (key: string, target: DropTarget) => void
  /** Ťahanie z panela: kam by padol nový kus (zvýraznenie), alebo null mimo racku. */
  preview?: { heightU: number; width: FitSlot['width'] } | null
  gridRef?: React.RefObject<HTMLDivElement | null>
  hover?: DropTarget | null
  /** Káble (kreslia sa v pohľade zozadu). */
  links?: RackLink[]
  resolve?: SlotPorts
}

/** Mriežka racku na úpravu: U zdola, sloty na pozíciách, ťahanie na presun, výber kliknutím. */
export function RackGrid({ units, slots, side, selected, flagged, describe, onSelect, onMove, preview, gridRef, hover, links = [], resolve }: Props) {
  const own = useRef<HTMLDivElement | null>(null)
  const ref = gridRef ?? own
  const [drag, setDrag] = useState<{ key: string; grabU: number; target: DropTarget | null } | null>(null)
  const pressTimer = useRef(0)
  // Aktuálny cieľ ťahania aj mimo vykreslenia (pustenie myši ho prečíta bez vedľajších efektov v setState).
  const target = useRef<DropTarget | null>(null)

  useEffect(() => {
    if (!drag) return
    const slot = slots.find((item) => item.key === drag.key)
    if (!slot) return
    const move = (event: PointerEvent) => {
      const rect = ref.current?.getBoundingClientRect()
      if (!rect) return
      event.preventDefault()
      target.current = targetAt(rect, event.clientX, event.clientY, units, slot.heightU, slot.width, drag.grabU)
      setDrag((current) => (current ? { ...current, target: target.current } : current))
    }
    const up = () => {
      if (target.current) onMove?.(drag.key, target.current)
      target.current = null
      setDrag(null)
    }
    window.addEventListener('pointermove', move, { passive: false })
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
    }
  }, [drag, slots, units, onMove, ref])

  const startDrag = (event: ReactPointerEvent, slot: FitSlot) => {
    if (!onMove) return
    const rect = ref.current?.getBoundingClientRect()
    const grabU = rect ? Math.max(0, Math.min(slot.heightU - 1, Math.floor((rect.bottom - event.clientY) / ROW_PX) + 1 - slot.bottomU)) : 0
    const begin = () => {
      target.current = null
      setDrag({ key: slot.key, grabU, target: null })
    }
    // Myš hneď, prst po podržaní (aby sa dalo stránku normálne posúvať).
    if (event.pointerType === 'mouse') begin()
    else pressTimer.current = window.setTimeout(begin, 350)
  }
  const cancelPress = () => window.clearTimeout(pressTimer.current)

  const shown = slots.filter((slot) => slot.side === side)
  const ghostSlot = drag ? shown.find((slot) => slot.key === drag.key) : undefined
  const ghost = drag?.target && ghostSlot ? { ...ghostSlot, ...drag.target } : hover && preview ? { heightU: preview.heightU, width: preview.width, ...hover } : null

  // Zozadu sú vidno aj zadné panely prístrojov osadených spredu (zrkadlovo), pod tými, čo sú osadené zozadu.
  const backs = side === 'rear' ? slots.filter((slot) => slot.side === 'front') : []

  const place = (slot: Pick<FitSlot, 'bottomU' | 'heightU' | 'width' | 'col'>, mirror = false) => {
    const [from, to] = partsOf(slot)
    const [first, last] = mirror ? [5 - to, 5 - from] : [from, to]
    return {
      bottom: (slot.bottomU - 1) * ROW_PX + 1,
      height: slot.heightU * ROW_PX - 2,
      left: `calc(${(first / 6) * 100}% + 1px)`,
      width: `calc(${((last - first + 1) / 6) * 100}% - 2px)`,
    }
  }

  return (
    <div className="flex rounded-lg border-4 border-neutral-700 bg-neutral-900 p-1 select-none dark:border-neutral-600">
      <ol className="flex w-7 shrink-0 flex-col-reverse text-right text-[10px] text-neutral-400" aria-hidden>
        {Array.from({ length: units }, (_, index) => (
          <li key={index} className="pr-1" style={{ height: ROW_PX, lineHeight: `${ROW_PX}px` }}>
            {index + 1}
          </li>
        ))}
      </ol>
      <div ref={ref} className="relative flex-1 touch-pan-y" style={{ height: units * ROW_PX }} onClick={(event) => event.target === event.currentTarget && onSelect(null)}>
        {Array.from({ length: units }, (_, index) => (
          <div key={index} className="pointer-events-none absolute inset-x-0 border-t border-neutral-800" style={{ bottom: index * ROW_PX, height: ROW_PX }} aria-hidden />
        ))}
        {backs.map((slot) => {
          const info = describe(slot)
          return (
            <div key={`back-${slot.key}`} className="pointer-events-none absolute overflow-hidden rounded-sm border border-neutral-600 opacity-80" style={place(slot, true)} aria-hidden>
              <DeviceFace category={info.category ?? null} accessory={slot.accessory} side="rear" heightU={slot.heightU} width={slot.width} name={`${info.name} ${info.subtitle}`} />
              <span className="relative m-0.5 inline-block max-w-[calc(100%-0.25rem)] truncate rounded bg-black/70 px-1 text-[10px] leading-tight text-neutral-300">{info.name}</span>
            </div>
          )
        })}
        {shown.map((slot) => {
          const info = describe(slot)
          return (
            <button
              key={slot.key}
              type="button"
              aria-label={`${info.name}, U ${slot.bottomU}${slot.heightU > 1 ? `–${slot.bottomU + slot.heightU - 1}` : ''}`}
              aria-pressed={selected === slot.key}
              onClick={() => onSelect(slot.key)}
              onPointerDown={(event) => startDrag(event, slot)}
              onPointerUp={cancelPress}
              onPointerLeave={cancelPress}
              className={cn(
                'absolute flex flex-col items-start justify-center overflow-hidden rounded-sm border-2 bg-neutral-800 px-2 text-left text-xs leading-tight font-medium text-white',
                kindColor(info.kind).split(' ')[0],
                selected === slot.key && 'ring-2 ring-accent ring-offset-1 ring-offset-neutral-900',
                flagged.has(slot.key) && 'outline-2 outline-red-500 outline-dashed',
                drag?.key === slot.key && 'opacity-40',
                onMove && 'cursor-grab',
              )}
              style={place(slot)}
            >
              <DeviceFace category={info.category ?? null} accessory={slot.accessory} side={slot.side === side ? 'front' : 'rear'} heightU={slot.heightU} width={slot.width} name={`${info.name} ${info.subtitle}`} />
              <span className="relative max-w-full truncate rounded bg-black/70 px-1">{info.name}</span>
              {info.subtitle && slot.heightU > 1 && <span className="relative mt-0.5 max-w-full truncate rounded bg-black/70 px-1 text-[10px] font-normal text-neutral-300">{info.subtitle}</span>}
            </button>
          )
        })}
        {side === 'rear' && resolve && links.length > 0 && <Cables units={units} slots={slots} links={links} resolve={resolve} />}
        {ghost && <div className="pointer-events-none absolute rounded-sm border-2 border-dashed border-accent bg-accent/20" style={place(ghost)} aria-hidden />}
      </div>
    </div>
  )
}

/**
 * Káble zozadu: oblúk od portu k portu (poloha portu podľa poradia v zozname portov). Prístroje osadené spredu sú
 * zozadu zrkadlovo.
 */
function Cables({ units, slots, links, resolve }: { units: number; slots: FitSlot[]; links: RackLink[]; resolve: SlotPorts }) {
  const height = units * ROW_PX
  const point = (key: string, portId: string) => {
    const slot = slots.find((item) => item.key === key)
    if (!slot) return null
    const ports = resolve(slot).ports
    const index = Math.max(0, ports.findIndex((port) => port.id === portId))
    const [from, to] = partsOf(slot)
    const [first, last] = slot.side === 'front' ? [5 - to, 5 - from] : [from, to]
    const left = first / 6
    const width = (last - first + 1) / 6
    const fraction = ports.length > 1 ? 0.08 + (0.84 * index) / (ports.length - 1) : 0.5
    // Zadný panel sa kreslí tak, ako ho vidno zozadu – poradie portov zľava doprava.
    const x = left + width * fraction
    const y = height - (slot.bottomU - 1 + slot.heightU / 2) * ROW_PX
    return { x: x * 1000, y }
  }
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox={`0 0 1000 ${height}`} preserveAspectRatio="none" aria-hidden>
      {links.map((link) => {
        const a = point(link.from, link.fromPort)
        const b = point(link.to, link.toPort)
        if (!a || !b) return null
        const sag = Math.min(60, 12 + Math.abs(a.y - b.y) * 0.25)
        return (
          <path
            key={link.key}
            d={`M ${a.x} ${a.y} C ${a.x} ${a.y + sag}, ${b.x} ${b.y + sag}, ${b.x} ${b.y}`}
            fill="none"
            stroke={CABLE_COLORS[link.cable]}
            strokeWidth={3}
            strokeLinecap="round"
            opacity={0.9}
            vectorEffect="non-scaling-stroke"
          />
        )
      })}
    </svg>
  )
}
