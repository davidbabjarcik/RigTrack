import { useEffect, useRef, useState } from 'react'
import { caseFrontCm, casesInCell, cellUsage, PALLET_CM, palletPositions, type PlacedCase, type RackBay } from './model'

type Props = {
  name: string
  bays: RackBay[]
  cases: PlacedCase[]
  /** Vybraná polica: pole a polica (1 = dole). */
  selected: { bay: number; level: number } | null
  /** Cases, ktoré sa hľadajú. */
  highlighted?: Set<string>
  onSelect: (cell: { bay: number; level: number } | null) => void
}

const POST = 8 // šírka stojky (cm)
const BEAM_H = 8 // výška nosníka (cm)

/** Šírka prvku v pixeloch (písmo a čiary sa držia v px bez ohľadu na veľkosť regála). */
function useWidth() {
  const ref = useRef<SVGSVGElement>(null)
  const [width, setWidth] = useState(900)
  useEffect(() => {
    const element = ref.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width || 900))
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  return { ref, width }
}

/** Text skrátený na šírku (px). */
function fit(text: string, widthPx: number, fontPx: number) {
  const max = Math.max(1, Math.floor(widthPx / (fontPx * 0.56)))
  return text.length > max ? `${text.slice(0, Math.max(1, max - 1))}…` : text
}

/**
 * Regál spredu ako technický výkres: tenké stojky a nosníky, police s kótami výšky, šírka poľa dole,
 * palety a cases ako obdĺžniky podľa rozmerov. Farby idú z témy (svetlá aj tmavá). Kliknutím sa polica vyberie.
 */
export function RackFront({ name, bays, cases, selected, highlighted, onSelect }: Props) {
  const heights = bays.map((bay) => bay.levels.reduce((sum, level) => sum + level.heightCm + BEAM_H, 0))
  const rackH = Math.max(...heights, 50)
  const rackW = bays.reduce((sum, bay) => sum + bay.widthCm + POST, POST)
  const { ref, width } = useWidth()

  // Mierka: koľko cm je jeden pixel (podľa šírky aj výšky, ktorá je obmedzená).
  const padPx = { left: 64, right: 16, top: 16, bottom: 44 }
  const maxHeightPx = 520
  const scale = Math.max((rackW + 1) / Math.max(200, width - padPx.left - padPx.right), rackH / (maxHeightPx - padPx.top - padPx.bottom))
  const px = (value: number) => value * scale
  const font = px(12)
  const small = px(10.5)
  const pad = { left: px(padPx.left), right: px(padPx.right), top: px(padPx.top), bottom: px(padPx.bottom) }
  const floor = rackH
  const bayX = bays.map((_, index) => POST + bays.slice(0, index).reduce((sum, bay) => sum + bay.widthCm + POST, 0))
  const tick = px(4)

  return (
    <svg
      ref={ref}
      viewBox={`${-pad.left} ${-pad.top} ${rackW + pad.left + pad.right} ${rackH + pad.top + pad.bottom}`}
      className="block w-full rounded-xl border bg-surface text-foreground select-none"
      style={{ maxHeight: maxHeightPx }}
      role="group"
      aria-label={`Regál ${name} spredu`}
      fontFamily="inherit"
    >
      <defs>
        <pattern id="rf-floor" width={px(6)} height={px(6)} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1={0} y1={0} x2={0} y2={px(6)} stroke="currentColor" strokeOpacity={0.25} strokeWidth={px(1)} />
        </pattern>
      </defs>

      {/* Podlaha. */}
      <line x1={-pad.left * 0.4} y1={floor} x2={rackW + pad.right * 0.5} y2={floor} stroke="currentColor" strokeOpacity={0.5} strokeWidth={px(1.2)} />
      <rect x={-pad.left * 0.4} y={floor} width={rackW + pad.left * 0.4 + pad.right * 0.5} height={px(7)} fill="url(#rf-floor)" />

      {bays.map((bay, bayIndex) => {
        const x = bayX[bayIndex]
        const levels = bay.levels.map((level, levelIndex) => {
          const below = bay.levels.slice(0, levelIndex).reduce((sum, item) => sum + item.heightCm + BEAM_H, 0)
          const beamY = floor - below - BEAM_H
          return { level, levelNo: levelIndex + 1, beamY, top: beamY - level.heightCm }
        })
        return (
          <g key={bayIndex}>
            {levels.map(({ level, levelNo, beamY, top }) => {
              const inside = casesInCell(cases, bayIndex + 1, levelNo)
              const usage = cellUsage(bay, level, inside)
              const active = selected?.bay === bayIndex + 1 && selected.level === levelNo
              const hit = inside.some((item) => highlighted?.has(item.id))
              const palletH = level.pallets ? Math.min(14, level.heightCm * 0.12) : 0
              const pallets = palletPositions(bay.widthCm, level)
              const select = () => onSelect(active ? null : { bay: bayIndex + 1, level: levelNo })
              let cursor = x + (pallets[0] ?? 3)
              return (
                <g
                  key={levelNo}
                  role="button"
                  tabIndex={0}
                  aria-pressed={active}
                  aria-label={`Pole ${bayIndex + 1}, ${levelNo}. polica: ${inside.length} cases, voľné ${Math.max(0, usage.freeCm)} cm`}
                  className="cursor-pointer outline-none [&:hover>rect:first-child]:fill-[var(--color-accent)] [&:hover>rect:first-child]:[fill-opacity:0.06]"
                  onClick={select}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      select()
                    }
                  }}
                >
                  <rect x={x} y={top} width={bay.widthCm} height={level.heightCm} fill={active || hit ? 'var(--color-accent)' : 'transparent'} fillOpacity={active ? 0.12 : hit ? 0.08 : 0} />
                  {/* Nosník. */}
                  <rect x={x} y={beamY + BEAM_H - Math.min(BEAM_H, px(6))} width={bay.widthCm} height={Math.min(BEAM_H, px(6))} fill="#d97706" fillOpacity={0.85} />

                  {/* Palety: doska a tri hranoly. */}
                  {pallets.map((offset, index) => {
                    // 1 cm od susednej palety, aby boli natesno postavené palety rozoznateľné.
                    const left = x + offset + 1
                    return (
                      <g key={`p${index}`} fill="#a16207" fillOpacity={0.55}>
                        <rect x={left} y={beamY - palletH} width={PALLET_CM - 2} height={palletH * 0.28} />
                        {[0, 0.43, 0.86].map((offset) => (
                          <rect key={offset} x={left + (PALLET_CM - 2) * offset} y={beamY - palletH * 0.72} width={(PALLET_CM - 2) * 0.14} height={palletH * 0.72} />
                        ))}
                      </g>
                    )
                  })}

                  {/* Cases. */}
                  {inside.map((item) => {
                    const known = caseFrontCm(item)
                    const w = Math.min(known ?? 60, bay.widthCm - 2)
                    const h = Math.max(px(14), Math.min(item.depthCm ?? level.heightCm * 0.55, level.heightCm - palletH - 2))
                    const left = Math.min(cursor, x + bay.widthCm - w)
                    cursor += w + 2
                    const bad = cursor - 2 > x + bay.widthCm || Boolean(item.depthCm && item.depthCm > level.heightCm)
                    const found = highlighted?.has(item.id)
                    return (
                      <g key={item.id}>
                        <rect
                          x={left}
                          y={beamY - palletH - h}
                          width={w}
                          height={h}
                          rx={px(2)}
                          fill="currentColor"
                          fillOpacity={0.07}
                          stroke={found ? 'var(--color-accent)' : bad ? '#dc2626' : 'currentColor'}
                          strokeOpacity={found || bad ? 1 : 0.55}
                          strokeWidth={px(found ? 2 : 1)}
                          strokeDasharray={known === null ? `${px(4)} ${px(3)}` : undefined}
                        />
                        {w / scale > 28 && (
                          <text x={left + w / 2} y={beamY - palletH - h / 2} fontSize={small} fill="currentColor" textAnchor="middle" dominantBaseline="central" pointerEvents="none">
                            {fit(item.name, w / scale - 6, 10.5)}
                          </text>
                        )}
                      </g>
                    )
                  })}

                  {/* Voľné miesto vpravo hore v polici. */}
                  {level.heightCm / scale > 18 && (
                    <text
                      x={x + bay.widthCm - px(6)}
                      y={top + px(13)}
                      fontSize={small}
                      textAnchor="end"
                      fill={usage.freeCm < 0 ? '#dc2626' : 'currentColor'}
                      fillOpacity={usage.freeCm < 0 ? 1 : 0.6}
                      pointerEvents="none"
                    >
                      {usage.freeCm < 0 ? `chýba ${-usage.freeCm} cm` : `voľné ${usage.freeCm} cm`}
                    </text>
                  )}
                  {active && <rect x={x + px(1)} y={top + px(1)} width={bay.widthCm - px(2)} height={level.heightCm - px(2)} fill="none" stroke="var(--color-accent)" strokeWidth={px(2)} pointerEvents="none" />}
                </g>
              )
            })}

            {/* Kóta šírky poľa dole. */}
            <g stroke="currentColor" strokeOpacity={0.45} strokeWidth={px(1)} pointerEvents="none">
              <line x1={x} y1={floor + px(18)} x2={x + bay.widthCm} y2={floor + px(18)} />
              <line x1={x} y1={floor + px(18) - tick} x2={x} y2={floor + px(18) + tick} />
              <line x1={x + bay.widthCm} y1={floor + px(18) - tick} x2={x + bay.widthCm} y2={floor + px(18) + tick} />
            </g>
            <text x={x + bay.widthCm / 2} y={floor + px(34)} fontSize={small} fill="currentColor" fillOpacity={0.7} textAnchor="middle" pointerEvents="none">
              {bays.length > 1 ? `Pole ${bayIndex + 1} · ` : ''}
              {bay.widthCm} cm
            </text>
          </g>
        )
      })}

      {/* Stojky. */}
      {[...bayX.map((x) => x - POST), rackW - POST].map((x, index) => {
        const h = Math.max(heights[index - 1] ?? 0, heights[index] ?? 0) + 4
        return (
          <g key={`u${index}`} pointerEvents="none">
            <rect x={x + (POST - Math.min(POST, px(9))) / 2} y={floor - h} width={Math.min(POST, px(9))} height={h} fill="#475569" stroke="#334155" strokeWidth={px(0.8)} />
            <line x1={x + POST / 2} y1={floor - h + 4} x2={x + POST / 2} y2={floor - 2} stroke="#cbd5e1" strokeOpacity={0.5} strokeWidth={px(1.2)} strokeDasharray={`${px(2)} ${px(4)}`} />
          </g>
        )
      })}

      {/* Kóty výšok políc prvého poľa vľavo. */}
      {bays[0] &&
        bays[0].levels.map((level, levelIndex) => {
          const below = bays[0].levels.slice(0, levelIndex).reduce((sum, item) => sum + item.heightCm + BEAM_H, 0)
          const bottom = floor - below - BEAM_H
          const top = bottom - level.heightCm
          const dx = -px(16)
          return (
            <g key={`d${levelIndex}`} pointerEvents="none">
              <g stroke="currentColor" strokeOpacity={0.45} strokeWidth={px(1)}>
                <line x1={dx} y1={top} x2={dx} y2={bottom} />
                <line x1={dx - tick} y1={top} x2={dx + tick} y2={top} />
                <line x1={dx - tick} y1={bottom} x2={dx + tick} y2={bottom} />
              </g>
              {level.heightCm / scale > 14 && (
                <text x={dx - px(6)} y={(top + bottom) / 2} fontSize={small} fill="currentColor" fillOpacity={0.7} textAnchor="end" dominantBaseline="central">
                  {level.heightCm}
                </text>
              )}
            </g>
          )
        })}
      <text x={-pad.left + px(4)} y={-pad.top + font} fontSize={small} fill="currentColor" fillOpacity={0.5}>
        výška {rackH} cm
      </text>
    </svg>
  )
}
