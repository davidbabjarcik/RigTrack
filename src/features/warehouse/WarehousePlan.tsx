import { isStructure, metres, SPOT_KIND_FILLS, type Spot, type Warehouse } from './model'

type Props = {
  warehouse: Warehouse
  spots: Spot[]
  /** Počet cases na každom mieste. */
  counts: Map<string, number>
  /** Obsadenosť plochy miesta v % (zo všetkých poschodí), ak sa dá vypočítať z rozmerov cases. */
  usage?: Map<string, number>
  selectedId: string | null
  /** Miesta, kde leží hľadaný case. */
  highlighted: Set<string>
  onSelect: (id: string | null) => void
}

const INK = '#1f2937'
const FLOOR = '#f3f1ec'
const ACCENT = '#f97316'

/** Pôdorys skladu, pohľad zhora: betónová podlaha s mriežkou po 1 m, steny, regály, palety, stĺpy, dvere a okná. */
export function WarehousePlan({ warehouse, spots, counts, usage, selectedId, highlighted, onSelect }: Props) {
  const { lengthCm, widthCm } = warehouse
  const unit = Math.max(lengthCm, widthCm) / 100 // 1 % dlhšej strany – hrúbky čiar a písmo sa škálujú s veľkosťou skladu
  const wall = Math.max(12, unit * 1.2)
  const margin = unit * 7
  const font = Math.min(lengthCm, widthCm) * 0.04

  // Najprv plochy (zóny, palety, regály), navrch stavebné prvky, aby ich nič neprekrylo.
  const ordered = [...spots].sort((a, b) => Number(isStructure(a.kind)) - Number(isStructure(b.kind)) || Number(b.kind === 'zone') - Number(a.kind === 'zone'))

  return (
    <svg
      viewBox={`${-margin} ${-margin} ${lengthCm + margin * 2} ${widthCm + margin * 2}`}
      className="max-h-[72dvh] w-full rounded-xl border bg-[#e7e5e0] select-none dark:bg-[#1c1f26]"
      role="group"
      aria-label="Plán skladu, pohľad zhora"
      fontFamily="inherit"
    >
      <defs>
        <pattern id="wh-grid-fine" width={50} height={50} patternUnits="userSpaceOnUse">
          <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#e2ded5" strokeWidth={unit * 0.08} />
        </pattern>
        <pattern id="wh-grid" width={100} height={100} patternUnits="userSpaceOnUse">
          <rect width={100} height={100} fill="url(#wh-grid-fine)" />
          <path d="M 100 0 L 0 0 0 100" fill="none" stroke="#d6d1c6" strokeWidth={unit * 0.14} />
        </pattern>
        <pattern id="wh-hatch" width={unit * 1.6} height={unit * 1.6} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width={unit * 1.6} height={unit * 1.6} fill="#52525b" />
          <line x1={0} y1={0} x2={0} y2={unit * 1.6} stroke="#a1a1aa" strokeWidth={unit * 0.35} />
        </pattern>
        <filter id="wh-shadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx={unit * 0.15} dy={unit * 0.25} stdDeviation={unit * 0.3} floodColor="#000" floodOpacity="0.25" />
        </filter>
      </defs>

      {/* Podlaha a obvodové steny. */}
      <rect x={0} y={0} width={lengthCm} height={widthCm} fill={FLOOR} onClick={() => onSelect(null)} />
      <rect x={0} y={0} width={lengthCm} height={widthCm} fill="url(#wh-grid)" pointerEvents="none" />
      <rect x={-wall / 2} y={-wall / 2} width={lengthCm + wall} height={widthCm + wall} fill="none" stroke={INK} strokeWidth={wall} pointerEvents="none" />

      {/* Rozmery skladu po okrajoch. */}
      <g fill="#6b7280" fontSize={unit * 2.2} fontWeight={600} textAnchor="middle" pointerEvents="none">
        <text x={lengthCm / 2} y={-wall - unit * 1.6}>
          {metres(lengthCm)}
        </text>
        <text x={-wall - unit * 1.6} y={widthCm / 2} transform={`rotate(-90 ${-wall - unit * 1.6} ${widthCm / 2})`}>
          {metres(widthCm)}
        </text>
      </g>
      {/* Mierka 1 m vpravo dole. */}
      <g pointerEvents="none" transform={`translate(${lengthCm - 100} ${widthCm + wall + unit * 2})`}>
        <rect width={100} height={unit * 0.7} fill={INK} />
        <text x={50} y={unit * 3.2} fontSize={unit * 2} fill="#6b7280" textAnchor="middle">
          1 m
        </text>
      </g>

      {ordered.map((spot) => {
        const active = spot.id === selectedId
        const hit = highlighted.has(spot.id)
        const count = counts.get(spot.id) ?? 0
        const color = SPOT_KIND_FILLS[spot.kind]
        const { x, y, length: w, width: h } = spot
        const size = Math.min(font, h * 0.3, (w / Math.max(spot.name.length, 4)) * 1.6)
        const percent = usage?.get(spot.id)
        const select = () => onSelect(active ? null : spot.id)
        const outline = active || hit ? ACCENT : undefined

        // Stavebné prvky: stĺp (šrafovaný), stena, dvere s oblúkom otvárania, okno dvojitou čiarou.
        let shape
        if (spot.kind === 'column') {
          shape = <rect x={x} y={y} width={w} height={h} fill="url(#wh-hatch)" stroke={outline ?? INK} strokeWidth={outline ? unit * 0.6 : unit * 0.25} />
        } else if (spot.kind === 'wall') {
          shape = <rect x={x} y={y} width={w} height={h} fill={INK} stroke={outline ?? INK} strokeWidth={outline ? unit * 0.6 : 0} />
        } else if (spot.kind === 'door') {
          // Krídlo sa otvára dovnútra skladu (od bližšej steny).
          const horizontal = w >= h
          const span = horizontal ? w : h
          const down = y + h / 2 < widthCm / 2 ? 1 : -1
          const right = x + w / 2 < lengthCm / 2 ? 1 : -1
          const arc = horizontal
            ? `M ${x} ${y + h / 2} L ${x + span} ${y + h / 2} A ${span} ${span} 0 0 ${down > 0 ? 1 : 0} ${x} ${y + h / 2 + down * span}`
            : `M ${x + w / 2} ${y} L ${x + w / 2} ${y + span} A ${span} ${span} 0 0 ${right > 0 ? 0 : 1} ${x + w / 2 + right * span} ${y}`
          shape = (
            <g>
              <rect x={x} y={y} width={w} height={h} fill={FLOOR} stroke={outline ?? color} strokeWidth={outline ? unit * 0.6 : unit * 0.3} />
              <path d={arc} fill={`${color}14`} stroke={color} strokeWidth={unit * 0.25} strokeDasharray={`${unit} ${unit * 0.6}`} />
            </g>
          )
        } else if (spot.kind === 'window') {
          const horizontal = w >= h
          shape = (
            <g>
              <rect x={x} y={y} width={w} height={h} fill="#e0f2fe" stroke={outline ?? color} strokeWidth={outline ? unit * 0.6 : unit * 0.3} />
              {horizontal ? (
                <line x1={x} y1={y + h / 2} x2={x + w} y2={y + h / 2} stroke={color} strokeWidth={unit * 0.25} />
              ) : (
                <line x1={x + w / 2} y1={y} x2={x + w / 2} y2={y + h} stroke={color} strokeWidth={unit * 0.25} />
              )}
            </g>
          )
        } else if (spot.kind === 'zone') {
          shape = <rect x={x} y={y} width={w} height={h} rx={unit} fill={`${color}1f`} stroke={outline ?? color} strokeWidth={outline ? unit * 0.6 : unit * 0.35} strokeDasharray={`${unit * 1.4} ${unit * 0.9}`} />
        } else if (spot.kind === 'pallet') {
          // Paleta: drevené dosky naprieč.
          const boards = Math.max(3, Math.round(w / 25))
          shape = (
            <g filter="url(#wh-shadow)">
              <rect x={x} y={y} width={w} height={h} rx={unit * 0.3} fill="#d6b88a" stroke={outline ?? '#8a6a3b'} strokeWidth={outline ? unit * 0.6 : unit * 0.25} />
              {Array.from({ length: boards - 1 }, (_, index) => (
                <line key={index} x1={x + ((index + 1) * w) / boards} y1={y} x2={x + ((index + 1) * w) / boards} y2={y + h} stroke="#8a6a3b" strokeWidth={unit * 0.15} />
              ))}
            </g>
          )
        } else {
          // Regál: police (svetlá výplň), stĺpiky v rohoch a pásik obsadenosti dole.
          const post = Math.min(w, h) * 0.12
          shape = (
            <g filter="url(#wh-shadow)">
              <rect x={x} y={y} width={w} height={h} rx={unit * 0.3} fill="#eef2ff" stroke={outline ?? color} strokeWidth={outline ? unit * 0.6 : unit * 0.3} />
              {[
                [x, y],
                [x + w - post, y],
                [x, y + h - post],
                [x + w - post, y + h - post],
              ].map(([px, py], index) => (
                <rect key={index} x={px} y={py} width={post} height={post} fill={color} />
              ))}
              {percent !== undefined && (
                <g>
                  <rect x={x + post} y={y + h - post * 0.8} width={w - post * 2} height={post * 0.5} fill="#c7d2fe" />
                  <rect x={x + post} y={y + h - post * 0.8} width={((w - post * 2) * Math.min(100, percent)) / 100} height={post * 0.5} fill={percent > 100 ? '#dc2626' : percent > 85 ? ACCENT : '#16a34a'} />
                </g>
              )}
            </g>
          )
        }

        const structure = isStructure(spot.kind)
        const textFill = spot.kind === 'wall' || spot.kind === 'column' ? '#ffffff' : INK
        return (
          <g
            key={spot.id}
            role="button"
            tabIndex={0}
            aria-pressed={active}
            aria-label={structure ? spot.name : `${spot.name}, cases: ${count}`}
            className="cursor-pointer outline-none"
            onClick={select}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                select()
              }
            }}
          >
            {shape}
            {(active || hit) && <rect x={x - unit * 0.8} y={y - unit * 0.8} width={w + unit * 1.6} height={h + unit * 1.6} rx={unit} fill="none" stroke={ACCENT} strokeOpacity={0.35} strokeWidth={unit * 1.2} pointerEvents="none" />}
            {/* Popis: pri regáli, palete a zóne názov a počet cases; pri stavebných prvkoch len ak je miesto. */}
            {(!structure || (size > unit * 1.5 && spot.kind !== 'window')) && (
              <g pointerEvents="none" textAnchor="middle" paintOrder="stroke" stroke={structure ? 'none' : '#ffffffd9'} strokeWidth={size * 0.22} strokeLinejoin="round">
                <text x={x + w / 2} y={y + h / 2 - (structure ? 0 : size * 0.45)} fontSize={size} fontWeight={700} fill={textFill} dominantBaseline="central">
                  {spot.name}
                </text>
                {!structure && (
                  <text x={x + w / 2} y={y + h / 2 + size * 0.75} fontSize={size * 0.75} fill="#4b5563" dominantBaseline="central">
                    {[count === 0 ? 'prázdne' : `${count} ${count === 1 ? 'case' : count < 5 ? 'cases' : 'cases'}`, spot.levels > 1 && `${spot.levels} posch.`].filter(Boolean).join(' · ')}
                  </text>
                )}
              </g>
            )}
          </g>
        )
      })}
    </svg>
  )
}
