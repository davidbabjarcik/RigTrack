import { caseFrontCm, casesInCell, cellUsage, PALLET_CM, type PlacedCase, type RackBay } from './model'

type Props = {
  name: string
  bays: RackBay[]
  cases: PlacedCase[]
  /** Vybraná polica: pole a polica (1 = dole). */
  selected: { bay: number; level: number } | null
  /** Polica s hľadaným case. */
  highlighted?: Set<string>
  onSelect: (cell: { bay: number; level: number } | null) => void
}

const UPRIGHT = '#1d4ed8'
const UPRIGHT_DARK = '#1e3a8a'
const BEAM = '#ea580c'
const INK = '#1f2937'
const ACCENT = '#f97316'
const POST = 9 // šírka stojky (cm)
const BEAM_H = 12 // výška nosníka (cm)
const CASE_FILLS = ['#e5e7eb', '#dbeafe', '#fef3c7', '#dcfce7', '#fce7f3', '#ede9fe']

/** Názov skrátený na šírku škatule. */
function fit(text: string, widthCm: number, fontCm: number) {
  const max = Math.max(2, Math.floor(widthCm / (fontCm * 0.58)))
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

/**
 * Regál spredu: modré stojky, oranžové nosníky, police s vlastnou výškou v každom poli, palety a cases ako škatule
 * (šírka a výška podľa rozmerov case). Pri každej polici je výška a voľné miesto; kliknutím sa polica vyberie.
 */
export function RackFront({ name, bays, cases, selected, highlighted, onSelect }: Props) {
  const heights = bays.map((bay) => bay.levels.reduce((sum, level) => sum + level.heightCm + BEAM_H, 0))
  const totalHeight = Math.max(...heights, 100)
  const totalWidth = bays.reduce((sum, bay) => sum + bay.widthCm + POST, POST)
  const unit = Math.max(totalWidth, totalHeight) / 100
  const font = Math.max(unit * 2.2, 9)
  const margin = { left: unit * 4, right: unit * 4, top: unit * 7, bottom: unit * 9 }
  const floor = totalHeight

  const bayX = bays.map((_, index) => POST + bays.slice(0, index).reduce((sum, bay) => sum + bay.widthCm + POST, 0))

  return (
    <svg
      viewBox={`${-margin.left} ${-margin.top} ${totalWidth + margin.left + margin.right} ${totalHeight + margin.top + margin.bottom}`}
      className="max-h-[70dvh] w-full rounded-xl border bg-[#f4f4f5] select-none dark:bg-[#1c1f26]"
      role="group"
      aria-label={`Regál ${name} spredu`}
      fontFamily="inherit"
    >
      <defs>
        <linearGradient id="rack-upright" x1="0" x2="1">
          <stop offset="0" stopColor={UPRIGHT_DARK} />
          <stop offset="0.45" stopColor={UPRIGHT} />
          <stop offset="1" stopColor={UPRIGHT_DARK} />
        </linearGradient>
        <pattern id="rack-holes" width={POST} height={8} patternUnits="userSpaceOnUse">
          <rect x={POST * 0.38} y={2} width={POST * 0.24} height={3.5} rx={1} fill="#0f172a" opacity={0.55} />
        </pattern>
      </defs>

      <text x={totalWidth / 2} y={-unit * 3} fontSize={font * 1.25} fontWeight={700} fill={INK} textAnchor="middle" className="dark:fill-white">
        {name} – pohľad spredu
      </text>

      {/* Podlaha. */}
      <rect x={-margin.left} y={floor} width={totalWidth + margin.left + margin.right} height={unit * 1.2} fill="#a8a29e" />

      {bays.map((bay, bayIndex) => {
        const x = bayX[bayIndex]
        let bottom = floor
        return (
          <g key={bayIndex}>
            {bay.levels.map((level, levelIndex) => {
              const levelNo = levelIndex + 1
              const beamY = bottom - BEAM_H
              const top = beamY - level.heightCm
              bottom = top
              const inside = casesInCell(cases, bayIndex + 1, levelNo)
              const usage = cellUsage(bay, level, inside)
              const active = selected?.bay === bayIndex + 1 && selected.level === levelNo
              const hit = inside.some((item) => highlighted?.has(item.id))
              const palletH = level.pallets ? Math.min(15, level.heightCm * 0.15) : 0
              // Palety rovnomerne po polici.
              const palletGap = level.pallets ? (bay.widthCm - level.pallets * PALLET_CM) / (level.pallets + 1) : 0
              let caseX = x + Math.max(0, palletGap > 0 && level.pallets ? palletGap : 2)
              const select = () => onSelect(active ? null : { bay: bayIndex + 1, level: levelNo })
              return (
                <g
                  key={levelIndex}
                  role="button"
                  tabIndex={0}
                  aria-pressed={active}
                  aria-label={`Pole ${bayIndex + 1}, ${levelNo}. polica: ${inside.length} cases, voľné ${Math.max(0, usage.freeCm)} cm`}
                  className="cursor-pointer outline-none"
                  onClick={select}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      select()
                    }
                  }}
                >
                  {/* Priestor police a nosník pod ňou. */}
                  <rect x={x} y={top} width={bay.widthCm} height={level.heightCm} fill={active ? '#ffedd5' : hit ? '#fff7ed' : '#ffffff'} fillOpacity={active || hit ? 1 : 0.55} />
                  <rect x={x - 1} y={beamY} width={bay.widthCm + 2} height={BEAM_H} fill={BEAM} rx={1.5} />
                  <rect x={x - 1} y={beamY + BEAM_H * 0.15} width={bay.widthCm + 2} height={BEAM_H * 0.18} fill="#fdba74" opacity={0.7} />

                  {/* Palety. */}
                  {Array.from({ length: level.pallets ?? 0 }, (_, index) => {
                    const px = x + palletGap + index * (PALLET_CM + palletGap)
                    return (
                      <g key={`p${index}`}>
                        <rect x={px} y={beamY - palletH} width={PALLET_CM} height={palletH * 0.3} fill="#c8a165" />
                        {[0, 0.42, 0.84].map((offset) => (
                          <rect key={offset} x={px + PALLET_CM * offset} y={beamY - palletH * 0.7} width={PALLET_CM * 0.16} height={palletH * 0.7} fill="#a47a3f" />
                        ))}
                      </g>
                    )
                  })}

                  {/* Cases ako škatule zľava (na paletách, ak sú). */}
                  {inside.map((item, index) => {
                    const known = caseFrontCm(item)
                    const w = Math.min(known ?? 60, bay.widthCm)
                    const h = Math.min(item.depthCm ?? level.heightCm * 0.6, level.heightCm - palletH - 2)
                    const cx = caseX
                    caseX += w + 2
                    const overflow = cx + w > x + bay.widthCm
                    const fontCm = Math.min(font, w / 4, h / 2.2)
                    const tall = Boolean(item.depthCm && item.depthCm > level.heightCm)
                    return (
                      <g key={item.id}>
                        <rect
                          x={Math.min(cx, x + bay.widthCm - w)}
                          y={beamY - palletH - h}
                          width={w}
                          height={h}
                          rx={2}
                          fill={CASE_FILLS[index % CASE_FILLS.length]}
                          stroke={highlighted?.has(item.id) ? ACCENT : overflow || tall ? '#dc2626' : '#374151'}
                          strokeWidth={highlighted?.has(item.id) ? unit * 0.6 : unit * 0.25}
                          strokeDasharray={known === null ? `${unit} ${unit * 0.6}` : undefined}
                        />
                        <text x={Math.min(cx, x + bay.widthCm - w) + w / 2} y={beamY - palletH - h / 2} fontSize={fontCm} fill={INK} textAnchor="middle" dominantBaseline="central" pointerEvents="none">
                          {fit(item.name, w, fontCm)}
                        </text>
                      </g>
                    )
                  })}

                  {/* Výška police vľavo hore a voľné miesto vpravo hore. */}
                  <text x={x + unit} y={top + font * 1.1} fontSize={font * 0.8} fill="#6b7280" pointerEvents="none">
                    {level.heightCm} cm
                  </text>
                  <text x={x + bay.widthCm - unit} y={top + font * 1.1} fontSize={font * 0.8} fontWeight={600} fill={usage.freeCm < 0 ? '#dc2626' : usage.freeCm < 30 ? '#c2410c' : '#15803d'} textAnchor="end" pointerEvents="none">
                    {usage.freeCm < 0 ? `chýba ${-usage.freeCm} cm` : `voľné ${usage.freeCm} cm`}
                  </text>
                  {active && <rect x={x + unit * 0.3} y={top + unit * 0.3} width={bay.widthCm - unit * 0.6} height={level.heightCm - unit * 0.6} fill="none" stroke={ACCENT} strokeWidth={unit * 0.6} rx={unit} pointerEvents="none" />}
                </g>
              )
            })}
            {/* Šírka poľa a jeho číslo pod ním. */}
            <text x={x + bay.widthCm / 2} y={floor + unit * 4.2} fontSize={font} fontWeight={600} fill={INK} textAnchor="middle" className="dark:fill-white">
              Pole {bayIndex + 1} · {bay.widthCm} cm
            </text>
          </g>
        )
      })}

      {/* Stojky medzi poliami (výška podľa vyššieho suseda). */}
      {[...bayX.map((x) => x - POST), totalWidth - POST].map((x, index) => {
        const h = Math.max(heights[index - 1] ?? 0, heights[index] ?? 0)
        return (
          <g key={`u${index}`} pointerEvents="none">
            <rect x={x} y={floor - h - 6} width={POST} height={h + 6} fill="url(#rack-upright)" rx={1} />
            <rect x={x} y={floor - h - 6} width={POST} height={h + 6} fill="url(#rack-holes)" />
            <rect x={x - 3} y={floor - 2} width={POST + 6} height={3} fill="#334155" />
          </g>
        )
      })}

      {/* Celková výška vľavo. */}
      <text x={-unit * 1.5} y={floor - totalHeight / 2} fontSize={font * 0.85} fill="#6b7280" textAnchor="middle" transform={`rotate(-90 ${-unit * 1.5} ${floor - totalHeight / 2})`}>
        {totalHeight} cm
      </text>
    </svg>
  )
}
