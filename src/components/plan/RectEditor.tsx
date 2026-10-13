import { useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'

export type PlanRect = { x: number; y: number; length: number; width: number }

type Drag =
  | { mode: 'move'; index: number; grabX: number; grabY: number; rect: PlanRect }
  | { mode: 'resize'; index: number; rect: PlanRect }
  | { mode: 'draw'; startX: number; startY: number; rect: PlanRect }

type Props = {
  /** Rozmery plochy v cm: `length` vodorovne, `width` zvislo. */
  length: number
  width: number
  rects: PlanRect[]
  selected: number | null
  onSelect: (index: number | null) => void
  /** Volá sa po pustení, s konečnou polohou a veľkosťou. */
  onChange: (index: number, rect: PlanRect) => void
  onAdd: (rect: PlanRect) => void
  fillOf: (index: number) => string
  labelOf: (index: number) => string
  /** Os x rastie sprava doľava (nákladný priestor s kabínou vpravo). */
  mirrored?: boolean
  /** Na koľko cm sa ťahanie prichytáva a aký je najmenší rozmer. */
  snap?: number
  /** Rozostup čiar mriežky v cm. */
  grid?: number
  /** Popis polohy počas ťahania. */
  describe: (rect: PlanRect) => string
  /** Čo je pod nákresom, keď sa práve neťahá. */
  footer: ReactNode
  ariaLabel: string
  className?: string
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), Math.max(min, max))
const finite = (value: number) => (Number.isFinite(value) ? value : 0)

/**
 * Kreslenie obdĺžnikov do pôdorysu myšou alebo prstom. Ťahaním po prázdnom mieste vznikne nový,
 * ťahaním obdĺžnika sa posúva, ťahaním za štvorček v rohu vybraného sa mení veľkosť.
 * Zmena sa oznámi až po pustení; presné čísla nech majú vedľa aj obyčajné polia.
 */
export function RectEditor({
  length,
  width,
  rects,
  selected,
  onSelect,
  onChange,
  onAdd,
  fillOf,
  labelOf,
  mirrored = false,
  snap: step = 5,
  grid = 50,
  describe,
  footer,
  ariaLabel,
  className = '',
}: Props) {
  const svg = useRef<SVGSVGElement>(null)
  // Polohu ukazovateľa počítame voči obsahu, ktorý môže byť zrkadlovo otočený.
  const content = useRef<SVGGElement>(null)
  const [drag, setDrag] = useState<Drag | null>(null)

  const pad = Math.max(length, width) * 0.02
  const font = Math.max(Math.min(length, width) * 0.07, step)
  const handle = Math.max(length, width) * 0.035
  const snap = (value: number) => Math.round(value / step) * step

  /** Poloha ukazovateľa v centimetroch plochy. */
  const pointOf = (event: ReactPointerEvent) => {
    const matrix = content.current?.getScreenCTM()
    if (!matrix) return { x: 0, y: 0 }
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse())
    return { x: clamp(point.x, 0, length), y: clamp(point.y, 0, width) }
  }

  const start = (event: ReactPointerEvent, next: (point: { x: number; y: number }) => Drag) => {
    event.stopPropagation()
    event.preventDefault()
    svg.current?.setPointerCapture(event.pointerId)
    setDrag(next(pointOf(event)))
  }

  const move = (event: ReactPointerEvent) => {
    if (!drag) return
    const point = pointOf(event)
    if (drag.mode === 'move') {
      const x = clamp(snap(point.x - drag.grabX), 0, length - drag.rect.length)
      const y = clamp(snap(point.y - drag.grabY), 0, width - drag.rect.width)
      setDrag({ ...drag, rect: { ...drag.rect, x, y } })
    } else if (drag.mode === 'resize') {
      setDrag({
        ...drag,
        rect: {
          ...drag.rect,
          length: clamp(snap(point.x - drag.rect.x), step, length - drag.rect.x),
          width: clamp(snap(point.y - drag.rect.y), step, width - drag.rect.y),
        },
      })
    } else {
      const x1 = snap(Math.min(drag.startX, point.x))
      const y1 = snap(Math.min(drag.startY, point.y))
      const x2 = clamp(snap(Math.max(drag.startX, point.x)), 0, length)
      const y2 = clamp(snap(Math.max(drag.startY, point.y)), 0, width)
      setDrag({ ...drag, rect: { x: x1, y: y1, length: x2 - x1, width: y2 - y1 } })
    }
  }

  const finish = (event: ReactPointerEvent) => {
    if (!drag) return
    svg.current?.releasePointerCapture(event.pointerId)
    setDrag(null)
    if (drag.mode === 'draw') {
      // Obyčajné kliknutie do prázdna len zruší výber.
      if (drag.rect.length < step || drag.rect.width < step) return onSelect(null)
      onAdd(drag.rect)
      onSelect(rects.length)
    } else {
      const before = rects[drag.index]
      const same = before.x === drag.rect.x && before.y === drag.rect.y && before.length === drag.rect.length && before.width === drag.rect.width
      if (!same) onChange(drag.index, drag.rect)
    }
  }

  const rectOf = (rect: PlanRect, index: number): PlanRect =>
    drag && drag.mode !== 'draw' && drag.index === index
      ? drag.rect
      : { x: finite(rect.x), y: finite(rect.y), length: finite(rect.length), width: finite(rect.width) }
  const gridId = `rect-editor-grid-${grid}`

  return (
    <div>
      <svg
        ref={svg}
        viewBox={`${-pad} ${-pad} ${length + pad * 2} ${width + pad * 2}`}
        className={`w-full touch-none rounded-lg border bg-white select-none ${className}`}
        role="img"
        aria-label={ariaLabel}
        onPointerMove={move}
        onPointerUp={finish}
        onPointerCancel={() => setDrag(null)}
      >
        <defs>
          <pattern id={gridId} width={grid} height={grid} patternUnits="userSpaceOnUse">
            <path d={`M ${grid} 0 L 0 0 0 ${grid}`} fill="none" stroke="#e5e5e5" strokeWidth={pad / 6} />
          </pattern>
        </defs>
        <g ref={content} transform={mirrored ? `translate(${length} 0) scale(-1 1)` : undefined}>
          <rect
            x={0}
            y={0}
            width={length}
            height={width}
            fill={`url(#${gridId})`}
            stroke="#171717"
            strokeWidth={pad / 2}
            className="cursor-crosshair"
            onPointerDown={(event) => start(event, (point) => ({ mode: 'draw', startX: point.x, startY: point.y, rect: { ...point, length: 0, width: 0 } }))}
          />
          {rects.map((item, index) => {
            const rect = rectOf(item, index)
            const active = selected === index
            const centerX = rect.x + rect.length / 2
            return (
              <g key={index}>
                <rect
                  x={rect.x}
                  y={rect.y}
                  width={rect.length}
                  height={rect.width}
                  fill={fillOf(index)}
                  fillOpacity={active ? 1 : 0.8}
                  stroke={active ? '#f97316' : '#171717'}
                  strokeWidth={pad / (active ? 1.5 : 4)}
                  className="cursor-move"
                  onPointerDown={(event) => {
                    onSelect(index)
                    start(event, (point) => ({ mode: 'move', index, grabX: point.x - rect.x, grabY: point.y - rect.y, rect }))
                  }}
                />
                <text
                  x={centerX}
                  y={rect.y + rect.width / 2}
                  transform={mirrored ? `translate(${centerX * 2} 0) scale(-1 1)` : undefined}
                  fontSize={Math.min(font, rect.width * 0.7, (rect.length / Math.max(labelOf(index).length, 1)) * 1.4)}
                  fontWeight="600"
                  fill="#ffffff"
                  textAnchor="middle"
                  dominantBaseline="central"
                  pointerEvents="none"
                >
                  {labelOf(index)}
                </text>
                {active && (
                  <rect
                    x={rect.x + rect.length - handle / 2}
                    y={rect.y + rect.width - handle / 2}
                    width={handle}
                    height={handle}
                    fill="#c2410c"
                    stroke="#ffffff"
                    strokeWidth={pad / 6}
                    className={mirrored ? 'cursor-nesw-resize' : 'cursor-nwse-resize'}
                    data-handle
                    onPointerDown={(event) => start(event, () => ({ mode: 'resize', index, rect }))}
                  />
                )}
              </g>
            )
          })}
          {drag?.mode === 'draw' && drag.rect.length > 0 && drag.rect.width > 0 && (
            <rect
              x={drag.rect.x}
              y={drag.rect.y}
              width={drag.rect.length}
              height={drag.rect.width}
              fill="#fdba74"
              fillOpacity={0.6}
              stroke="#c2410c"
              strokeWidth={pad / 3}
              strokeDasharray={`${pad} ${pad / 2}`}
              pointerEvents="none"
            />
          )}
        </g>
      </svg>

      <div className="mt-2 flex min-h-9 flex-wrap items-center justify-between gap-2 text-sm">
        {drag ? <span className="tabular-nums">{describe(drag.rect)}</span> : footer}
      </div>
    </div>
  )
}
