import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { cn } from '@/lib/utils'
import { partsOf, type FitSlot } from './fit'
import { kindColor, ROW_PX, targetAt, type DropTarget } from './gridUtils'

type Props = {
  units: number
  slots: FitSlot[]
  side: 'front' | 'rear'
  selected: string | null
  flagged: Set<string>
  /** Názov, druh (farba) a podnázov slotu. */
  describe: (slot: FitSlot) => { name: string; subtitle: string; kind: string }
  onSelect: (key: string | null) => void
  /** Presun slotu ťahaním (myšou hneď, prstom po dlhšom podržaní). */
  onMove?: (key: string, target: DropTarget) => void
  /** Ťahanie z panela: kam by padol nový kus (zvýraznenie), alebo null mimo racku. */
  preview?: { heightU: number; width: FitSlot['width'] } | null
  gridRef?: React.RefObject<HTMLDivElement | null>
  hover?: DropTarget | null
}

/** Mriežka racku na úpravu: U zdola, sloty na pozíciách, ťahanie na presun, výber kliknutím. */
export function RackGrid({ units, slots, side, selected, flagged, describe, onSelect, onMove, preview, gridRef, hover }: Props) {
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

  const place = (slot: Pick<FitSlot, 'bottomU' | 'heightU' | 'width' | 'col'>) => {
    const [first, last] = partsOf(slot)
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
                'absolute flex flex-col justify-center overflow-hidden rounded-sm border-2 px-2 text-left text-xs leading-tight font-medium',
                kindColor(info.kind),
                selected === slot.key && 'ring-2 ring-accent ring-offset-1 ring-offset-neutral-900',
                flagged.has(slot.key) && 'outline-2 outline-red-500 outline-dashed',
                drag?.key === slot.key && 'opacity-40',
                onMove && 'cursor-grab',
              )}
              style={place(slot)}
            >
              <span className="truncate">{info.name}</span>
              {info.subtitle && slot.heightU > 1 && <span className="truncate text-[10px] font-normal opacity-75">{info.subtitle}</span>}
            </button>
          )
        })}
        {ghost && <div className="pointer-events-none absolute rounded-sm border-2 border-dashed border-accent bg-accent/20" style={place(ghost)} aria-hidden />}
      </div>
    </div>
  )
}
